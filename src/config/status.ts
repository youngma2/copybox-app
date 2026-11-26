/**
 * 주문 상태 5단계 · 입금 상태 설정 (설정·규칙층)
 *
 * 주문 상태: 접수됨 → 인쇄중 → 완료 → 출고 → 배송 완료
 * 입금 상태: 미결제(초안) → 입금 대기 → 입금 확인 완료
 */

export type OrderStatus = 'received' | 'printing' | 'done' | 'shipped' | 'delivered' | 'canceled';

export const ORDER_STATUS_FLOW: OrderStatus[] = ['received', 'printing', 'done', 'shipped', 'delivered'];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: '접수됨',
  printing: '인쇄중',
  done: '완료',
  shipped: '출고',
  delivered: '배송 완료',
  canceled: '취소',
};

export const ORDER_STATUS_HELP: Record<OrderStatus, string> = {
  received: '주문과 입금을 확인하는 단계',
  printing: '출력·제본 작업 중',
  done: '인쇄·제본 완료 (출고 준비)',
  shipped: '택배 접수 또는 방문 수령 준비 완료',
  delivered: '손님이 받으신 상태',
  canceled: '취소된 주문',
};

/** 뱃지 색상 (Tailwind 클래스) */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  received: 'bg-brand-50 text-brand-700 border-brand-200',
  printing: 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-sky-50 text-sky-700 border-sky-200',
  shipped: 'bg-violet-50 text-violet-700 border-violet-200',
  delivered: 'bg-mint/10 text-mint border-mint/30',
  canceled: 'bg-ink-50 text-ink-400 border-ink-200',
};

/** 출고·배송 완료 뒤 14일 PDF 파기 안내에 쓰는 상태 */
export const PDF_PURGE_TRIGGER_STATUSES: OrderStatus[] = ['shipped', 'delivered'];

export type PaymentStatus = 'unpaid' | 'awaiting_deposit' | 'confirmed';

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: '미결제',
  awaiting_deposit: '입금 대기',
  confirmed: '입금 확인 완료',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, string> = {
  unpaid: 'bg-ink-50 text-ink-500 border-ink-200',
  awaiting_deposit: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-mint/10 text-mint border-mint/30',
};

export type PaymentMethod = 'bank_transfer' | 'kakaopay';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: '계좌이체 (무통장입금)',
  kakaopay: '카카오페이 송금',
};

/** PG 연동 전 초기 오픈 결제 안내 (수수료 0원) */
export const PAYMENT_NOTICE =
  '초기 오픈은 계좌이체(무통장입금)와 카카오페이 송금으로 받습니다. 입금이 확인되면 사장님이 [입금 확인 완료]로 바꾸고 인쇄를 시작합니다. 카드·간편결제는 PG 심사 후 연결됩니다.';

export function asOrderStatus(value: string | null | undefined): OrderStatus {
  return value === 'printing' ||
    value === 'done' ||
    value === 'shipped' ||
    value === 'delivered' ||
    value === 'canceled'
    ? value
    : 'received';
}

export function asPaymentStatus(value: string | null | undefined): PaymentStatus {
  return value === 'unpaid' || value === 'confirmed' ? value : 'awaiting_deposit';
}
