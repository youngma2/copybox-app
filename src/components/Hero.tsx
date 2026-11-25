import { IconArrowRight, IconCheck, IconFile, IconPrinter, IconStore } from './Icons';

const CHIPS = ['PDF 페이지 자동 인식', '실시간 견적 계산', '당일 출력·제본', '비회원도 주문 가능'];

const STEPS = [
  {
    no: '01',
    title: '파일 올리기',
    body: 'PDF·HWP·DOCX·이미지를 끌어다 놓으면 페이지 수를 자동으로 세어요.',
    icon: <IconFile className="h-5 w-5" />,
  },
  {
    no: '02',
    title: '옵션 고르기',
    body: '규격·흑백/컬러·단면/양면·제본을 고르면 금액이 바로 바뀝니다.',
    icon: <IconPrinter className="h-5 w-5" />,
  },
  {
    no: '03',
    title: '접수하고 수령',
    body: '연락처만 남기면 접수 끝. 매장 방문 또는 택배·퀵으로 받아요.',
    icon: <IconStore className="h-5 w-5" />,
  },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-[0.55]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-brand-100/60 blur-3xl"
        aria-hidden="true"
      />
      <div className="container-page relative pb-12 pt-12 sm:pt-16 lg:pb-16 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-ink-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-ink-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              일산 복사 · 출력 · 제본 전문점
            </p>

            <h1 className="mt-5 text-balance text-[34px] font-extrabold leading-[1.18] tracking-tight text-ink-900 sm:text-[46px] lg:text-[52px]">
              PDF만 올리면,
              <br />
              견적은{' '}
              <span className="relative inline-block">
                <span className="relative z-10">바로</span>
                <span
                  className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-sun/80 sm:bottom-1.5 sm:h-4"
                  aria-hidden="true"
                />
              </span>{' '}
              나옵니다.
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-600 sm:text-base">
              파일을 끌어다 놓으면 페이지 수를 자동으로 세고, 인쇄비와 제본비를 실시간으로 계산해
              드립니다. 회원가입 없이도 3초면 견적이 끝나요.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <a href="#quote" className="btn-primary">
                바로 견적 내기
                <IconArrowRight className="h-4 w-4" />
              </a>
              <a href="#price" className="btn-ghost">
                단가표 보기
              </a>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-4 gap-y-2">
              {CHIPS.map((chip) => (
                <li key={chip} className="flex items-center gap-1.5 text-[13px] font-medium text-ink-600">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-mint/10 text-mint">
                    <IconCheck className="h-3 w-3" />
                  </span>
                  {chip}
                </li>
              ))}
            </ul>
          </div>

          {/* 예시 견적서 — 시안용 비주얼 */}
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
                  <span className="text-ink-600">45원/면</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[13px] text-ink-600">
                  <span>24면 × 2부</span>
                  <span className="num font-semibold text-ink-800">2,160원</span>
                </div>
              </div>

              <dl className="mt-3 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-ink-600">스프링 제본 × 2부</dt>
                  <dd className="num font-semibold text-ink-800">6,000원</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-600">양면 할인</dt>
                  <dd className="num font-semibold text-mint">-240원 반영</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-end justify-between border-t border-dashed border-ink-200 pt-3">
                <span className="text-xs font-semibold text-ink-400">총 예상 금액</span>
                <span className="num text-xl font-extrabold tracking-tight text-ink-900">8,160원</span>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 py-2 text-[10px] font-medium text-ink-400">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                결제 전 매장에서 최종 확인
              </div>
            </div>
            <div className="absolute -top-3 -right-3 z-10 rotate-3 rounded-xl bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-lift">
              PDF 페이지 자동 인식
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.no}
              className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white/90 p-4 shadow-card backdrop-blur"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-600">
                {step.icon}
              </span>
              <div>
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
