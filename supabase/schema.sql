-- 카피박스(COPYBOX) 주문 접수 테이블 — Supabase 연동 준비용 (실행 전 검토하세요)
-- 파일은 Storage 버킷(order-files)에 올리고 file_path에 저장하는 구성을 권장합니다.

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_no      text not null unique,               -- 예: CB-261124-482071
  created_at    timestamptz not null default now(),

  -- 고객
  customer_name text not null,
  phone         text not null,
  member_id     uuid references auth.users (id) on delete set null,
  member_label  text,                               -- '비회원 주문' 또는 '홍길동 · 카카오 로그인'

  -- 수령
  pickup        text not null check (pickup in ('store', 'delivery')),
  address       text,
  notes         text,

  -- 파일
  file_name     text,
  file_path     text,                               -- Storage 객체 경로
  file_pages    integer,
  auto_detected boolean not null default false,

  -- 인쇄 옵션 (견적 시점 값 스냅샷)
  paper_size    text not null check (paper_size in ('A4', 'A3', 'B4')),
  color_mode    text not null check (color_mode in ('mono', 'color')),
  sides         text not null check (sides in ('single', 'double')),
  pages         integer not null check (pages > 0),
  copies        integer not null check (copies > 0),
  binding       text not null check (binding in ('none', 'coil', 'perfect', 'saddle', 'coating')),
  unit_price    integer not null,                   -- 원/면
  print_cost    integer not null,
  binding_cost  integer not null,
  total_price   integer not null,

  status        text not null default 'received'
                check (status in ('received', 'confirmed', 'printing', 'ready', 'done', 'canceled'))
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_phone_idx on public.orders (phone);

alter table public.orders enable row level security;

-- 비회원도 접수할 수 있게 INSERT는 익명 허용, 조회는 본인/매장 관리자만.
create policy "anyone can place an order"
  on public.orders for insert
  to anon, authenticated
  with check (true);

create policy "members read own orders"
  on public.orders for select
  to authenticated
  using (member_id = auth.uid());

-- 매장 관리자(서비스 롤 키 또는 별도 role)는 모든 주문을 조회·변경합니다.
