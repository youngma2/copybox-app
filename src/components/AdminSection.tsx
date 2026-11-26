import { useState } from 'react';
import type { Review } from '../lib/storage/types';
import type { Customer, OrderWithCustomer, StatusHistory } from '../lib/storage/types';
import type { OrderStatus } from '../config/status';
import AdminOrders from './admin/AdminOrders';
import AdminCustomers from './admin/AdminCustomers';
import AdminDashboard from './admin/AdminDashboard';
import { AdminReviews } from './Reviews';
import { IconShield } from './Icons';

interface AdminSectionProps {
  orders: OrderWithCustomer[];
  customers: Customer[];
  history: StatusHistory[];
  reviews: Review[];
  loading: boolean;
  storeMode: 'demo' | 'supabase';
  busyOrderId: string | null;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onConfirmPayment: (orderId: string) => void;
  onAddPhoto: (orderId: string, dataUrl: string) => Promise<void>;
  onRemovePhoto: (orderId: string, photoId: string) => Promise<void>;
  onRefresh: () => void;
  onSeed: () => void;
  onSetReviewVisibility: (reviewId: string, visible: boolean) => void;
  onReplyReview: (reviewId: string, reply: string) => void;
  onNotice: (message: string) => void;
}

type AdminTab = 'orders' | 'customers' | 'dashboard' | 'reviews';

const TABS: { id: AdminTab; label: string; short: string }[] = [
  { id: 'orders', label: '주문 관리', short: '주문' },
  { id: 'customers', label: '고객 DB', short: '고객' },
  { id: 'dashboard', label: '매출 대시보드', short: '매출' },
  { id: 'reviews', label: '리뷰 관리', short: '리뷰' },
];

export default function AdminSection({
  orders,
  customers,
  history,
  reviews,
  loading,
  storeMode,
  busyOrderId,
  onStatusChange,
  onConfirmPayment,
  onAddPhoto,
  onRemovePhoto,
  onRefresh,
  onSeed,
  onSetReviewVisibility,
  onReplyReview,
  onNotice,
}: AdminSectionProps) {
  const [tab, setTab] = useState<AdminTab>('orders');

  return (
    <section className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.18em] text-brand-600">ADMIN</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">사장님 관리자</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
            결제가 끝난 주문만 모아 봅니다. 주문·입금·보관 사진·메시지·고객 DB·매출을 한곳에서 관리하세요.
          </p>
        </div>
        <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-400">
          {storeMode === 'demo' ? '시안 · 이 브라우저에 저장된 주문' : 'Supabase · 사장님 계정(RLS)'}
        </span>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
        <IconShield className="mt-px h-4 w-4 shrink-0" />
        <p>
          운영 전환 시에는 단순 PIN 대신 <strong className="font-bold">사장님 계정 인증 + 2단계 인증(MFA)</strong>과
          <code className="mx-0.5 rounded bg-white/70 px-1">staff_members</code> 권한 검증을 씁니다. 지금은 완성 전 테스트를 위해
          관리자 탭을 열어 두었습니다.
        </p>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-ink-100 pb-px" role="tablist" aria-label="관리자 메뉴">
        {TABS.map((item) => {
          const active = tab === item.id;
          const count =
            item.id === 'orders' ? orders.length : item.id === 'customers' ? customers.length : item.id === 'reviews' ? reviews.length : 0;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`admin-tab-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-t-lg border-b-2 px-3 py-2.5 text-[12px] font-bold transition ${
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-ink-500 hover:bg-ink-50 hover:text-ink-800'
              }`}
            >
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.short}</span>
              {count > 0 && <span className="num ml-1 text-[10px] font-semibold text-ink-400">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {tab === 'orders' && (
          <AdminOrders
            orders={orders}
            history={history}
            loading={loading}
            storeMode={storeMode}
            busyOrderId={busyOrderId}
            onStatusChange={onStatusChange}
            onConfirmPayment={onConfirmPayment}
            onAddPhoto={onAddPhoto}
            onRemovePhoto={onRemovePhoto}
            onRefresh={onRefresh}
            onSeed={onSeed}
            onNotice={onNotice}
          />
        )}
        {tab === 'customers' && <AdminCustomers customers={customers} orders={orders} onNotice={onNotice} />}
        {tab === 'dashboard' && <AdminDashboard orders={orders} />}
        {tab === 'reviews' && (
          <AdminReviews
            reviews={reviews}
            customers={customers}
            onVisibility={onSetReviewVisibility}
            onReply={onReplyReview}
          />
        )}
      </div>
    </section>
  );
}
