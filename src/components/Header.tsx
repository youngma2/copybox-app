import { PROVIDER_LABEL } from '../lib/auth';
import type { Customer } from '../lib/storage';
import { PRODUCT_PAGES } from '../config/products';
import { isProductView, type View } from '../lib/routing';
import { IconPhone, IconUser } from './Icons';

export type { View } from '../lib/routing';

interface HeaderProps {
  view: View;
  onNavigate: (view: View) => void;
  user: Customer | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

const TABS: { id: View; label: string; short: string; testId: string }[] = [
  { id: 'print', label: PRODUCT_PAGES.print.navLabel, short: PRODUCT_PAGES.print.navShort, testId: 'print' },
  { id: 'card', label: PRODUCT_PAGES.card.navLabel, short: PRODUCT_PAGES.card.navShort, testId: 'card' },
  { id: 'history', label: '내 주문 이력', short: '주문 이력', testId: 'history' },
  { id: 'admin', label: '관리자', short: '관리자', testId: 'admin' },
];

export default function Header({ view, onNavigate, user, onLoginClick, onLogout }: HeaderProps) {
  const productTab: View = isProductView(view) ? view : 'print';
  const ticker = PRODUCT_PAGES[isProductView(view) ? view : 'print'].ticker;

  return (
    <>
      <div className="bg-ink-900 text-white">
        <div className="container-page flex h-9 items-center justify-between gap-3 overflow-hidden text-[11px] sm:text-xs">
          <p className="min-w-0 truncate text-white/75">
            <span className="mr-1.5 rounded-full bg-sun px-1.5 py-0.5 font-bold text-ink-900">시안</span>
            {ticker}
          </p>
          <p className="hidden shrink-0 text-white/50 sm:block">비회원도 주문 가능</p>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-ink-100 bg-paper/90 backdrop-blur-md">
        <div className="container-page">
          <div className="flex h-16 items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onNavigate(productTab)}
              className="flex shrink-0 items-center gap-2.5 text-left"
              aria-label="카피박스 홈"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lift">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
                  <path d="M7 3.5h7L18.5 8v12.5h-11z" fill="currentColor" opacity="0.95" />
                  <path d="M14 3.5V8h4.5" fill="none" stroke="#1E4FD8" strokeWidth="1.4" />
                  <path d="M9.5 12.5h6M9.5 15.5h4" stroke="#1E4FD8" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <span className="leading-none">
                <span className="block text-[17px] font-extrabold tracking-tight text-ink-900">카피박스</span>
                <span className="mt-1 block text-[10px] font-semibold tracking-[0.22em] text-ink-400">COPYBOX</span>
              </span>
            </button>

            <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
              {TABS.map((tab) => {
                const active = tab.id === view;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-testid={`tab-${tab.testId}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onNavigate(tab.id)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      active ? 'bg-white text-brand-700 shadow-card' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex min-w-0 items-center gap-1.5">
              <a
                href="tel:031-000-0000"
                className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-50 lg:flex"
              >
                <IconPhone className="h-4 w-4" />
                031-000-0000
              </a>

              {user ? (
                <div className="flex min-w-0 items-center gap-1">
                  <span
                    data-testid="user-chip"
                    className="flex min-w-0 items-center gap-1.5 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-2"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                      {user.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 max-w-[76px] truncate text-xs font-semibold text-ink-800">
                      {user.name}님
                    </span>
                    <span className="hidden shrink-0 text-[10px] font-medium text-ink-400 sm:block">
                      {PROVIDER_LABEL[user.provider]}
                    </span>
                  </span>
                  <button
                    type="button"
                    data-testid="header-logout"
                    onClick={onLogout}
                    className="shrink-0 rounded-lg px-1.5 py-1.5 text-[11px] font-medium text-ink-400 transition hover:bg-ink-50 hover:text-ink-800"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="login-open"
                  onClick={onLoginClick}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-2.5 py-2 text-[12px] font-semibold text-ink-800 transition hover:border-ink-400 hover:bg-ink-50 sm:px-3 sm:text-[13px]"
                >
                  <IconUser className="h-4 w-4 shrink-0 text-ink-600" />
                  간편 로그인
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate(productTab)}
                className="btn-primary hidden !rounded-xl !px-4 !py-2 !text-[13px] sm:inline-flex"
              >
                견적 내기
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto pb-2 md:hidden" aria-label="모바일 메뉴">
            {TABS.map((tab) => {
              const active = tab.id === view;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`mtab-${tab.testId}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onNavigate(tab.id)}
                  className={`min-w-0 flex-1 whitespace-nowrap rounded-lg px-1 py-2 text-center text-[12px] font-semibold transition ${
                    active ? 'bg-white text-brand-700 shadow-card' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {tab.short}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
