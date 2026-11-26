import { useEffect, useState } from 'react';
import { won } from '../lib/format';
import {
  BINDING_NOTE,
  BINDING_OPTIONS,
  COLOR_LABEL,
  MAX_COPIES,
  MAX_PAGES,
  MIN_COPIES,
  MIN_PAGES,
  PAPER_NOTE,
  SIDES_LABEL,
  clamp,
  unitPagePrice,
  type BindingId,
  type ColorMode,
  type QuoteInput,
  type Sides,
} from '../lib/pricing';
import { IconMinus, IconPlus } from './Icons';

interface OptionsCardProps {
  value: QuoteInput;
  pagesAuto: boolean;
  fileName: string | null;
  onChange: (patch: Partial<QuoteInput>) => void;
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  sub?: string;
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  testIdPrefix,
  columns,
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  testIdPrefix: string;
  columns: string;
}) {
  return (
    <div role="group" aria-label={label} className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            data-testid={`${testIdPrefix}-${option.value}`}
            onClick={() => onChange(option.value)}
            className={`min-w-0 rounded-xl border px-2 py-2.5 text-center transition ${
              selected
                ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600'
                : 'border-ink-100 bg-white text-ink-800 hover:border-ink-200 hover:bg-ink-50/60'
            }`}
          >
            <span className="block truncate text-sm font-bold">{option.label}</span>
            {option.sub ? (
              <span className={`mt-0.5 block truncate text-[10px] font-medium ${selected ? 'text-brand-600' : 'text-ink-400'}`}>
                {option.sub}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  testId,
  unit = '페이지',
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  label: string;
  testId: string;
  unit?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(next: number) {
    const clamped = clamp(next, min, max);
    onChange(clamped);
    setDraft(String(clamped));
  }

  return (
    <div className="flex w-full max-w-[220px] items-stretch overflow-hidden rounded-xl border border-ink-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      <button
        type="button"
        aria-label={`${label} 줄이기`}
        onClick={() => commit(value - step)}
        disabled={value <= min}
        className="grid w-10 shrink-0 place-items-center text-ink-600 transition hover:bg-ink-50 disabled:opacity-30"
      >
        <IconMinus className="h-4 w-4" />
      </button>
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1 py-2.5">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={draft}
          aria-label={label}
          data-testid={testId}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^0-9]/g, '');
            setDraft(digits);
            if (digits === '') return;
            const parsed = Number(digits);
            if (parsed >= min && parsed <= max) onChange(parsed);
          }}
          onBlur={() => {
            if (draft === '') {
              commit(value);
              return;
            }
            commit(Number(draft));
          }}
          className="num w-12 bg-transparent text-center text-[15px] font-bold text-ink-900 outline-none"
        />
        <span className="text-xs font-medium text-ink-400">{unit}</span>
      </div>
      <button
        type="button"
        aria-label={`${label} 늘리기`}
        onClick={() => commit(value + step)}
        disabled={value >= max}
        className="grid w-10 shrink-0 place-items-center text-ink-600 transition hover:bg-ink-50 disabled:opacity-30"
      >
        <IconPlus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function OptionsCard({ value, pagesAuto, fileName, onChange }: OptionsCardProps) {
  const colorOptions: SegmentedOption<ColorMode>[] = (['mono', 'color'] as ColorMode[]).map((color) => ({
    value: color,
    label: COLOR_LABEL[color],
    sub: `${won(unitPagePrice(value.size, color, 'single'))}/페이지`,
  }));

  const sideOptions: SegmentedOption<Sides>[] = (['single', 'double'] as Sides[]).map((sides) => ({
    value: sides,
    label: SIDES_LABEL[sides],
    sub: `${won(unitPagePrice(value.size, value.color, sides))}/페이지`,
  }));

  return (
    <section className="card" aria-labelledby="options-title">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-4 py-4 sm:px-5 md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M5 7h14M5 12h14M5 17h9" />
            </svg>
          </span>
          <h3 id="options-title" className="text-[15px] font-bold tracking-tight text-ink-900">
            인쇄 옵션
          </h3>
        </div>
        <p className="text-[11px] text-ink-400">바꾸는 즉시 견적이 다시 계산돼요</p>
      </div>

      <div className="space-y-5 px-4 py-5 sm:px-5 md:px-6 md:py-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold text-ink-800">용지 크기</span>
              <span className="text-[10px] font-medium text-ink-400">규격</span>
            </div>
            <div
              data-testid="size-a4"
              aria-label="용지 크기 A4"
              className="flex items-center justify-between rounded-xl border border-brand-600 bg-brand-50 px-3 py-2.5 ring-1 ring-brand-600"
            >
              <span className="text-sm font-bold text-brand-700">A4</span>
              <span className="text-[10px] font-semibold text-brand-600">한 가지 규격</span>
            </div>
            <p className="mt-1.5 text-[10px] text-ink-400">{PAPER_NOTE.A4}</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold text-ink-800">색상</span>
              <span className="text-[10px] font-medium text-ink-400">1페이지 기준</span>
            </div>
            <Segmented
              label="색상"
              testIdPrefix="color"
              columns="grid-cols-2"
              value={value.color}
              options={colorOptions}
              onChange={(color) => onChange({ color })}
            />
            <p className="mt-1.5 text-[10px] text-ink-400">
              {value.color === 'mono' ? '검정 토너로 출력 · 가장 경제적' : '사진·도표가 많은 문서에 추천'}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold text-ink-800">인쇄 방식</span>
              <span className="text-[10px] font-medium text-ink-400">단면 / 양면</span>
            </div>
            <Segmented
              label="인쇄 방식"
              testIdPrefix="sides"
              columns="grid-cols-2"
              value={value.sides}
              options={sideOptions}
              onChange={(sides) => onChange({ sides })}
            />
            <p className="mt-1.5 text-[10px] text-ink-400">
              양면은 종이 {value.sides === 'double' ? Math.ceil(value.pages / 2) : value.pages}장으로 인쇄돼요
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-ink-800">페이지 수</span>
              {pagesAuto ? (
                <span className="rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-bold text-mint">자동 인식</span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  직접 입력
                </span>
              )}
            </div>
            <Stepper
              value={value.pages}
              min={MIN_PAGES}
              max={MAX_PAGES}
              onChange={(pages) => onChange({ pages })}
              label="페이지 수"
              testId="pages-input"
            />
            <p className="mt-1.5 truncate text-[10px] text-ink-400">
              {fileName ? `${fileName} · 1페이지 = 1면` : '파일을 올리면 자동으로 채워져요'}
            </p>
          </div>
        </div>

        <div className="h-px bg-ink-100" />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-bold text-ink-800">제본 방식</span>
            <span className="text-[10px] font-medium text-ink-400">3종 · 1부 기준</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BINDING_OPTIONS.map((option) => {
              const selected = option.id === value.binding;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  data-testid={`binding-${option.id}`}
                  onClick={() => onChange({ binding: option.id as BindingId })}
                  className={`min-w-0 rounded-xl border px-1.5 py-2.5 text-center transition ${
                    selected
                      ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                      : 'border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-50/60'
                  }`}
                >
                  <span className={`block truncate text-[13px] font-bold ${selected ? 'text-brand-700' : 'text-ink-900'}`}>
                    {option.label}
                  </span>
                  <span className={`mt-0.5 block truncate text-[10px] ${selected ? 'text-brand-600' : 'text-ink-400'}`}>
                    {option.price === 0 ? '0원' : `${won(option.price)}~`}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-ink-400">{BINDING_NOTE}</p>
        </div>

        <div className="h-px bg-ink-100" />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full sm:w-48">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold text-ink-800">부수</span>
              <span className="text-[10px] font-medium text-ink-400">같은 내용 몇 부</span>
            </div>
            <Stepper
              value={value.copies}
              min={MIN_COPIES}
              max={MAX_COPIES}
              onChange={(copies) => onChange({ copies })}
              label="부수"
              testId="copies-input"
              unit="부"
            />
          </div>
          <p className="max-w-full text-[10px] leading-relaxed text-ink-400">
            {value.size} {COLOR_LABEL[value.color]} {SIDES_LABEL[value.sides]} · 페이지{' '}
            {value.sides === 'double' ? Math.ceil(value.pages / 2) : value.pages}장 × {value.copies}부
            <br />
            제본비는 부수마다 한 번씩 더해져요
          </p>
        </div>
      </div>
    </section>
  );
}
