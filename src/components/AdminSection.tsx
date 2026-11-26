import { useMemo, useState } from 'react';
import { won } from '../lib/format';
import { formatOrderDate, formatPhone, PICKUP_LABEL } from '../lib/order';
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABEL,
  type Customer,
  type OrderStatus,
  type OrderWithCustomer,
  type StatusHistory,
  type StoreMode,
} from '../lib/store';
import { describeOrderOptions } from '../lib/describe';
import StatusBadge from './StatusBadge';
import { IconFile, IconRefresh, IconUser } from './Icons';

interface AdminSectionProps {
  orders: OrderWithCustomer[];
  customers: Customer[];
  history: StatusHistory[];
  loading: boolean;
  storeMode: StoreMode;
  busyOrderId: string | null;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onRefresh: () => void;
  onSeed: () => void;
}

const ALL = 'all';

export default function AdminSection({
  orders,
  customers,
  history,
  loading,
  storeMode,
  busyOrderId,
  onStatusChange,
  onRefresh,
  onSeed,
}: AdminSectionProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(ALL);

  const counts = useMemo(() => {
    return {
      total: orders.length,
      received: orders.filter((order) => order.status === 'received').length,
      printing: orders.filter((order) => order.status === 'printing').length,
      done: orders.filter((order) => order.status === 'done').length,
    };
  }, [orders]);

  const customerOptions = useMemo(() => {
    const map = new Map<string, { customer: Customer | null; count: number }>();
    customers.forEach((customer) => map.set(customer.id, { customer, count: 0 }));
    orders.forEach((order) => {
      const existing = map.get(order.customerId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(order.customerId, { customer: order.customer, count: 1 });
      }
    });
    return Array.from(map.entries())
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.count - a.count);
  }, [customers, orders]);

  const visibleOrders = useMemo(
    () => (selectedCustomerId === ALL ? orders : orders.filter((order) => order.customerId === selectedCustomerId)),
    [orders, selectedCustomerId],
  );

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
    <section className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.18em] text-brand-600">ADMIN</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">관리자</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
            접수된 주문 전체와 손님별 과거 이력을 모아 보고, 상태를 접수됨 → 인쇄중 → 완료로 바꿀 수 있습니다.
            실제 매장에서는 사장님 계정(RLS)만 이 화면에 접근할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-400">
            {storeMode === 'demo' ? '시안 · 이 브라우저에 저장된 주문' : 'Supabase · 사장님 계정'}
          </span>
          <button
            type="button"
            data-testid="admin-refresh"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[12px] font-semibold text-ink-700 transition hover:bg-ink-50"
          >
            <IconRefresh className="h-4 w-4" />
            새로고침
          </button>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { key: 'total', label: '전체 주문', value: counts.total, tone: 'text-ink-900' },
          { key: 'received', label: '접수됨', value: counts.received, tone: 'text-brand-700' },
          { key: 'printing', label: '인쇄중', value: counts.printing, tone: 'text-amber-600' },
          { key: 'done', label: '완료', value: counts.done, tone: 'text-mint' },
        ].map((item) => (
          <div key={item.key} data-testid={`admin-stat-${item.key}`} className="card px-3 py-3 sm:px-4">
            <dt className="text-[10px] font-semibold text-ink-400">{item.label}</dt>
            <dd className={`num mt-0.5 text-[20px] font-extrabold ${item.tone}`}>
              {item.value}
              <span className="ml-0.5 text-[11px] font-bold text-ink-400">건</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
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
                  selected
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                }`}
              >
                {name} · {option.count}건
              </button>
            );
          })}
        </div>
      </div>

      {selectedCustomerId !== ALL && (
        <CustomerSummary
          customer={customerOptions.find((option) => option.id === selectedCustomerId)?.customer ?? null}
          orders={orders.filter((order) => order.customerId === selectedCustomerId)}
        />
      )}

      {loading ? (
        <p className="mt-6 rounded-xl border border-ink-100 bg-white px-4 py-6 text-center text-[12px] text-ink-400">
          주문을 불러오는 중…
        </p>
      ) : visibleOrders.length === 0 ? (
        <div className="card mt-5 px-5 py-10 text-center">
          <p className="text-[14px] font-bold text-ink-800">아직 접수된 주문이 없어요</p>
          <p className="mt-1.5 text-[12px] text-ink-600">
            손님이 주문을 접수하면 이 화면에 바로 쌓입니다.
            {storeMode === 'demo' ? ' 시안 확인용 예시 주문을 넣어 볼 수 있어요.' : ''}
          </p>
          {storeMode === 'demo' && (
            <button type="button" data-testid="admin-seed" onClick={onSeed} className="btn-primary mt-4 !py-3">
              시안 예시 주문 넣기
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-3" data-testid="admin-order-list">
          {visibleOrders.map((order) => {
            const orderHistory = historyByOrder.get(order.id) ?? [];
            const busy = busyOrderId === order.id;
            return (
              <li
                key={order.id}
                data-testid="admin-order"
                data-order-number={order.orderNumber}
                className="card min-w-0 overflow-hidden"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink-100 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="break-all text-[14px] font-extrabold text-ink-900">{order.orderNumber}</p>
                    <p className="num mt-0.5 text-[11px] text-ink-400">{formatOrderDate(order.createdAt)}</p>
                  </div>
                  <StatusBadge status={order.status} />
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
                  </div>
                  <p data-testid="admin-order-options" className="break-words text-[12px] font-semibold text-ink-800">
                    {describeOrderOptions(order)}
                  </p>

                  <dl className="grid gap-2 text-[11px] sm:grid-cols-2">
                    <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                      <dt className="font-semibold text-ink-400">요청사항</dt>
                      <dd className="mt-0.5 break-words leading-relaxed text-ink-800">{order.customerRequest ?? '없음'}</dd>
                    </div>
                    <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                      <dt className="font-semibold text-ink-400">첨부파일</dt>
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
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <p className="break-all text-[10px] text-ink-400">
                      고객 ID <span className="num">{order.customerId}</span>
                    </p>
                    <p data-testid="admin-order-total" className="num text-[15px] font-extrabold text-ink-900">
                      {won(order.totalPrice)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`${order.orderNumber} 상태 변경`}>
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
                          className={`rounded-xl border px-1 py-2 text-[12px] font-bold transition ${
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

                  <details className="rounded-lg border border-ink-100 bg-white px-3 py-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-ink-600">
                      상태 변경 이력 {orderHistory.length}건
                    </summary>
                    <ol className="mt-2 space-y-1.5">
                      {orderHistory.map((entry) => (
                        <li key={entry.id} className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-ink-500">
                          <span>
                            {entry.fromStatus ? `${ORDER_STATUS_LABEL[entry.fromStatus]} → ` : ''}
                            <strong className="font-bold text-ink-800">{ORDER_STATUS_LABEL[entry.toStatus]}</strong>
                            {entry.note ? ` · ${entry.note}` : ''}
                          </span>
                          <span className="num shrink-0 text-ink-400">{formatOrderDate(entry.createdAt)}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CustomerSummary({ customer, orders }: { customer: Customer | null; orders: OrderWithCustomer[] }) {
  if (!customer) return null;
  const total = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  return (
    <div className="card mt-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-ink-900">{customer.name}</p>
          <p className="num mt-0.5 text-[12px] text-ink-600">{formatPhone(customer.phone)}</p>
          <p className="mt-1 break-all text-[10px] text-ink-400">
            고객 ID <span className="num">{customer.id}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-ink-400">주문 {orders.length}건</p>
          <p className="num text-[15px] font-extrabold text-ink-900">{won(total)}</p>
        </div>
      </div>
    </div>
  );
}
