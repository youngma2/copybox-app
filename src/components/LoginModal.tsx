import { useEffect, type ReactNode } from 'react';
import type { LoginProvider } from '../lib/auth';
import { PROVIDER_LABEL } from '../lib/auth';
import { IconClose, IconGoogle, IconKakao, IconNaver } from './Icons';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (provider: LoginProvider) => void;
}

const PROVIDERS: {
  id: LoginProvider;
  label: string;
  className: string;
  icon: ReactNode;
}[] = [
  {
    id: 'kakao',
    label: '카카오로 시작하기',
    className: 'bg-[#FEE500] text-[#191919] hover:brightness-[0.97]',
    icon: <IconKakao className="h-5 w-5" />,
  },
  {
    id: 'naver',
    label: '네이버로 시작하기',
    className: 'bg-[#03C75A] text-white hover:brightness-[0.97]',
    icon: <IconNaver className="h-5 w-5" />,
  },
  {
    id: 'google',
    label: 'Google로 계속하기',
    className: 'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50',
    icon: <IconGoogle className="h-5 w-5" />,
  },
];

export default function LoginModal({ open, onClose, onLogin }: LoginModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="로그인 창 닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-900/50 animate-[fade-in_0.15s_ease-out]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        data-testid="login-modal"
        className="relative w-full max-w-[420px] animate-fade-up rounded-t-3xl bg-white p-6 pb-8 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-ink-400 transition hover:bg-ink-50 hover:text-ink-800"
        >
          <IconClose className="h-5 w-5" />
        </button>

        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
            <rect x="5" y="10" width="14" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="14.3" r="1.2" fill="currentColor" />
          </svg>
        </div>

        <h2 id="login-title" className="mt-4 text-center text-xl font-extrabold tracking-tight text-ink-900">
          간편 로그인
        </h2>
        <p className="mt-1.5 text-center text-sm leading-relaxed text-ink-600">
          주문 내역과 인쇄 파일을
          <br className="sm:hidden" /> 안전하게 보관해 드려요.
        </p>

        <div className="mt-6 space-y-2.5">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              data-testid={`login-${provider.id}`}
              onClick={() => onLogin(provider.id)}
              className={`flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-[15px] font-bold transition active:scale-[0.99] ${provider.className}`}
              aria-label={`${PROVIDER_LABEL[provider.id]} 계정으로 로그인 (시안)`}
            >
              {provider.icon}
              {provider.label}
            </button>
          ))}
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink-100" />
          <span className="text-xs font-medium text-ink-400">또는</span>
          <span className="h-px flex-1 bg-ink-100" />
        </div>

        <button
          type="button"
          data-testid="login-guest"
          onClick={onClose}
          className="h-11 w-full rounded-xl border border-ink-200 text-sm font-semibold text-ink-800 transition hover:bg-ink-50"
        >
          비회원으로 계속하기
        </button>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-400">
          시안 화면입니다 · 실제 로그인 연동 전이며
          <br />
          어떤 개인정보도 전송되지 않습니다.
        </p>
      </div>
    </div>
  );
}
