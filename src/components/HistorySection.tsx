import { useState } from 'react';
import { won } from '../lib/format';
import { formatOrderDate, formatPhone, PICKUP_LABEL } from '../lib/order';
import { PROVIDER_LABEL } from '../lib/auth';
import { PAYMENT_STATUS_LABEL } from '../config/status';
import { PDF_RETENTION_DAYS, paymentRecordUntil } from '../config/delivery';
import type { Customer, Order, Review, StoreMode } from '../lib/storage/types';
import { describeOrderOptions, formatDateLabel } from '../lib/describe';
import StatusBadge, { PaymentBadge } from './StatusBadge';
import PickupPhotos from './PickupPhotos';
import OrderMessages from './OrderMessages';
import { ReviewForm, Stars } from './Reviews';
import { IconArrowRight, IconFile, IconRefresh, IconShield, IconUser } from './Icons';

interface HistorySectionProps {
  customer: Customer | null;
  orders: Order[];
  reviews: Review[];
  loading: boolean;
  storeMode: StoreMode;
  onLoginClick: () => void;
  onLogout: () => void;
  onReorder: (order: Order) => void;
  onNewOrder: () => void;
  onDeleteAccount: () => Promise<void>;
  onSaveReview: (order: Order, input: { rating: number; body: string; photoUrl: string | null }) => Promise<void>;
  onNotice: (message: string) => void;
}

export default function HistorySection({
  customer,
  orders,
  reviews,
  loading,
  storeMode,
  onLoginClick,
  onLogout,
  onReorder,
  onNewOrder,
  onDeleteAccount,
  onSaveReview,
  onNotice,
}: HistorySectionProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const totalAmount = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const paidAmount = orders
    .filter((order) => order.paymentStatus !== 'unpaid')
    .reduce((sum, order) => sum + order.totalPrice, 0);

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
      setConfirmDelete(false);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : '탈퇴 처리에 실패했어요.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.18em] text-brand-600">MY ORDERS</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">내 주문 이력</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
            손님 ID에 묶인 과거 주문을 최신순으로 모았습니다. 보관 사진·메시지·리뷰까지 한 번에 확인하세요.
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
                <button
                  type="button"
                  data-testid="history-logout"
                  onClick={onLogout}
                  className="rounded-lg px-2.5 py-2 text-[11px] font-medium text-ink-400 transition hover:bg-ink-50 hover:text-ink-800"
                >
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
                <dt className="text-[10px] font-semibold text-ink-400">누적 결제 금액</dt>
                <dd data-testid="history-total" className="num mt-0.5 text-[18px] font-extrabold text-ink-900">
                  {won(paidAmount || totalAmount)}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-3 py-2.5">
              <p className="flex min-w-0 items-start gap-1.5 text-[10px] leading-relaxed text-ink-500">
                <IconShield className="mt-px h-3.5 w-3.5 shrink-0 text-ink-400" />
                이름·연락처·주소는 주문 확인에만 쓰고, 인쇄 PDF 원본은 출고·배송 완료 {PDF_RETENTION_DAYS}일 뒤 파기합니다.
              </p>
              <button
                type="button"
                data-testid="history-delete-account"
                onClick={() => setConfirmDelete((current) => !current)}
                className="shrink-0 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[10px] font-semibold text-ink-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
              >
                회원 탈퇴 · 내 정보 삭제
              </button>
            </div>

            {confirmDelete && (
              <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-3" data-testid="delete-confirm">
                <p className="text-[11.5px] font-bold text-rose-800">정말 탈퇴하시겠어요?</p>
                <ul className="mt-1.5 space-y-0.5 text-[10.5px] leading-relaxed text-rose-700">
                  <li>· 이름·연락처·주소·인쇄 PDF·보관 사진·메시지는 즉시 파기됩니다.</li>
                  <li>· 결제 기록(금액·일시)만 전자상거래법에 따라 5년간 비식별로 보관됩니다.</li>
                  <li>· 보관 만료 예정: {formatDateLabel(paymentRecordUntil(new Date().toISOString()).toISOString())}</li>
                  <li>· 탈퇴 후에는 주문 이력을 다시 볼 수 없습니다.</li>
                </ul>
                {deleteError && <p className="mt-1.5 text-[10px] font-semibold text-rose-700">{deleteError}</p>}
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    data-testid="delete-confirm-yes"
                    disabled={deleting}
                    onClick={() => void deleteAccount()}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                  >
                    {deleting ? '처리 중…' : '탈퇴하고 개인정보 삭제'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
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
              {orders.map((order) => {
                const review = reviews.find((row) => row.orderId === order.id);
                return (
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        {order.deliverySpeed === 'eco' && (
                          <span
                            data-testid="history-eco-badge"
                            className="rounded-full bg-mint/10 px-2 py-1 text-[10px] font-bold text-mint"
                          >
                            🌿 여유특가 · 출고마감 {formatDateLabel(order.dueShipDate)}
                          </span>
                        )}
                        <PaymentBadge status={order.paymentStatus} />
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    <div className="space-y-3 px-4 py-3.5 sm:px-5">
                      <p data-testid="history-order-options" className="break-words text-[12px] font-bold text-ink-800">
                        {describeOrderOptions(order)}
                      </p>
                      {order.cardText && (
                        <p className="break-words whitespace-pre-line rounded-lg bg-sun/10 px-2.5 py-1.5 text-[11px] text-ink-700">
                          명함 문구 · {order.cardText}
                        </p>
                      )}

                      <dl className="grid gap-2 text-[11px] sm:grid-cols-2">
                        <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                          <dt className="font-semibold text-ink-400">요청사항</dt>
                          <dd data-testid="history-order-request" className="mt-0.5 break-words leading-relaxed text-ink-800">
                            {order.customerRequest ?? '없음'}
                          </dd>
                        </div>
                        <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                          <dt className="font-semibold text-ink-400">첨부파일 · 파기 예정</dt>
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
                            <span className="mt-1 block text-[10px] text-ink-400">
                              {order.pdfPurgeAt
                                ? `${formatDateLabel(order.pdfPurgeAt)} 원본 자동 파기 예정`
                                : `출고·배송 완료 ${PDF_RETENTION_DAYS}일 뒤 원본을 파기합니다.`}
                            </span>
                          </dd>
                        </div>
                        <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                          <dt className="font-semibold text-ink-400">수령 방법</dt>
                          <dd className="mt-0.5 text-ink-800">
                            {PICKUP_LABEL[order.pickup]}
                            {order.address ? ` · ${order.address}` : ''}
                          </dd>
                        </div>
                        <div className="min-w-0 rounded-lg bg-ink-50/70 px-3 py-2">
                          <dt className="font-semibold text-ink-400">
                            {order.paymentStatus === 'confirmed' ? '결제 금액' : `결제 금액 · ${PAYMENT_STATUS_LABEL[order.paymentStatus]}`}
                          </dt>
                          <dd data-testid="history-order-total" className="num mt-0.5 text-[13px] font-extrabold text-ink-900">
                            {won(order.totalPrice)}
                          </dd>
                          {order.paymentConfirmedAt && (
                            <dd className="num mt-0.5 text-[10px] text-mint">
                              입금 확인 {formatOrderDate(order.paymentConfirmedAt)}
                            </dd>
                          )}
                        </div>
                      </dl>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <PickupPhotos photos={order.pickupPhotos} editable={false} />
                        <div className="rounded-lg bg-ink-50/70 px-3 py-2 text-[10px] leading-relaxed text-ink-500">
                          <p className="text-[11px] font-semibold text-ink-400">진행 단계</p>
                          <p className="mt-1 text-ink-700">
                            접수됨 → 인쇄중 → 완료 → <strong className="font-bold">출고</strong> → 배송 완료
                          </p>
                          <p className="mt-1">
                            출고는 택배 접수 완료 또는 방문 수령 준비 완료를 뜻합니다.
                            {order.deliverySpeed === 'eco' ? ' (여유특가 · 영업일 4일 이내)' : ' (일반 · 영업일 1~2일)'}
                          </p>
                        </div>
                      </div>

                      <OrderMessages orderId={order.id} role="customer" onNotice={onNotice} />

                      {review ? (
                        <div className="rounded-xl border border-ink-100 bg-white px-3 py-2.5" data-testid={`history-review-${order.orderNumber}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <Stars value={review.rating} size="sm" />
                            <span className="text-[10px] text-ink-400">{formatOrderDate(review.createdAt)}</span>
                            {!review.visible && (
                              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[9px] font-bold text-ink-500">비공개</span>
                            )}
                          </div>
                          <p className="mt-1 break-words text-[11.5px] text-ink-700">{review.body || '별점만 남겼어요.'}</p>
                          {review.photoUrl && (
                            <img src={review.photoUrl} alt="후기 사진" className="mt-1.5 h-16 w-16 rounded-lg border border-ink-100 object-cover" />
                          )}
                          {review.adminReply && (
                            <p className="mt-1.5 rounded-lg bg-brand-50/70 px-2.5 py-1.5 text-[10.5px] text-brand-800">
                              <strong className="font-bold">사장님 답글</strong> · {review.adminReply}
                            </p>
                          )}
                        </div>
                      ) : order.status === 'delivered' ? (
                        <ReviewForm
                          orderNumber={order.orderNumber}
                          onSubmit={(input) => onSaveReview(order, input)}
                        />
                      ) : (
                        <p className="rounded-lg bg-ink-50/60 px-3 py-2 text-[10px] text-ink-400">
                          배송 완료되면 이 주문에 별점·한줄 후기를 남길 수 있어요.
                        </p>
                      )}
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
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
