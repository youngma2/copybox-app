import { won } from '../lib/format';
import { COLOR_LABEL, SIDES_LABEL, type Quote } from '../lib/pricing';
import { CARD_PROOF, cardPrintOption, cardSheetLabel } from '../config/business-card';
import { CARD_SHIPPING_FEE, SHIPPING_TOTAL, deliverySpeedOption } from '../config/delivery';
import type { PickupMethod } from '../config/delivery';
import type { UploadedFileMeta } from './Uploader';
import { IconArrowRight, IconClock, IconFile, IconPrinter, IconShield } from './Icons';
import { formatDateLabel } from '../lib/describe';

interface SummaryCardProps {
  quote: Quote;
  file: UploadedFileMeta | null;
  onOrder: () => void;
  onChangePickup: (pickup: PickupMethod) => void;
}

export default function SummaryCard({ quote, file, onOrder, onChangePickup }: SummaryCardProps) {
  const isCard = quote.product === 'card';
  const optionLine = `${quote.size} ${COLOR_LABEL[quote.color]} ${SIDES_LABEL[quote.sides]}`;
  const speed = deliverySpeedOption(quote.deliverySpeed);

  return (
    <aside className="lg:sticky lg:top-24" aria-label="예상 견적 요약">
      <div className="card overflow-hidden">
        <div className="flex items-start justify-between gap-3 bg-ink-900 px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-medium text-white/50">예상 견적</p>
            <p className="mt-0.5 text-[15px] font-bold">실시간 자동 계산</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE
          </span>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5 rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-brand-600 shadow-card">
              <IconFile className="h-4 w-4" />
            </span>
            {file ? (
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-ink-900" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] text-ink-400">
                  {file.autoDetected ? `${file.pages}페이지 자동 인식` : isCard ? '디자인 파일 접수' : '페이지 수 직접 입력'}
                </p>
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-ink-400">
                {isCard
                  ? '명함은 문구만 남겨 주셔도 시안을 만들어 드려요.'
                  : '파일을 올리면 페이지 수가 자동으로 채워져요.'}
                <br />
                {isCard ? `지금은 ${quote.cardQty}매 기준입니다.` : `지금은 ${quote.pages}페이지 기준입니다.`}
              </p>
            )}
          </div>

          <dl className="mt-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <dt className="min-w-0">
                <span className="text-[13px] font-semibold text-ink-800">{isCard ? '명함 인쇄' : '인쇄비'}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-400">
                  {isCard
                    ? `${cardSheetLabel(quote.cardPaper)} · ${cardPrintOption(quote.cardPrint).label} · ${won(quote.unitPrice)}/200매 × ${quote.cardUnits}묶음`
                    : `${optionLine} · ${won(quote.unitPrice)}/페이지 × ${quote.pages}페이지 × ${quote.copies}부`}
                </span>
              </dt>
              <dd data-testid="print-cost" className="num shrink-0 text-[13px] font-bold text-ink-900">
                {won(quote.printCost)}
              </dd>
            </div>

            {quote.discount > 0 && (
              <div className="flex items-start justify-between gap-3" data-testid="discount-row">
                <dt className="min-w-0">
                  <span className="text-[13px] font-semibold text-mint">🌿 여유 제작 특가</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-400">인쇄비 10% 할인</span>
                </dt>
                <dd className="num shrink-0 text-[13px] font-bold text-mint">-{won(quote.discount)}</dd>
              </div>
            )}

            {!isCard && (
              <div className="flex items-start justify-between gap-3">
                <dt className="min-w-0">
                  <span className="text-[13px] font-semibold text-ink-800">
                    {quote.binding.id === 'none' ? '제본' : `${quote.binding.label} 제본`}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-400">
                    {quote.binding.price === 0
                      ? '낱장 출력 · 추가 비용 없음'
                      : `${won(quote.binding.price)}~ × ${quote.copies}부 · 사이즈별 금액 추후 확정`}
                  </span>
                </dt>
                <dd data-testid="binding-cost" className="num shrink-0 text-[13px] font-bold text-ink-900">
                  {won(quote.bindingCost)}
                </dd>
              </div>
            )}

            <div className="rounded-xl border border-ink-100 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-ink-800">수령 방법</span>
                <div className="flex gap-1" role="group" aria-label="수령 방법">
                  {(['store', 'delivery'] as PickupMethod[]).map((method) => {
                    const selected = quote.pickup === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        aria-pressed={selected}
                        data-testid={`summary-pickup-${method}`}
                        onClick={() => onChangePickup(method)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                          selected ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                        }`}
                      >
                        {method === 'store' ? '방문 수령' : '택배'}
                      </button>
                    );
                  })}
                </div>
              </div>
              {quote.pickup === 'delivery' ? (
                <div className="mt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between gap-2 text-ink-600">
                    <span>{isCard ? '배송비 (인쇄소 직배송)' : '택배비'}</span>
                    <span className="num font-semibold text-ink-800">{won(quote.shippingFee)}</span>
                  </div>
                  {!isCard && (
                    <div className="flex justify-between gap-2 text-ink-600">
                      <span>박스 · 포장재비</span>
                      <span className="num font-semibold text-ink-800">{won(quote.packagingFee)}</span>
                    </div>
                  )}
                  <p className="pt-0.5 text-[10px] leading-relaxed text-ink-400">
                    {isCard
                      ? '명함은 포장재비 없이 배송비만 받습니다 · 제주·도서산간은 별도 · 퀵은 착불'
                      : '제주·도서산간·추가 박스는 별도 안내 · 퀵은 착불'}
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 text-[10px] text-ink-400">
                  방문 수령은 배송비 0원 · 택배 선택 시 {won(isCard ? CARD_SHIPPING_FEE : SHIPPING_TOTAL)} 추가
                </p>
              )}
            </div>
          </dl>

          <div className="mt-4 border-t border-dashed border-ink-200 pt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-ink-600">총 예상 금액</p>
                <p className="mt-0.5 text-[10px] text-ink-400">부가세 포함 · 결제 전 매장 확인</p>
              </div>
              <p
                data-testid="total-amount"
                data-total={quote.total}
                className="num shrink-0 text-[28px] font-extrabold leading-none tracking-tight text-ink-900"
              >
                {won(quote.total)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-mint/5 px-3 py-2.5 text-[10px] leading-relaxed text-ink-600">
            <IconClock className="mt-px h-3.5 w-3.5 shrink-0 text-mint" />
            <p>
              {isCard ? (
                <>
                  <strong className="font-bold text-mint">{CARD_PROOF.leadShort}</strong> · 시안 확인 필수
                  <br />
                  시안 확인 요청 → <strong className="font-semibold text-ink-800">시안 확정(OK)</strong> 후 인쇄·재단을 시작합니다. (수정 최대{' '}
                  {CARD_PROOF.maxRevisions}회)
                </>
              ) : (
                <>
                  <strong className="font-bold text-mint">{speed.emoji} {speed.short}</strong> · 출고 마감{' '}
                  <strong className="font-semibold text-ink-800">{formatDateLabel(quote.dueDate)}</strong>
                  <br />
                  {quote.deliverySpeed === 'eco'
                    ? '배송 도착일이 아닌 영업일 4일 이내 출고 기준입니다.'
                    : '영업일 1~2일 내 출고를 목표로 합니다.'}
                </>
              )}
            </p>
          </div>

          <button type="button" data-testid="goto-order" onClick={onOrder} className="btn-primary mt-4 w-full">
            이 견적으로 주문 접수
            <IconArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-400">
            <IconShield className="mt-px h-3.5 w-3.5 shrink-0 text-ink-400" />
            <p>파일은 브라우저 안에서만 확인하며, 주민번호·카드번호는 받지 않습니다.</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-ink-100 bg-white/70 px-3.5 py-2.5 text-[11px] text-ink-600">
        <IconPrinter className="h-4 w-4 shrink-0 text-ink-400" />
        <p>
          출력 후 <strong className="font-semibold text-ink-800">1부씩 검수</strong>하고, 문제가 있으면 다시
          출력해 드려요.
        </p>
      </div>
    </aside>
  );
}
