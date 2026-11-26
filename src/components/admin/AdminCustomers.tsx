import { useMemo, useState } from 'react';
import { won } from '../../lib/format';
import { formatOrderDate, formatPhone } from '../../lib/order';
import { PICKUP_LABEL } from '../../config/delivery';
import type { Customer, OrderWithCustomer } from '../../lib/storage/types';
import { describeOrderOptions, formatDateLabel } from '../../lib/describe';
import StatusBadge, { PaymentBadge } from '../StatusBadge';
import OrderMessages from '../OrderMessages';
import { IconChevron, IconFile, IconUser } from '../Icons';

interface AdminCustomersProps {
  customers: Customer[];
  orders: OrderWithCustomer[];
  onNotice: (message: string) => void;
}

interface CustomerStat {
  customer: Customer | null;
  id: string;
  orders: OrderWithCustomer[];
  total: number;
  lastAt: string | null;
}

export default function AdminCustomers({ customers, orders, onNotice }: AdminCustomersProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useMemo<CustomerStat[]>(() => {
    const map = new Map<string, CustomerStat>();
    customers.forEach((customer) => {
      map.set(customer.id, { customer, id: customer.id, orders: [], total: 0, lastAt: null });
    });
    orders.forEach((order) => {
      const entry = map.get(order.customerId) ?? {
        customer: order.customer,
        id: order.customerId,
        orders: [],
        total: 0,
        lastAt: null,
      };
      entry.orders.push(order);
      entry.total += order.totalPrice;
      if (!entry.lastAt || order.createdAt > entry.lastAt) entry.lastAt = order.createdAt;
      map.set(order.customerId, entry);
    });
    return Array.from(map.values()).sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
  }, [customers, orders]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return stats;
    const digits = needle.replace(/[^0-9]/g, '');
    return stats.filter((entry) => {
      const name = entry.customer?.name?.toLowerCase() ?? '';
      const phone = entry.customer?.phone ?? '';
      return (
        name.includes(needle) ||
        entry.id.toLowerCase().includes(needle) ||
        (digits.length >= 3 && phone.includes(digits))
      );
    });
  }, [stats, query]);

  const selected = stats.find((entry) => entry.id === selectedId) ?? null;
  const totalRevenue = stats.reduce((sum, entry) => sum + entry.total, 0);

  return (
    <div data-testid="admin-customers">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          data-testid="customer-search"
          placeholder="이름 · 연락처 · 고객 ID 검색"
          className="field min-w-0 flex-1 !py-2 !text-[12px] sm:max-w-sm"
          aria-label="고객 검색"
        />
        <span className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-500">
          고객 {stats.length}명 · 누적 {won(totalRevenue)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ul className="space-y-1.5" data-testid="customer-list">
          {filtered.length === 0 ? (
            <li className="card px-4 py-6 text-center text-[12px] text-ink-400">조건에 맞는 고객이 없어요.</li>
          ) : (
            filtered.map((entry) => {
              const active = entry.id === selectedId;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    data-testid={`customer-row-${entry.id}`}
                    onClick={() => setSelectedId(active ? null : entry.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      active ? 'border-brand-600 bg-brand-50/60' : 'border-ink-100 bg-white hover:bg-ink-50/60'
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700">
                      {(entry.customer?.name ?? '?').slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 text-[12px] font-bold text-ink-900">
                        <span className="truncate">{entry.customer?.name ?? '알 수 없음'}</span>
                        <span className="num text-[11px] font-medium text-ink-500">
                          {entry.customer ? formatPhone(entry.customer.phone) : '-'}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10px] text-ink-400">
                        주문 {entry.orders.length}건 · 최근 {entry.lastAt ? formatDateLabel(entry.lastAt) : '없음'}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block text-[12px] font-extrabold text-ink-900">{won(entry.total)}</span>
                      <IconChevron className={`ml-auto h-3.5 w-3.5 text-ink-300 ${active ? 'rotate-90' : ''}`} />
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="min-w-0">
          {!selected ? (
            <div className="card flex h-full min-h-[220px] flex-col items-center justify-center px-5 py-8 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <IconUser className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[13px] font-bold text-ink-800">고객을 선택하면 전체 이력이 열립니다</p>
              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-ink-500">
                과거 주문·파일·금액·메시지·보관 사진까지 한 화면에서 확인할 수 있어요.
              </p>
            </div>
          ) : (
            <div className="card min-w-0 p-4" data-testid="customer-detail">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold text-ink-900">{selected.customer?.name ?? '알 수 없음'}</p>
                  <p className="num mt-0.5 text-[12px] text-ink-600">
                    {selected.customer ? formatPhone(selected.customer.phone) : '-'}
                  </p>
                  <p className="mt-1 break-all text-[10px] text-ink-400">고객 ID {selected.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-ink-400">누적 결제</p>
                  <p className="num text-[16px] font-extrabold text-ink-900">{won(selected.total)}</p>
                  <p className="text-[10px] text-ink-400">{selected.orders.length}건</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {selected.orders.length === 0 ? (
                  <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-500">아직 주문이 없습니다.</p>
                ) : (
                  selected.orders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-ink-100 px-3 py-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className="break-all text-[12px] font-bold text-ink-900">{order.orderNumber}</p>
                          <p className="num text-[10px] text-ink-400">{formatOrderDate(order.createdAt)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <PaymentBadge status={order.paymentStatus} />
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                      <p className="mt-1 break-words text-[11px] text-ink-700">{describeOrderOptions(order)}</p>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-ink-400">
                        <span>{PICKUP_LABEL[order.pickup]} · {order.deliverySpeed === 'eco' ? '🌿 여유특가' : '🚀 일반 출고'}</span>
                        <span className="num font-bold text-ink-800">{won(order.totalPrice)}</span>
                      </div>
                      {order.files.length > 0 && (
                        <p className="mt-1 flex items-start gap-1 break-all text-[10px] text-ink-500">
                          <IconFile className="mt-px h-3 w-3 shrink-0" />
                          {order.files.map((file) => file.fileName).join(', ')}
                        </p>
                      )}
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[10px] font-semibold text-brand-700">주문 메시지 보기</summary>
                        <div className="mt-1.5">
                          <OrderMessages orderId={order.id} role="admin" onNotice={onNotice} />
                        </div>
                      </details>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
