/**
 * 수령 방법 · 택배비 · 포장비 · 출고 속도 설정 (설정·규칙층)
 *
 * 택배비 기준 (2026-11 확정):
 *   기본 택배비 4,000원 + 박스·포장재비 1,000원 = 총 5,000원
 *   제주(+3,000~4,000원) · 도서산간(+4,000원) · 추가 박스는 별도 안내
 *   방문 수령 0원 / 퀵은 착불
 */

export type PickupMethod = 'store' | 'delivery';
export type DeliverySpeed = 'normal' | 'eco';

export const PICKUP_LABEL: Record<PickupMethod, string> = {
  store: '매장 방문 수령',
  delivery: '택배 · 퀵',
};

/** 기본 택배비 (원) — A4 출력 */
export const SHIPPING_FEE = 4000;
/** 박스·포장재비 (원) — A4 출력 */
export const PACKAGING_FEE = 1000;
/** 기본 택배비 + 포장비 */
export const SHIPPING_TOTAL = SHIPPING_FEE + PACKAGING_FEE;

/** 명함 배송비 (원) — 인쇄소 직배송이라 포장재비 없이 배송비만 받습니다. */
export const CARD_SHIPPING_FEE = 3000;
export const CARD_PACKAGING_FEE = 0;

export const CARD_SHIPPING_NOTE =
  '명함은 인쇄소에서 바로 보내 드려 포장재비 없이 배송비 3,000원만 받습니다. · 제주·도서산간은 별도 안내 · 방문 수령 0원';

/** 상품별 수령 비용 — 명함은 배송비 3,000원, A4는 택배 4,000원 + 포장 1,000원 */
export function shippingFeesFor(
  product: 'print' | 'card',
  pickup: PickupMethod,
): { shippingFee: number; packagingFee: number; total: number } {
  if (pickup !== 'delivery') return { shippingFee: 0, packagingFee: 0, total: 0 };
  const shippingFee = product === 'card' ? CARD_SHIPPING_FEE : SHIPPING_FEE;
  const packagingFee = product === 'card' ? CARD_PACKAGING_FEE : PACKAGING_FEE;
  return { shippingFee, packagingFee, total: shippingFee + packagingFee };
}

export const SHIPPING_NOTE =
  '기본 택배비 4,000원 + 박스·포장재비 1,000원 = 5,000원 · 제주·도서산간 및 추가 박스는 별도 안내 · 방문 수령 0원 · 퀵은 착불';

export const SHIPPING_DETAIL = [
  { label: '기본 택배비', value: SHIPPING_FEE, note: '2kg 이하 기준' },
  { label: '박스 · 포장재비', value: PACKAGING_FEE, note: '박스·완충재 포함' },
];

export const SHIPPING_EXTRA_NOTE =
  '제주 +3,000~4,000원 · 도서산간 +4,000원 · 5kg 초과 또는 추가 박스는 별도 안내드립니다.';

/** 여유 제작 특가 할인율 — 인쇄비에서 10% */
export const ECO_DISCOUNT_RATE = 0.1;

export interface DeliverySpeedOption {
  id: DeliverySpeed;
  emoji: string;
  label: string;
  short: string;
  sub: string;
  /** 출고 기준 영업일 */
  businessDays: number;
  note: string;
}

export const DELIVERY_SPEED_OPTIONS: DeliverySpeedOption[] = [
  {
    id: 'normal',
    emoji: '🚀',
    label: '일반 출고 (1~2일)',
    short: '일반 출고',
    sub: '영업일 1~2일 내 출고',
    businessDays: 2,
    note: '접수 순서대로 바로 작업합니다. 추가 할인은 없습니다.',
  },
  {
    id: 'eco',
    emoji: '🌿',
    label: '여유 제작 특가 (영업일 4일 내 출고 · 인쇄비 10% 할인)',
    short: '여유 제작 특가',
    sub: '영업일 4일 내 출고 · 인쇄비 10% 할인',
    businessDays: 4,
    note: '급하지 않은 주문을 모아 정성껏 인쇄합니다. 작업 일정에 따라 조기 출고될 수 있습니다.',
  },
];

export function deliverySpeedOption(speed: DeliverySpeed): DeliverySpeedOption {
  return DELIVERY_SPEED_OPTIONS.find((option) => option.id === speed) ?? DELIVERY_SPEED_OPTIONS[0];
}

/** 배송 도착일이 아닙니다 — 출고(택배 접수 완료 · 방문수령 준비 완료) 기준입니다. */
export const ECO_DEFINITION =
  '영업일 4일 이내 출고 기준입니다. 배송 도착일이 아니며, 출고는 택배 접수 완료 또는 방문 수령 준비 완료를 뜻합니다. 작업 일정에 따라 조기 출고될 수 있습니다.';

/** 주말(토·일)을 빼고 영업일을 더합니다. 공휴일은 아직 반영하지 않습니다(추후 설정에서 추가). */
export function addBusinessDays(base: Date, days: number): Date {
  const result = new Date(base.getTime());
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
}

/** 출고 마감일 (영업일 기준) */
export function dueShipDate(createdAt: Date | string, speed: DeliverySpeed): Date {
  const base = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return addBusinessDays(base, deliverySpeedOption(speed).businessDays);
}

/**
 * 명함 출고 마감일 — 시안 확정일(확정 전이면 오늘)부터 영업일 2~3일.
 * 확정 전에는 "시안 확정 후 영업일 2~3일 출고"로만 안내합니다.
 */
export function cardDueShipDate(from: Date | string, businessDays = 3): Date {
  const base = typeof from === 'string' ? new Date(from) : from;
  return addBusinessDays(base, businessDays);
}

/** 출고·배송 완료 후 PDF 원본을 파기하는 날 (14일 뒤) */
export const PDF_RETENTION_DAYS = 14;

export function pdfPurgeDate(baseIso: string | null): Date | null {
  if (!baseIso) return null;
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return null;
  const purge = new Date(base.getTime());
  purge.setDate(purge.getDate() + PDF_RETENTION_DAYS);
  return purge;
}

/** 전자상거래법상 결제·계약 기록 보관 기간 (5년) */
export const PAYMENT_RECORD_YEARS = 5;

export function paymentRecordUntil(baseIso: string): Date {
  const base = new Date(baseIso);
  const until = new Date(base.getTime());
  until.setFullYear(until.getFullYear() + PAYMENT_RECORD_YEARS);
  return until;
}
