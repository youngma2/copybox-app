/**
 * 견적 계산 — 설정(config/) 값을 읽어 실제 금액을 계산합니다.
 *
 * · A4 출력: 인쇄비 + 제본비
 * · 명함: 지류별 200매 단가 × 묶음
 * · 여유 제작 특가: 인쇄비의 10% 할인
 * · 택배: 택배비 4,000원 + 포장비 1,000원 (방문 수령 0원)
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
  deliverySpeedOption,
  dueShipDate,
  type DeliverySpeed,
  type PickupMethod,
} from '../config/delivery';
import {
  CARD_MAX_UNITS,
  CARD_MIN_UNITS,
  CARD_SHEETS_PER_UNIT,
  cardPaperOption,
  cardUnits,
  type CardPaper,
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
  CARD_SHEETS_PER_UNIT,
  cardPaperOption,
  cardUnits,
};
export type { CardPaper };
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
  cardUnits: number;
  cardText: string;
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
  cardUnits: number;
  cardQty: number;
  cardText: string;
  /** 적용 단가 (원/페이지, 명함은 원/200매) */
  unitPrice: number;
  /** 인쇄비 합계 (할인 전) */
  printCost: number;
  /** 제본비 합계 (부수 × 1부 제본비) */
  bindingCost: number;
  /** 여유 제작 특가 할인율 */
  discountRate: number;
  /** 할인 금액 */
  discount: number;
  /** 택배비 (방문 수령 0원) */
  shippingFee: number;
  /** 포장비 (방문 수령 0원) */
  packagingFee: number;
  shippingCost: number;
  pickup: PickupMethod;
  deliverySpeed: DeliverySpeed;
  /** 예상 총액 (할인·택배비 반영) */
  total: number;
  /** 실제 사용하는 종이 장수 (1부 기준) */
  sheetsPerCopy: number;
  /** 오늘 접수 기준 출고 마감일 (YYYY-MM-DD) */
  dueDate: string;
}

export const DEFAULT_QUOTE_INPUT: QuoteInput = {
  product: 'print',
  size: 'A4',
  color: 'mono',
  sides: 'single',
  pages: 1,
  copies: 1,
  binding: 'none',
  cardPaper: 'coating',
  cardUnits: 1,
  cardText: '',
  pickup: 'store',
  deliverySpeed: 'normal',
};

function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function calculateQuote(input: QuoteInput, now: Date = new Date()): Quote {
  const isCard = input.product === 'card';
  const pages = isCard
    ? CARD_SHEETS_PER_UNIT
    : clamp(input.pages, MIN_PAGES, MAX_PAGES);
  const copies = isCard ? cardUnits(input.cardUnits) : clamp(input.copies, MIN_COPIES, MAX_COPIES);
  const binding = isCard ? bindingById('none') : bindingById(input.binding);
  const paper = cardPaperOption(input.cardPaper);

  const unitPrice = isCard ? paper.price : unitPagePrice(input.size, input.color, input.sides);
  const printCost = isCard ? paper.price * copies : unitPrice * pages * copies;
  const bindingCost = isCard ? 0 : binding.price * copies;
  const discountRate = input.deliverySpeed === 'eco' ? ECO_DISCOUNT_RATE : 0;
  const discount = Math.round(printCost * discountRate);
  const shippingFee = input.pickup === 'delivery' ? SHIPPING_FEE : 0;
  const packagingFee = input.pickup === 'delivery' ? PACKAGING_FEE : 0;
  const shippingCost = shippingFee + packagingFee;

  return {
    product: input.product,
    size: input.size,
    color: input.color,
    sides: input.sides,
    pages: isCard ? CARD_SHEETS_PER_UNIT : pages,
    copies,
    binding: isCard ? BINDING_OPTIONS[0] : binding,
    cardPaper: input.cardPaper,
    cardUnits: isCard ? copies : cardUnits(input.cardUnits),
    cardQty: isCard ? copies * CARD_SHEETS_PER_UNIT : 0,
    cardText: input.cardText ?? '',
    unitPrice,
    printCost,
    bindingCost,
    discountRate,
    discount,
    shippingFee,
    packagingFee,
    shippingCost,
    pickup: input.pickup,
    deliverySpeed: input.deliverySpeed,
    total: printCost - discount + bindingCost + shippingCost,
    sheetsPerCopy: isCard ? CARD_SHEETS_PER_UNIT : input.sides === 'double' ? Math.ceil(pages / 2) : pages,
    dueDate: isoDate(dueShipDate(now, input.deliverySpeed)),
  };
}

/** 한 줄 요약 — "A4 흑백 양면 · 6페이지 × 1부 · 스프링" / "명함 코팅 90×50mm · 200매" */
export function summarizeQuote(quote: Quote): string {
  if (quote.product === 'card') {
    return `명함 ${cardPaperOption(quote.cardPaper).label.replace(' 명함', '')} 90×50mm · ${quote.cardQty}매`;
  }
  return [
    `${quote.size} ${COLOR_LABEL[quote.color]} ${SIDES_LABEL[quote.sides]}`,
    `${quote.pages}페이지 × ${quote.copies}부`,
    quote.binding.label,
  ].join(' · ');
}
