import { STORE } from '../config/store';
import { SHIPPING_NOTE } from '../config/delivery';
import { IconChat, IconClock, IconPhone, IconPin, IconStore, IconTruck } from './Icons';

interface StoreInfoProps {
  onSampleAction: (message: string) => void;
}

const HOURS = STORE.hours;

export default function StoreInfo({ onSampleAction }: StoreInfoProps) {
  return (
    <section id="store" className="bg-white/60 py-14 sm:py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-brand-600">STORE</p>
            <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">
              매장 안내
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              일산에서 가장 가까운 출력실. 파일만 보내고 편하게 찾아가세요.
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
            아래 정보는 시안용 샘플입니다
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-lift">
                <IconStore className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-[17px] font-extrabold tracking-tight text-ink-900">{STORE.name}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-600">
                  복사 · 출력 · 제본 · 스캔 · 명함 · 포스터
                </p>
              </div>
            </div>

            <dl className="mt-5 space-y-4">
              <div className="flex gap-3">
                <dt className="mt-0.5 text-ink-400" aria-label="주소">
                  <IconPin className="h-[18px] w-[18px]" />
                </dt>
                <dd className="text-[13px] leading-relaxed text-ink-800">
                  {STORE.address}
                  <span className="mt-0.5 block text-[11px] text-ink-400">{STORE.addressNote}</span>
                </dd>
              </div>

              <div className="flex gap-3">
                <dt className="mt-0.5 text-ink-400" aria-label="영업시간">
                  <IconClock className="h-[18px] w-[18px]" />
                </dt>
                <dd className="w-full">
                  <span className="text-[13px] font-semibold text-ink-800">영업시간</span>
                  <ul className="mt-1.5 space-y-1">
                    {HOURS.map((row) => (
                      <li key={row.day} className="flex items-center justify-between gap-3 text-[12px]">
                        <span className="text-ink-600">{row.day}</span>
                        <span className={`num font-semibold ${row.time === '휴무' ? 'text-ink-400' : 'text-ink-800'}`}>
                          {row.time}
                        </span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>

              <div className="flex gap-3">
                <dt className="mt-0.5 text-ink-400" aria-label="전화">
                  <IconPhone className="h-[18px] w-[18px]" />
                </dt>
                <dd className="text-[13px] text-ink-800">
                  <a href={STORE.phoneHref} className="num font-semibold underline decoration-ink-200 underline-offset-4 hover:decoration-brand-500">
                    {STORE.phone}
                  </a>
                  <span className="mt-0.5 block text-[11px] text-ink-400">샘플 번호 · 영업시간 내 연결</span>
                </dd>
              </div>

              <div className="flex gap-3">
                <dt className="mt-0.5 text-ink-400" aria-label="카카오톡">
                  <IconChat className="h-[18px] w-[18px]" />
                </dt>
                <dd className="text-[13px] text-ink-800">
                  카카오톡 채널 <span className="font-semibold">{STORE.kakaoChannel}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-400">파일 전송 · 견적 문의</span>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="mt-0.5 text-ink-400" aria-label="주차">
                  <IconTruck className="h-[18px] w-[18px]" />
                </dt>
                <dd className="text-[13px] text-ink-800">
                  주차 <span className="font-semibold">건물 뒤편 30분 무료</span>
                  <span className="mt-0.5 block text-[11px] text-ink-400">만차 시 인근 공영주차장 이용 (샘플)</span>
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <a href={STORE.phoneHref} className="btn-primary !px-4 !py-2.5 !text-[13px]">
                <IconPhone className="h-4 w-4" />
                전화하기
              </a>
              <button
                type="button"
                onClick={() => onSampleAction('시안 화면입니다 · 카카오톡 채널 링크를 실제 주소로 연결해 주세요.')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 py-2.5 text-[13px] font-bold text-[#191919] transition hover:brightness-[0.97]"
              >
                <IconChat className="h-4 w-4" />
                카카오톡 문의
              </button>
            </div>
          </div>

          <div className="card flex flex-col overflow-hidden">
            <div className="relative flex-1 overflow-hidden bg-ink-50 p-5">
              <div className="absolute inset-0 bg-grid opacity-60" aria-hidden="true" />
              <div className="relative flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white/70 p-6 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-white shadow-lift">
                  <IconPin className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[13px] font-bold text-ink-900">지도 영역</p>
                <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-ink-400">
                  네이버 지도 · 카카오맵을 이 자리에 넣으면 실제 매장 위치가 표시됩니다. (샘플)
                </p>
                <button
                  type="button"
                  onClick={() => onSampleAction('시안 화면입니다 · 지도 API 또는 매장 위치 링크를 연결해 주세요.')}
                  className="mt-4 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-800 transition hover:bg-ink-50"
                >
                  길찾기 (샘플)
                </button>
              </div>
            </div>
            <div className="grid gap-2 border-t border-ink-100 p-4 sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-lg bg-ink-50/70 p-3">
                <IconTruck className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                <p className="break-words text-[11px] leading-relaxed text-ink-600">
                  <strong className="font-semibold text-ink-800">택배비 · 포장비</strong>
                  <br />
                  {SHIPPING_NOTE}
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-ink-50/70 p-3">
                <IconClock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                <p className="text-[11px] leading-relaxed text-ink-600">
                  <strong className="font-semibold text-ink-800">🌿 여유 제작 특가</strong>
                  <br />
                  영업일 4일 이내 출고 · 인쇄비 10% 할인
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
