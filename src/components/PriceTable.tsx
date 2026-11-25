import { won } from '../lib/format';
import {
  BASE_PAGE_PRICE,
  BINDING_OPTIONS,
  PAPER_SIZES,
  PAPER_NOTE,
  unitPagePrice,
  type PaperSize,
} from '../lib/pricing';

interface PriceTableProps {
  currentSize: PaperSize;
}

export default function PriceTable({ currentSize }: PriceTableProps) {
  return (
    <section id="price" className="container-page py-14 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-brand-600">PRICE</p>
          <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">단가표</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            1면(1페이지) 기준 단가입니다. 양면 인쇄는 자동으로 10% 할인돼요.
          </p>
        </div>
        <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-400">
          샘플 단가 · 부가세 포함
        </span>
      </div>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="card overflow-hidden">
          <div className="sm:hidden">
            {PAPER_SIZES.map((size) => {
              const active = size === currentSize;
              return (
                <div
                  key={size}
                  className={`border-b border-ink-100 px-4 py-4 last:border-b-0 ${active ? 'bg-brand-50/50' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-extrabold text-ink-900">{size}</span>
                    {active && (
                      <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white">선택</span>
                    )}
                    <span className="ml-auto text-[10px] text-ink-400">{PAPER_NOTE[size]}</span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-1.5">
                    {[
                      { label: '흑백 단면', value: unitPagePrice(size, 'mono', 'single') },
                      { label: '흑백 양면', value: unitPagePrice(size, 'mono', 'double') },
                      { label: '컬러 단면', value: unitPagePrice(size, 'color', 'single') },
                      { label: '컬러 양면', value: unitPagePrice(size, 'color', 'double') },
                    ].map((cell) => (
                      <div
                        key={cell.label}
                        className="flex items-center justify-between rounded-lg border border-ink-100 bg-white px-2.5 py-1.5"
                      >
                        <dt className="text-[10px] text-ink-400">{cell.label}</dt>
                        <dd className="num text-[12px] font-bold text-ink-800">{won(cell.value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <caption className="sr-only">규격·색상·인쇄면별 1면당 인쇄 단가표</caption>
              <thead>
                <tr className="bg-ink-50/80 text-left text-[11px] font-semibold text-ink-600">
                  <th scope="col" className="px-4 py-3 sm:px-5">
                    규격
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    흑백 단면
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    흑백 양면
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    컬러 단면
                  </th>
                  <th scope="col" className="px-4 py-3 text-right sm:px-5">
                    컬러 양면
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {PAPER_SIZES.map((size) => {
                  const active = size === currentSize;
                  return (
                    <tr key={size} className={active ? 'bg-brand-50/50' : 'bg-white'}>
                      <th scope="row" className="px-4 py-3.5 text-left sm:px-5">
                        <span className="flex items-center gap-2">
                          <span className="text-[15px] font-extrabold text-ink-900">{size}</span>
                          {active && (
                            <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              선택
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-medium text-ink-400">{PAPER_NOTE[size]}</span>
                      </th>
                      <td className="num px-3 py-3.5 text-right font-semibold text-ink-800">
                        {won(unitPagePrice(size, 'mono', 'single'))}
                      </td>
                      <td className="num px-3 py-3.5 text-right font-semibold text-ink-800">
                        {won(unitPagePrice(size, 'mono', 'double'))}
                      </td>
                      <td className="num px-3 py-3.5 text-right font-semibold text-ink-800">
                        {won(unitPagePrice(size, 'color', 'single'))}
                      </td>
                      <td className="num px-4 py-3.5 text-right font-semibold text-ink-800 sm:px-5">
                        {won(unitPagePrice(size, 'color', 'double'))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-100 bg-white px-4 py-3 text-[11px] text-ink-400 sm:px-5">
            <span>· 1면 = 1페이지</span>
            <span>· 양면은 종이 장수가 절반</span>
            <span>· 최소 결제 금액 없음</span>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="text-[15px] font-bold tracking-tight text-ink-900">제본 · 후가공</h3>
          <p className="mt-1 text-[11px] text-ink-400">부수 1부 기준 추가 금액</p>
          <ul className="mt-4 divide-y divide-ink-100">
            {BINDING_OPTIONS.map((option) => (
              <li key={option.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="block text-[13px] font-semibold text-ink-800">{option.label}</span>
                  <span className="block text-[10px] text-ink-400">{option.note}</span>
                </span>
                <span className="num shrink-0 text-[13px] font-bold text-ink-900">
                  {option.price === 0 ? '무료' : `+${won(option.price)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2.5 text-[10px] leading-relaxed text-ink-600">
            100페이지 이상 제본은 페이지 수에 따라 금액이 달라질 수 있어요. 대량 주문은 매장으로 문의해 주세요.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 rounded-2xl border border-dashed border-ink-200 bg-white/60 p-4 text-[11px] leading-relaxed text-ink-600 sm:grid-cols-2 sm:p-5">
        <p>
          <strong className="font-semibold text-ink-800">표시 금액은 샘플입니다.</strong> 실제 매장 단가로 바꾸면 견적
          계산기도 같은 값으로 계산됩니다.
        </p>
        <p>
          A4 기준 흑백 {won(BASE_PAGE_PRICE.A4.mono)}/면 · 컬러 {won(BASE_PAGE_PRICE.A4.color)}/면 — 부가세 포함,
          결제 전 매장에서 최종 확인해 주세요.
        </p>
      </div>
    </section>
  );
}
