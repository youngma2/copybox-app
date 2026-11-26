import { useEffect, useState, type ReactNode } from 'react';
import { PROVIDER_LABEL, type LoginProvider } from '../lib/auth';
import { formatPhone, isValidPhone } from '../lib/order';
import type { StoreMode } from '../lib/store';
import { IconClose, IconGoogle, IconKakao, IconNaver } from './Icons';

interface LoginModalProps {
  open: boolean;
  mode: StoreMode;
  onClose: () => void;
  onLogin: (provider: LoginProvider) => Promise<void>;
  onLookup: (name: string, phone: string) => Promise<void>;
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

export default function LoginModal({ open, mode, onClose, onLogin, onLookup }: LoginModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function run(action: () => Promise<void>, fallbackMessage: string) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallbackMessage);
    } finally {
      setBusy(false);
    }
  }

  async function handleLookup() {
    if (name.trim() === '') {
      setError('성함을 입력해 주세요.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('휴대폰 번호를 정확히 입력해 주세요.');
      return;
    }
    await run(() => onLookup(name, phone), '이력을 찾지 못했습니다.');
  }

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
        className="relative max-h-[92vh] w-full max-w-[420px] overflow-y-auto animate-fade-up rounded-t-3xl bg-white p-5 pb-7 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-full text-ink-400 transition hover:bg-ink-50 hover:text-ink-800"
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
          간편 로그인 · 이력 찾기
        </h2>
        <p className="mt-1.5 text-center text-sm leading-relaxed text-ink-600">
          주문 내역과 요청사항을
          <br className="sm:hidden" /> 손님 ID에 묶어 안전하게 보관해 드려요.
        </p>

        <div className="mt-5 space-y-2.5">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              data-testid={`login-${provider.id}`}
              disabled={busy}
              onClick={() => run(() => onLogin(provider.id), `${PROVIDER_LABEL[provider.id]} 로그인에 실패했습니다.`)}
              className={`flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-[15px] font-bold transition active:scale-[0.99] disabled:opacity-60 ${provider.className}`}
              aria-label={`${PROVIDER_LABEL[provider.id]} 계정으로 로그인`}
            >
              {provider.icon}
              {provider.label}
            </button>
          ))}
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink-100" />
          <span className="text-xs font-medium text-ink-400">비회원 주문은</span>
          <span className="h-px flex-1 bg-ink-100" />
        </div>

        <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-3.5">
          <p className="text-[12px] font-bold text-ink-800">성함 · 연락처로 이력 찾기</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
            접수할 때 남긴 성함과 연락처가 모두 일치해야 조회됩니다.
          </p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              data-testid="lookup-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="성함"
              autoComplete="name"
              className="field !py-2.5 !text-[13px]"
              aria-label="이력 조회 성함"
            />
            <input
              type="tel"
              inputMode="numeric"
              data-testid="lookup-phone"
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
              placeholder="010-0000-0000"
              autoComplete="tel"
              className="field num !py-2.5 !text-[13px]"
              aria-label="이력 조회 연락처"
            />
          </div>
          <button
            type="button"
            data-testid="lookup-submit"
            disabled={busy}
            onClick={handleLookup}
            className="btn-ghost mt-2 w-full !py-2.5 !text-[13px] disabled:opacity-60"
          >
            {busy ? '확인 중…' : '이력 찾기'}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-rose-700">
            {error}
          </p>
        )}

        <button
          type="button"
          data-testid="login-guest"
          onClick={onClose}
          className="mt-3 h-11 w-full rounded-xl border border-ink-200 text-sm font-semibold text-ink-800 transition hover:bg-ink-50"
        >
          비회원으로 계속하기
        </button>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-400">
          {mode === 'demo'
            ? '시안 모드 · 실제 OAuth 연동 전이며, 입력한 정보는 이 브라우저에만 저장됩니다.'
            : 'Supabase 연결됨 · 손님 정보는 본인 계정에만 연결됩니다(RLS).'}
        </p>
      </div>
    </div>
  );
}
