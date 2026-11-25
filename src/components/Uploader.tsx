import { useEffect, useRef, useState } from 'react';
import { fileExtension, fileSize } from '../lib/format';
import { IconClose, IconFile, IconUpload } from './Icons';

export type FileKind = 'pdf' | 'document' | 'image';

export interface UploadedFileMeta {
  name: string;
  size: number;
  kind: FileKind;
  pages: number | null;
  autoDetected: boolean;
}

interface UploaderProps {
  file: UploadedFileMeta | null;
  pages: number;
  onFileChange: (file: UploadedFileMeta | null) => void;
  onPagesChange: (pages: number) => void;
}

const ACCEPT =
  '.pdf,.hwp,.hwpx,.doc,.docx,.txt,.rtf,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.heic,.tif,.tiff';

const MAX_BYTES = 50 * 1024 * 1024;

export function detectKind(name: string): FileKind {
  const ext = fileExtension(name).toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tif', 'tiff'].includes(ext)) return 'image';
  return 'document';
}

const KIND_STYLE: Record<FileKind, { badge: string; label: string }> = {
  pdf: { badge: 'bg-rose-50 text-rose-600', label: 'PDF' },
  document: { badge: 'bg-brand-50 text-brand-700', label: '문서' },
  image: { badge: 'bg-amber-50 text-amber-600', label: '이미지' },
};

export default function Uploader({ file, pages, onFileChange, onPagesChange }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setError(null);
      setNotice(null);
    }
  }, [file]);

  async function handleFile(candidate: File) {
    setNotice(null);
    setError(null);

    if (candidate.size > MAX_BYTES) {
      setError('파일이 50MB를 넘어요. 나눠서 올리시거나 매장으로 문의해 주세요.');
      return;
    }

    const kind = detectKind(candidate.name);

    if (kind !== 'pdf') {
      onFileChange({ name: candidate.name, size: candidate.size, kind, pages: null, autoDetected: false });
      setNotice('PDF가 아니면 페이지 수를 직접 입력해 주세요. (아래 인쇄 옵션에서 조정)');
      return;
    }

    setBusy(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const buffer = await candidate.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
      const count = doc.getPageCount();
      if (!Number.isFinite(count) || count < 1) throw new Error('empty-pdf');
      onFileChange({ name: candidate.name, size: candidate.size, kind, pages: count, autoDetected: true });
      onPagesChange(count);
    } catch {
      onFileChange({ name: candidate.name, size: candidate.size, kind, pages: null, autoDetected: false });
      setError('PDF 페이지 수를 자동으로 읽지 못했어요. 아래에서 직접 입력해 주세요. (암호가 걸린 파일일 수 있어요)');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function clearFile() {
    onFileChange(null);
    onPagesChange(1);
    setError(null);
    setNotice(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function openPicker() {
    if (busy) return;
    inputRef.current?.click();
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="upload-title">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <IconUpload className="h-4 w-4" />
          </span>
          <div>
            <h3 id="upload-title" className="text-[15px] font-bold tracking-tight text-ink-900">
              인쇄할 파일
            </h3>
            <p className="text-[11px] text-ink-400">PDF는 페이지 수를 자동으로 인식해요</p>
          </div>
        </div>
        {file && (
          <button
            type="button"
            onClick={openPicker}
            className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:bg-ink-50"
          >
            파일 교체
          </button>
        )}
      </div>

      <div className="p-5 md:p-6">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          data-testid="file-input"
          aria-label="인쇄할 파일 선택"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            if (picked) void handleFile(picked);
          }}
        />

        <div
          role="button"
          tabIndex={0}
          data-testid="dropzone"
          aria-label="파일을 끌어다 놓거나 눌러서 선택"
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) void handleFile(dropped);
          }}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 transition ${file ? 'py-5 sm:py-6' : 'py-8 text-center sm:py-10'} ${
            dragging
              ? 'border-brand-500 bg-brand-50/80'
              : file
                ? 'border-ink-100 bg-white hover:border-brand-300 hover:bg-brand-50/30'
                : 'border-ink-200 bg-ink-50/40 hover:border-brand-400 hover:bg-brand-50/40'
          }`}
        >
          {busy ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <span className="h-8 w-8 animate-spin-slow rounded-full border-[3px] border-brand-100 border-t-brand-600" />
              <p className="text-sm font-semibold text-ink-800">PDF 페이지를 세는 중…</p>
              <p className="text-[11px] text-ink-400">파일은 브라우저 안에서만 확인합니다</p>
            </div>
          ) : file ? (
            <div className="flex w-full items-center gap-3 text-left">
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${KIND_STYLE[file.kind].badge}`}
              >
                <IconFile className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-ink-900" title={file.name}>
                  {file.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-400">
                  <span className="font-semibold text-ink-600">
                    {fileExtension(file.name)} · {fileSize(file.size)}
                  </span>
                  {file.autoDetected && file.pages ? (
                    <span
                      data-testid="pagecount-badge"
                      className="inline-flex items-center gap-1 rounded-full bg-mint/10 px-2 py-0.5 font-bold text-mint"
                    >
                      <span className="h-1 w-1 rounded-full bg-mint" />
                      {file.pages}페이지 자동 인식
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-600">
                      페이지 직접 입력
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="파일 삭제"
                data-testid="file-remove"
                onClick={(event) => {
                  event.stopPropagation();
                  clearFile();
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-800"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-card">
                <IconUpload className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-bold text-ink-900">
                PDF를 여기로 끌어다 놓으세요
              </p>
              <p className="mt-1 text-xs text-ink-400">
                또는 <span className="font-semibold text-brand-600">클릭해서 파일 선택</span>
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {['PDF', 'HWP', 'DOCX', 'JPG · PNG'].map((label) => (
                  <span key={label} className="rounded-md border border-ink-100 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-400">
                    {label}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-ink-400">최대 50MB · 파일은 서버로 전송되지 않습니다</p>
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-700">
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        )}
        {!error && notice && (
          <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-[11px] leading-relaxed text-ink-600">{notice}</p>
        )}

        {file?.autoDetected && file.pages ? (
          <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
            총 <strong className="font-bold text-ink-800">{file.pages}페이지</strong>로 계산했어요. 페이지 수는 아래
            옵션에서 직접 고칠 수 있습니다. (현재 견적 기준 {pages}면)
          </p>
        ) : null}
      </div>
    </section>
  );
}
