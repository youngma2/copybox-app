import { PROVIDER_LABEL, type DemoUser } from '../lib/auth';
import { IconPhone, IconUser } from './Icons';

interface HeaderProps {
  user: DemoUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

const NAV = [
  { href: '#quote', label: '견적 계산기' },
  { href: '#price', label: '단가표' },
  { href: '#store', label: '매장 안내' },
  { href: '#order', label: '주문 접수' },
];

export default function Header({ user, onLoginClick, onLogout }: HeaderProps) {
  return (
    <>
      <div className="bg-ink-900 text-white">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-[11px] sm:text-xs">
          <p className="truncate text-white/70">
            <span className="mr-1.5 rounded-full bg-sun px-1.5 py-0.5 font-bold text-ink-900">시안</span>
            매장 정보와 단가는 샘플입니다 · 실제 정보로 교체할 수 있어요
          </p>
          <p className="hidden shrink-0 text-white/50 sm:block">비회원도 바로 견적·주문 가능</p>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-ink-100 bg-paper/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2.5" aria-label="카피박스 홈">
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
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="tel:031-000-0000"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-50 lg:flex"
            >
              <IconPhone className="h-4 w-4" />
              031-000-0000
            </a>

            {user ? (
              <div className="flex items-center gap-1.5">
                <span
                  data-testid="user-chip"
                  className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-2.5"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {user.name.slice(0, 1)}
                  </span>
                  <span className="text-xs font-semibold text-ink-800">{user.name}님</span>
                  <span className="hidden text-[10px] font-medium text-ink-400 sm:block">
                    {PROVIDER_LABEL[user.provider]}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-400 transition hover:bg-ink-50 hover:text-ink-800"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="login-open"
                onClick={onLoginClick}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] font-semibold text-ink-800 transition hover:border-ink-400 hover:bg-ink-50"
              >
                <IconUser className="h-4 w-4 text-ink-600" />
                간편 로그인
              </button>
            )}

            <a href="#quote" className="btn-primary hidden !rounded-xl !px-4 !py-2 !text-[13px] sm:inline-flex">
              견적 내기
            </a>
          </div>
        </div>
      </header>
    </>
  );
}
