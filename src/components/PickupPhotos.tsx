import { useRef, useState } from 'react';
import { fileToDataUrl } from '../lib/image';
import { PHOTO_POLICY } from '../config/store';
import type { PickupPhoto } from '../lib/storage/types';
import { IconClose, IconPlus } from './Icons';

interface PickupPhotosProps {
  photos: PickupPhoto[];
  editable: boolean;
  onAdd?: (dataUrl: string) => Promise<void>;
  onRemove?: (photoId: string) => Promise<void>;
}

/** 방문 수령 보관 사진 — 사장님은 최대 2장 업로드/삭제, 손님은 확인만 */
export default function PickupPhotos({ photos, editable, onAdd, onRemove }: PickupPhotosProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const full = photos.length >= 2;

  async function handleFile(file: File | null) {
    if (!file || !onAdd) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await onAdd(dataUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '사진을 올리지 못했어요.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function remove(photoId: string) {
    if (!onRemove) return;
    setBusy(true);
    setError(null);
    try {
      await onRemove(photoId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '사진을 삭제하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg bg-ink-50/70 px-3 py-2" data-testid="pickup-photos">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-ink-400">방문 수령 보관 사진</p>
        <span className="num text-[10px] text-ink-400">{photos.length}/2</span>
      </div>

      {photos.length === 0 ? (
        <p className="mt-1 text-[11px] text-ink-500">
          {editable ? '물건과 보관 위치 사진을 최대 2장까지 올려 주세요.' : '사장님이 보관 사진을 올리면 여기에서 확인할 수 있어요.'}
        </p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {photos.map((photo) => (
            <span key={photo.id} className="relative inline-block">
              <img
                src={photo.photoUrl}
                alt="방문 수령 보관 사진"
                data-testid="pickup-photo"
                className="h-16 w-16 rounded-lg border border-ink-200 bg-white object-cover"
              />
              {editable && onRemove && (
                <button
                  type="button"
                  onClick={() => void remove(photo.id)}
                  aria-label="보관 사진 삭제"
                  disabled={busy}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-white disabled:opacity-50"
                >
                  <IconClose className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {editable && !full && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            data-testid="pickup-photo-input"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            data-testid="pickup-photo-add"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-700 disabled:opacity-50"
          >
            <IconPlus className="h-3.5 w-3.5" />
            {busy ? '올리는 중…' : '사진 올리기'}
          </button>
        </>
      )}
      {editable && full && <p className="mt-1.5 text-[10px] text-ink-400">2장이 모두 올라갔어요. 바꾸려면 기존 사진을 삭제해 주세요.</p>}
      {error && <p className="mt-1 text-[10px] font-medium text-rose-600">{error}</p>}
      {editable && <p className="mt-1 text-[9px] leading-relaxed text-ink-400">{PHOTO_POLICY}</p>}
    </div>
  );
}
