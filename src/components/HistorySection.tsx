import { won } from '../lib/format';
import { formatOrderDate, formatPhone, PICKUP_LABEL } from '../lib/order';
import { PROVIDER_LABEL } from '../lib/auth';
import type { Customer, Order, StoreMode } from '../lib/store';
import { describeOrderOptions } from '../lib/describe';
import StatusBadge from './StatusBadge';
import { IconArrowRight, IconFile, IconRefresh, IconUser } from './Icons';

interface HistorySectionProps {
  customer: Customer | null;
  orders: Order[];
  loading: boolean;
  storeMode: StoreMode;
  onLoginClick: () => void;
  onLogout: () => void;
  onReorder: (order: Order) => void;
  onNewOrder: () => void;
}

export default function HistorySection({
  customer,
  orders,
  loading,
  storeMode,
  onLoginClick,
  onLogout,
  onReorder,
  onNewOrder,
}: HistorySectionProps) {
  const totalAmount = orders.reduce((sum, order) => sum + order.totalPrice, 0);

  return (
    <section className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.18em] text-brand-600">MY ORDERS</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">내 주문 이력</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
            손님 ID에 묶인 과거 주문을 최신순으로 모았습니다. 접수번호·옵션·금액·요청사항·첨부파일을 한 번에 확인하세요.
          </p>
        </div>
        <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-400">
          {storeMode === 'demo' ? '데모 저장소 · 이 브라우저 기준' : 'Supabase · RLS 보호'}
        </span>
      </div>

      {!customer ? (
        <div className="card mt-6 flex flex-col items-center px-5 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <IconUser className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-[17px] font-extrabold text-ink-900">로그인하면 지난 주문을 그대로 볼 수 있어요</h2>
          <p className="mt-2 max-w-md text-[12px] leading-relaxed text-ink-600">
            간편 로그인으로 들어오시거나, <strong className="font-semibold text-ink-800">성함과 연락처</strong>가
            일치하면 비회원 주문도 찾아 드립니다. 손님 정보는 본인 주문에만 연결됩니다.
          </p>
          <div className="mt-5 flex w-full max-w-xs flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" data-testid="history-login" onClick={onLoginClick} className="btn-primary !py-3">
              간편 로그인 · 이력 찾기
              <IconArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={onNewOrder} className="btn-ghost !py-3">
              새 주문하기
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card mt-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-lg font-extrabold text-brand-700">
                  {customer.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span data-testid="history-customer-name" className="text-[16px] font-extrabold text-ink-900">
                      {customer.name}님
                    </span>
                    <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-bold text-ink-600">
                      {PROVIDER_LABEL[customer.provider]}
                    </span>
                  </p>
                  <p className="num mt-0.5 text-[12px] text-ink-600">{formatPhone(customer.phone)}</p>
                  <p className="mt-1 break-all text-[10px] leading-relaxed text-ink-400">
                    고객 ID <span data-testid="history-customer-id" className="num">{customer.id}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={onNewOrder} className="btn-ghost !px-3 !py-2 !text-[12px]">
                  새 주문하기
                </button>
                <button type="button" data-testid="history-logout" onClick={onLogout} className="rounded-lg px-2.5 py-2 text-[11px] font-medium text-ink-400 transition hover:bg-ink-50 hover:text-ink-800">
                  로그아웃
                </button>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-ink-50/70 px-3 py-2.5">
                <dt className="text-[10px] font-semibold text-ink-400">총 주문</dt>
                <dd data-testid="history-count" className="num mt-0.5 text-[18px] font-extrabold text-ink-900">
                  {orders.length}건
                </dd>
              </div>
              <div className="rounded-xl bg-ink-50/70 px-3 py-2.5">
                <dt className="text-[10px] font-semibold text-ink-400">누적 예상 금액</dt>
                <dd data-testid="history-total" className="num mt-0.5 text-[18px] font-extrabold text-ink-900">
                  {won(totalAmount)}
                </dd>
              </div>
            </dl>
          </div>

          {loading ? (
            <p className="mt-6 rounded-xl border border-ink-100 bg-white px-4 py-6 text-center text-[12px] text-ink-400">
              주문 이력을 불러오는 중…
            </p>
          ) : orders.length === 0 ? (
            <div className="card mt-4 px-5 py-10 text-center">
              <p className="text-[14px] font-bold text-ink-800">아직 주문 이력이 없어요</p>
              <p className="mt-1.5 text-[12px] text-ink-600">첫 주문을 접수하면 이 화면에 접수번호와 옵션이 그대로 쌓입니다.</p>
              <button type="button" onClick={onNewOrder} className="btn-primary mt-4 !py-3">
                견적 내고 주문하기
                <IconArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <ul className="mt-4 space-y-3" data-testid="history-list">
              {orders.map((order) => (
                <li
                  key={order.id}
                  data-testid="history-order"
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
                    <p data-testid="history-order-options" className="break-words text-[12px] font-bold text-ink-800">
                      {describeOrderOptions(order)}
                    </p>

                    <dl className="grid gap-2 text-[11px] sm:grid-cols-2">
                      <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                        <dt className="font-semibold text-ink-400">요청사항</dt>
                        <dd data-testid="history-order-request" className="mt-0.5 break-words leading-relaxed text-ink-800">
                          {order.customerRequest ?? '없음'}
                        </dd>
                      </div>
                      <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                        <dt className="font-semibold text-ink-400">첨부파일</dt>
                        <dd data-testid="history-order-file" className="mt-0.5 break-words leading-relaxed text-ink-800">
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
                      <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                        <dt className="font-semibold text-ink-400">수령 방법</dt>
                        <dd className="mt-0.5 text-ink-800">{PICKUP_LABEL[order.pickup]}</dd>
                      </div>
                      <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                        <dt className="font-semibold text-ink-400">결제 예상 금액</dt>
                        <dd data-testid="history-order-total" className="num mt-0.5 text-[13px] font-extrabold text-ink-900">
                          {won(order.totalPrice)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-4 py-3 sm:px-5">
                    <p className="text-[10px] text-ink-400">같은 옵션으로 다시 접수할 수 있어요</p>
                    <button
                      type="button"
                      data-testid={`reorder-${order.orderNumber}`}
                      onClick={() => onReorder(order)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[12px] font-bold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <IconRefresh className="h-4 w-4" />
                      이 옵션으로 다시 주문
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
