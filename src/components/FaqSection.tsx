import { useState } from 'react';
import { FAQ_ITEMS, STORE } from '../config/store';
import { IconChat } from './Icons';

interface FaqSectionProps {
  onKakao: () => void;
}

export default function FaqSection({ onKakao }: FaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  return (
    <section id="faq" className="container-page py-14 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.18em] text-brand-600">FAQ</p>
          <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">자주 묻는 질문</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
            제작 기간·파일 형식·택배비·개인정보 처리까지 한 번에 확인하세요.
          </p>
        </div>
        <button
          type="button"
          data-testid="faq-kakao"
          onClick={onKakao}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#FEE500] px-4 py-2.5 text-[13px] font-bold text-[#191919] transition hover:brightness-[0.97]"
        >
          <IconChat className="h-4 w-4" />
          카카오톡으로 문의하기
        </button>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="card divide-y divide-ink-100 overflow-hidden" data-testid="faq-list">
          {FAQ_ITEMS.map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} className="min-w-0">
                <button
                  type="button"
                  data-testid={`faq-toggle-${item.id}`}
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-ink-50/60 sm:px-5"
                >
                  <span className="min-w-0 break-words text-[13px] font-bold text-ink-900">Q. {item.question}</span>
                  <span className={`mt-0.5 shrink-0 text-[12px] font-bold text-brand-600 transition ${open ? 'rotate-45' : ''}`} aria-hidden="true">
                    +
                  </span>
                </button>
                {open && (
                  <p data-testid={`faq-answer-${item.id}`} className="break-words px-4 pb-4 text-[12px] leading-relaxed text-ink-600 sm:px-5">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="card min-w-0 bg-ink-900 p-5 text-white">
          <p className="text-[10px] font-bold tracking-[0.2em] text-sun">KAKAO CHANNEL</p>
          <h3 className="mt-2 text-[17px] font-extrabold">카톡으로 바로 물어보세요</h3>
          <p className="mt-2 break-words text-[11.5px] leading-relaxed text-white/70">
            파일 전송·급한 주문·시안 요청은 카카오톡 채널 <strong className="font-semibold text-white">{STORE.kakaoChannel}</strong>
            에서 가장 빠릅니다. 영업시간 내에 답 드려요.
          </p>
          <button
            type="button"
            onClick={onKakao}
            data-testid="faq-kakao-card"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 py-3 text-[13px] font-bold text-[#191919] transition hover:brightness-[0.97]"
          >
            <IconChat className="h-4 w-4" />
            카카오톡 채널 열기
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-white/40">
            {STORE.kakaoUrl
              ? '카카오톡 채널로 연결됩니다.'
              : '채널 링크 연결 전 자리입니다. 링크가 준비되면 이 버튼이 채널로 바로 연결됩니다.'}
          </p>
        </div>
      </div>
    </section>
  );
}
