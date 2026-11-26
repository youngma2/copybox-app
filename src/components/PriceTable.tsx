import { won } from '../lib/format';
import { BINDING_NOTE, BINDING_OPTIONS, PAGE_UNIT_PRICE } from '../lib/pricing';

export default function PriceTable() {
  return (
    <section id="price" className="container-page py-14 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-brand-600">PRICE</p>
          <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">단가표</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            A4 한 가지 규격 · 1페이지(1면) 기준 단가입니다. 흑백이 기본 선택이에요.
          </p>
        </div>
        <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-400">
          부가세 포함
        </span>
      </div>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="card overflow-hidden">
          <div className="border-b border-ink-100 px-4 py-3.5 sm:px-5">
            <p className="text-[13px] font-bold text-ink-900">A4 인쇄 단가</p>
            <p className="mt-0.5 text-[11px] text-ink-400">1페이지 = 1면 · 할인 공식 없이 페이지당 단가 그대로</p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-4 sm:gap-3 sm:p-5">
            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 sm:p-4">
              <p className="text-[11px] font-semibold text-brand-700">A4 흑백 · 단면</p>
              <p data-testid="price-mono-single" className="num mt-1 text-[24px] font-extrabold leading-tight text-ink-900 sm:text-[28px]">
                {won(PAGE_UNIT_PRICE.mono.single)}
              </p>
              <p className="mt-0.5 text-[10px] text-brand-600">페이지당 · 기본</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 sm:p-4">
              <p className="text-[11px] font-semibold text-brand-700">A4 흑백 · 양면</p>
              <p data-testid="price-mono-double" className="num mt-1 text-[24px] font-extrabold leading-tight text-ink-900 sm:text-[28px]">
                {won(PAGE_UNIT_PRICE.mono.double)}
              </p>
              <p className="mt-0.5 text-[10px] text-brand-600">페이지당</p>
            </div>

            <div className="rounded-xl border border-ink-100 bg-white p-3 sm:p-4">
              <p className="text-[11px] font-semibold text-ink-600">A4 컬러 · 단면</p>
              <p data-testid="price-color-single" className="num mt-1 text-[20px] font-extrabold leading-tight text-ink-900 sm:text-[22px]">
                {won(PAGE_UNIT_PRICE.color.single)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-400">페이지당</p>
            </div>
            <div className="rounded-xl border border-ink-100 bg-white p-3 sm:p-4">
              <p className="text-[11px] font-semibold text-ink-600">A4 컬러 · 양면</p>
              <p data-testid="price-color-double" className="num mt-1 text-[20px] font-extrabold leading-tight text-ink-900 sm:text-[22px]">
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

      <div className="mt-5 grid gap-2 rounded-2xl border border-dashed border-ink-200 bg-white/60 p-4 text-[11px] leading-relaxed text-ink-600 sm:grid-cols-2 sm:p-5">
        <p>
          <strong className="font-semibold text-ink-800">견적서·접수증·단가표가 같은 단가를 씁니다.</strong> A4 흑백 단면{' '}
          {won(PAGE_UNIT_PRICE.mono.single)} · 양면 {won(PAGE_UNIT_PRICE.mono.double)}으로 계산됩니다.
        </p>
        <p>
          스프링·와이어는 <strong className="font-semibold text-ink-800">1,500원부터</strong> 시작하며, 사이즈별 금액은 추후
          확정해 안내드립니다.
        </p>
      </div>
    </section>
  );
}
