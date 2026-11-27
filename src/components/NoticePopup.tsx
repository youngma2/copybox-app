import { useEffect, useState } from 'react';
import { ANNOUNCEMENT, STORE } from '../config/store';
import { IconClose } from './Icons';

const DISMISS_KEY = 'copybox.notice.dismissUntil';

interface NoticePopupProps {
  onEcoQuote: () => void;
  /** 여유 제작 특가는 A4 출력 전용 — 명함 페이지에서는 안내하지 않습니다. */
  ecoAvailable?: boolean;
}

function endOfToday(): number {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export default function NoticePopup({ onEcoQuote, ecoAvailable = true }: NoticePopupProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissedUntil = 0;
    try {
      dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    } catch {
      dismissedUntil = 0;
    }
    if (Number.isFinite(dismissedUntil) && dismissedUntil > Date.now()) return;
    const timer = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  function dismissToday() {
    try {
      localStorage.setItem(DISMISS_KEY, String(endOfToday()));
    } catch {
      /* 저장할 수 없으면 이번만 닫습니다. */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="공지 닫기"
        onClick={close}
        className="absolute inset-0 cursor-default bg-ink-900/55"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-title"
        data-testid="notice-popup"
        className="relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="relative overflow-hidden bg-ink-900 px-5 pb-5 pt-6 text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-500/30 blur-2xl" aria-hidden="true" />
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <IconClose className="h-5 w-5" />
          </button>
          <p className="text-[10px] font-bold tracking-[0.28em] text-sun">{ANNOUNCEMENT.eyebrow}</p>
          <h2 id="notice-title" className="mt-2 break-words text-[21px] font-extrabold leading-snug tracking-tight">
            {ANNOUNCEMENT.title}
          </h2>
          <p className="mt-2 break-words text-[12.5px] leading-relaxed text-white/75">{ANNOUNCEMENT.body}</p>
        </div>

        <div className="px-5 py-5">
          {ecoAvailable ? (
            <>
              <div className="rounded-2xl border border-mint/30 bg-mint/5 px-4 py-3.5">
                <p className="text-[13px] font-extrabold text-mint">{ANNOUNCEMENT.ecoTitle}</p>
                <p className="mt-1 break-words text-[11.5px] leading-relaxed text-ink-600">{ANNOUNCEMENT.ecoBody}</p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-ink-400">
                  배송 도착일이 아닌 출고(택배 접수 완료 · 방문수령 준비 완료) 기준입니다. A4 출력 전용 특가입니다.
                </p>
              </div>

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  data-testid="notice-eco-cta"
                  onClick={() => {
                    close();
                    onEcoQuote();
                  }}
                  className="btn-primary w-full !bg-mint hover:!bg-mint/90"
                >
                  {ANNOUNCEMENT.ecoCta}
                </button>
                <button type="button" data-testid="notice-close" onClick={close} className="btn-ghost !py-2.5 !text-[13px]">
                  그냥 둘러보기
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
                <p className="text-[13px] font-extrabold text-ink-900">명함은 시안 확정 후 인쇄합니다</p>
                <p className="mt-1 break-words text-[11.5px] leading-relaxed text-ink-600">
                  시안 확인 요청 → 고객 [시안 확정(OK)] → 인쇄·재단 후 영업일 2~3일 내 출고. 시안 수정은 최대 2회까지 가능합니다.
                </p>
              </div>

              <div className="mt-3 grid gap-2">
                <button type="button" data-testid="notice-close" onClick={close} className="btn-ghost !py-3 !text-[13px]">
                  그냥 둘러보기
                </button>
              </div>
            </>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-100 pt-3">
            <p className="break-words text-[10px] text-ink-400">{STORE.isSample ? '매장 정보는 시안 샘플입니다.' : STORE.name}</p>
            <button
              type="button"
              data-testid="notice-dismiss-today"
              onClick={dismissToday}
              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-500 transition hover:bg-ink-50 hover:text-ink-800"
            >
              {ANNOUNCEMENT.closeOnce}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
