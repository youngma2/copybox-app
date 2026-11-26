import { useMemo, useState } from 'react';
import { won } from '../../lib/format';
import type { OrderWithCustomer } from '../../lib/storage/types';
import { describeOrderOptions } from '../../lib/describe';

type RangeKey = 'day' | 'week' | 'month' | 'year' | 'custom';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setHours(23, 59, 59, 999);
  return next;
}

function rangeFor(key: RangeKey, customStart: string, customEnd: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (key === 'day') {
    return { start: startOfDay(now), end: endOfDay(now), label: '오늘' };
  }
  if (key === 'week') {
    const start = startOfDay(now);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    return { start, end: endOfDay(now), label: '이번 주 (월~오늘)' };
  }
  if (key === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: endOfDay(now), label: '이번 달' };
  }
  if (key === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end: endOfDay(now), label: '올해' };
  }
  const start = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : startOfDay(now);
  const end = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : endOfDay(now);
  return { start, end, label: `${customStart || toKey(now)} ~ ${customEnd || toKey(now)}` };
}

export default function AdminDashboard({ orders }: { orders: OrderWithCustomer[] }) {
  const [range, setRange] = useState<RangeKey>('month');
  const [customStart, setCustomStart] = useState(toKey(new Date()));
  const [customEnd, setCustomEnd] = useState(toKey(new Date()));

  const { start, end, label } = rangeFor(range, customStart, customEnd);

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const at = new Date(order.createdAt).getTime();
        return at >= start.getTime() && at <= end.getTime();
      }),
    [orders, start, end],
  );

  const revenue = filtered.reduce((sum, order) => sum + order.totalPrice, 0);
  const average = filtered.length > 0 ? Math.round(revenue / filtered.length) : 0;

  const byWeekday = useMemo(() => {
    const buckets = new Array(7).fill(0) as number[];
    filtered.forEach((order) => {
      buckets[new Date(order.createdAt).getDay()] += 1;
    });
    return buckets;
  }, [filtered]);

  const byHour = useMemo(() => {
    const buckets = new Array(24).fill(0) as number[];
    filtered.forEach((order) => {
      buckets[new Date(order.createdAt).getHours()] += 1;
    });
    return buckets;
  }, [filtered]);

  const combos = useMemo(() => {
    const map = new Map<string, { label: string; count: number; revenue: number }>();
    filtered.forEach((order) => {
      const key = `${order.product}|${order.paperSize}|${order.colorMode}|${order.sides}|${order.copies}|${order.binding}|${order.cardPaper ?? ''}|${order.cardQty ?? ''}`;
      const label = describeOrderOptions(order);
      const entry = map.get(key) ?? { label, count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += order.totalPrice;
      map.set(key, entry);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 5);
  }, [filtered]);

  const maxWeekday = Math.max(1, ...byWeekday);
  const maxHour = Math.max(1, ...byHour);
  const peakHour = byHour.indexOf(Math.max(...byHour));

  return (
    <div data-testid="admin-dashboard">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {([
            ['day', '일'],
            ['week', '주'],
            ['month', '월'],
            ['year', '연'],
            ['custom', '기간 지정'],
          ] as [RangeKey, string][]).map(([key, text]) => (
            <button
              key={key}
              type="button"
              data-testid={`dashboard-range-${key}`}
              aria-pressed={range === key}
              onClick={() => setRange(key)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                range === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="date"
              value={customStart}
              data-testid="dashboard-start"
              onChange={(event) => setCustomStart(event.target.value)}
              className="field !w-auto !py-1.5 !text-[11px]"
              aria-label="시작일"
            />
            <span className="text-[11px] text-ink-400">~</span>
            <input
              type="date"
              value={customEnd}
              data-testid="dashboard-end"
              onChange={(event) => setCustomEnd(event.target.value)}
              className="field !w-auto !py-1.5 !text-[11px]"
              aria-label="종료일"
            />
          </div>
        )}
        <span className="ml-auto text-[11px] text-ink-400">{label}</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="card px-3 py-3">
          <dt className="text-[10px] font-semibold text-ink-400">총 결제 금액</dt>
          <dd data-testid="dashboard-revenue" className="num mt-0.5 text-[20px] font-extrabold text-ink-900">
            {won(revenue)}
          </dd>
        </div>
        <div className="card px-3 py-3">
          <dt className="text-[10px] font-semibold text-ink-400">주문량</dt>
          <dd data-testid="dashboard-count" className="num mt-0.5 text-[20px] font-extrabold text-brand-700">
            {filtered.length}
            <span className="ml-0.5 text-[11px] font-bold text-ink-400">건</span>
          </dd>
        </div>
        <div className="card col-span-2 px-3 py-3 sm:col-span-1">
          <dt className="text-[10px] font-semibold text-ink-400">평균 객단가</dt>
          <dd data-testid="dashboard-average" className="num mt-0.5 text-[20px] font-extrabold text-mint">
            {won(average)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card min-w-0 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold text-ink-900">요일별 주문</p>
            <span className="text-[10px] text-ink-400">가장 많은 요일 {WEEKDAYS[byWeekday.indexOf(Math.max(...byWeekday))]}요일</span>
          </div>
          <ul className="mt-3 space-y-1.5" data-testid="dashboard-weekday">
            {byWeekday.map((count, index) => (
              <li key={WEEKDAYS[index]} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-[10px] font-semibold text-ink-500">{WEEKDAYS[index]}</span>
                <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-50">
                  <span
                    className="block h-full rounded-full bg-brand-500"
                    style={{ width: `${(count / maxWeekday) * 100}%` }}
                  />
                </span>
                <span className="num w-7 shrink-0 text-right text-[10px] font-bold text-ink-700">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card min-w-0 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold text-ink-900">시간대별 주문</p>
            <span className="text-[10px] text-ink-400">집중 시간대 {pad(peakHour)}시</span>
          </div>
          <div className="mt-3 flex h-24 items-end gap-[2px]" data-testid="dashboard-hour">
            {byHour.map((count, hour) => (
              <span
                key={hour}
                className="flex h-full min-w-0 flex-1 flex-col justify-end"
                title={`${pad(hour)}시 · ${count}건`}
              >
                <span
                  className={`w-full rounded-t ${count > 0 ? 'bg-mint/70' : 'bg-ink-100'}`}
                  style={{ height: count > 0 ? `${Math.max(6, (count / maxHour) * 100)}%` : '2px' }}
                />
              </span>
            ))}
          </div>
          <div className="mt-1 flex gap-[2px] text-[8px] text-ink-400" aria-hidden="true">
            {byHour.map((_, hour) => (
              <span key={hour} className="min-w-0 flex-1 text-center">
                {hour % 3 === 0 ? hour : ''}
              </span>
            ))}
          </div>
          <p className="mt-0.5 text-[10px] text-ink-400">0~23시 · 주문 접수 시각 기준</p>
        </div>
      </div>

      <div className="card mt-3 min-w-0 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-bold text-ink-900">자주 주문하는 옵션 조합</p>
          <span className="text-[10px] text-ink-400">같은 옵션으로 묶은 순위</span>
        </div>
        {combos.length === 0 ? (
          <p className="mt-3 rounded-lg bg-ink-50 px-3 py-3 text-[11px] text-ink-500">이 기간에는 주문이 없습니다.</p>
        ) : (
          <ol className="mt-3 space-y-2" data-testid="dashboard-combos">
            {combos.map((combo, index) => (
              <li key={combo.label} className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 break-words text-[11px] font-semibold text-ink-800">{combo.label}</span>
                <span className="num shrink-0 text-[10px] text-ink-500">
                  {combo.count}건 · {won(combo.revenue)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
        결제가 끝난 주문만 집계합니다(미결제·작성 중 이탈 제외). 합계는 부가세 포함 금액입니다.
      </p>
    </div>
  );
}
