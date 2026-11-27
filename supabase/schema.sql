-- ============================================================================
-- 카피박스(COPYBOX) 전용 Supabase 스키마  ·  v3 (2026-11-27)
-- ============================================================================
-- ※ 공부 체크 앱과는 완전히 분리된 **별도 Supabase 프로젝트**에서만 실행하세요.
--   (같은 프로젝트에 실행하면 테이블·버킷·정책이 섞입니다. 테이블 이름은 모두
--    public.customers / public.orders / public.order_files / public.order_status_history)
--
-- 손님 정보 보호 원칙
--   1) 모든 주문·첨부파일은 customer_id 로 묶여 손님별 과거 이력이 통째로 남습니다.
--   2) customers 는 소프트 삭제(deleted_at)만 하고, 주문이 있는 손님은 FK
--      ON DELETE RESTRICT 로 물리 삭제가 불가능합니다(데이터 유실 방지).
--   3) RLS: 로그인한 본인의 행만 조회·생성할 수 있고, DELETE 정책은 아예 없습니다.
--   4) 첨부파일 버킷(order-files)은 비공개이며 본인/사장님만 읽을 수 있습니다.
--
-- 적용 순서
--   1. 새 Supabase 프로젝트 생성 → SQL Editor 에 이 파일 전체 실행
--   2. Authentication > Providers 에서 카카오·네이버·구글 활성화
--   3. 사장님 계정으로 로그인한 뒤 staff_members 에 사장님 user id 등록(맨 아래 안내)
--   4. 앱 환경변수 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 설정 후 배포
--   5. Storage > order-files 버킷이 Private 인지 확인
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신
-- ---------------------------------------------------------------------------
create or replace function public.copybox_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 사장님(관리자) 권한 — staff_members 에 등록된 계정만 전체 조회/상태 변경
-- ---------------------------------------------------------------------------
create table if not exists public.staff_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

-- 자기 자신이 사장님 명단에 있는지 여부(RLS 재귀를 피하려고 security definer)
create or replace function public.is_copybox_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff_members where user_id = auth.uid());
$$;

revoke all on function public.is_copybox_staff() from public;
grant execute on function public.is_copybox_staff() to authenticated;

drop policy if exists "staff read self" on public.staff_members;
create policy "staff read self"
  on public.staff_members for select
  to authenticated
  using (user_id = auth.uid());
-- 등록/삭제는 대시보드(서비스 롤)에서만 합니다. 앱에서 임의로 사장님이 될 수 없습니다.

-- ---------------------------------------------------------------------------
-- 1) customers — 손님 (소프트 삭제)
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null
               default auth.uid(),
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  phone        text not null check (phone ~ '^0[0-9]{8,10}$'),
  email        text,
  provider     text not null default 'guest'
               check (provider in ('kakao', 'naver', 'google', 'guest')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

comment on table public.customers is '카피박스 손님. deleted_at 소프트 삭제, 주문이 있으면 물리 삭제 불가';
comment on column public.customers.auth_user_id is '로그인 계정. 비회원 주문은 null + provider=guest';
comment on column public.customers.phone is '숫자만 저장(01012345678). 표시는 앱에서 하이픈 처리';

create index if not exists customers_phone_idx on public.customers (phone) where deleted_at is null;

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at
  before update on public.customers
  for each row execute function public.copybox_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2) orders — 주문 (손님 삭제 제한 + 접수 시점 단가 스냅샷)
-- ---------------------------------------------------------------------------
create or replace function public.copybox_order_number()
returns text
language sql
volatile
as $$
  select 'CB-' || to_char(now(), 'YYMMDD') || '-' ||
         lpad(((floor(random() * 900000) + 100000)::int)::text, 6, '0');
$$;

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique default public.copybox_order_number(),
  customer_id       uuid not null references public.customers (id) on delete restrict,
  status            text not null default 'received'
                    check (status in ('received', 'printing', 'done', 'shipped', 'delivered', 'canceled')),
  paper_size        text not null default 'A4' check (paper_size = 'A4'),
  color_mode        text not null check (color_mode in ('mono', 'color')),
  sides             text not null check (sides in ('single', 'double')),
  pages             integer not null check (pages between 1 and 2000),
  copies            integer not null check (copies between 1 and 999),
  binding           text not null default 'none' check (binding in ('none', 'coil', 'wire')),
  page_unit_price   integer not null check (page_unit_price > 0),
  binding_unit_price integer not null default 0 check (binding_unit_price >= 0),
  print_cost        integer not null default 0 check (print_cost >= 0),
  discount_amount   integer not null default 0 check (discount_amount >= 0),
  shipping_fee      integer not null default 0 check (shipping_fee >= 0),
  packaging_fee     integer not null default 0 check (packaging_fee >= 0),
  total_price       integer not null check (total_price >= 0),
  product           text not null default 'print' check (product in ('print', 'card')),
  card_paper        text check (card_paper in ('coating', 'noncoating', 'imported')),
  card_qty          integer check (card_qty is null or card_qty >= 200),
  card_text         text,
  delivery_speed    text not null default 'normal' check (delivery_speed in ('normal', 'eco')),
  due_ship_date     date,
  payment_status    text not null default 'unpaid'
                    check (payment_status in ('unpaid', 'awaiting_deposit', 'confirmed')),
  payment_method    text not null default 'bank_transfer'
                    check (payment_method in ('bank_transfer', 'kakaopay')),
  payment_confirmed_at timestamptz,
  pdf_purge_at      timestamptz,
  customer_request  text,
  pickup            text not null default 'store' check (pickup in ('store', 'delivery')),
  address           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- 접수 시점 단가·총액이 그대로 박제되도록 DB에서도 검증합니다.
  --   총액 = 인쇄비 - 여유특가 할인 + 제본비 + 택배비 + 포장비
  constraint orders_total_matches_prices
    check (total_price = print_cost - discount_amount + binding_unit_price * copies + shipping_fee + packaging_fee),
  constraint orders_page_price_matches_options
    check (
      (color_mode = 'mono' and page_unit_price = case sides when 'single' then 50 else 40 end)
      or (color_mode = 'color' and page_unit_price = case sides when 'single' then 300 else 250 end)
    ),
  constraint orders_binding_price_valid
    check (
      (binding = 'none' and binding_unit_price = 0)
      or (binding in ('coil', 'wire') and binding_unit_price >= 1500)
    )
);

comment on table public.orders is '카피박스 주문. customer_id NOT NULL + ON DELETE RESTRICT 로 손님 이력 보존';
comment on column public.orders.page_unit_price is '접수 시점 1페이지 단가(원). A4 흑백 단면 50 / 양면 40';
comment on column public.orders.binding_unit_price is '제본 1부당 금액(원). 스프링·와이어는 최소 1500';
comment on column public.orders.customer_request is '손님이 남긴 요청사항';

create index if not exists orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.copybox_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3) order_files — 첨부파일 (주문·손님 양쪽에 묶임)
-- ---------------------------------------------------------------------------
create table if not exists public.order_files (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete restrict,
  customer_id  uuid not null references public.customers (id) on delete restrict,
  file_name    text not null check (char_length(btrim(file_name)) between 1 and 255),
  file_size    bigint check (file_size is null or file_size >= 0),
  page_count   integer check (page_count is null or page_count > 0),
  storage_path text,
  created_at   timestamptz not null default now()
);

comment on table public.order_files is '주문 첨부파일. order_id·customer_id 모두 RESTRICT 로 이력 보존';

create index if not exists order_files_order_idx on public.order_files (order_id, created_at desc);
create index if not exists order_files_customer_idx on public.order_files (customer_id, created_at desc);

-- 파일의 손님이 주문의 손님과 다르면 저장 거부 (손님 정보 섞임 방지)
create or replace function public.copybox_check_order_file_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.orders o
    where o.id = new.order_id and o.customer_id = new.customer_id
  ) then
    raise exception 'order_files.customer_id does not match orders.customer_id';
  end if;
  return new;
end;
$$;

drop trigger if exists order_files_check_owner on public.order_files;
create trigger order_files_check_owner
  before insert or update on public.order_files
  for each row execute function public.copybox_check_order_file_owner();

-- ---------------------------------------------------------------------------
-- 4) order_status_history — 상태 변경 이력 보존
-- ---------------------------------------------------------------------------
create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  from_status text check (from_status in ('received', 'printing', 'done', 'shipped', 'delivered', 'canceled')),
  to_status   text not null check (to_status in ('received', 'printing', 'done', 'shipped', 'delivered', 'canceled')),
  changed_by  uuid references auth.users (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists order_status_history_order_idx
  on public.order_status_history (order_id, created_at desc);
create index if not exists order_status_history_customer_idx
  on public.order_status_history (customer_id, created_at desc);

-- 주문이 접수되거나 상태가 바뀌면 자동으로 이력이 쌓입니다.
create or replace function public.copybox_log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, customer_id, from_status, to_status, changed_by, note)
    values (new.id, new.customer_id, null, new.status, auth.uid(), '주문 접수');
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, customer_id, from_status, to_status, changed_by, note)
    values (new.id, new.customer_id, old.status, new.status, auth.uid(), '상태 변경');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_log_status on public.orders;
create trigger orders_log_status
  after insert or update of status on public.orders
  for each row execute function public.copybox_log_order_status();

-- ---------------------------------------------------------------------------
-- 5) RLS — 손님 정보 안전 최우선
-- ---------------------------------------------------------------------------
alter table public.customers            enable row level security;
alter table public.orders               enable row level security;
alter table public.order_files          enable row level security;
alter table public.order_status_history enable row level security;

-- 어떤 경우에도 앱에서 DELETE 불가 (정책 없음 + 권한 회수)
revoke delete on public.customers, public.orders, public.order_files, public.order_status_history
  from anon, authenticated;

-- ---- customers -------------------------------------------------------------
drop policy if exists "customers select own" on public.customers;
create policy "customers select own"
  on public.customers for select
  to authenticated
  using (auth_user_id = auth.uid() and deleted_at is null);

drop policy if exists "customers insert own" on public.customers;
create policy "customers insert own"
  on public.customers for insert
  to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "customers update own" on public.customers;
create policy "customers update own"
  on public.customers for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists "customers staff all" on public.customers;
create policy "customers staff all"
  on public.customers for select
  to authenticated
  using (public.is_copybox_staff());

-- ---- orders ---------------------------------------------------------------
drop policy if exists "orders select own" on public.orders;
create policy "orders select own"
  on public.orders for select
  to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = orders.customer_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own"
  on public.orders for insert
  to authenticated
  with check (
    status = 'received'
    and exists (
      select 1 from public.customers c
      where c.id = orders.customer_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "orders staff select" on public.orders;
create policy "orders staff select"
  on public.orders for select
  to authenticated
  using (public.is_copybox_staff());

drop policy if exists "orders staff update" on public.orders;
create policy "orders staff update"
  on public.orders for update
  to authenticated
  using (public.is_copybox_staff())
  with check (public.is_copybox_staff());
-- 손님은 주문 내용을 수정할 수 없습니다(접수 시점 스냅샷 보존).

-- ---- order_files ----------------------------------------------------------
drop policy if exists "order_files select own" on public.order_files;
create policy "order_files select own"
  on public.order_files for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = order_files.order_id
        and o.customer_id = order_files.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "order_files insert own" on public.order_files;
create policy "order_files insert own"
  on public.order_files for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = order_files.order_id
        and o.customer_id = order_files.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "order_files staff select" on public.order_files;
create policy "order_files staff select"
  on public.order_files for select
  to authenticated
  using (public.is_copybox_staff());

-- ---- order_status_history -------------------------------------------------
drop policy if exists "status history select own" on public.order_status_history;
create policy "status history select own"
  on public.order_status_history for select
  to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = order_status_history.customer_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "status history staff select" on public.order_status_history;
create policy "status history staff select"
  on public.order_status_history for select
  to authenticated
  using (public.is_copybox_staff());
-- INSERT 는 트리거(security definer)만 수행합니다. 위조 방지를 위해 손님 INSERT 정책 없음.

-- ---------------------------------------------------------------------------
-- 6) Storage — 비공개 버킷 order-files
--    경로 규칙: {customer_id}/{order_number}/{file_name}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-files',
  'order-files',
  false,
  52428800, -- 50MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-hwp',
    'application/haansofthwp',
    'text/plain'
  ]
)
on conflict (id) do update set public = false;

drop policy if exists "order files upload own" on storage.objects;
create policy "order files upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'order-files'
    and (storage.foldername(name))[1] in (
      select c.id::text
      from public.customers c
      where c.auth_user_id = auth.uid() and c.deleted_at is null
    )
  );

drop policy if exists "order files read own" on storage.objects;
create policy "order files read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'order-files'
    and (storage.foldername(name))[1] in (
      select c.id::text
      from public.customers c
      where c.auth_user_id = auth.uid() and c.deleted_at is null
    )
  );

drop policy if exists "order files read staff" on storage.objects;
create policy "order files read staff"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'order-files' and public.is_copybox_staff());
-- UPDATE/DELETE 정책 없음 → 앱에서 파일 수정·삭제 불가(이력 보존)

-- ---------------------------------------------------------------------------
-- 7) 사장님 화면용 요약 뷰 (security_invoker 로 RLS 그대로 적용)
-- ---------------------------------------------------------------------------
create or replace view public.copybox_customer_overview
with (security_invoker = true) as
select
  c.id                                   as customer_id,
  c.name,
  c.phone,
  c.provider,
  count(o.id)                            as order_count,
  coalesce(sum(o.total_price), 0)::bigint as total_amount,
  max(o.created_at)                      as last_order_at
from public.customers c
left join public.orders o on o.customer_id = c.id
where c.deleted_at is null
group by c.id, c.name, c.phone, c.provider;

grant select on public.copybox_customer_overview to authenticated;

-- ============================================================================
-- 사장님 등록 예시 (대시보드 SQL Editor, 서비스 롤로 실행)
--   insert into public.staff_members (user_id, name)
--   select id, '카피박스 사장님' from auth.users where email = '사장님로그인메일';
--
-- 손님 소프트 삭제 예시 (앱에서는 DELETE 불가, 대시보드에서만)
--   update public.customers set deleted_at = now() where id = '...';
--   → 주문·첨부파일은 그대로 남아 매장 이력이 유지됩니다.
-- ============================================================================

-- ============================================================================
-- v3 추가분 (2026-11-27) — 5단계 상태 · 입금 확인 · 보관 사진 · 주문 메시지 ·
--                        리뷰 · 명함 · 여유 제작 특가 · 14일 PDF 파기 · 탈퇴 RPC
-- ============================================================================
-- 이미 v2 로 만든 프로젝트라면 이 블록만 실행하면 됩니다.
-- (새 프로젝트에서 위쪽 create table 까지 실행했다면 이 블록은 "이미 있음"으로 넘어갑니다.)

-- 1) 주문 상태 5단계 + 입금·출고·명함 컬럼 -----------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('received', 'printing', 'done', 'shipped', 'delivered', 'canceled'));

alter table public.orders add column if not exists product text not null default 'print';
alter table public.orders add column if not exists card_paper text;
alter table public.orders add column if not exists card_qty integer;
alter table public.orders add column if not exists card_text text;
alter table public.orders add column if not exists print_cost integer not null default 0;
alter table public.orders add column if not exists discount_amount integer not null default 0;
alter table public.orders add column if not exists shipping_fee integer not null default 0;
alter table public.orders add column if not exists packaging_fee integer not null default 0;
alter table public.orders add column if not exists delivery_speed text not null default 'normal';
alter table public.orders add column if not exists due_ship_date date;
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists payment_method text not null default 'bank_transfer';
alter table public.orders add column if not exists payment_confirmed_at timestamptz;
alter table public.orders add column if not exists pdf_purge_at timestamptz;

-- 기존(v2) 주문은 이미 결제가 끝난 것으로 보고 print_cost 를 채워 둡니다.
update public.orders
set print_cost = page_unit_price * pages * copies
where print_cost = 0 and page_unit_price > 0;
update public.orders
set payment_status = 'confirmed', payment_confirmed_at = created_at
where payment_status = 'unpaid' and created_at < timestamptz '2026-11-27';

alter table public.orders drop constraint if exists orders_total_matches_prices;
alter table public.orders
  add constraint orders_total_matches_prices
  check (total_price = print_cost - discount_amount + binding_unit_price * copies + shipping_fee + packaging_fee);

alter table public.orders drop constraint if exists orders_product_check;
alter table public.orders
  add constraint orders_product_check check (product in ('print', 'card'));
alter table public.orders drop constraint if exists orders_card_paper_check;
alter table public.orders
  add constraint orders_card_paper_check
  check (card_paper is null or card_paper in ('coating', 'noncoating', 'imported'));
alter table public.orders drop constraint if exists orders_delivery_speed_check;
alter table public.orders
  add constraint orders_delivery_speed_check check (delivery_speed in ('normal', 'eco'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'awaiting_deposit', 'confirmed'));
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check check (payment_method in ('bank_transfer', 'kakaopay'));

-- 상태 이력의 check 도 5단계로
alter table public.order_status_history drop constraint if exists order_status_history_from_status_check;
alter table public.order_status_history drop constraint if exists order_status_history_to_status_check;
alter table public.order_status_history
  add constraint order_status_history_from_status_check
  check (from_status is null or from_status in ('received', 'printing', 'done', 'shipped', 'delivered', 'canceled'));
alter table public.order_status_history
  add constraint order_status_history_to_status_check
  check (to_status in ('received', 'printing', 'done', 'shipped', 'delivered', 'canceled'));

create index if not exists orders_payment_status_idx on public.orders (payment_status, created_at desc);
create index if not exists orders_due_ship_idx on public.orders (due_ship_date);
create index if not exists orders_pdf_purge_idx on public.orders (pdf_purge_at);

-- 2) 방문 수령 보관 사진 (주문당 최대 2장) ------------------------------------
create table if not exists public.pickup_photos (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  photo_url   text not null,
  caption     text,
  created_at  timestamptz not null default now()
);
-- 사진 2장 제한은 트리거로 지킵니다.
create or replace function public.copybox_limit_pickup_photos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.pickup_photos where order_id = new.order_id) >= 2 then
    raise exception '방문 수령 보관 사진은 주문당 최대 2장입니다.';
  end if;
  if not exists (
    select 1 from public.orders o where o.id = new.order_id and o.customer_id = new.customer_id
  ) then
    raise exception 'pickup_photos.customer_id does not match orders.customer_id';
  end if;
  return new;
end;
$$;

drop trigger if exists pickup_photos_limit on public.pickup_photos;
create trigger pickup_photos_limit
  before insert or update on public.pickup_photos
  for each row execute function public.copybox_limit_pickup_photos();

create index if not exists pickup_photos_order_idx on public.pickup_photos (order_id, created_at);
create index if not exists pickup_photos_customer_idx on public.pickup_photos (customer_id, created_at desc);

-- 3) 손님 ↔ 사장님 주문 메시지 ------------------------------------------------
create table if not exists public.order_messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  author      text not null check (author in ('customer', 'admin')),
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists order_messages_order_idx on public.order_messages (order_id, created_at);
create index if not exists order_messages_customer_idx on public.order_messages (customer_id, created_at desc);

-- 4) 리뷰 — 배송 완료 주문 1건당 1개 -----------------------------------------
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders (id) on delete restrict,
  customer_id   uuid not null references public.customers (id) on delete restrict,
  rating        integer not null check (rating between 1 and 5),
  body          text not null default '' check (char_length(body) <= 200),
  photo_url     text,
  visible       boolean not null default true,
  admin_reply   text,
  admin_reply_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists reviews_visible_created_idx on public.reviews (visible, created_at desc);
create index if not exists reviews_customer_idx on public.reviews (customer_id, created_at desc);

-- 배송 완료된 주문에만 리뷰를 남길 수 있게 DB에서도 검증합니다.
create or replace function public.copybox_check_review_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.orders o
    where o.id = new.order_id and o.customer_id = new.customer_id and o.status = 'delivered'
  ) then
    raise exception '리뷰는 배송 완료된 주문에만 남길 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_check_order on public.reviews;
create trigger reviews_check_order
  before insert on public.reviews
  for each row execute function public.copybox_check_review_order();

-- 5) 명함 주문 상세 (주문 1건에 명함 1건) ------------------------------------
create table if not exists public.business_cards (
  order_id     uuid primary key references public.orders (id) on delete restrict,
  customer_id  uuid not null references public.customers (id) on delete restrict,
  paper        text not null check (paper in ('coating', 'noncoating', 'imported')),
  quantity     integer not null check (quantity >= 200 and quantity % 200 = 0),
  width_mm     integer not null default 90,
  height_mm    integer not null default 50,
  card_text    text,
  file_path    text,
  created_at   timestamptz not null default now()
);
create index if not exists business_cards_customer_idx on public.business_cards (customer_id, created_at desc);

-- 6) RLS — 새 테이블도 같은 원칙(본인 것만 + 사장님 전체) ---------------------
alter table public.pickup_photos   enable row level security;
alter table public.order_messages  enable row level security;
alter table public.reviews         enable row level security;
alter table public.business_cards  enable row level security;

revoke delete on public.pickup_photos, public.order_messages, public.reviews
  from anon, authenticated;
-- 보관 사진은 사장님만 올리고 지울 수 있습니다(손님은 보기만).
grant delete on public.pickup_photos to authenticated;

drop policy if exists "pickup photos select own" on public.pickup_photos;
create policy "pickup photos select own"
  on public.pickup_photos for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = pickup_photos.order_id and c.auth_user_id = auth.uid()
    )
    or public.is_copybox_staff()
  );

drop policy if exists "pickup photos staff insert" on public.pickup_photos;
create policy "pickup photos staff insert"
  on public.pickup_photos for insert
  to authenticated
  with check (public.is_copybox_staff());

drop policy if exists "pickup photos staff delete" on public.pickup_photos;
create policy "pickup photos staff delete"
  on public.pickup_photos for delete
  to authenticated
  using (public.is_copybox_staff());

drop policy if exists "messages select own" on public.order_messages;
create policy "messages select own"
  on public.order_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = order_messages.order_id and c.auth_user_id = auth.uid()
    )
    or public.is_copybox_staff()
  );

drop policy if exists "messages insert own" on public.order_messages;
create policy "messages insert own"
  on public.order_messages for insert
  to authenticated
  with check (
    (
      author = 'customer'
      and exists (
        select 1 from public.orders o
        join public.customers c on c.id = o.customer_id
        where o.id = order_messages.order_id
          and c.auth_user_id = auth.uid()
          and o.customer_id = order_messages.customer_id
      )
    )
    or (author = 'admin' and public.is_copybox_staff())
  );

drop policy if exists "reviews select public" on public.reviews;
create policy "reviews select public"
  on public.reviews for select
  to anon, authenticated
  using (visible = true or public.is_copybox_staff());

drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own"
  on public.reviews for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = reviews.order_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "reviews update staff" on public.reviews;
create policy "reviews update staff"
  on public.reviews for update
  to authenticated
  using (public.is_copybox_staff())
  with check (public.is_copybox_staff());

drop policy if exists "business cards select own" on public.business_cards;
create policy "business cards select own"
  on public.business_cards for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = business_cards.order_id and c.auth_user_id = auth.uid()
    )
    or public.is_copybox_staff()
  );

drop policy if exists "business cards insert own" on public.business_cards;
create policy "business cards insert own"
  on public.business_cards for insert
  to authenticated
  with check (public.is_copybox_staff());

-- 7) 사장님 주문 목록은 결제가 끝난 주문만 (미결제·작성 중 이탈 제외) ----------
create or replace view public.copybox_paid_orders
with (security_invoker = true) as
select *
from public.orders
where payment_status <> 'unpaid';

grant select on public.copybox_paid_orders to authenticated;

comment on view public.copybox_paid_orders is
  '사장님 관리자 주문 목록 — 결제(입금 신청)까지 끝난 주문만. 미결제 초안·장바구니 이탈 건은 제외됩니다.';

-- 8) 회원 탈퇴(내 정보 삭제) RPC ---------------------------------------------
--    이름·연락처·주소·인쇄 PDF·보관 사진·메시지를 즉시 파기하고,
--    결제 기록(금액·일시)만 전자상거래법상 5년 비식별로 남깁니다.
create or replace function public.copybox_delete_my_data(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select auth_user_id into v_owner from public.customers where id = p_customer_id;
  if v_owner is distinct from auth.uid() and not public.is_copybox_staff() then
    raise exception '본인 정보만 삭제할 수 있습니다.';
  end if;

  update public.orders
    set address = null, customer_request = null, card_text = null, updated_at = now()
    where customer_id = p_customer_id;
  delete from public.order_files   where customer_id = p_customer_id;
  delete from public.pickup_photos where customer_id = p_customer_id;
  update public.order_messages set body = '(탈퇴로 삭제됨)' where customer_id = p_customer_id;
  update public.reviews set body = '탈퇴한 고객의 리뷰입니다.', photo_url = null where customer_id = p_customer_id;

  update public.customers
    set name = '탈퇴한 고객', phone = '00000000000', email = null,
        deleted_at = now(), updated_at = now()
    where id = p_customer_id;
end;
$$;

revoke all on function public.copybox_delete_my_data(uuid) from public;
grant execute on function public.copybox_delete_my_data(uuid) to authenticated;

-- 9) 14일 뒤 PDF 원본 자동 파기 (pg_cron 사용 시) -----------------------------
--    출고·배송 완료로 바뀌면 pdf_purge_at = now() + 14일 이 잡힙니다.
--    아래 함수를 매일 새벽에 돌리면 파기 대상 목록을 돌려줍니다.
--    (실제 파일 삭제는 Cloudflare R2 Worker 가 이 목록을 받아 수행)
create or replace function public.copybox_purge_due_pdfs()
returns table (order_id uuid, file_name text, storage_path text)
language sql
security definer
set search_path = public
as $$
  select f.order_id, f.file_name, f.storage_path
  from public.order_files f
  join public.orders o on o.id = f.order_id
  where o.pdf_purge_at is not null
    and o.pdf_purge_at <= now()
    and f.storage_path is not null;
$$;

revoke all on function public.copybox_purge_due_pdfs() from public;

-- pg_cron 예시 (확장 활성화 후 하루 한 번)
--   select cron.schedule('copybox-purge-pdfs', '0 4 * * *',
--     $$select public.copybox_purge_due_pdfs()$$);

-- 10) 관리자 인증 강화 메모 --------------------------------------------------
--   · 사장님 계정은 staff_members 로만 지정 (서비스 롤에서 등록)
--   · Supabase Authentication > Multi-Factor Authentication 에서 MFA(TOTP)를 켜고
--     사장님 계정에 등록 → 로그인 시 2단계 인증을 요구합니다.
--   · 관리자 화면은 staff_members 검사 + RLS 로 이중 보호, 파일은 Presigned URL 만 사용.

-- ============================================================================
-- v4 추가분 (2026-11-28) — 명함 지류·면도수 단가, 시안 확인(확정 전 인쇄 금지),
--                        시안 타임라인(card_proof_logs) 영구 보관
-- ============================================================================
-- 이미 v3 로 만든 프로젝트라면 이 블록만 실행하면 됩니다.

-- 1) 명함 옵션 확장 (지류 정식 품명 · 인쇄 면·도수) ---------------------------
alter table public.orders add column if not exists card_print text;
alter table public.orders add column if not exists card_info jsonb;

-- 예전 지류 구분(coating/noncoating/imported)을 제지사 품명 id 로 옮깁니다.
update public.orders set card_paper = 'snow250'   where card_paper = 'coating';
update public.orders set card_paper = 'snow300'   where card_paper = 'noncoating';
update public.orders set card_paper = 'banu250'   where card_paper = 'imported';

alter table public.orders drop constraint if exists orders_card_paper_check;
alter table public.orders
  add constraint orders_card_paper_check
  check (card_paper is null or card_paper in ('snow250', 'snow300', 'banu250', 'arte310', 'randevu240'));

alter table public.orders drop constraint if exists orders_card_print_check;
alter table public.orders
  add constraint orders_card_print_check
  check (card_print is null or card_print in ('single1', 'single4', 'double1', 'double4'));

comment on column public.orders.card_print is '명함 인쇄 면·도수 — 단면1도/단면4도/양면1도/양면4도';
comment on column public.orders.card_info is '명함에 넣는 고객 정보 JSON (성함·직함·회사·연락처·이메일·주소)';

-- business_cards(참고용 상세 표)의 지류 check 도 새 품명으로 맞춥니다.
alter table public.business_cards drop constraint if exists business_cards_paper_check;
alter table public.business_cards
  add constraint business_cards_paper_check
  check (paper in ('snow250', 'snow300', 'banu250', 'arte310', 'randevu240'));

-- 2) 시안 확인 상태 ----------------------------------------------------------
alter table public.orders add column if not exists proof_status text not null default 'confirmed';
alter table public.orders add column if not exists proof_revision_count integer not null default 0;
alter table public.orders add column if not exists proof_confirmed_at timestamptz;
alter table public.orders add column if not exists proof_confirmed_version integer;

-- 기존(v3 이전) 명함 주문은 시안 확인 단계가 없던 시절이므로 확정으로 두어 인쇄 흐름을 막지 않습니다.
--   새 명함 주문은 앱이 proof_status='not_requested' 로 넣습니다.
update public.orders
set proof_confirmed_at = coalesce(proof_confirmed_at, created_at)
where product = 'card' and proof_status = 'confirmed' and proof_confirmed_at is null;

alter table public.orders drop constraint if exists orders_proof_status_check;
alter table public.orders
  add constraint orders_proof_status_check
  check (proof_status in ('not_requested', 'requested', 'revision_requested', 'confirmed'));

alter table public.orders drop constraint if exists orders_proof_revision_limit;
alter table public.orders
  add constraint orders_proof_revision_limit check (proof_revision_count between 0 and 2);

comment on column public.orders.proof_status is '명함 시안 확인 상태 — 미요청/확인요청/수정요청/확정';
comment on column public.orders.proof_revision_count is '고객 시안 수정 요청 횟수 (최대 2회)';
comment on column public.orders.proof_confirmed_at is '고객이 [시안 확정(OK)]를 누른 시각 (수정 불가 기록)';

create index if not exists orders_proof_status_idx on public.orders (proof_status, created_at desc);

-- 3) 시안 타임라인 — 덮어쓰지 않고 쌓기만 하는 표 -------------------------
create table if not exists public.card_proof_logs (
  id                      uuid primary key default gen_random_uuid(),
  order_id                uuid not null references public.orders (id) on delete restrict,
  customer_id             uuid not null references public.customers (id) on delete restrict,
  kind                    text not null check (kind in ('note', 'proof', 'revision', 'confirm')),
  version                 integer check (version is null or version >= 1),
  body                    text,
  proof_url               text,
  proof_file_name         text,
  proof_file_type         text check (proof_file_type is null or proof_file_type in ('image', 'pdf')),
  confirmed_proof_version integer,
  actor                   text not null default 'system' check (actor in ('customer', 'admin', 'system')),
  created_at              timestamptz not null default now()
);

comment on table public.card_proof_logs is
  '명함 시안 타임라인 — 주문 메모·시안 버전(v1,v2,v3)·수정 요청 원문·확정 시각과 확정 시안을 덮어쓰지 않고 누적 보관 (분쟁 대비)';
comment on column public.card_proof_logs.proof_url is '시안 이미지/PDF — 운영은 Cloudflare R2 경로, 시안 모드는 data URL';
comment on column public.card_proof_logs.version is '올린 시안 버전. order_id 안에서 v1부터 증가하며 기존 행은 바꾸지 않습니다.';

create index if not exists card_proof_logs_order_idx on public.card_proof_logs (order_id, created_at);
create index if not exists card_proof_logs_customer_idx on public.card_proof_logs (customer_id, created_at desc);

-- 이미 쌓인 기록은 고치거나 지우지 않습니다 (append-only).
revoke update, delete on public.card_proof_logs from anon, authenticated;

-- 주문과 손님이 어긋나면 저장 거부
create or replace function public.copybox_check_card_proof_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.orders o where o.id = new.order_id and o.customer_id = new.customer_id
  ) then
    raise exception 'card_proof_logs.customer_id does not match orders.customer_id';
  end if;
  return new;
end;
$$;

drop trigger if exists card_proof_logs_check_owner on public.card_proof_logs;
create trigger card_proof_logs_check_owner
  before insert on public.card_proof_logs
  for each row execute function public.copybox_check_card_proof_owner();

-- 수정 요청은 주문당 2회까지 (DB에서도 막습니다)
create or replace function public.copybox_limit_card_revisions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'revision'
     and (select count(*) from public.card_proof_logs
          where order_id = new.order_id and kind = 'revision') >= 2 then
    raise exception '시안 수정은 최대 2회까지 가능합니다 (2회 초과 수정 불가).';
  end if;
  return new;
end;
$$;

drop trigger if exists card_proof_logs_limit_revisions on public.card_proof_logs;
create trigger card_proof_logs_limit_revisions
  before insert on public.card_proof_logs
  for each row execute function public.copybox_limit_card_revisions();

-- 확정된 주문에는 새 시안을 올릴 수 없습니다.
create or replace function public.copybox_block_proof_after_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'proof'
     and exists (select 1 from public.orders o where o.id = new.order_id and o.proof_status = 'confirmed') then
    raise exception '고객이 시안을 확정한 주문에는 새 시안을 올릴 수 없습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists card_proof_logs_block_after_confirm on public.card_proof_logs;
create trigger card_proof_logs_block_after_confirm
  before insert on public.card_proof_logs
  for each row execute function public.copybox_block_proof_after_confirm();

-- 4) 시안 확정 전에는 명함 주문을 인쇄중 이후로 넘기지 못합니다 -----------------
create or replace function public.copybox_require_card_proof()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.product = 'card'
     and new.status in ('printing', 'done', 'shipped', 'delivered')
     and new.proof_status <> 'confirmed' then
    raise exception '명함 주문은 고객이 [시안 확정(OK)]를 누른 뒤에 인쇄를 시작할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_require_card_proof on public.orders;
create trigger orders_require_card_proof
  before update on public.orders
  for each row execute function public.copybox_require_card_proof();

-- 5) RLS — 본인·사장님만 읽기, INSERT 는 사장님(시안·메모)과 RPC(수정·확정)만 ------
alter table public.card_proof_logs enable row level security;

drop policy if exists "card proof logs select own" on public.card_proof_logs;
create policy "card proof logs select own"
  on public.card_proof_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = card_proof_logs.order_id and c.auth_user_id = auth.uid()
    )
    or public.is_copybox_staff()
  );

drop policy if exists "card proof logs staff insert" on public.card_proof_logs;
create policy "card proof logs staff insert"
  on public.card_proof_logs for insert
  to authenticated
  with check (public.is_copybox_staff() and actor = 'admin');

-- 손님의 수정 요청·확정은 아래 RPC(security definer)만 수행합니다.
--   → 주문 행(proof_status)과 기록을 한 번에, 본인 확인 후에만 저장합니다.

-- 6) 고객 [수정 요청] RPC ---------------------------------------------------
create or replace function public.copybox_request_card_revision(p_order_id uuid, p_body text)
returns public.card_proof_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order  public.orders%rowtype;
  v_owner  uuid;
  v_count  integer;
  v_version integer;
  v_log    public.card_proof_logs%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception '주문을 찾을 수 없습니다.'; end if;
  select auth_user_id into v_owner from public.customers where id = v_order.customer_id;
  if v_owner is distinct from auth.uid() and not public.is_copybox_staff() then
    raise exception '본인 주문에만 수정 요청을 할 수 있습니다.';
  end if;
  if v_order.product <> 'card' then raise exception '명함 주문에서만 시안 수정을 요청할 수 있습니다.'; end if;
  if v_order.proof_status = 'confirmed' then
    raise exception '이미 시안을 확정한 주문입니다. 확정 후에는 수정·취소·환불이 불가합니다.';
  end if;
  if v_order.proof_status = 'not_requested' then
    raise exception '아직 시안이 올라오지 않았습니다.';
  end if;
  if coalesce(btrim(p_body), '') = '' then raise exception '수정하실 내용을 적어 주세요.'; end if;

  select count(*) into v_count from public.card_proof_logs
   where order_id = p_order_id and kind = 'revision';
  if v_count >= 2 then raise exception '시안 수정은 최대 2회까지 가능합니다 (2회 초과 수정 불가).'; end if;

  select coalesce(max(version), 0) into v_version from public.card_proof_logs
   where order_id = p_order_id and kind = 'proof';

  insert into public.card_proof_logs (order_id, customer_id, kind, version, body, actor)
  values (p_order_id, v_order.customer_id, 'revision', nullif(v_version, 0), btrim(p_body), 'customer')
  returning * into v_log;

  update public.orders
     set proof_revision_count = v_count + 1,
         proof_status = 'revision_requested'
   where id = p_order_id;

  return v_log;
end;
$$;

revoke all on function public.copybox_request_card_revision(uuid, text) from public;
grant execute on function public.copybox_request_card_revision(uuid, text) to authenticated;

-- 7) 고객 [시안 확정(OK)] RPC — 확정 시각·확정 시안을 그대로 보관 ---------------
create or replace function public.copybox_confirm_card_proof(p_order_id uuid)
returns public.card_proof_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order  public.orders%rowtype;
  v_owner  uuid;
  v_proof  public.card_proof_logs%rowtype;
  v_log    public.card_proof_logs%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception '주문을 찾을 수 없습니다.'; end if;
  select auth_user_id into v_owner from public.customers where id = v_order.customer_id;
  if v_owner is distinct from auth.uid() and not public.is_copybox_staff() then
    raise exception '본인 주문의 시안만 확정할 수 있습니다.';
  end if;
  if v_order.product <> 'card' then raise exception '명함 주문에서만 시안을 확정할 수 있습니다.'; end if;
  if v_order.proof_status = 'confirmed' then raise exception '이미 시안을 확정한 주문입니다.'; end if;

  select * into v_proof from public.card_proof_logs
   where order_id = p_order_id and kind = 'proof'
   order by version desc nulls last, created_at desc limit 1;
  if not found then raise exception '아직 확인하실 시안이 없습니다.'; end if;

  insert into public.card_proof_logs
    (order_id, customer_id, kind, version, body, proof_url, proof_file_name, proof_file_type, confirmed_proof_version, actor)
  values
    (p_order_id, v_order.customer_id, 'confirm', v_proof.version,
     '고객 시안 확정 (v' || coalesce(v_proof.version, 1) || ')',
     v_proof.proof_url, v_proof.proof_file_name, v_proof.proof_file_type,
     v_proof.version, 'customer')
  returning * into v_log;

  update public.orders
     set proof_status = 'confirmed',
         proof_confirmed_at = now(),
         proof_confirmed_version = v_proof.version,
         due_ship_date = (now() + interval '3 days')::date
   where id = p_order_id;

  return v_log;
end;
$$;

revoke all on function public.copybox_confirm_card_proof(uuid) from public;
grant execute on function public.copybox_confirm_card_proof(uuid) to authenticated;

-- 8) 회원 탈퇴 RPC 보완 — 명함 정보·시안 파일도 파기 (기록만 남김) -----------------
create or replace function public.copybox_delete_my_data(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select auth_user_id into v_owner from public.customers where id = p_customer_id;
  if v_owner is distinct from auth.uid() and not public.is_copybox_staff() then
    raise exception '본인 정보만 삭제할 수 있습니다.';
  end if;

  update public.orders
    set address = null, customer_request = null, card_text = null, card_info = null, updated_at = now()
    where customer_id = p_customer_id;
  delete from public.order_files   where customer_id = p_customer_id;
  delete from public.pickup_photos where customer_id = p_customer_id;
  update public.order_messages set body = '(탈퇴로 삭제됨)' where customer_id = p_customer_id;
  update public.reviews set body = '탈퇴한 고객의 리뷰입니다.', photo_url = null where customer_id = p_customer_id;

  -- 시안 파일에도 성함·연락처가 들어가므로 파일은 지우고, 타임라인 기록만 남깁니다.
  update public.card_proof_logs
    set proof_url = null,
        proof_file_name = null,
        body = case when kind in ('note', 'revision') then '(탈퇴로 삭제됨)' else body end
    where customer_id = p_customer_id;

  update public.customers
    set name = '탈퇴한 고객', phone = '00000000000', email = null,
        deleted_at = now(), updated_at = now()
    where id = p_customer_id;
end;
$$;

revoke all on function public.copybox_delete_my_data(uuid) from public;
grant execute on function public.copybox_delete_my_data(uuid) to authenticated;

-- 9) 단가·배송 메모 ---------------------------------------------------------
-- · 명함 판매가 = 지류 기준가(단면 4도) + 면·도수 차액 → 앱 src/config/business-card.ts 가 단일 출처.
-- · 명함 배송비 3,000원 (포장재비 없음) / A4 출력 택배 4,000원 + 포장재비 1,000원.
--   orders_total_matches_prices 는 shipping_fee + packaging_fee 를 그대로 쓰므로 두 상품 모두 만족합니다.
-- · 여유 제작 특가(인쇄비 10% 할인)는 A4 출력 전용입니다. 명함 주문은 delivery_speed='normal', discount_amount=0.
