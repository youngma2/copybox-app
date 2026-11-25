export type PaperSize = 'A4' | 'A3' | 'B4';
export type ColorMode = 'mono' | 'color';
export type Sides = 'single' | 'double';
export type BindingId = 'none' | 'coil' | 'perfect' | 'saddle' | 'coating';

export const PAPER_SIZES: PaperSize[] = ['A4', 'A3', 'B4'];

/** 1면(페이지)당 기본 단가 — 샘플 단가표 (원) */
export const BASE_PAGE_PRICE: Record<PaperSize, Record<ColorMode, number>> = {
  A4: { mono: 50, color: 300 },
  A3: { mono: 100, color: 600 },
  B4: { mono: 80, color: 400 },
};

/** 양면 인쇄는 면당 10% 할인 */
export const DOUBLE_SIDE_RATE = 0.9;

export const MIN_PAGES = 1;
export const MAX_PAGES = 2000;
export const MIN_COPIES = 1;
export const MAX_COPIES = 999;

export interface BindingOption {
  id: BindingId;
  label: string;
  price: number;
  note: string;
}

export const BINDING_OPTIONS: BindingOption[] = [
  { id: 'none', label: '없음', price: 0, note: '낱장으로 출력' },
  { id: 'coil', label: '스프링 제본', price: 3000, note: '넘기기 편한 스프링' },
  { id: 'perfect', label: '무선 제본', price: 3500, note: '책자 형태로 제작' },
  { id: 'saddle', label: '중철 제본', price: 2500, note: '접지 후 스테이플' },
  { id: 'coating', label: '코팅', price: 1000, note: '표지 코팅 포함' },
];

export const PAPER_NOTE: Record<PaperSize, string> = {
  A4: '가장 일반적인 문서 크기',
  A3: 'A4의 2배, 도면·포스터',
  B4: '교재·시험지에 많이 쓰여요',
};

export const COLOR_LABEL: Record<ColorMode, string> = { mono: '흑백', color: '컬러' };
export const SIDES_LABEL: Record<Sides, string> = { single: '단면', double: '양면' };

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/** 현재 규격·색상·인쇄면 기준 1페이지(1면) 단가 */
export function unitPagePrice(size: PaperSize, color: ColorMode, sides: Sides): number {
  const base = BASE_PAGE_PRICE[size][color];
  return sides === 'double' ? Math.round(base * DOUBLE_SIDE_RATE) : base;
}

export interface QuoteInput {
  size: PaperSize;
  color: ColorMode;
  sides: Sides;
  pages: number;
  copies: number;
  binding: BindingId;
}

export interface Quote {
  size: PaperSize;
  color: ColorMode;
  sides: Sides;
  pages: number;
  copies: number;
  binding: BindingOption;
  /** 적용 단가 (원/면) */
  unitPrice: number;
  /** 할인 전 단가 (원/면) */
  listUnitPrice: number;
  /** 인쇄비 합계 */
  printCost: number;
  /** 양면 할인액 */
  doubleDiscount: number;
  /** 제본비 합계 */
  bindingCost: number;
  /** 예상 총액 (VAT 포함) */
  total: number;
  /** 실제 사용하는 종이 장수 (1부 기준) */
  sheetsPerCopy: number;
}

export function calculateQuote(input: QuoteInput): Quote {
  const pages = clamp(input.pages, MIN_PAGES, MAX_PAGES);
  const copies = clamp(input.copies, MIN_COPIES, MAX_COPIES);
  const listUnitPrice = BASE_PAGE_PRICE[input.size][input.color];
  const unitPrice = unitPagePrice(input.size, input.color, input.sides);
  const printCost = unitPrice * pages * copies;
  const doubleDiscount = (listUnitPrice - unitPrice) * pages * copies;
  const binding = BINDING_OPTIONS.find((option) => option.id === input.binding) ?? BINDING_OPTIONS[0];
  const bindingCost = binding.price * copies;

  return {
    size: input.size,
    color: input.color,
    sides: input.sides,
    pages,
    copies,
    binding,
    unitPrice,
    listUnitPrice,
    printCost,
    doubleDiscount,
    bindingCost,
    total: printCost + bindingCost,
    sheetsPerCopy: input.sides === 'double' ? Math.ceil(pages / 2) : pages,
  };
}
