import { useEffect, useState, type FormEvent } from 'react';
import { PROVIDER_LABEL } from '../lib/auth';
import { won } from '../lib/format';
import { BINDING_OPTIONS, COLOR_LABEL, SIDES_LABEL, cardPaperOption, type Quote } from '../lib/pricing';
import {
  formatOrderDate,
  formatPhone,
  isValidPhone,
  type OrderFormValues,
} from '../lib/order';
import { PICKUP_LABEL, SHIPPING_TOTAL, deliverySpeedOption, type PickupMethod } from '../config/delivery';
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_NOTICE,
  PAYMENT_STATUS_LABEL,
  type PaymentMethod,
} from '../config/status';
import { STORE } from '../config/store';
import type { Customer, Order, StoreMode } from '../lib/storage/types';
import { formatDateLabel } from '../lib/describe';
import type { UploadedFileMeta } from './Uploader';
import { IconArrowRight, IconCheck, IconStore, IconTruck, IconUser } from './Icons';

interface OrderSectionProps {
  quote: Quote;
  file: UploadedFileMeta | null;
  customer: Customer | null;
  receipt: Order | null;
  storeMode: StoreMode;
  pickup: PickupMethod;
  onPickupChange: (pickup: PickupMethod) => void;
  onLoginClick: () => void;
  onSubmit: (values: OrderFormValues) => Promise<void>;
  onReset: () => void;
  onViewHistory: () => void;
}

type Step = 'form' | 'pay';

export default function OrderSection({
  quote,
  file,
  customer,
  receipt,
  storeMode,
  pickup,
  onPickupChange,
  onLoginClick,
  onSubmit,
  onReset,
  onViewHistory,
}: OrderSectionProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    setName((current) => (current === '' ? customer.name : current));
    setPhone((current) => (current === '' ? formatPhone(customer.phone) : current));
  }, [customer]);

  // 접수증이 그려진 뒤에 접수 위치로 이동 (폼이 사라져 높이가 바뀌므로)
  useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => {
      document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [receipt]);

  useEffect(() => {
    setStep('form');
  }, [receipt]);

  const nameError = name.trim() === '' ? '받으실 분 성함을 입력해 주세요.' : null;
  const phoneError = !isValidPhone(phone) ? '휴대폰 번호를 정확히 입력해 주세요.' : null;
  const addressError = pickup === 'delivery' && address.trim() === '' ? '배송지 주소를 입력해 주세요.' : null;
  const agreeError = !agree ? '개인정보 수집·이용에 동의해 주세요.' : null;
  const hasError = Boolean(nameError || phoneError || addressError || agreeError);
  const speed = deliverySpeedOption(quote.deliverySpeed);

  function goPay(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    setSubmitError(null);
    if (hasError) return;
    setStep('pay');
    window.setTimeout(() => {
      document.getElementById('payment-step')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }

  async function confirmPayment() {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit({ name, phone, address, notes, agree, paymentMethod });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '주문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="order" className="container-page py-14 sm:py-20">
      {receipt ? (
        <ReceiptView
          record={receipt}
          customer={customer}
          storeMode={storeMode}
          onReset={onReset}
          onViewHistory={onViewHistory}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-brand-600">ORDER</p>
              <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">
                {quote.product === 'card' ? '명함 주문 접수' : 'A4 출력·제본 주문 접수'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                연락처와 수령 방법만 남겨 주세요. 결제까지 마치면 사장님 주문 목록에 바로 올라갑니다.
              </p>
            </div>
            <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-400">
              회원 · 비회원 모두 주문 가능
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold">
            <span className={`rounded-full px-3 py-1 ${step === 'form' ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'}`}>
              1. 주문 정보
            </span>
            <span className="text-ink-300">→</span>
            <span className={`rounded-full px-3 py-1 ${step === 'pay' ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-500'}`}>
              2. 결제 확인
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <form onSubmit={goPay} noValidate className="card min-w-0 p-4 sm:p-6">
              {customer ? (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50/70 px-3.5 py-2.5">
                  <p className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-brand-700">
                    <IconUser className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">
                      {customer.name}님 · {PROVIDER_LABEL[customer.provider]} 주문으로 접수합니다
                    </span>
                  </p>
                  <span className="text-[10px] text-brand-600">내 주문 이력에 쌓여요</span>
                </div>
              ) : (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-3.5 py-2.5">
                  <p className="min-w-0 text-[12px] leading-relaxed text-ink-600">
                    <strong className="font-semibold text-ink-800">비회원</strong> 주문도 이 브라우저에 저장되어
                    성함·연락처로 이력을 다시 볼 수 있어요.
                  </p>
                  <button
                    type="button"
                    onClick={onLoginClick}
                    className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-brand-700 shadow-card transition hover:bg-brand-50"
                  >
                    간편 로그인
                  </button>
                </div>
              )}

              <fieldset disabled={step === 'pay'} className="disabled:opacity-60">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="order-name" className="mb-1.5 block text-[13px] font-bold text-ink-800">
                      주문자 성함 <span className="text-brand-600">*</span>
                    </label>
                    <input
                      id="order-name"
                      data-testid="order-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="홍길동"
                      aria-invalid={Boolean(touched && nameError)}
                      className="field"
                    />
                    {touched && nameError && <p className="mt-1 text-[11px] font-medium text-rose-600">{nameError}</p>}
                  </div>

                  <div>
                    <label htmlFor="order-phone" className="mb-1.5 block text-[13px] font-bold text-ink-800">
                      연락처 <span className="text-brand-600">*</span>
                    </label>
                    <input
                      id="order-phone"
                      data-testid="order-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(formatPhone(event.target.value))}
                      placeholder="010-0000-0000"
                      aria-invalid={Boolean(touched && phoneError)}
                      className="field num"
                    />
                    {touched && phoneError && <p className="mt-1 text-[11px] font-medium text-rose-600">{phoneError}</p>}
                  </div>
                </div>

                <fieldset className="mt-5">
                  <legend className="mb-1.5 text-[13px] font-bold text-ink-800">
                    수령 방법 <span className="text-brand-600">*</span>
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(['store', 'delivery'] as PickupMethod[]).map((method) => {
                      const selected = pickup === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          aria-pressed={selected}
                          data-testid={`pickup-${method}`}
                          onClick={() => onPickupChange(method)}
                          className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition ${
                            selected
                              ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                              : 'border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-50/60'
                          }`}
                        >
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                              selected ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600'
                            }`}
                          >
                            {method === 'store' ? <IconStore className="h-4 w-4" /> : <IconTruck className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className={`block truncate text-[13px] font-bold ${selected ? 'text-brand-700' : 'text-ink-900'}`}>
                              {method === 'store' ? '매장 방문 (0원)' : '택배 · 퀵'}
                            </span>
                            <span className="block truncate text-[10px] text-ink-400">
                              {method === 'store' ? '준비 완료 후 방문' : `택배+포장 ${won(SHIPPING_TOTAL)}`}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {pickup === 'delivery' && (
                    <div className="mt-3">
                      <label htmlFor="order-address" className="mb-1.5 block text-[12px] font-semibold text-ink-800">
                        배송지 주소 <span className="text-brand-600">*</span>
                      </label>
                      <input
                        id="order-address"
                        data-testid="order-address"
                        type="text"
                        autoComplete="street-address"
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="받으실 주소를 입력해 주세요"
                        aria-invalid={Boolean(touched && addressError)}
                        className="field"
                      />
                      {touched && addressError && <p className="mt-1 text-[11px] font-medium text-rose-600">{addressError}</p>}
                      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">
                        기본 택배비 4,000원 + 박스·포장재비 1,000원 = {won(SHIPPING_TOTAL)} · 제주·도서산간은 별도 · 퀵은 착불
                      </p>
                    </div>
                  )}
                </fieldset>

                <div className="mt-5">
                  <label htmlFor="order-notes" className="mb-1.5 block text-[13px] font-bold text-ink-800">
                    요청 사항 <span className="text-[11px] font-medium text-ink-400">(선택)</span>
                  </label>
                  <textarea
                    id="order-notes"
                    data-testid="order-notes"
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={
                      quote.product === 'card'
                        ? '예: 문구는 위에 적었어요. 로고 파일이 있는데 카톡으로 보내도 될까요?'
                        : '예: 표지는 컬러로, 나머지는 흑백 / 오늘 5시까지 찾으러 갈게요'
                    }
                    className="field resize-none"
                  />
                </div>

                <div className="mt-4">
                  <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-ink-600">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(event) => setAgree(event.target.checked)}
                      data-testid="order-agree"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-200 text-brand-600 focus:ring-brand-500"
                    />
                    <span>
                      <strong className="font-semibold text-ink-800">[필수]</strong> 개인정보 수집·이용에 동의합니다.
                      (성함·연락처·배송지 수집 / 주문 확인·이력 조회 / 인쇄 PDF는 출고·배송 완료 14일 뒤 파기 / 주민번호·카드번호는 받지 않습니다)
                    </span>
                  </label>
                  {touched && agreeError && <p className="mt-1 text-[11px] font-medium text-rose-600">{agreeError}</p>}
                </div>

                <button type="submit" data-testid="submit-order" className="btn-primary mt-5 w-full !py-4">
                  결제 방법 확인하기
                  <IconArrowRight className="h-4 w-4" />
                </button>
                <p className="mt-2.5 text-center text-[11px] text-ink-400">
                  다음 단계에서 결제(입금)를 마치면 주문이 사장님 화면에 올라갑니다.
                </p>
              </fieldset>
            </form>

            <div className="min-w-0 space-y-3">
              <div className="card overflow-hidden">
                <div className="border-b border-ink-100 px-5 py-3.5">
                  <h3 className="text-[14px] font-bold text-ink-900">접수 내용 요약</h3>
                </div>
                <div className="px-5 py-4">
                  {file ? (
                    <p className="truncate text-[12px] font-semibold text-ink-800" title={file.name}>
                      📄 {file.name}
                    </p>
                  ) : (
                    <p className="text-[12px] text-ink-400">
                      {quote.product === 'card' ? '명함 · 문구만 접수' : '파일 미첨부 · 페이지 수 직접 입력'}
                    </p>
                  )}
                  {quote.product === 'card' && quote.cardText.trim() !== '' && (
                    <p className="mt-2 break-words rounded-lg bg-ink-50 px-2.5 py-2 text-[11px] leading-relaxed text-ink-600">
                      <span className="font-semibold text-ink-800">명함 문구</span>
                      <br />
                      {quote.cardText.trim()}
                    </p>
                  )}
                  <dl className="mt-3 space-y-2 text-[12px]">
                    {quote.product === 'card' ? (
                      <>
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-400">지류 · 규격</dt>
                          <dd className="text-right font-semibold text-ink-800">
                            {cardPaperOption(quote.cardPaper).label} · {quote.cardQty}매
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-400">단가</dt>
                          <dd className="font-semibold text-ink-800">{won(quote.unitPrice)}/200매</dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-400">규격 · 색상</dt>
                          <dd className="font-semibold text-ink-800">
                            {quote.size} · {COLOR_LABEL[quote.color]}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-400">인쇄</dt>
                          <dd className="text-right font-semibold text-ink-800">
                            {SIDES_LABEL[quote.sides]} · {quote.pages}페이지 × {quote.copies}부
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-400">제본</dt>
                          <dd className="font-semibold text-ink-800">
                            {quote.binding.label}
                            {quote.binding.startingAt ? ' (1,500원~)' : ''}
                          </dd>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-400">출고</dt>
                      <dd className="text-right font-semibold text-ink-800">
                        {speed.emoji} {speed.short} · 마감 {formatDateLabel(quote.dueDate)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-400">수령</dt>
                      <dd className="text-right font-semibold text-ink-800">
                        {PICKUP_LABEL[pickup]}
                        {pickup === 'delivery' ? ` (+${won(SHIPPING_TOTAL)})` : ' (0원)'}
                      </dd>
                    </div>
                    {quote.discount > 0 && (
                      <div className="flex justify-between gap-3 text-mint">
                        <dt>여유특가 할인</dt>
                        <dd className="num font-semibold">-{won(quote.discount)}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-3 flex items-end justify-between border-t border-dashed border-ink-200 pt-3">
                    <span className="text-[11px] font-semibold text-ink-600">결제 예정 금액</span>
                    <span className="num text-lg font-extrabold text-ink-900">{won(quote.total)}</span>
                  </div>
                </div>
              </div>

              {step === 'pay' && (
                <div id="payment-step" className="card border-brand-200 p-4" data-testid="payment-step">
                  <p className="text-[13px] font-extrabold text-ink-900">결제 방법을 선택해 주세요</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{PAYMENT_NOTICE}</p>

                  <div className="mt-3 grid gap-2">
                    {(['bank_transfer', 'kakaopay'] as PaymentMethod[]).map((method) => {
                      const selected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          aria-pressed={selected}
                          data-testid={`pay-method-${method}`}
                          onClick={() => setPaymentMethod(method)}
                          className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left ${
                            selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-ink-100 bg-white hover:bg-ink-50'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className={`block text-[12px] font-bold ${selected ? 'text-brand-700' : 'text-ink-900'}`}>
                              {PAYMENT_METHOD_LABEL[method]}
                            </span>
                            <span className="block text-[10px] text-ink-400">
                              {method === 'bank_transfer' ? '입금 후 [결제 완료]를 눌러 주세요' : '송금 링크·QR은 시안 화면입니다'}
                            </span>
                          </span>
                          <span className={`num shrink-0 text-[12px] font-extrabold ${selected ? 'text-brand-700' : 'text-ink-700'}`}>
                            {won(quote.total)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 rounded-xl bg-ink-50 px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-600">
                    {paymentMethod === 'bank_transfer' ? (
                      <>
                        <p className="font-bold text-ink-800">입금 계좌 (시안)</p>
                        <p className="num mt-0.5">농협 000-0000-0000-00 · 예금주 카피박스</p>
                        <p className="mt-1">입금자명은 주문자 성함으로 남겨 주세요. 확인 후 인쇄를 시작합니다.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-ink-800">카카오페이 송금 (시안)</p>
                        <p className="mt-0.5">사장님 카카오페이 송금 링크·QR은 실제 매장 정보와 함께 연결됩니다.</p>
                      </>
                    )}
                  </div>

                  {submitError && (
                    <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-rose-700">
                      {submitError}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="btn-ghost flex-1 !py-3 !text-[13px]"
                    >
                      이전
                    </button>
                    <button
                      type="button"
                      data-testid="confirm-payment"
                      disabled={submitting}
                      onClick={() => void confirmPayment()}
                      className="btn-primary flex-[1.4] !py-3 !text-[13px]"
                    >
                      {submitting ? '주문을 저장하는 중…' : '결제 완료 · 주문 확정'}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
                    결제를 마쳐야 주문이 확정됩니다. 작성 중 이탈하면 아무 정보도 저장되지 않습니다.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-ink-100 bg-white/70 p-4">
                <p className="text-[12px] font-bold text-ink-800">이렇게 진행돼요</p>
                <ol className="mt-2.5 space-y-2 text-[11px] leading-relaxed text-ink-600">
                  <li className="flex gap-2">
                    <span className="font-bold text-brand-600">1</span> 결제 완료 → 사장님 주문 목록에 표시
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-brand-600">2</span> 입금 확인 후 출력·제본
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-brand-600">3</span> 출고(택배 접수·수령 준비) → 보관 사진 확인
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ReceiptView({
  record,
  customer,
  storeMode,
  onReset,
  onViewHistory,
}: {
  record: Order;
  customer: Customer | null;
  storeMode: StoreMode;
  onReset: () => void;
  onViewHistory: () => void;
}) {
  const binding = BINDING_OPTIONS.find((option) => option.id === record.binding) ?? BINDING_OPTIONS[0];
  const isCard = record.product === 'card';
  const speed = deliverySpeedOption(record.deliverySpeed);

  return (
    <div data-testid="receipt" className="mx-auto max-w-[560px] animate-pop">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint/10 text-mint">
          <IconCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-[24px] font-extrabold tracking-tight text-ink-900 sm:text-[28px]">주문이 접수됐어요</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
          {customer?.name ?? '고객'}님, 입금 확인 후 바로 작업을 시작합니다.
          <br />
          접수 내용은 <strong className="font-semibold text-ink-800">내 주문 이력</strong>에서 언제든 다시 볼 수 있습니다.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-ink-200 bg-ink-50/60 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.2em] text-ink-400">COPYBOX 접수증</p>
            <p data-testid="receipt-order-no" className="num mt-1 break-all text-[15px] font-extrabold text-ink-900">
              {record.orderNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-ink-400">접수 일시</p>
            <p className="num mt-0.5 text-[11px] font-semibold text-ink-800">{formatOrderDate(record.createdAt)}</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <dl className="space-y-2.5 text-[12px]">
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-ink-400">주문자</dt>
              <dd className="min-w-0 text-right font-semibold text-ink-900">
                {customer?.name ?? '-'} · <span className="num">{customer ? formatPhone(customer.phone) : '-'}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">수령 방법</dt>
              <dd className="font-semibold text-ink-900">{PICKUP_LABEL[record.pickup]}</dd>
            </div>
            {record.pickup === 'delivery' && record.address && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-400">배송지</dt>
                <dd className="min-w-0 break-words text-right font-medium text-ink-800">{record.address}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-ink-400">파일</dt>
              <dd className="min-w-0 break-words text-right font-medium text-ink-800">
                {record.files.length > 0
                  ? record.files
                      .map((file) => `${file.fileName}${file.pageCount ? ` (${file.pageCount}페이지)` : ''}`)
                      .join(', ')
                  : isCard
                    ? '명함 · 문구 접수'
                    : '미첨부'}
              </dd>
            </div>
            {record.cardText && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-400">명함 문구</dt>
                <dd className="min-w-0 whitespace-pre-line break-words text-right font-medium text-ink-800">
                  {record.cardText}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">주문 상태</dt>
              <dd className="font-semibold text-brand-700">{ORDER_STATUS_LABEL[record.status]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">입금 상태</dt>
              <dd className="font-semibold text-amber-700">
                {PAYMENT_STATUS_LABEL[record.paymentStatus]} · {PAYMENT_METHOD_LABEL[record.paymentMethod]}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-ink-400">출고 예정</dt>
              <dd className="min-w-0 break-words text-right font-semibold text-mint">
                {speed.emoji} {speed.short} · {formatDateLabel(record.dueShipDate)}까지
              </dd>
            </div>
            {record.customerRequest && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-400">요청 사항</dt>
                <dd className="min-w-0 break-words text-right font-medium text-ink-800">{record.customerRequest}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 rounded-xl bg-ink-50/80 px-4 py-3.5">
            <p className="break-words text-[11px] font-bold text-ink-600">
              {isCard
                ? `명함 ${cardPaperOption(record.cardPaper ?? 'coating').label.replace(' 명함', '')} · ${record.cardQty}매`
                : `A4 ${COLOR_LABEL[record.colorMode]} ${SIDES_LABEL[record.sides]} · ${record.pages}페이지 × ${record.copies}부 · ${binding.label}`}
            </p>
            <div className="mt-2 space-y-1.5 text-[11px] text-ink-600">
              <div className="flex justify-between gap-3">
                <span>{isCard ? '명함 인쇄' : `인쇄비 (${won(record.pageUnitPrice)}/페이지)`}</span>
                <span className="num font-semibold text-ink-800">{won(record.printCost)}</span>
              </div>
              {!isCard && (
                <div className="flex justify-between gap-3">
                  <span>
                    {binding.label} 제본{binding.startingAt ? ' (1,500원~)' : ''} × {record.copies}부
                  </span>
                  <span className="num font-semibold text-ink-800">{won(record.bindingUnitPrice * record.copies)}</span>
                </div>
              )}
              {record.discount > 0 && (
                <div className="flex justify-between gap-3 text-mint">
                  <span>🌿 여유 제작 특가 (인쇄비 10%)</span>
                  <span className="num font-semibold">-{won(record.discount)}</span>
                </div>
              )}
              {record.pickup === 'delivery' && (
                <div className="flex justify-between gap-3">
                  <span>택배비 · 포장재비</span>
                  <span className="num font-semibold text-ink-800">
                    {won(record.shippingFee + record.packagingFee)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2.5 flex items-end justify-between border-t border-dashed border-ink-200 pt-2.5">
              <span className="text-[11px] font-semibold text-ink-600">총 결제 금액 (VAT 포함)</span>
              <span data-testid="receipt-total" className="num text-xl font-extrabold text-ink-900">
                {won(record.totalPrice)}
              </span>
            </div>
          </div>

          <p className="mt-4 break-words rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
            {storeMode === 'demo' ? (
              <>
                <strong className="font-bold">시안 모드</strong> — 실제 결제는 없습니다. 이 주문은 이 브라우저
                (localStorage)에 손님 ID 기준으로 저장됐고, 접수번호와 손님 ID로 과거 이력을 다시 볼 수 있습니다.
              </>
            ) : (
              <>주문이 Supabase(RLS 보호)에 저장됐습니다. 입금이 확인되면 인쇄를 시작합니다.</>
            )}
            <br />
            <span className="num">고객 ID: {record.customerId}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onViewHistory} data-testid="receipt-history-link" className="btn-primary flex-1 !py-3">
          내 주문 이력 보기
        </button>
        <button type="button" onClick={onReset} data-testid="reset-quote" className="btn-ghost flex-1">
          새 견적 내기
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-400">
        문의: {STORE.phone} (샘플) · 평일 09:00–19:00 · 입금 문의는 카카오톡 {STORE.kakaoChannel}
      </p>
    </div>
  );
}
