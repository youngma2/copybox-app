/**
 * 견적 계산 — 설정(config/) 값을 읽어 실제 금액을 계산합니다.
 *
 * · A4 출력: 인쇄비 + 제본비 (택배 4,000원 + 포장 1,000원)
 * · 명함: (지류 기준가 + 면·도수 차액) × 200매 묶음, 배송비 3,000원 (포장재비 없음)
 * · 여유 제작 특가(인쇄비 10% 할인)는 A4 출력에만 적용합니다. 명함은 시안 확정 기준입니다.
 */

import {
  BINDING_NOTE,
  BINDING_OPTIONS,
  COLOR_LABEL,
  MAX_COPIES,
  MAX_PAGES,
  MIN_COPIES,
  MIN_PAGES,
  PAPER_NOTE,
  PAPER_SIZES,
  PRODUCT_LABEL,
  SIDES_LABEL,
  bindingById,
  clamp,
  isBindingId,
  isColorMode,
  isProductKind,
  isSides,
  unitPagePrice,
  type BindingId,
  type BindingOption,
  type ColorMode,
  type PaperSize,
  type ProductKind,
  type Sides,
} from '../config/pricing';
import {
  ECO_DISCOUNT_RATE,
  PACKAGING_FEE,
  SHIPPING_FEE,
  cardDueShipDate,
  deliverySpeedOption,
  dueShipDate,
  shippingFeesFor,
  type DeliverySpeed,
  type PickupMethod,
} from '../config/delivery';
import {
  CARD_MAX_UNITS,
  CARD_MIN_UNITS,
  CARD_PROOF,
  CARD_SHEETS_PER_UNIT,
  EMPTY_CARD_INFO,
  cardPrintOption,
  cardSheetLabel,
  cardUnitPrice,
  cardUnits,
  type CardInfo,
  type CardPaper,
  type CardPrintMode,
} from '../config/business-card';

export {
  BINDING_NOTE,
  BINDING_OPTIONS,
  COLOR_LABEL,
  MAX_COPIES,
  MAX_PAGES,
  MIN_COPIES,
  MIN_PAGES,
  PAPER_NOTE,
  PAPER_SIZES,
  PRODUCT_LABEL,
  SIDES_LABEL,
  bindingById,
  clamp,
  isBindingId,
  isColorMode,
  isProductKind,
  isSides,
  unitPagePrice,
};
export type { BindingId, BindingOption, ColorMode, PaperSize, ProductKind, Sides };
export {
  CARD_MAX_UNITS,
  CARD_MIN_UNITS,
  CARD_PROOF,
  CARD_SHEETS_PER_UNIT,
  EMPTY_CARD_INFO,
  cardPrintOption,
  cardUnitPrice,
  cardUnits,
};
export type { CardInfo, CardPaper, CardPrintMode };
export { ECO_DISCOUNT_RATE, PACKAGING_FEE, SHIPPING_FEE, deliverySpeedOption, dueShipDate };
export type { DeliverySpeed, PickupMethod };

export interface QuoteInput {
  product: ProductKind;
  size: PaperSize;
  color: ColorMode;
  sides: Sides;
  pages: number;
  copies: number;
  binding: BindingId;
  cardPaper: CardPaper;
  cardPrint: CardPrintMode;
  cardUnits: number;
  cardText: string;
  cardInfo: CardInfo;
  pickup: PickupMethod;
  deliverySpeed: DeliverySpeed;
}

export interface Quote {
  product: ProductKind;
  size: PaperSize;
  color: ColorMode;
  sides: Sides;
  pages: number;
  copies: number;
  binding: BindingOption;
  cardPaper: CardPaper;
  cardPrint: CardPrintMode;
  cardInfo: CardInfo;
  cardUnits: number;
  cardQty: number;
  cardText: string;
  /** 적용 단가 (원/페이지, 명함은 원/200매) */
  unitPrice: number;
  /** 인쇄비 합계 (할인 전) */
  printCost: number;
  /** 제본비 합계 (부수 × 1부 제본비) */
  bindingCost: number;
  /** 여유 제작 특가 할인율 (A4만) */
  discountRate: number;
  /** 할인 금액 */
  discount: number;
  /** 택배비 (방문 수령 0원) */
  shippingFee: number;
  /** 포장비 (방문 수령 0원 · 명함은 없음) */
  packagingFee: number;
  shippingCost: number;
  pickup: PickupMethod;
  deliverySpeed: DeliverySpeed;
  /** 예상 총액 (할인·배송비 반영) */
  total: number;
  /** 실제 사용하는 종이 장수 (1부 기준) */
  sheetsPerCopy: number;
  /** 오늘 접수 기준 출고 마감일 (YYYY-MM-DD) */
  dueDate: string;
  /** 화면에 보여줄 출고 안내 한 줄 */
  leadLabel: string;
}

export const DEFAULT_QUOTE_INPUT: QuoteInput = {
  product: 'print',
  size: 'A4',
  color: 'mono',
  sides: 'single',
  pages: 1,
  copies: 1,
  binding: 'none',
  cardPaper: 'snow250',
  cardPrint: 'single4',
  cardUnits: 1,
  cardText: '',
  cardInfo: EMPTY_CARD_INFO,
  pickup: 'store',
  deliverySpeed: 'normal',
};

function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function calculateQuote(input: QuoteInput, now: Date = new Date()): Quote {
  const isCard = input.product === 'card';
  const pages = isCard ? CARD_SHEETS_PER_UNIT : clamp(input.pages, MIN_PAGES, MAX_PAGES);
  const copies = isCard ? cardUnits(input.cardUnits) : clamp(input.copies, MIN_COPIES, MAX_COPIES);
  const binding = isCard ? bindingById('none') : bindingById(input.binding);

  const unitPrice = isCard
    ? cardUnitPrice(input.cardPaper, input.cardPrint)
    : unitPagePrice(input.size, input.color, input.sides);
  const printCost = isCard ? unitPrice * copies : unitPrice * pages * copies;
  const bindingCost = isCard ? 0 : binding.price * copies;

  // 여유 제작 특가는 A4 출력 전용입니다. 명함은 시안 확정 후 출고 기준이라 할인하지 않습니다.
  const speed: DeliverySpeed = isCard ? 'normal' : input.deliverySpeed;
  const discountRate = !isCard && speed === 'eco' ? ECO_DISCOUNT_RATE : 0;
  const discount = Math.round(printCost * discountRate);

  const fees = shippingFeesFor(input.product, input.pickup);
  const due = isCard
    ? cardDueShipDate(now, CARD_PROOF.leadBusinessDays)
    : dueShipDate(now, input.deliverySpeed);

  return {
    product: input.product,
    size: input.size,
    color: input.color,
    sides: input.sides,
    pages: isCard ? CARD_SHEETS_PER_UNIT : pages,
    copies,
    binding: isCard ? BINDING_OPTIONS[0] : binding,
    cardPaper: input.cardPaper,
    cardPrint: input.cardPrint,
    cardInfo: input.cardInfo ?? EMPTY_CARD_INFO,
    cardUnits: isCard ? copies : cardUnits(input.cardUnits),
    cardQty: isCard ? copies * CARD_SHEETS_PER_UNIT : 0,
    cardText: input.cardText ?? '',
    unitPrice,
    printCost,
    bindingCost,
    discountRate,
    discount,
    shippingFee: fees.shippingFee,
    packagingFee: fees.packagingFee,
    shippingCost: fees.total,
    pickup: input.pickup,
    deliverySpeed: speed,
    total: printCost - discount + bindingCost + fees.total,
    sheetsPerCopy: isCard ? CARD_SHEETS_PER_UNIT : input.sides === 'double' ? Math.ceil(pages / 2) : pages,
    dueDate: isoDate(due),
    leadLabel: isCard
      ? CARD_PROOF.leadLabel
      : speed === 'eco'
        ? '영업일 4일 이내 출고'
        : '영업일 1~2일 내 출고',
  };
}

/** 한 줄 요약 — "A4 흑백 양면 · 6페이지 × 1부 · 스프링" / "명함 스노우지 250g · 단면 4도(컬러) · 200매" */
export function summarizeQuote(quote: Quote): string {
  if (quote.product === 'card') {
    return `명함 ${cardSheetLabel(quote.cardPaper)} · ${cardPrintOption(quote.cardPrint).label} · ${quote.cardQty}매`;
  }
  return [
    `${quote.size} ${COLOR_LABEL[quote.color]} ${SIDES_LABEL[quote.sides]}`,
    `${quote.pages}페이지 × ${quote.copies}부`,
    quote.binding.label,
  ].join(' · ');
}
