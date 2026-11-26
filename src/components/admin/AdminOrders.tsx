import { useMemo, useState } from 'react';
import { won } from '../../lib/format';
import { formatOrderDate, formatPhone } from '../../lib/order';
import { PICKUP_LABEL } from '../../config/delivery';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, ORDER_STATUS_FLOW, ORDER_STATUS_LABEL } from '../../config/status';
import type { OrderStatus } from '../../config/status';
import type { OrderWithCustomer, StatusHistory } from '../../lib/storage/types';
import { describeOrderOptions, formatDateLabel } from '../../lib/describe';
import StatusBadge, { PaymentBadge } from '../StatusBadge';
import PickupPhotos from '../PickupPhotos';
import OrderMessages from '../OrderMessages';
import { IconFile, IconRefresh, IconUser } from '../Icons';

interface AdminOrdersProps {
  orders: OrderWithCustomer[];
  history: StatusHistory[];
  loading: boolean;
  storeMode: 'demo' | 'supabase';
  busyOrderId: string | null;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onConfirmPayment: (orderId: string) => void;
  onAddPhoto: (orderId: string, dataUrl: string) => Promise<void>;
  onRemovePhoto: (orderId: string, photoId: string) => Promise<void>;
  onRefresh: () => void;
  onSeed: () => void;
  onNotice: (message: string) => void;
}

const ALL = 'all';

export default function AdminOrders({
  orders,
  history,
  loading,
  storeMode,
  busyOrderId,
  onStatusChange,
  onConfirmPayment,
  onAddPhoto,
  onRemovePhoto,
  onRefresh,
  onSeed,
  onNotice,
}: AdminOrdersProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(
    () => ({
      total: orders.length,
      awaiting: orders.filter((order) => order.paymentStatus === 'awaiting_deposit').length,
      printing: orders.filter((order) => order.status === 'printing').length,
      shipping: orders.filter((order) => order.status === 'done' || order.status === 'shipped').length,
      delivered: orders.filter((order) => order.status === 'delivered').length,
    }),
    [orders],
  );

  const customerOptions = useMemo(() => {
    const map = new Map<string, { customer: OrderWithCustomer['customer']; count: number }>();
    orders.forEach((order) => {
      const existing = map.get(order.customerId);
      if (existing) existing.count += 1;
      else map.set(order.customerId, { customer: order.customer, count: 1 });
    });
    return Array.from(map.entries())
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (selectedCustomerId !== ALL && order.customerId !== selectedCustomerId) return false;
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (!needle) return true;
      const name = order.customer?.name?.toLowerCase() ?? '';
      const phone = order.customer?.phone ?? '';
      return (
        order.orderNumber.toLowerCase().includes(needle) ||
        name.includes(needle) ||
        phone.includes(needle.replace(/[^0-9]/g, ''))
      );
    });
  }, [orders, selectedCustomerId, statusFilter, query]);

  const historyByOrder = useMemo(() => {
    const map = new Map<string, StatusHistory[]>();
    history.forEach((entry) => {
      const list = map.get(entry.orderId) ?? [];
      list.push(entry);
      map.set(entry.orderId, list);
    });
    return map;
  }, [history]);

  return (
    <div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { key: 'total', label: '전체 주문', value: counts.total, tone: 'text-ink-900' },
          { key: 'awaiting', label: '입금 대기', value: counts.awaiting, tone: 'text-amber-600' },
          { key: 'printing', label: '인쇄중', value: counts.printing, tone: 'text-brand-700' },
          { key: 'shipping', label: '출고 준비·출고', value: counts.shipping, tone: 'text-violet-600' },
          { key: 'delivered', label: '배송 완료', value: counts.delivered, tone: 'text-mint' },
        ].map((item) => (
          <div key={item.key} data-testid={`admin-stat-${item.key}`} className="card px-3 py-3">
            <dt className="text-[10px] font-semibold text-ink-400">{item.label}</dt>
            <dd className={`num mt-0.5 text-[20px] font-extrabold ${item.tone}`}>
              {item.value}
              <span className="ml-0.5 text-[11px] font-bold text-ink-400">건</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          data-testid="admin-search"
          placeholder="접수번호 · 손님 이름 · 연락처 검색"
          className="field min-w-0 flex-1 !py-2 !text-[12px] sm:max-w-xs"
          aria-label="주문 검색"
        />
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            data-testid="admin-status-filter-all"
            aria-pressed={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
              statusFilter === 'all' ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-600'
            }`}
          >
            전체 상태
          </button>
          {ORDER_STATUS_FLOW.map((status) => (
            <button
              key={status}
              type="button"
              data-testid={`admin-status-filter-${status}`}
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                statusFilter === status ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-600'
              }`}
            >
              {ORDER_STATUS_LABEL[status]}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-testid="admin-refresh"
          onClick={onRefresh}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[12px] font-semibold text-ink-700 transition hover:bg-ink-50"
        >
          <IconRefresh className="h-4 w-4" />
          새로고침
        </button>
      </div>

      <div className="mt-3">
        <p className="text-[12px] font-bold text-ink-800">손님별 보기</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            data-testid="admin-customer-all"
            aria-pressed={selectedCustomerId === ALL}
            onClick={() => setSelectedCustomerId(ALL)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
              selectedCustomerId === ALL
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
            }`}
          >
            전체 손님 {orders.length}건
          </button>
          {customerOptions.map((option) => {
            const name = option.customer?.name ?? '알 수 없음';
            const selected = selectedCustomerId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                data-testid={`admin-customer-${option.id}`}
                aria-pressed={selected}
                onClick={() => setSelectedCustomerId(option.id)}
                className={`max-w-[220px] shrink-0 truncate rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                  selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                }`}
              >
                {name} · {option.count}건
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 rounded-xl border border-ink-100 bg-white px-4 py-6 text-center text-[12px] text-ink-400">
          주문을 불러오는 중…
        </p>
      ) : visibleOrders.length === 0 ? (
        <div className="card mt-5 px-5 py-10 text-center">
          <p className="text-[14px] font-bold text-ink-800">조건에 맞는 주문이 없어요</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-600">
            결제가 끝난 주문만 이 화면에 쌓입니다. 미결제·작성 중 이탈 건은 표시되지 않아요.
            {storeMode === 'demo' ? ' 시안 확인용 예시 주문을 넣어 볼 수 있습니다.' : ''}
          </p>
          {storeMode === 'demo' && (
            <button type="button" data-testid="admin-seed" onClick={onSeed} className="btn-primary mt-4 !py-3">
              시안 예시 주문 넣기
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-3" data-testid="admin-order-list">
          {visibleOrders.map((order) => (
            <AdminOrderCard
              key={order.id}
              order={order}
              history={historyByOrder.get(order.id) ?? []}
              busy={busyOrderId === order.id}
              onStatusChange={onStatusChange}
              onConfirmPayment={onConfirmPayment}
              onAddPhoto={onAddPhoto}
              onRemovePhoto={onRemovePhoto}
              onNotice={onNotice}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminOrderCard({
  order,
  history,
  busy,
  onStatusChange,
  onConfirmPayment,
  onAddPhoto,
  onRemovePhoto,
  onNotice,
}: {
  order: OrderWithCustomer;
  history: StatusHistory[];
  busy: boolean;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onConfirmPayment: (orderId: string) => void;
  onAddPhoto: (orderId: string, dataUrl: string) => Promise<void>;
  onRemovePhoto: (orderId: string, photoId: string) => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const isEco = order.deliverySpeed === 'eco';
  return (
    <li data-testid="admin-order" data-order-number={order.orderNumber} className="card min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink-100 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <p className="break-all text-[14px] font-extrabold text-ink-900">{order.orderNumber}</p>
          <p className="num mt-0.5 text-[11px] text-ink-400">{formatOrderDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {isEco && (
            <span
              data-testid="admin-eco-badge"
              className="rounded-full bg-mint/10 px-2 py-1 text-[10px] font-bold text-mint"
              title={`여유특가 출고마감일 ${order.dueShipDate}`}
            >
              🌿 여유특가 · 출고마감 {formatDateLabel(order.dueShipDate)}
            </span>
          )}
          <PaymentBadge status={order.paymentStatus} />
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="space-y-3 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <span className="flex min-w-0 items-center gap-1.5 font-bold text-ink-900">
            <IconUser className="h-3.5 w-3.5 shrink-0 text-ink-400" />
            <span className="truncate">{order.customer?.name ?? '알 수 없음'}</span>
          </span>
          <span className="num text-ink-600">{order.customer ? formatPhone(order.customer.phone) : '-'}</span>
          <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
            {PICKUP_LABEL[order.pickup]}
          </span>
          <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
            {PAYMENT_METHOD_LABEL[order.paymentMethod]}
          </span>
        </div>

        <div>
          <p data-testid="admin-order-options" className="break-words text-[12px] font-semibold text-ink-800">
            {describeOrderOptions(order)}
          </p>
          {order.cardText && (
            <p className="mt-1 break-words whitespace-pre-line rounded-lg bg-sun/10 px-2 py-1.5 text-[11px] text-ink-700">
              명함 문구 · {order.cardText}
            </p>
          )}
        </div>

        <dl className="grid gap-2 text-[11px] sm:grid-cols-2">
          <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
            <dt className="font-semibold text-ink-400">요청사항</dt>
            <dd className="mt-0.5 break-words leading-relaxed text-ink-800">{order.customerRequest ?? '없음'}</dd>
          </div>
          <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
            <dt className="font-semibold text-ink-400">첨부파일 · 자동 파기</dt>
            <dd className="mt-0.5 break-words leading-relaxed text-ink-800">
              {order.files.length > 0 ? (
                order.files.map((file) => (
                  <span key={file.id} className="flex min-w-0 items-start gap-1.5">
                    <IconFile className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="min-w-0 break-all">
                      {file.fileName}
                      {file.pageCount ? ` · ${file.pageCount}페이지` : ''}
                    </span>
                  </span>
                ))
              ) : (
                '첨부 없음'
              )}
              <span className="mt-1 block text-[10px] text-ink-400">
                {order.pdfPurgeAt
                  ? `${formatDateLabel(order.pdfPurgeAt)} PDF 원본 자동 파기 예정`
                  : '출고·배송 완료 후 14일 뒤 원본을 파기합니다.'}
              </span>
            </dd>
          </div>
        </dl>

        <div className="rounded-lg bg-white ring-1 ring-ink-100">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 text-[11px] sm:grid-cols-4">
            <span className="flex justify-between gap-1 sm:flex-col">
              <span className="text-ink-400">인쇄비</span>
              <span className="num font-semibold text-ink-800">{won(order.printCost)}</span>
            </span>
            <span className="flex justify-between gap-1 sm:flex-col">
              <span className="text-ink-400">제본비</span>
              <span className="num font-semibold text-ink-800">{won(order.bindingUnitPrice * order.copies)}</span>
            </span>
            <span className="flex justify-between gap-1 sm:flex-col">
              <span className="text-ink-400">할인</span>
              <span className="num font-semibold text-mint">-{won(order.discount)}</span>
            </span>
            <span className="flex justify-between gap-1 sm:flex-col">
              <span className="text-ink-400">택배+포장</span>
              <span className="num font-semibold text-ink-800">{won(order.shippingFee + order.packagingFee)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-ink-800">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</p>
            <p className="num mt-0.5 text-[10px] text-ink-400">
              {order.paymentConfirmedAt
                ? `입금 확인 ${formatOrderDate(order.paymentConfirmedAt)}`
                : '입금을 확인하면 눌러 주세요 · 확인 시각이 손님 주문 이력에 함께 저장됩니다.'}
            </p>
          </div>
          <button
            type="button"
            data-testid={`admin-payment-${order.orderNumber}`}
            disabled={order.paymentStatus === 'confirmed' || busy}
            onClick={() => onConfirmPayment(order.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition ${
              order.paymentStatus === 'confirmed'
                ? 'bg-mint/10 text-mint'
                : 'bg-ink-900 text-white hover:bg-ink-800 disabled:opacity-40'
            }`}
          >
            {order.paymentStatus === 'confirmed' ? '입금 확인 완료' : '입금 확인 완료로 표시'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5" role="group" aria-label={`${order.orderNumber} 상태 변경`}>
          {ORDER_STATUS_FLOW.map((status) => {
            const active = order.status === status;
            return (
              <button
                key={status}
                type="button"
                data-testid={`admin-status-${order.orderNumber}-${status}`}
                aria-pressed={active}
                disabled={busy || active}
                onClick={() => onStatusChange(order.id, status)}
                className={`rounded-xl border px-1 py-2 text-[11px] font-bold transition ${
                  active
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-40'
                }`}
              >
                {ORDER_STATUS_LABEL[status]}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-ink-400">
          출고·배송 완료로 바꾸면 PDF 원본 파기 예정일(14일 뒤)이 자동으로 잡힙니다.
        </p>

        <PickupPhotos
          photos={order.pickupPhotos}
          editable
          onAdd={(dataUrl) => onAddPhoto(order.id, dataUrl)}
          onRemove={(photoId) => onRemovePhoto(order.id, photoId)}
        />

        <OrderMessages orderId={order.id} role="admin" onNotice={onNotice} />

        <details className="rounded-lg border border-ink-100 bg-white px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-ink-600">
            상태·입금 변경 이력 {history.length}건
          </summary>
          <ol className="mt-2 space-y-1.5">
            {history.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-ink-500">
                <span>
                  {entry.fromStatus && entry.fromStatus !== entry.toStatus
                    ? `${ORDER_STATUS_LABEL[entry.fromStatus]} → `
                    : ''}
                  <strong className="font-bold text-ink-800">
                    {entry.note?.includes('입금') ? entry.note : ORDER_STATUS_LABEL[entry.toStatus]}
                  </strong>
                  {entry.note && !entry.note.includes('입금') ? ` · ${entry.note}` : ''}
                </span>
                <span className="num shrink-0 text-ink-400">{formatOrderDate(entry.createdAt)}</span>
              </li>
            ))}
          </ol>
        </details>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="break-all text-[10px] text-ink-400">
            고객 ID <span className="num">{order.customerId}</span>
          </p>
          <p data-testid="admin-order-total" className="num text-[15px] font-extrabold text-ink-900">
            {won(order.totalPrice)}
          </p>
        </div>
      </div>
    </li>
  );
}
