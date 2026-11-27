import type { ProductKind } from '../config/pricing';
import { PRODUCT_PAGES } from '../config/products';
import type { PickupMethod } from '../config/delivery';
import type { Quote, QuoteInput } from '../lib/pricing';
import type { OrderFormValues } from '../lib/order';
import type { Customer, Order, Review, StoreMode } from '../lib/storage';
import ProductHero from './ProductHero';
import { EcoBanner, EcoSection } from './EcoPromo';
import PriceTable from './PriceTable';
import StoreInfo from './StoreInfo';
import { ReviewSummary } from './Reviews';
import FaqSection from './FaqSection';
import OptionsCard from './OptionsCard';
import OrderSection from './OrderSection';
import SummaryCard from './SummaryCard';
import Uploader, { type UploadedFileMeta } from './Uploader';
import { IconShield } from './Icons';

interface ProductPageProps {
  product: ProductKind;
  options: QuoteInput;
  quote: Quote;
  file: UploadedFileMeta | null;
  pagesAuto: boolean;
  customer: Customer | null;
  receipt: Order | null;
  storeMode: StoreMode;
  reorderSource: string | null;
  reviews: Review[];
  onFileChange: (file: UploadedFileMeta | null) => void;
  onPagesChange: (pages: number) => void;
  onOptionsChange: (patch: Partial<QuoteInput>) => void;
  onProductChange: (product: ProductKind) => void;
  onPickupChange: (pickup: PickupMethod) => void;
  onLoginClick: () => void;
  onSubmit: (values: OrderFormValues) => Promise<void>;
  onReset: () => void;
  onViewHistory: () => void;
  onEcoQuote: () => void;
  onKakao: () => void;
  onSampleAction: (message: string) => void;
  onDismissReorder: () => void;
}

/**
 * 상품 전용 페이지 — 상품마다 헤더 소개·옵션·단가표·주문 흐름이 이 한 페이지에 들어갑니다.
 * 공용 부품(업로더·옵션·요약·주문·후기·FAQ)은 그대로 쓰고, product 값만 바꿔 재사용합니다.
 */
export default function ProductPage({
  product,
  options,
  quote,
  file,
  pagesAuto,
  customer,
  receipt,
  storeMode,
  reorderSource,
  reviews,
  onFileChange,
  onPagesChange,
  onOptionsChange,
  onProductChange,
  onPickupChange,
  onLoginClick,
  onSubmit,
  onReset,
  onViewHistory,
  onEcoQuote,
  onKakao,
  onSampleAction,
  onDismissReorder,
}: ProductPageProps) {
  const content = PRODUCT_PAGES[product];
  const isCard = product === 'card';

  function scrollTo(sectionId: string) {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  return (
    <div data-testid={`product-page-${product}`}>
      <ProductHero product={product} onScrollTo={scrollTo} />
      {!isCard && <EcoBanner onEcoQuote={onEcoQuote} />}

      {isCard && (
        <section className="container-page pt-3">
          <div
            data-testid="card-proof-banner"
            className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 shadow-card sm:px-5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-lg">명함</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.16em] text-amber-700">PROOF FIRST</p>
                <p className="mt-0.5 break-words text-[14px] font-extrabold leading-snug text-ink-900">
                  명함은 시안 확정 후 영업일 2~3일 출고입니다 (시안 확인 필수)
                </p>
                <p className="mt-0.5 break-words text-[11px] leading-relaxed text-ink-600">
                  주문 접수 → 시안 확인 요청 → 고객 [시안 확정(OK)] 후 인쇄·재단. A4 출력의 1~2일 출고와 다릅니다.
                </p>
                <p className="mt-1 break-words text-[11px] font-semibold text-amber-800">
                  ※ 시안 수정은 최대 2회까지 가능합니다 (2회 초과 수정 불가)
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="quote" className="container-page pt-12 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.18em] text-brand-600">QUOTE</p>
            <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">
              {isCard ? '명함 실시간 견적' : 'A4 출력 실시간 견적'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{content.quoteIntro}</p>
          </div>
          <p className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600">
            <IconShield className="h-3.5 w-3.5 text-mint" />
            파일은 브라우저에서만 확인
          </p>
        </div>

        {reorderSource && (
          <div
            data-testid="reorder-hint"
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5"
          >
            <p className="min-w-0 break-words text-[12px] font-semibold text-brand-800">
              접수번호 <span className="num">{reorderSource}</span>의 옵션을 불러왔어요. 파일만 다시 올려 주세요.
            </p>
            <button
              type="button"
              onClick={onDismissReorder}
              className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700 shadow-card"
            >
              닫기
            </button>
          </div>
        )}

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_356px]">
          <div className="min-w-0 space-y-4">
            <Uploader
              variant={isCard ? 'card' : 'print'}
              file={file}
              pages={options.pages}
              onFileChange={onFileChange}
              onPagesChange={onPagesChange}
            />
            <OptionsCard
              value={{ ...options, product }}
              pagesAuto={pagesAuto}
              fileName={file?.name ?? null}
              onChange={onOptionsChange}
              onProductChange={onProductChange}
            />
          </div>
          <div className="min-w-0">
            <SummaryCard quote={quote} file={file} onOrder={() => scrollTo('order')} onChangePickup={onPickupChange} />
          </div>
        </div>
      </section>

      <PriceTable product={product} />

      {!isCard && <EcoSection onEcoQuote={onEcoQuote} />}

      <StoreInfo onSampleAction={onSampleAction} />

      <ReviewSummary reviews={reviews} />

      <FaqSection onKakao={onKakao} />

      <OrderSection
        quote={quote}
        file={file}
        customer={customer}
        receipt={receipt}
        storeMode={storeMode}
        pickup={options.pickup}
        onPickupChange={onPickupChange}
        onLoginClick={onLoginClick}
        onSubmit={onSubmit}
        onReset={onReset}
        onViewHistory={onViewHistory}
      />
    </div>
  );
}
