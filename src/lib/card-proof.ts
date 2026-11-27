/**
 * 명함 시안 확인 안내 문구 만들기 (관리자 → 고객)
 *
 * · 메일은 `mailto:` 링크로 메일 작성 창만 엽니다. 절대 자동 발송하지 않습니다.
 * · 복사용 안내 문구에는 주문코드와 확인 링크가 들어갑니다.
 * · '쪼꼬 시안 요청서'는 인쇄소(성원애드피아)에 그대로 넘길 수 있는 형식입니다.
 */

import {
  CARD_PROOF,
  CARD_PROOF_STATUS_LABEL,
  CARD_SPEC,
  cardPrintOption,
  cardSheetLabel,
  revisionCounterLabel,
} from '../config/business-card';
import type { CardProofLog } from './storage/types';
import type { Order, Customer } from './storage/types';
import { formatOrderDate } from './order';
import { formatDateLabel } from './describe';

type OrderLike = Order & { customer?: Customer | null };

/** 고객이 시안을 확인할 주소 (내 주문 이력) */
export function proofCheckLink(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}#/history`;
}

/** 시안 버전 목록 (v1, v2 …) */
export function proofVersions(logs: CardProofLog[]): CardProofLog[] {
  return logs.filter((log) => log.kind === 'proof');
}

export function latestProof(logs: CardProofLog[]): CardProofLog | null {
  const proofs = proofVersions(logs);
  return proofs.length > 0 ? proofs[proofs.length - 1] : null;
}

export function revisionLogs(logs: CardProofLog[]): CardProofLog[] {
  return logs.filter((log) => log.kind === 'revision');
}

function spaceSpec() {
  return `${CARD_SPEC.workWidthMm}×${CARD_SPEC.workHeightMm}mm 작업 / ${CARD_SPEC.widthMm}×${CARD_SPEC.heightMm}mm 재단 / CMYK`;
}

/** 복사·문자·카톡으로 보낼 시안 확인 안내 문구 */
export function buildCardProofGuideText(order: OrderLike, logs: CardProofLog[]): string {
  const proof = latestProof(logs);
  const version = proof?.version ? `v${proof.version}` : 'v1';
  return [
    `[카피박스] 명함 시안 확인 요청 - ${order.orderNumber}`,
    '',
    `${order.customer?.name ?? '고객'}님, 요청하신 명함 시안(${version})이 준비되었습니다.`,
    `▶ 확인 링크: ${proofCheckLink()}`,
    '',
    `· 시안 확인은 위 링크의 '내 주문 이력'에서 하실 수 있습니다.`,
    `· ${CARD_PROOF.revisionNotice.replace('※ ', '')}`,
    `· ${CARD_PROOF.confirmWarning}`,
    '',
    `· 주문번호: ${order.orderNumber}`,
    `· 지류/인쇄: ${cardSheetLabel(order.cardPaper)} · ${cardPrintOption(order.cardPrint).label} · ${order.cardQty}매`,
    `· 규격: ${spaceSpec()}`,
    '',
    '카피박스',
  ].join('\n');
}

/** [고객 메일 쓰기] — 메일 작성 창만 엽니다 (자동 발송 없음) */
export function buildCardProofMail(order: OrderLike, logs: CardProofLog[]): { to: string; subject: string; body: string } {
  const proof = latestProof(logs);
  const version = proof?.version ? `v${proof.version}` : 'v1';
  const to = order.customer?.email ?? '';
  const subject = `${CARD_PROOF.mailSubjectPrefix} - ${order.orderNumber}`;
  const body = [
    `${order.customer?.name ?? '고객'}님, 안녕하세요. 카피박스입니다.`,
    '',
    `요청하신 명함 시안(${version})이 준비되어 보내 드립니다.`,
    '',
    '▶ 주문번호: ' + order.orderNumber,
    '▶ 시안 버전: ' + version,
    '▶ 시안 확인 링크: ' + proofCheckLink(),
    '',
    "링크에서 '내 주문 이력'을 열면 시안 미리보기와 [시안 확정(OK)] 버튼이 있습니다.",
    '· 수정 횟수가 정해져 있으니 오타·연락처·배치를 꼼꼼히 확인하신 뒤 확정 버튼을 눌러 주세요.',
    '· 시안 확정 후에는 즉시 인쇄가 진행되어 수정·취소·환불이 불가합니다.',
    `· ${CARD_PROOF.revisionNotice.replace('※ ', '')}`,
    '',
    `· 지류: ${cardSheetLabel(order.cardPaper)} · ${order.cardQty}매`,
    `· 인쇄: ${cardPrintOption(order.cardPrint).label}`,
    `· 규격: ${spaceSpec()}`,
    '',
    '감사합니다.',
    '카피박스',
  ].join('\n');
  return { to, subject, body };
}

/** mailto: 주소 — 본문이 길어도 잘리지 않게 인코딩합니다. */
export function mailtoHref(mail: { to: string; subject: string; body: string }): string {
  const params = new URLSearchParams({ subject: mail.subject, body: mail.body });
  return `mailto:${encodeURIComponent(mail.to)}?${params.toString().replace(/\+/g, '%20')}`;
}

/**
 * ⑧ [쪼꼬 시안 요청서 복사]
 * 고객 입력 정보 + 선택 옵션 + 수정 요청 원문 + 성원애드피아 규격을 한 번에 복사합니다.
 */
export function buildCardProofRequestSpec(order: OrderLike, logs: CardProofLog[]): string {
  const info = order.cardInfo;
  const revisions = revisionLogs(logs);
  const proofs = proofVersions(logs);
  const lines: string[] = [
    '[카피박스 · 쪼꼬 시안 요청서]',
    `주문번호: ${order.orderNumber}`,
    `접수일시: ${formatOrderDate(order.createdAt)}`,
    '',
    '[고객 정보]',
    `· 성함: ${info?.name || order.customer?.name || '-'}`,
    `· 직함: ${info?.title || '-'}`,
    `· 회사/상호: ${info?.company || '-'}`,
    `· 연락처: ${info?.phone || order.customer?.phone || '-'}`,
    `· 이메일: ${info?.email || order.customer?.email || '-'}`,
    `· 주소: ${info?.address || order.address || '-'}`,
    '',
    '[선택 옵션]',
    `· 지류: ${cardSheetLabel(order.cardPaper)}`,
    `· 인쇄: ${cardPrintOption(order.cardPrint).label}`,
    `· 수량: ${order.cardQty ?? 200}매 (200매 단위)`,
    `· 수령: ${order.pickup === 'delivery' ? '택배 (인쇄소 직배송)' : '매장 방문 수령'}`,
    '',
    '[인쇄 규격 · 성원애드피아]',
    `· 작업 사이즈: ${CARD_SPEC.workWidthMm}×${CARD_SPEC.workHeightMm}mm`,
    `· 재단 사이즈: ${CARD_SPEC.widthMm}×${CARD_SPEC.heightMm}mm`,
    '· 색상 모드: CMYK',
    '· 도련/재단선 포함 작업, 300dpi 이상',
    '',
    '[명함 문구 · 요청]',
    order.cardText?.trim() || '-',
    order.customerRequest?.trim() ? `주문 메모: ${order.customerRequest.trim()}` : '',
    '',
    `[수정 요청 원문] (${revisionCounterLabel(order.proofRevisionCount)})`,
    ...(revisions.length
      ? revisions.map((log, index) => `${index + 1}차 (${formatOrderDate(log.createdAt)}): ${log.body ?? '-'}`)
      : ['- 없음']),
    '',
    '[시안 이력]',
    ...(proofs.length
      ? proofs.map(
          (log) =>
            `· v${log.version ?? '?'} (${formatOrderDate(log.createdAt)}) ${log.proofFileName ?? ''}`.trim(),
        )
      : ['· 아직 시안 없음']),
    `· 시안 상태: ${CARD_PROOF_STATUS_LABEL[order.proofStatus]}`,
    order.proofConfirmedAt
      ? `· 시안 확정: ${formatOrderDate(order.proofConfirmedAt)} (v${order.proofConfirmedVersion ?? '-'})`
      : '· 시안 확정: 아직',
    '',
    `[출고 기준] ${CARD_PROOF.leadLabel}`,
  ];
  return lines.filter((line) => line !== undefined).join('\n');
}

/** 화면 표시용: "v2 · 2026년 11월 28일 (금) 오후 3:10" */
export function proofVersionLabel(log: CardProofLog): string {
  const version = log.version ? `v${log.version}` : '시안';
  return `${version} · ${formatDateLabel(log.createdAt)} ${new Date(log.createdAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
