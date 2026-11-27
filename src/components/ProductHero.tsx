import { won } from '../lib/format';
import { PAGE_UNIT_PRICE, type ProductKind } from '../config/pricing';
import { PRODUCT_PAGES } from '../config/products';
import { CARD_PAPER_OPTIONS, CARD_SPEC } from '../config/business-card';
import { IconArrowRight, IconCheck, IconFile, IconPrinter, IconStore } from './Icons';

const STEP_ICONS = [<IconFile className="h-5 w-5" />, <IconPrinter className="h-5 w-5" />, <IconStore className="h-5 w-5" />];

interface ProductHeroProps {
  product: ProductKind;
  onScrollTo: (sectionId: string) => void;
}

function PrintVisual() {
  return (
    <div className="relative mx-auto hidden w-full max-w-[360px] lg:block" aria-hidden="true">
      <div className="absolute inset-x-4 top-4 h-full rotate-[3deg] rounded-2xl border border-ink-100 bg-white/70" />
      <div className="absolute inset-x-2 top-2 h-full rotate-[1.5deg] rounded-2xl border border-ink-100 bg-white/90" />
      <div className="relative rounded-2xl border border-ink-100 bg-white p-5 shadow-lift">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-ink-400">COPYBOX</p>
            <p className="mt-1 text-sm font-extrabold text-ink-900">예상 견적서</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-brand-50/70 p-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-ink-800">A4 · 흑백 · 양면</span>
            <span className="text-ink-600">{won(PAGE_UNIT_PRICE.mono.double)}/페이지</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[13px] text-ink-600">
            <span>24페이지 × 2부</span>
            <span className="num font-semibold text-ink-800">1,920원</span>
          </div>
        </div>

        <dl className="mt-3 space-y-2 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-ink-600">스프링 제본 (1,500원~) × 2부</dt>
            <dd className="num font-semibold text-ink-800">3,000원</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-end justify-between border-t border-dashed border-ink-200 pt-3">
          <span className="text-xs font-semibold text-ink-400">총 예상 금액</span>
          <span className="num text-xl font-extrabold tracking-tight text-ink-900">4,920원</span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 py-2 text-[10px] font-medium text-ink-400">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          결제 전 매장에서 최종 확인
        </div>
      </div>
      <div className="absolute -right-3 -top-3 z-10 rotate-3 rounded-xl bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-lift">
        PDF 페이지 자동 인식
      </div>
    </div>
  );
}

function CardVisual() {
  const paper = CARD_PAPER_OPTIONS[0];
  return (
    <div className="relative mx-auto hidden w-full max-w-[360px] lg:block" aria-hidden="true">
      <div className="absolute inset-x-4 top-5 h-full rotate-[-3deg] rounded-2xl border border-ink-100 bg-white/70" />
      <div className="relative rounded-2xl border border-ink-100 bg-white p-5 shadow-lift">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-ink-400">COPYBOX</p>
            <p className="mt-1 text-sm font-extrabold text-ink-900">명함 시안</p>
          </div>
          <span className="rounded-full bg-sun/70 px-2 py-0.5 text-[10px] font-bold text-ink-900">
            {CARD_SPEC.widthMm}×{CARD_SPEC.heightMm}mm
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-ink-100 bg-paper p-4">
          <p className="text-[15px] font-extrabold tracking-tight text-ink-900">김영민</p>
          <p className="mt-0.5 text-[10px] font-semibold text-ink-400">대표 · 카피박스 일산점</p>
          <div className="mt-3 space-y-1 text-[10px] leading-relaxed text-ink-600">
            <p className="num">010-0000-0000</p>
            <p>카카오톡 @카피박스</p>
            <p>일산 복사 · 출력 · 제본 전문</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-ink-50 px-2.5 py-2 text-[10px]">
          <span className="font-semibold text-ink-600">
            {paper.label.replace(' 명함', '')} · {CARD_SPEC.widthMm}×{CARD_SPEC.heightMm}mm
          </span>
          <span className="num font-extrabold text-ink-900">{won(paper.price)}/200매</span>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg bg-mint/5 px-2.5 py-2 text-[10px] font-medium text-ink-600">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          접수 후 시안 확인 → 인쇄 · 재단
        </div>
      </div>
      <div className="absolute -right-3 -top-3 z-10 rotate-3 rounded-xl bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-lift">
        문구만 주셔도 OK
      </div>
    </div>
  );
}

export default function ProductHero({ product, onScrollTo }: ProductHeroProps) {
  const content = PRODUCT_PAGES[product];
  const priceTags =
    product === 'card'
      ? [
          { label: '코팅 · 비코팅', value: won(CARD_PAPER_OPTIONS[0].price), note: '200매 기준' },
          { label: '수입지', value: won(CARD_PAPER_OPTIONS[2].price), note: '200매 기준' },
          { label: '규격', value: `${CARD_SPEC.widthMm}×${CARD_SPEC.heightMm}`, note: 'mm · 도련 92×52' },
        ]
      : [
          { label: 'A4 흑백 · 단면', value: won(PAGE_UNIT_PRICE.mono.single), note: '페이지당' },
          { label: 'A4 흑백 · 양면', value: won(PAGE_UNIT_PRICE.mono.double), note: '페이지당' },
          { label: '스프링 · 와이어', value: `${won(1500)}~`, note: '1부 기준' },
        ];

  return (
    <section id="top" data-testid={`product-hero-${product}`} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-[0.55]" aria-hidden="true" />
      <div
        className={`pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full blur-3xl ${
          product === 'card' ? 'bg-sun/25' : 'bg-brand-100/60'
        }`}
        aria-hidden="true"
      />

      <div className="container-page relative pb-12 pt-12 sm:pt-16 lg:pb-16 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-ink-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-ink-600">
              <span className={`h-1.5 w-1.5 rounded-full ${product === 'card' ? 'bg-sun' : 'bg-brand-500'}`} />
              {content.eyebrow}
            </p>

            <h1
              data-testid="product-hero-title"
              className="mt-5 text-balance text-[32px] font-extrabold leading-[1.18] tracking-tight text-ink-900 sm:text-[44px] lg:text-[50px]"
            >
              {content.titleLines.map((line, index) => (
                <span key={index} className="block">
                  {line.text ?? (
                    <>
                      {line.lead}
                      <span className="relative inline-block">
                        <span className="relative z-10">{line.highlight}</span>
                        <span className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-sun/80 sm:h-4" aria-hidden="true" />
                      </span>
                      {line.tail}
                    </>
                  )}
                </span>
              ))}
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-600 sm:text-base">{content.description}</p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => onScrollTo('quote')} className="btn-primary" data-testid="hero-quote-cta">
                바로 견적 내기
                <IconArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onScrollTo('price')} className="btn-ghost" data-testid="hero-price-cta">
                단가표 보기
              </button>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-4 gap-y-2">
              {content.chips.map((chip) => (
                <li key={chip} className="flex items-center gap-1.5 text-[13px] font-medium text-ink-600">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-mint/10 text-mint">
                    <IconCheck className="h-3 w-3" />
                  </span>
                  {chip}
                </li>
              ))}
            </ul>

            <dl className="mt-7 grid max-w-md grid-cols-3 gap-2">
              {priceTags.map((tag) => (
                <div key={tag.label} className="min-w-0 rounded-xl border border-ink-100 bg-white/80 px-2.5 py-2">
                  <dt className="truncate text-[10px] font-semibold text-ink-400">{tag.label}</dt>
                  <dd className="num mt-0.5 truncate text-[15px] font-extrabold text-ink-900">{tag.value}</dd>
                  <dd className="truncate text-[9px] text-ink-400">{tag.note}</dd>
                </div>
              ))}
            </dl>
          </div>

          {product === 'card' ? <CardVisual /> : <PrintVisual />}
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {content.steps.map((step, index) => (
            <div
              key={step.no}
              className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white/90 p-4 shadow-card backdrop-blur"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-600">
                {STEP_ICONS[index]}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink-900">
                  <span className="text-[10px] font-bold tracking-widest text-brand-500">{step.no}</span>
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-400">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
