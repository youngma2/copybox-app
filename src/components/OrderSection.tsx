import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { DemoUser } from '../lib/auth';
import { PROVIDER_LABEL } from '../lib/auth';
import { won } from '../lib/format';
import { COLOR_LABEL, SIDES_LABEL, type Quote } from '../lib/pricing';
import { PICKUP_LABEL, createOrderRecord, formatPhone, isValidPhone, type OrderRecord, type PickupMethod } from '../lib/order';
import type { UploadedFileMeta } from './Uploader';
import { IconArrowRight, IconCheck, IconStore, IconTruck, IconUser } from './Icons';

interface OrderSectionProps {
  quote: Quote;
  file: UploadedFileMeta | null;
  user: DemoUser | null;
  receipt: OrderRecord | null;
  onLoginClick: () => void;
  onSubmit: (record: OrderRecord) => void;
  onReset: () => void;
}

export default function OrderSection({
  quote,
  file,
  user,
  receipt,
  onLoginClick,
  onSubmit,
  onReset,
}: OrderSectionProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pickup, setPickup] = useState<PickupMethod>('store');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [agree, setAgree] = useState(true);
  const [touched, setTouched] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setName((current) => (current === '' || current === '홍길동' ? user.name : current));
    }
  }, [user]);

  // 접수증이 그려진 뒤에 접수 위치로 이동 (폼이 사라져 높이가 바뀌므로)
  useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => {
      document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [receipt]);

  const nameError = name.trim() === '' ? '받으실 분 성함을 입력해 주세요.' : null;
  const phoneError = !isValidPhone(phone) ? '휴대폰 번호를 정확히 입력해 주세요.' : null;
  const addressError = pickup === 'delivery' && address.trim() === '' ? '배송지 주소를 입력해 주세요.' : null;
  const agreeError = !agree ? '개인정보 수집·이용에 동의해 주세요.' : null;
  const hasError = Boolean(nameError || phoneError || addressError || agreeError);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (hasError) return;
    onSubmit(
      createOrderRecord({
        name,
        phone,
        pickup,
        address,
        notes,
        user,
        fileName: file?.name ?? null,
        filePages: file?.pages ?? null,
        autoDetected: Boolean(file?.autoDetected),
        quote,
      }),
    );
  }

  return (
    <section id="order" className="container-page py-14 sm:py-20" ref={sectionRef}>
      {receipt ? (
        <ReceiptView record={receipt} onReset={onReset} />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-brand-600">ORDER</p>
              <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">
                견적 · 주문 접수
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                연락처와 수령 방법만 남겨 주세요. 접수 후 매장에서 확인 연락을 드립니다.
              </p>
            </div>
            <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-400">
              회원 · 비회원 모두 주문 가능
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <form onSubmit={handleSubmit} noValidate className="card p-5 sm:p-6">
              {user ? (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50/70 px-3.5 py-2.5">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-brand-700">
                    <IconUser className="h-4 w-4" />
                    {user.name}님 · {PROVIDER_LABEL[user.provider]} 로그인으로 접수합니다
                  </p>
                  <span className="text-[10px] text-brand-600">주문 내역은 회원 계정에 저장돼요</span>
                </div>
              ) : (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-3.5 py-2.5">
                  <p className="text-[12px] text-ink-600">
                    <strong className="font-semibold text-ink-800">비회원</strong>으로 접수합니다. 로그인하면 내역을 다시
                    볼 수 있어요.
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
                        onClick={() => setPickup(method)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition ${
                          selected
                            ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                            : 'border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-50/60'
                        }`}
                      >
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-lg ${
                            selected ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600'
                          }`}
                        >
                          {method === 'store' ? <IconStore className="h-4 w-4" /> : <IconTruck className="h-4 w-4" />}
                        </span>
                        <span>
                          <span className={`block text-[13px] font-bold ${selected ? 'text-brand-700' : 'text-ink-900'}`}>
                            {method === 'store' ? '매장 방문' : '택배 · 퀵'}
                          </span>
                          <span className="block text-[10px] text-ink-400">
                            {method === 'store' ? '준비 완료 후 방문' : '배송비 별도 안내'}
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
                    {touched && addressError && (
                      <p className="mt-1 text-[11px] font-medium text-rose-600">{addressError}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-ink-400">배송비는 매장에서 확인 후 안내드려요.</p>
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
                  placeholder="예: 표지는 컬러로, 나머지는 흑백 / 오늘 5시까지 찾으러 갈게요"
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
                    className="mt-0.5 h-4 w-4 rounded border-ink-200 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    개인정보 수집·이용에 동의합니다. (시안에서는 어떤 정보도 전송·저장되지 않습니다)
                  </span>
                </label>
                {touched && agreeError && <p className="mt-1 text-[11px] font-medium text-rose-600">{agreeError}</p>}
              </div>

              <button type="submit" data-testid="submit-order" className="btn-primary mt-5 w-full !py-4">
                견적 및 주문 접수하기
                <IconArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-2.5 text-center text-[11px] text-ink-400">
                접수 후 매장에서 확인 연락을 드리며, 결제는 방문·수령 시 진행됩니다.
              </p>
            </form>

            <div className="space-y-3">
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
                    <p className="text-[12px] text-ink-400">파일 미첨부 · 페이지 수 직접 입력</p>
                  )}
                  <dl className="mt-3 space-y-2 text-[12px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-400">규격 · 색상</dt>
                      <dd className="font-semibold text-ink-800">
                        {quote.size} · {COLOR_LABEL[quote.color]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-400">인쇄</dt>
                      <dd className="font-semibold text-ink-800">
                        {SIDES_LABEL[quote.sides]} · {quote.pages}면 × {quote.copies}부
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-400">제본</dt>
                      <dd className="font-semibold text-ink-800">{quote.binding.label}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex items-end justify-between border-t border-dashed border-ink-200 pt-3">
                    <span className="text-[11px] font-semibold text-ink-600">예상 금액</span>
                    <span className="num text-lg font-extrabold text-ink-900">{won(quote.total)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-white/70 p-4">
                <p className="text-[12px] font-bold text-ink-800">이렇게 진행돼요</p>
                <ol className="mt-2.5 space-y-2 text-[11px] leading-relaxed text-ink-600">
                  <li className="flex gap-2">
                    <span className="font-bold text-brand-600">1</span> 접수 확인 연락 (영업시간 내)
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-brand-600">2</span> 출력·제본 후 검수
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-brand-600">3</span> 매장 수령 또는 택배·퀵 발송
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

function ReceiptView({ record, onReset }: { record: OrderRecord; onReset: () => void }) {
  const { quote } = record;
  return (
    <div data-testid="receipt" className="mx-auto max-w-[560px] animate-pop">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint/10 text-mint">
          <IconCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-[24px] font-extrabold tracking-tight text-ink-900 sm:text-[28px]">주문 접수가 완료됐어요</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
          {record.name}님, 곧 매장에서 확인 연락을 드릴게요.
          <br />
          아래 접수 내용을 저장해 두시면 편리합니다.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <div className="flex items-start justify-between gap-3 border-b border-dashed border-ink-200 bg-ink-50/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-ink-400">COPYBOX 접수증</p>
            <p data-testid="receipt-order-no" className="num mt-1 text-[15px] font-extrabold text-ink-900">
              {record.orderNo}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-ink-400">접수 일시</p>
            <p className="num mt-0.5 text-[11px] font-semibold text-ink-800">{record.submittedAt}</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <dl className="space-y-2.5 text-[12px]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">주문자</dt>
              <dd className="font-semibold text-ink-900">
                {record.name} · <span className="num">{record.phone}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">수령 방법</dt>
              <dd className="font-semibold text-ink-900">{PICKUP_LABEL[record.pickup]}</dd>
            </div>
            {record.pickup === 'delivery' && record.address && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-400">배송지</dt>
                <dd className="text-right font-medium text-ink-800">{record.address}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">파일</dt>
              <dd className="max-w-[65%] truncate text-right font-medium text-ink-800" title={record.fileName ?? ''}>
                {record.fileName ?? '미첨부'}
                {record.autoDetected && record.filePages ? ` (${record.filePages}페이지 자동 인식)` : ''}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">주문 구분</dt>
              <dd className="font-medium text-ink-800">{record.memberLabel}</dd>
            </div>
            {record.notes && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-400">요청 사항</dt>
                <dd className="text-right font-medium text-ink-800">{record.notes}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 rounded-xl bg-ink-50/80 px-4 py-3.5">
            <p className="text-[11px] font-bold text-ink-600">
              {quote.size} {COLOR_LABEL[quote.color]} {SIDES_LABEL[quote.sides]} · {quote.pages}면 × {quote.copies}부
            </p>
            <div className="mt-2 space-y-1.5 text-[11px] text-ink-600">
              <div className="flex justify-between">
                <span>인쇄비</span>
                <span className="num font-semibold text-ink-800">{won(quote.printCost)}</span>
              </div>
              {quote.doubleDiscount > 0 && (
                <div className="flex justify-between">
                  <span>양면 할인</span>
                  <span className="num font-semibold text-mint">-{won(quote.doubleDiscount)}</span>
                </div>
              )}
              {quote.binding.price > 0 && (
                <div className="flex justify-between">
                  <span>
                    {quote.binding.label} × {quote.copies}부
                  </span>
                  <span className="num font-semibold text-ink-800">{won(quote.bindingCost)}</span>
                </div>
              )}
            </div>
            <div className="mt-2.5 flex items-end justify-between border-t border-dashed border-ink-200 pt-2.5">
              <span className="text-[11px] font-semibold text-ink-600">총 예상 금액 (VAT 포함)</span>
              <span data-testid="receipt-total" className="num text-xl font-extrabold text-ink-900">
                {won(quote.total)}
              </span>
            </div>
          </div>

          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
            <strong className="font-bold">시안 모드</strong> — 실제로 접수되지 않았고 결제도 이루어지지 않았습니다.
            Supabase를 연결하면 이 화면이 실제 주문 저장으로 바뀝니다.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onReset} data-testid="reset-quote" className="btn-ghost flex-1">
          새 견적 내기
        </button>
        <a href="#price" className="btn-primary flex-1">
          단가표 보기
        </a>
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-400">
        문의: 031-000-0000 (샘플) · 평일 09:00–19:00
      </p>
    </div>
  );
}
