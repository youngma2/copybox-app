import { ECO_BANNER, FAQ_ITEMS } from '../config/store';
import { ECO_DEFINITION, ECO_DISCOUNT_RATE, SHIPPING_NOTE } from '../config/delivery';
import { IconArrowRight, IconCheck, IconClock, IconPrinter } from './Icons';

/** 첫 화면 강조 배너 */
export function EcoBanner({ onEcoQuote }: { onEcoQuote: () => void }) {
  return (
    <section className="container-page pt-3">
      <div
        data-testid="eco-banner"
        className="relative overflow-hidden rounded-2xl border border-mint/25 bg-gradient-to-br from-mint/10 via-white to-sun/15 px-4 py-4 shadow-card sm:px-5"
      >
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-mint/10 blur-2xl" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-lg text-white">🌿</span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.16em] text-mint">{ECO_BANNER.eyebrow}</p>
              <p className="mt-0.5 break-words text-[14px] font-extrabold leading-snug text-ink-900">{ECO_BANNER.title}</p>
              <p className="mt-0.5 break-words text-[11px] leading-relaxed text-ink-600">{ECO_BANNER.body}</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="eco-banner-cta"
            onClick={onEcoQuote}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-mint px-3.5 py-2.5 text-[12px] font-bold text-white shadow-lift transition hover:bg-mint/90"
          >
            {ECO_BANNER.cta}
            <IconArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

const POINTS = [
  {
    icon: <IconPrinter className="h-4 w-4" />,
    title: '인쇄비 10% 자동 할인',
    body: `견적에서 여유 제작 특가를 고르면 인쇄비${ECO_DISCOUNT_RATE * 100}%가 바로 빠집니다. 제본비·택배비는 그대로예요.`,
  },
  {
    icon: <IconClock className="h-4 w-4" />,
    title: '영업일 4일 이내 출고',
    body: '배송 도착일이 아닌 출고(택배 접수 완료 · 방문수령 준비 완료) 기준입니다. 작업 일정에 따라 조기 출고될 수 있어요.',
  },
  {
    icon: <IconCheck className="h-4 w-4" />,
    title: '급한 주문은 일반 출고',
    body: '일반 출고(영업일 1~2일)와 나란히 선택할 수 있어 급한 주문은 그대로 빠르게 받으실 수 있습니다.',
  },
];

/** 전용 안내 탭 · 강조 카드 */
export function EcoSection({ onEcoQuote }: { onEcoQuote: () => void }) {
  const faq = FAQ_ITEMS.find((item) => item.id === 'shipping');
  return (
    <section id="eco" className="container-page py-14 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.18em] text-mint">ECO SPECIAL</p>
          <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">
            🌿 여유 제작 특가
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
            급하지 않으시다면, 작업 일정을 모아 정성껏 인쇄하고 인쇄비 10%를 할인해 드립니다.
          </p>
        </div>
        <button type="button" onClick={onEcoQuote} className="btn-primary shrink-0 !bg-mint !px-4 !py-2.5 !text-[13px] hover:!bg-mint/90">
          {ECO_BANNER.cta}
          <IconArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {POINTS.map((point) => (
          <div key={point.title} className="card min-w-0 p-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint/10 text-mint">{point.icon}</span>
            <p className="mt-2.5 text-[13px] font-extrabold text-ink-900">{point.title}</p>
            <p className="mt-1 break-words text-[11px] leading-relaxed text-ink-600">{point.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-mint/40 bg-white/70 p-4 sm:p-5">
        <p className="text-[12px] font-bold text-ink-800">정확히 이렇게 적용됩니다</p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-ink-600">
          <li>· {ECO_DEFINITION}</li>
          <li>· 할인은 인쇄비(명함은 인쇄 단가)에서만 적용되고, 제본비·택배비는 그대로입니다.</li>
          <li>· {faq ? faq.answer : SHIPPING_NOTE}</li>
        </ul>
      </div>
    </section>
  );
}
