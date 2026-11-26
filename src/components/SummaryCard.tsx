import { won } from '../lib/format';
import { COLOR_LABEL, SIDES_LABEL, type Quote } from '../lib/pricing';
import type { UploadedFileMeta } from './Uploader';
import { IconArrowRight, IconFile, IconPrinter, IconShield } from './Icons';

interface SummaryCardProps {
  quote: Quote;
  file: UploadedFileMeta | null;
  onOrder: () => void;
}

export default function SummaryCard({ quote, file, onOrder }: SummaryCardProps) {
  const optionLine = `${quote.size} ${COLOR_LABEL[quote.color]} ${SIDES_LABEL[quote.sides]}`;

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
                  {file.autoDetected ? `${file.pages}페이지 자동 인식` : '페이지 수 직접 입력'} · 총 {quote.pages}페이지
                </p>
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-ink-400">
                파일을 올리면 페이지 수가 자동으로 채워져요.
                <br />
                지금은 {quote.pages}페이지 기준입니다.
              </p>
            )}
          </div>

          <dl className="mt-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <dt className="min-w-0">
                <span className="text-[13px] font-semibold text-ink-800">인쇄비</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-400">
                  {optionLine} · {won(quote.unitPrice)}/페이지 × {quote.pages}페이지 × {quote.copies}부
                </span>
              </dt>
              <dd data-testid="print-cost" className="num shrink-0 text-[13px] font-bold text-ink-900">
                {won(quote.printCost)}
              </dd>
            </div>

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

          <button type="button" data-testid="goto-order" onClick={onOrder} className="btn-primary mt-4 w-full">
            이 견적으로 주문 접수
            <IconArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-400">
            <IconShield className="mt-px h-3.5 w-3.5 shrink-0 text-ink-400" />
            <p>업로드한 파일은 브라우저 안에서만 확인하며, 파일 내용은 저장하지 않습니다.</p>
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
