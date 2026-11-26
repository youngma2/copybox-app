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
