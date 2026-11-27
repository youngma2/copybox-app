import { useState } from 'react';
import {
  CARD_PROOF,
  CARD_PROOF_STATUS_LABEL,
  CARD_PROOF_STATUS_TONE,
  revisionCounterLabel,
  canRequestRevision,
} from '../config/business-card';
import type { CardProofLog, CardProofUploadInput, Order, OrderWithCustomer } from '../lib/storage/types';
import { formatOrderDate } from '../lib/order';
import { copyText } from '../lib/clipboard';
import { proofFileToDataUrl } from '../lib/image';
import {
  buildCardProofGuideText,
  buildCardProofMail,
  buildCardProofRequestSpec,
  latestProof,
  mailtoHref,
  proofVersionLabel,
  proofVersions,
  revisionLogs,
} from '../lib/card-proof';
import { IconFile, IconShield } from './Icons';

function ProofBadge({ order }: { order: Pick<Order, 'proofStatus'> }) {
  return (
    <span
      data-testid={`card-proof-badge-${order.proofStatus}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${CARD_PROOF_STATUS_TONE[order.proofStatus]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {CARD_PROOF_STATUS_LABEL[order.proofStatus]}
    </span>
  );
}

function isImageProof(log: CardProofLog | null): boolean {
  if (!log?.proofUrl) return false;
  if (log.proofFileType === 'pdf') return false;
  return log.proofFileType === 'image' || /^data:image\//.test(log.proofUrl) || /\.(png|jpe?g|webp|gif|svg)$/i.test(log.proofUrl);
}

function ProofPreview({ log, testId }: { log: CardProofLog | null; testId?: string }) {
  if (!log || !log.proofUrl) {
    return (
      <p className="rounded-lg border border-dashed border-ink-200 bg-white px-3 py-4 text-center text-[11px] text-ink-400">
        아직 사장님이 올린 시안이 없습니다.
      </p>
    );
  }
  if (isImageProof(log)) {
    return (
      <a
        href={log.proofUrl}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-xl border border-ink-100 bg-white"
        title="새 창에서 크게 보기"
      >
        <img
          src={log.proofUrl}
          alt={`명함 시안 ${log.version ? `v${log.version}` : ''}`}
          data-testid={testId}
          className="mx-auto h-auto max-h-[220px] w-auto max-w-full object-contain"
        />
      </a>
    );
  }
  return (
    <a
      href={log.proofUrl}
      download={log.proofFileName ?? 'copybox-card-proof.pdf'}
      data-testid={testId}
      className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-[12px] font-semibold text-brand-700"
    >
      <IconFile className="h-4 w-4 shrink-0" />
      <span className="min-w-0 break-all">{log.proofFileName ?? '시안 PDF 열기'}</span>
    </a>
  );
}

function ProofTimeline({ logs }: { logs: CardProofLog[] }) {
  if (logs.length === 0) return null;
  return (
    <ol className="mt-2 space-y-1.5" data-testid="card-proof-timeline">
      {logs.map((log) => (
        <li key={log.id} className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5 text-[10px] leading-relaxed text-ink-500">
          <span className="min-w-0 break-words">
            <span className="font-bold text-ink-700">
              {log.kind === 'note'
                ? '주문 메모'
                : log.kind === 'proof'
                  ? `시안 v${log.version ?? '?'} 업로드`
                  : log.kind === 'revision'
                    ? '수정 요청'
                    : '시안 확정'}
            </span>
            {log.body ? <span className="ml-1 whitespace-pre-line">{log.body}</span> : null}
            {log.proofFileName ? <span className="ml-1 text-ink-400">({log.proofFileName})</span> : null}
          </span>
          <span className="num shrink-0 text-ink-400">{formatOrderDate(log.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* 고객 — 내 주문 이력의 시안 확인 카드                                  */
/* ------------------------------------------------------------------ */

export function CardProofCustomer({
  order,
  logs,
  busy,
  onRequestRevision,
  onConfirm,
}: {
  order: Order;
  logs: CardProofLog[];
  busy: boolean;
  onRequestRevision: (orderId: string, body: string) => Promise<void>;
  onConfirm: (orderId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const proof = latestProof(logs);
  const revisions = revisionLogs(logs);
  const confirmed = order.proofStatus === 'confirmed';
  const reachedLimit = !canRequestRevision(order.proofRevisionCount);

  async function sendRevision() {
    setError(null);
    if (!draft.trim()) {
      setError('수정하실 내용을 적어 주세요.');
      return;
    }
    setWorking(true);
    try {
      await onRequestRevision(order.id, draft.trim());
      setDraft('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '수정 요청을 보내지 못했어요.');
    } finally {
      setWorking(false);
    }
  }

  async function confirm() {
    setError(null);
    setWorking(true);
    try {
      await onConfirm(order.id);
      setConfirmOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '시안을 확정하지 못했어요.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      data-testid={`card-proof-${order.orderNumber}`}
      className="min-w-0 rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-ink-900">
          명함 시안 확인
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <ProofBadge order={order} />
          <span
            data-testid={`card-proof-revision-count-${order.orderNumber}`}
            className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-ink-600 ring-1 ring-ink-200"
          >
            수정 {revisionCounterLabel(order.proofRevisionCount)}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <ProofPreview log={proof} testId={`card-proof-preview-${order.orderNumber}`} />
        {proof ? (
          <p className="mt-1 text-[10px] text-ink-400">{proofVersionLabel(proof)}</p>
        ) : (
          <p className="mt-1 text-[10px] leading-relaxed text-ink-500">
            사장님이 시안을 만드는 중입니다. 시안이 올라오면 여기에서 미리보기로 확인하실 수 있어요.
          </p>
        )}
      </div>

      {confirmed ? (
        <p className="mt-2 rounded-lg bg-mint/10 px-2.5 py-2 text-[11px] leading-relaxed text-mint" data-testid="card-proof-confirmed">
          <strong className="font-bold">시안 확정 완료</strong> · {order.proofConfirmedAt ? formatOrderDate(order.proofConfirmedAt) : '-'} (v
          {order.proofConfirmedVersion ?? '-'})
          <br />
          확정된 시안으로 인쇄가 진행됩니다. {CARD_PROOF.leadLabel}.
        </p>
      ) : (
        <>
          {revisions.length > 0 && (
            <div className="mt-2 rounded-lg bg-white px-2.5 py-2" data-testid={`card-proof-revisions-${order.orderNumber}`}>
              <p className="text-[10px] font-bold text-ink-700">보낸 수정 요청</p>
              <ul className="mt-1 space-y-1">
                {revisions.map((log, index) => (
                  <li key={log.id} className="text-[10px] leading-relaxed text-ink-600">
                    <span className="font-semibold text-ink-800">{index + 1}차</span> · {log.body}
                    <span className="ml-1 text-ink-400">{formatOrderDate(log.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2.5">
            <label htmlFor={`revision-${order.id}`} className="mb-1 flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold text-ink-800">
              <span>수정 요청</span>
              <span className={`text-[10px] font-semibold ${reachedLimit ? 'text-rose-600' : 'text-ink-400'}`}>
                {revisionCounterLabel(order.proofRevisionCount)} 사용
              </span>
            </label>
            <textarea
              id={`revision-${order.id}`}
              data-testid={`card-proof-revision-input-${order.orderNumber}`}
              rows={2}
              value={draft}
              disabled={reachedLimit || busy || working || !proof}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                reachedLimit
                  ? '수정 가능 횟수(2회)를 모두 사용했어요.'
                  : '예) 연락처를 010-1234-5678로 바꿔 주세요. 회사 로고를 조금 키워 주세요.'
              }
              className="field resize-none !py-2 !text-[11.5px] disabled:bg-ink-50"
            />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-[10px] font-semibold text-amber-800">{CARD_PROOF.revisionNotice}</p>
              <button
                type="button"
                data-testid={`card-proof-revision-send-${order.orderNumber}`}
                disabled={reachedLimit || busy || working || !proof}
                onClick={() => void sendRevision()}
                className="shrink-0 rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-[11px] font-bold text-ink-800 transition hover:bg-ink-50 disabled:opacity-40"
              >
                {working ? '보내는 중…' : '수정 요청 보내기'}
              </button>
            </div>
            {reachedLimit && (
              <p className="mt-1 text-[10px] font-semibold text-rose-600" data-testid={`card-proof-revision-blocked-${order.orderNumber}`}>
                2회 초과 수정은 불가합니다. 지금 시안으로 확정하시거나 새 주문으로 진행해 주세요.
              </p>
            )}
          </div>

          <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-2 text-[10.5px] leading-relaxed text-rose-800">
            {CARD_PROOF.confirmWarning}
          </div>

          {confirmOpen ? (
            <div className="mt-2 rounded-lg border border-ink-300 bg-white px-2.5 py-2.5" data-testid="card-proof-confirm-panel">
              <p className="text-[11px] font-bold text-ink-900">시안을 확정할까요?</p>
              <p className="mt-1 text-[10px] leading-relaxed text-ink-600">
                확정 시각과 확정한 시안(v{proof?.version ?? '-'})이 그대로 보관되고, 이때부터 인쇄가 시작됩니다. 확정 후에는 수정·취소·환불이
                불가합니다.
              </p>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  data-testid={`card-proof-confirm-yes-${order.orderNumber}`}
                  disabled={working || busy}
                  onClick={() => void confirm()}
                  className="rounded-lg bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  {working ? '확정 중…' : '확정하고 인쇄 진행'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-testid={`card-proof-confirm-${order.orderNumber}`}
              disabled={busy || working || !proof || order.proofStatus === 'not_requested'}
              onClick={() => setConfirmOpen(true)}
              className="mt-2 w-full rounded-xl bg-ink-900 px-3 py-2.5 text-[12px] font-bold text-white transition hover:bg-ink-800 disabled:opacity-40"
            >
              시안 확정(OK) — 이 시안으로 인쇄
            </button>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10.5px] font-semibold text-rose-600">
          {error}
        </p>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer text-[10px] font-semibold text-ink-500">
          시안·수정 이력 {logs.length}건 보기
        </summary>
        <ProofTimeline logs={logs} />
      </details>
      <p className="mt-1.5 flex items-start gap-1 text-[9.5px] leading-relaxed text-ink-400">
        <IconShield className="mt-px h-3 w-3 shrink-0" />
        확정 시각과 시안은 덮어쓰지 않고 그대로 보관됩니다. (분쟁 대비 기록)
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 사장님 — 주문 상세의 시안 관리                                         */
/* ------------------------------------------------------------------ */

export function CardProofAdmin({
  order,
  logs,
  onUpload,
  onNotice,
}: {
  order: OrderWithCustomer;
  logs: CardProofLog[];
  onUpload: (orderId: string, input: CardProofUploadInput) => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const proof = latestProof(logs);
  const proofs = proofVersions(logs);
  const revisions = revisionLogs(logs);
  const confirmed = order.proofStatus === 'confirmed';

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { fileUrl, fileType } = await proofFileToDataUrl(file);
      await onUpload(order.id, { fileName: file.name, fileType, fileUrl });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '시안을 올리지 못했어요.');
    } finally {
      setUploading(false);
    }
  }

  async function copyGuide() {
    const ok = await copyText(buildCardProofGuideText(order, logs));
    onNotice(ok ? '시안 확인 안내 문구를 복사했어요. 문자·카톡에 붙여 넣으세요.' : '복사하지 못했어요. 브라우저 권한을 확인해 주세요.');
  }

  async function copySpec() {
    const ok = await copyText(buildCardProofRequestSpec(order, logs));
    onNotice(ok ? '쪼꼬 시안 요청서를 복사했어요. 성원애드피아에 그대로 붙여 넣으세요.' : '복사하지 못했어요. 브라우저 권한을 확인해 주세요.');
  }

  const mail = buildCardProofMail(order, logs);

  function openMail() {
    window.location.href = mailtoHref(mail);
    if (!mail.to) {
      onNotice('고객 이메일이 없어 받는 사람을 직접 입력해야 합니다. 메일 창이 열리지 않으면 안내 문구 복사를 이용해 주세요.');
    } else {
      onNotice('메일 작성 창만 열었습니다. 시안을 직접 확인한 뒤 보내 주세요. (자동 발송 없음)');
    }
  }

  return (
    <div
      data-testid={`admin-card-proof-${order.orderNumber}`}
      className="min-w-0 rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="text-[12px] font-extrabold text-ink-900">명함 시안 관리</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <ProofBadge order={order} />
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-ink-600 ring-1 ring-ink-200">
            수정 {revisionCounterLabel(order.proofRevisionCount)}
          </span>
        </div>
      </div>

      {!confirmed && (
        <p className="mt-1.5 rounded-lg bg-white px-2.5 py-2 text-[10.5px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
          고객이 <strong className="font-bold">[시안 확정(OK)]</strong>를 눌러야 인쇄를 시작할 수 있습니다. 확정 전에는 상태를 인쇄중으로 바꿀 수 없어요.
        </p>
      )}
      {confirmed && (
        <p className="mt-1.5 rounded-lg bg-mint/10 px-2.5 py-2 text-[10.5px] font-semibold text-mint">
          고객 확정 완료 · {order.proofConfirmedAt ? formatOrderDate(order.proofConfirmedAt) : '-'} (v{order.proofConfirmedVersion ?? '-'}) · 인쇄 가능
        </p>
      )}

      <div className="mt-2">
        <ProofPreview log={proof} />
        {proof && <p className="mt-1 text-[10px] text-ink-500">{proofVersionLabel(proof)}</p>}
      </div>

      {proofs.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {proofs.map((log) => (
            <a
              key={log.id}
              href={log.proofUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-[10px] font-semibold text-ink-700"
            >
              v{log.version ?? '?'}
            </a>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
            confirmed || uploading
              ? 'cursor-not-allowed bg-ink-100 text-ink-400'
              : 'bg-ink-900 text-white hover:bg-ink-800'
          }`}
        >
          <IconFile className="h-3.5 w-3.5" />
          {uploading ? '올리는 중…' : `시안 파일 올리기 (v${proofs.length + 1})`}
          <input
            type="file"
            accept="image/*,application/pdf"
            data-testid={`admin-proof-upload-${order.orderNumber}`}
            disabled={confirmed || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              void handleFile(file);
              event.target.value = '';
            }}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          data-testid={`admin-proof-guide-copy-${order.orderNumber}`}
          onClick={() => void copyGuide()}
          className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-700 transition hover:bg-ink-50"
        >
          안내 문구 복사
        </button>
        <button
          type="button"
          data-testid={`admin-proof-mail-${order.orderNumber}`}
          data-mailto={mailtoHref(mail)}
          onClick={openMail}
          className="rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-[11px] font-bold text-brand-700 transition hover:bg-brand-100"
        >
          고객 메일 쓰기
        </button>
        <button
          type="button"
          data-testid={`admin-request-spec-${order.orderNumber}`}
          onClick={() => void copySpec()}
          className="rounded-lg border border-sun/70 bg-sun/20 px-2.5 py-1.5 text-[11px] font-bold text-ink-900 transition hover:bg-sun/30"
        >
          쪼꼬 시안 요청서 복사
        </button>
      </div>
      <p className="mt-1.5 text-[9.5px] leading-relaxed text-ink-400">
        메일은 작성 창만 열립니다(자동 발송 없음). 고객 이메일: {order.customer?.email || '없음 · 메일 창에서 직접 입력'}
      </p>

      {revisions.length > 0 && (
        <div className="mt-2 rounded-lg bg-white px-2.5 py-2" data-testid={`admin-proof-revisions-${order.orderNumber}`}>
          <p className="text-[10px] font-bold text-ink-700">고객 수정 요청 원문 ({revisionCounterLabel(order.proofRevisionCount)})</p>
          <ul className="mt-1 space-y-1">
            {revisions.map((log, index) => (
              <li key={log.id} className="text-[10px] leading-relaxed text-ink-600">
                <span className="font-semibold text-ink-800">{index + 1}차</span> · {log.body}
                <span className="ml-1 text-ink-400">{formatOrderDate(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10.5px] font-semibold text-rose-600">
          {error}
        </p>
      )}

      <details className="mt-2" open={logs.length > 0}>
        <summary className="cursor-pointer text-[10px] font-semibold text-ink-500">
          시안 타임라인 {logs.length}건 (덮어쓰지 않고 누적)
        </summary>
        <ProofTimeline logs={logs} />
      </details>
    </div>
  );
}
