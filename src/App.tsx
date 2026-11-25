import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import LoginModal from './components/LoginModal';
import OptionsCard from './components/OptionsCard';
import OrderSection from './components/OrderSection';
import PriceTable from './components/PriceTable';
import StoreInfo from './components/StoreInfo';
import SummaryCard from './components/SummaryCard';
import Uploader, { type UploadedFileMeta } from './components/Uploader';
import { DEMO_USER_NAME, PROVIDER_LABEL, type DemoUser, type LoginProvider } from './lib/auth';
import { won } from './lib/format';
import type { OrderRecord } from './lib/order';
import { calculateQuote, type QuoteInput } from './lib/pricing';
import { IconArrowRight, IconShield } from './components/Icons';

const DEFAULT_OPTIONS: QuoteInput = {
  size: 'A4',
  color: 'mono',
  sides: 'single',
  pages: 1,
  copies: 1,
  binding: 'none',
};

export default function App() {
  const [file, setFile] = useState<UploadedFileMeta | null>(null);
  const [options, setOptions] = useState<QuoteInput>(DEFAULT_OPTIONS);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [receipt, setReceipt] = useState<OrderRecord | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const quote = useMemo(() => calculateQuote(options), [options]);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function patchOptions(patch: Partial<QuoteInput>) {
    setOptions((current) => ({ ...current, ...patch }));
  }

  function handleLogin(provider: LoginProvider) {
    setUser({ name: DEMO_USER_NAME, provider });
    setLoginOpen(false);
    showToast(`시안 모드: ${DEMO_USER_NAME}님으로 로그인됨 (${PROVIDER_LABEL[provider]})`);
  }

  function handleLogout() {
    setUser(null);
    showToast('로그아웃되었습니다. 비회원으로도 견적을 낼 수 있어요.');
  }

  function handleOrder(record: OrderRecord) {
    setReceipt(record);
  }

  function handleReset() {
    setReceipt(null);
    setFile(null);
    setOptions(DEFAULT_OPTIONS);
    window.setTimeout(() => {
      document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  function scrollToOrder() {
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header user={user} onLoginClick={() => setLoginOpen(true)} onLogout={handleLogout} />

      <main>
        <Hero />

        <section id="quote" className="container-page pt-12 sm:pt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-brand-600">QUOTE</p>
              <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">
                실시간 견적 계산기
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                파일을 올리고 옵션만 고르면 금액이 바로 계산돼요. 로그인은 필요 없습니다.
              </p>
            </div>
            <p className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600">
              <IconShield className="h-3.5 w-3.5 text-mint" />
              파일은 브라우저에서만 확인
            </p>
          </div>

          <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_356px]">
            <div className="space-y-4">
              <Uploader
                file={file}
                pages={options.pages}
                onFileChange={setFile}
                onPagesChange={(pages) => patchOptions({ pages })}
              />
              <OptionsCard
                value={options}
                pagesAuto={Boolean(file?.autoDetected)}
                fileName={file?.name ?? null}
                onChange={patchOptions}
              />
            </div>
            <SummaryCard quote={quote} file={file} onOrder={scrollToOrder} />
          </div>
        </section>

        <PriceTable currentSize={quote.size} />

        <StoreInfo onSampleAction={showToast} />

        <OrderSection
          quote={quote}
          file={file}
          user={user}
          receipt={receipt}
          onLoginClick={() => setLoginOpen(true)}
          onSubmit={handleOrder}
          onReset={handleReset}
        />
      </main>

      <footer className="border-t border-ink-100 bg-ink-900 pb-24 pt-10 text-white lg:pb-10">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M7 3.5h7L18.5 8v12.5h-11z" fill="currentColor" />
                    <path d="M14 3.5V8h4.5" fill="none" stroke="#1E4FD8" strokeWidth="1.4" />
                  </svg>
                </span>
                <span className="text-[15px] font-extrabold tracking-tight">카피박스</span>
                <span className="text-[10px] font-semibold tracking-[0.2em] text-white/40">COPYBOX</span>
              </div>
              <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-white/50">
                일산 복사·출력·제본 전문점.
                <br />
                파일만 보내면 나머지는 저희가 준비합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-[12px] sm:gap-14">
              <div>
                <p className="font-bold text-white/80">바로가기</p>
                <ul className="mt-2.5 space-y-1.5 text-white/50">
                  <li>
                    <a href="#quote" className="transition hover:text-white">
                      견적 계산기
                    </a>
                  </li>
                  <li>
                    <a href="#price" className="transition hover:text-white">
                      단가표
                    </a>
                  </li>
                  <li>
                    <a href="#store" className="transition hover:text-white">
                      매장 안내
                    </a>
                  </li>
                  <li>
                    <a href="#order" className="transition hover:text-white">
                      주문 접수
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-white/80">문의</p>
                <ul className="mt-2.5 space-y-1.5 text-white/50">
                  <li className="num">031-000-0000</li>
                  <li>카카오톡 @카피박스</li>
                  <li>경기도 고양시 일산동구 중앙로 1234</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-[10px] leading-relaxed text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p>
              시안용 페이지입니다. 상호·주소·연락처·단가는 모두 샘플이며 실제 매장 정보로 교체해 주세요.
              <br />
              상호 카피박스 · 대표 홍길동 · 사업자등록번호 000-00-00000 (샘플)
            </p>
            <p className="shrink-0">© 2026 COPYBOX. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* 모바일 하단 고정 견적 바 */}
      {!receipt && (file || options.pages > 1 || options.copies > 1 || options.binding !== 'none') && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 px-4 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium text-ink-400">
                총 예상 금액 · {quote.pages}면 × {quote.copies}부
              </p>
              <p className="num text-[19px] font-extrabold leading-tight text-ink-900">{won(quote.total)}</p>
            </div>
            <button type="button" onClick={scrollToOrder} className="btn-primary !px-4 !py-3 !text-[13px]">
              주문 접수
              <IconArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} />

      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          data-testid="toast"
          className="fixed inset-x-4 bottom-[86px] z-[60] mx-auto max-w-sm animate-fade-up rounded-xl bg-ink-900/95 px-4 py-3 text-center text-[12px] font-medium leading-relaxed text-white shadow-lift lg:bottom-6"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
