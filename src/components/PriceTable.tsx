import { won } from '../lib/format';
import { BINDING_NOTE, BINDING_OPTIONS, PAGE_UNIT_PRICE, type ProductKind } from '../config/pricing';
import {
  DELIVERY_SPEED_OPTIONS,
  ECO_DISCOUNT_RATE,
  SHIPPING_DETAIL,
  SHIPPING_EXTRA_NOTE,
  SHIPPING_NOTE,
  SHIPPING_TOTAL,
} from '../config/delivery';
import {
  CARD_MAX_UNITS,
  CARD_NOTICE,
  CARD_OPEN_BADGE,
  CARD_PAPER_OPTIONS,
  CARD_SHEETS_PER_UNIT,
  CARD_SPEC,
} from '../config/business-card';

function ShippingCard() {
  return (
    <div className="card min-w-0 p-4 sm:p-5" data-testid="shipping-table">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold text-ink-900">택배비 · 포장비</h3>
        <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-bold text-ink-500">방문 수령 0원</span>
      </div>
      <ul className="mt-3 space-y-2 text-[12px]">
        {SHIPPING_DETAIL.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-2">
            <span className="min-w-0 text-ink-600">
              {row.label}
              <span className="block text-[10px] text-ink-400">{row.note}</span>
            </span>
            <span className="num shrink-0 font-semibold text-ink-900">{won(row.value)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2 border-t border-dashed border-ink-200 pt-2">
          <span className="font-bold text-ink-800">합계</span>
          <span data-testid="shipping-total" className="num text-[15px] font-extrabold text-ink-900">
            {won(SHIPPING_TOTAL)}
          </span>
        </li>
      </ul>
      <p className="mt-2.5 break-words text-[10px] leading-relaxed text-ink-400">{SHIPPING_EXTRA_NOTE} 퀵은 착불입니다.</p>
      <p className="mt-1 break-words text-[10px] leading-relaxed text-ink-400">{SHIPPING_NOTE}</p>
    </div>
  );
}

function EcoCard() {
  return (
    <div className="card min-w-0 border-mint/30 bg-mint/5 p-4 sm:p-5" data-testid="eco-price-table">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold text-mint">🌿 여유 제작 특가</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-mint">-{ECO_DISCOUNT_RATE * 100}%</span>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-700">
        인쇄비에서 <strong className="font-bold text-mint">{ECO_DISCOUNT_RATE * 100}% 자동 할인</strong>. 제본비·택배비는
        그대로입니다.
      </p>
      <ul className="mt-2 space-y-1.5 text-[11px] text-ink-600">
        {DELIVERY_SPEED_OPTIONS.map((option) => (
          <li key={option.id} className="flex items-start gap-1.5">
            <span className="shrink-0">{option.emoji}</span>
            <span className="min-w-0">{option.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-500">
        배송 도착일이 아닌 영업일 4일 이내 출고(택배 접수 완료 · 방문수령 준비 완료) 기준, 작업 일정에 따라 조기 출고
        가능.
      </p>
    </div>
  );
}

/** 명함 단가 요약 — 명함 페이지의 대표 표이자, A4 페이지에서는 교차 안내용 */
function CardPriceTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="card min-w-0 p-4 sm:p-5" data-testid="card-price-table">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold text-ink-900">
          명함 · {CARD_SPEC.widthMm}×{CARD_SPEC.heightMm}mm
        </h3>
        <span className="rounded-full bg-sun/70 px-2 py-0.5 text-[10px] font-bold text-ink-900">{CARD_OPEN_BADGE}</span>
      </div>
      <ul className="mt-3 divide-y divide-ink-100">
        {CARD_PAPER_OPTIONS.map((option) => (
          <li key={option.id} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0 text-[12px] font-semibold text-ink-800">{option.label.replace(' 명함', '')}</span>
            <span className="num shrink-0 text-[12px] font-bold text-ink-900">{won(option.price)}/200매</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[10px] leading-relaxed text-ink-400">
        {compact ? '문구만 남겨 주셔도 시안 제작을 도와드립니다. 명함 탭에서 자세히 보세요.' : CARD_NOTICE}
      </p>
    </div>
  );
}

/** 명함 제작 안내 */
function CardGuide() {
  const rows = [
    { label: '재단 규격', value: `${CARD_SPEC.widthMm} × ${CARD_SPEC.heightMm} mm`, note: '도련 포함 92 × 52 mm' },
    { label: '수량', value: `${CARD_SHEETS_PER_UNIT}매 단위`, note: `최대 ${CARD_MAX_UNITS}묶음 (${CARD_MAX_UNITS * CARD_SHEETS_PER_UNIT}매)` },
    { label: '파일', value: 'PDF · AI · JPG · PNG', note: '300dpi 이상 권장' },
    { label: '디자인', value: '문구만 있어도 OK', note: '시안 확인 후 인쇄' },
  ];
  return (
    <div className="card min-w-0 p-4 sm:p-5" data-testid="card-guide">
      <h3 className="text-[14px] font-bold text-ink-900">명함 제작 안내</h3>
      <p className="mt-1 text-[11px] text-ink-400">주문 전에 이것만 확인해 주세요</p>
      <ul className="mt-3 divide-y divide-ink-100">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start justify-between gap-3 py-2">
            <span className="min-w-0 text-[12px] font-semibold text-ink-600">{row.label}</span>
            <span className="min-w-0 text-right">
              <span className="block text-[12px] font-bold text-ink-900">{row.value}</span>
              <span className="block text-[10px] text-ink-400">{row.note}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 rounded-lg bg-ink-50 px-3 py-2.5 text-[10px] leading-relaxed text-ink-600">{CARD_SPEC.note}</p>
    </div>
  );
}

export default function PriceTable({ product }: { product: ProductKind }) {
  const isCard = product === 'card';

  return (
    <section id="price" className="container-page py-14 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.18em] text-brand-600">PRICE</p>
          <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">
            {isCard ? '명함 단가표' : 'A4 인쇄 단가표'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            {isCard
              ? `명함은 ${CARD_SHEETS_PER_UNIT}매 단위로 계산합니다. 코팅·비코팅·수입지 모두 같은 오픈 특가입니다.`
              : 'A4 한 가지 규격 · 1페이지(1면) 기준 단가입니다. 흑백이 기본 선택이에요.'}
          </p>
        </div>
        <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-400">
          부가세 포함
        </span>
      </div>

      {isCard ? (
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
          <div className="card overflow-hidden">
            <div className="border-b border-ink-100 px-4 py-3.5 sm:px-5">
              <p className="text-[13px] font-bold text-ink-900">지류별 단가</p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                {CARD_SHEETS_PER_UNIT}매 기준 · 수량은 {CARD_SHEETS_PER_UNIT}매 단위로 늘어납니다
              </p>
            </div>
            <ul className="divide-y divide-ink-100 px-4 sm:px-5">
              {CARD_PAPER_OPTIONS.map((option) => (
                <li key={option.id} className="flex items-center justify-between gap-3 py-3" data-testid={`price-card-${option.id}`}>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-ink-800">{option.label}</span>
                    <span className="block break-words text-[10px] leading-relaxed text-ink-400">{option.note}</span>
                  </span>
                  <span className="num shrink-0 text-[15px] font-extrabold text-ink-900">{won(option.price)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-100 bg-white px-4 py-3 text-[11px] text-ink-400 sm:px-5">
              <span>· {CARD_SPEC.widthMm}×{CARD_SPEC.heightMm}mm</span>
              <span>· 도련 포함 92×52mm</span>
              <span>· 재단 오차 ±0.5mm</span>
            </div>
          </div>

          <CardGuide />
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="card overflow-hidden">
            <div className="border-b border-ink-100 px-4 py-3.5 sm:px-5">
              <p className="text-[13px] font-bold text-ink-900">A4 인쇄 단가</p>
              <p className="mt-0.5 text-[11px] text-ink-400">1페이지 = 1면 · 할인 공식 없이 페이지당 단가 그대로</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 sm:gap-3 sm:p-5">
              <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 sm:p-4">
                <p className="text-[11px] font-semibold text-brand-700">A4 흑백 · 단면</p>
                <p
                  data-testid="price-mono-single"
                  className="num mt-1 text-[24px] font-extrabold leading-tight text-ink-900 sm:text-[28px]"
                >
                  {won(PAGE_UNIT_PRICE.mono.single)}
                </p>
                <p className="mt-0.5 text-[10px] text-brand-600">페이지당 · 기본</p>
              </div>
              <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 sm:p-4">
                <p className="text-[11px] font-semibold text-brand-700">A4 흑백 · 양면</p>
                <p
                  data-testid="price-mono-double"
                  className="num mt-1 text-[24px] font-extrabold leading-tight text-ink-900 sm:text-[28px]"
                >
                  {won(PAGE_UNIT_PRICE.mono.double)}
                </p>
                <p className="mt-0.5 text-[10px] text-brand-600">페이지당</p>
              </div>

              <div className="rounded-xl border border-ink-100 bg-white p-3 sm:p-4">
                <p className="text-[11px] font-semibold text-ink-600">A4 컬러 · 단면</p>
                <p
                  data-testid="price-color-single"
                  className="num mt-1 text-[20px] font-extrabold leading-tight text-ink-900 sm:text-[22px]"
                >
                  {won(PAGE_UNIT_PRICE.color.single)}
                </p>
                <p className="mt-0.5 text-[10px] text-ink-400">페이지당</p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-white p-3 sm:p-4">
                <p className="text-[11px] font-semibold text-ink-600">A4 컬러 · 양면</p>
                <p
                  data-testid="price-color-double"
                  className="num mt-1 text-[20px] font-extrabold leading-tight text-ink-900 sm:text-[22px]"
                >
                  {won(PAGE_UNIT_PRICE.color.double)}
                </p>
                <p className="mt-0.5 text-[10px] text-ink-400">페이지당</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-100 bg-white px-4 py-3 text-[11px] text-ink-400 sm:px-5">
              <span>· A4 한 가지 규격만 운영</span>
              <span>· 1페이지 = 1면</span>
              <span>· 최소 결제 금액 없음</span>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="text-[15px] font-bold tracking-tight text-ink-900">제본</h3>
            <p className="mt-1 text-[11px] text-ink-400">부수 1부 기준 추가 금액</p>
            <ul className="mt-3 divide-y divide-ink-100">
              {BINDING_OPTIONS.map((option) => (
                <li key={option.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink-800">{option.label}</span>
                    <span className="block text-[10px] text-ink-400">{option.note}</span>
                  </span>
                  <span className="num shrink-0 text-[13px] font-bold text-ink-900">
                    {option.price === 0 ? '0원' : `${won(option.price)}~`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2.5 text-[10px] leading-relaxed text-ink-600">{BINDING_NOTE}</p>
          </div>
        </div>
      )}

      <div className={`mt-4 grid gap-4 ${isCard ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        <ShippingCard />
        {!isCard && <CardPriceTable compact />}
        <EcoCard />
      </div>

      <div className="mt-5 grid gap-2 rounded-2xl border border-dashed border-ink-200 bg-white/60 p-4 text-[11px] leading-relaxed text-ink-600 sm:grid-cols-2 sm:p-5">
        {isCard ? (
          <>
            <p>
              <strong className="font-semibold text-ink-800">명함은 {CARD_SHEETS_PER_UNIT}매 단위로 계산합니다.</strong> 코팅 ·
              비코팅 · 수입지 모두 200매 {won(CARD_PAPER_OPTIONS[0].price)} 오픈 특가입니다.
            </p>
            <p>{CARD_NOTICE}</p>
          </>
        ) : (
          <>
            <p>
              <strong className="font-semibold text-ink-800">견적서·접수증·단가표가 같은 단가를 씁니다.</strong> A4 흑백 단면{' '}
              {won(PAGE_UNIT_PRICE.mono.single)} · 양면 {won(PAGE_UNIT_PRICE.mono.double)}으로 계산됩니다.
            </p>
            <p>
              스프링·와이어는 <strong className="font-semibold text-ink-800">1,500원부터</strong> 시작하며, 사이즈별 금액은 추후
              확정해 안내드립니다.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
