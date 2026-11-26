import { useRef, useState } from 'react';
import { fileToDataUrl } from '../lib/image';
import { formatOrderDate } from '../lib/order';
import { REVIEW_POLICY } from '../config/store';
import type { Review } from '../lib/storage/types';
import { IconClose, IconPlus } from './Icons';

export function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-[20px]' : size === 'sm' ? 'text-[11px]' : 'text-[14px]';
  return (
    <span className={`inline-flex items-center gap-0.5 ${cls}`} aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.round(value) ? 'text-amber-400' : 'text-ink-200'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="별점">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star}점`}
          data-testid={`review-star-${star}`}
          onClick={() => onChange(star)}
          className={`text-[24px] leading-none transition ${star <= value ? 'text-amber-400' : 'text-ink-200 hover:text-amber-200'}`}
        >
          ★
        </button>
      ))}
      <span className="ml-1 text-[12px] font-semibold text-ink-600">{value}점</span>
    </div>
  );
}

/** 메인 화면 — 평균 별점 + 최근 후기 */
export function ReviewSummary({ reviews }: { reviews: Review[] }) {
  const visible = reviews.filter((review) => review.visible);
  const count = visible.length;
  const average = count > 0 ? visible.reduce((sum, review) => sum + review.rating, 0) / count : 0;

  return (
    <section id="reviews" className="bg-white/60 py-14 sm:py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.18em] text-brand-600">REVIEWS</p>
            <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">고객 후기</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
              배송 완료된 주문에 남긴 별점·한줄 후기입니다. 사진 후기도 함께 볼 수 있어요.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-card">
            <div>
              <p data-testid="review-average" className="num text-[26px] font-extrabold leading-none text-ink-900">
                {count > 0 ? average.toFixed(1) : '—'}
              </p>
              <p className="mt-1 text-[10px] text-ink-400">평균 별점</p>
            </div>
            <div className="border-l border-ink-100 pl-3">
              <Stars value={average} />
              <p className="mt-1 text-[10px] text-ink-400">후기 {count}건</p>
            </div>
          </div>
        </div>

        {count === 0 ? (
          <div className="card mt-6 px-5 py-8 text-center">
            <p className="text-[13px] font-bold text-ink-800">아직 등록된 후기가 없어요</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
              주문이 배송 완료되면 내 주문 이력에서 별점과 한줄 후기를 남길 수 있습니다.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {visible.slice(0, 6).map((review) => (
              <li key={review.id} data-testid="review-item" className="card min-w-0 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Stars value={review.rating} />
                    <p className="mt-1.5 break-words text-[12.5px] leading-relaxed text-ink-800">{review.body || '별점만 남겼어요.'}</p>
                  </div>
                  {review.photoUrl && (
                    <img
                      src={review.photoUrl}
                      alt="후기 사진"
                      className="h-16 w-16 shrink-0 rounded-lg border border-ink-100 object-cover"
                    />
                  )}
                </div>
                <p className="num mt-2 text-[10px] text-ink-400">{formatOrderDate(review.createdAt)}</p>
                {review.adminReply && (
                  <p className="mt-2 rounded-lg bg-brand-50/70 px-2.5 py-2 text-[11px] leading-relaxed text-brand-800">
                    <strong className="font-bold">사장님 답글</strong> · {review.adminReply}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-ink-400">{REVIEW_POLICY}</p>
      </div>
    </section>
  );
}

/** 내 주문 이력 — 배송 완료 주문에 남기는 리뷰 폼 */
export function ReviewForm({
  orderNumber,
  onSubmit,
}: {
  orderNumber: string;
  onSubmit: (input: { rating: number; body: string; photoUrl: string | null }) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      setPhotoUrl(await fileToDataUrl(file, 800, 0.78));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '사진을 올리지 못했어요.');
    }
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ rating, body, photoUrl });
      setBody('');
      setPhotoUrl(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '리뷰를 저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-3" data-testid={`review-form-${orderNumber}`}>
      <p className="text-[12px] font-bold text-ink-900">이 주문은 어떠셨나요?</p>
      <p className="mt-0.5 text-[10px] text-ink-500">배송 완료된 주문에만 별점·한줄 후기를 남길 수 있어요.</p>
      <div className="mt-2">
        <StarInput value={rating} onChange={setRating} />
      </div>
      <textarea
        rows={2}
        value={body}
        data-testid="review-body"
        onChange={(event) => setBody(event.target.value.slice(0, 200))}
        placeholder="한줄 후기를 남겨 주세요 (예: 깔끔하게 잘 나왔어요)"
        className="field mt-2 resize-none !py-2 !text-[12px]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          data-testid="review-photo-input"
          onChange={(event) => void handlePhoto(event.target.files?.[0] ?? null)}
        />
        {photoUrl ? (
          <span className="flex items-center gap-2">
            <img src={photoUrl} alt="후기 사진 미리보기" className="h-12 w-12 rounded-lg border border-ink-200 object-cover" />
            <button type="button" onClick={() => setPhotoUrl(null)} className="text-[11px] font-semibold text-ink-500 underline">
              사진 빼기
            </button>
          </span>
        ) : (
          <button
            type="button"
            data-testid="review-photo-button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-700"
          >
            <IconPlus className="h-3.5 w-3.5" />
            사진 (선택)
          </button>
        )}
        <button
          type="button"
          data-testid="review-submit"
          disabled={busy}
          onClick={() => void submit()}
          className="ml-auto rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          {busy ? '저장 중…' : '후기 남기기'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}

/** 관리자 — 리뷰 답글·숨김 관리 */
export function AdminReviews({
  reviews,
  customers,
  onVisibility,
  onReply,
}: {
  reviews: Review[];
  customers: { id: string; name: string }[];
  onVisibility: (reviewId: string, visible: boolean) => void;
  onReply: (reviewId: string, reply: string) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const average = reviews.filter((r) => r.visible).length
    ? reviews.filter((r) => r.visible).reduce((sum, r) => sum + r.rating, 0) / reviews.filter((r) => r.visible).length
    : 0;

  return (
    <div className="space-y-3" data-testid="admin-reviews">
      <div className="card flex flex-wrap items-center justify-between gap-2 p-4">
        <div>
          <p className="text-[12px] font-bold text-ink-900">리뷰 관리</p>
          <p className="mt-0.5 text-[11px] text-ink-500">공개 평균 {average.toFixed(1)}점 · 전체 {reviews.length}건</p>
        </div>
        <p className="text-[10px] text-ink-400">답글은 공개 후기에 그대로 보입니다.</p>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-xl border border-ink-100 bg-white px-4 py-6 text-center text-[12px] text-ink-400">
          아직 등록된 리뷰가 없어요.
        </p>
      ) : (
        <ul className="space-y-2">
          {reviews.map((review) => {
            const customer = customers.find((row) => row.id === review.customerId);
            const value = draft[review.id] ?? review.adminReply ?? '';
            return (
              <li key={review.id} className="card min-w-0 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={review.rating} size="sm" />
                      <span className="text-[11px] font-semibold text-ink-800">{customer?.name ?? '손님'}</span>
                      <span className="text-[10px] text-ink-400">{formatOrderDate(review.createdAt)}</span>
                      {!review.visible && (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-500">숨김</span>
                      )}
                    </div>
                    <p className="mt-1 break-words text-[12px] text-ink-700">{review.body || '별점만 남겼어요.'}</p>
                  </div>
                  {review.photoUrl && (
                    <img src={review.photoUrl} alt="후기 사진" className="h-14 w-14 shrink-0 rounded-lg border border-ink-100 object-cover" />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={value}
                    onChange={(event) => setDraft((current) => ({ ...current, [review.id]: event.target.value }))}
                    placeholder="사장님 답글"
                    className="field min-w-0 flex-1 !py-1.5 !text-[11px]"
                    aria-label="사장님 답글"
                  />
                  <button
                    type="button"
                    data-testid={`review-reply-${review.id}`}
                    onClick={() => onReply(review.id, value)}
                    className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
                  >
                    답글 저장
                  </button>
                  <button
                    type="button"
                    data-testid={`review-visibility-${review.id}`}
                    onClick={() => onVisibility(review.id, !review.visible)}
                    className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] font-semibold text-ink-700"
                  >
                    {review.visible ? '숨기기' : '다시 공개'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[10px] text-ink-400">리뷰는 배송 완료 주문 1건당 1개만 등록됩니다.</p>
    </div>
  );
}

export function PhotoThumb({ src, onRemove, label }: { src: string; onRemove?: () => void; label?: string }) {
  return (
    <span className="relative inline-block">
      <img src={src} alt={label ?? '보관 사진'} className="h-16 w-16 rounded-lg border border-ink-100 object-cover" />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="사진 삭제"
          className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-white"
        >
          <IconClose className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
