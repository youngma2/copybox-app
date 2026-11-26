/**
 * 단가·제본·판형 설정 (설정·규칙층)
 *
 * 가격이나 메뉴를 바꿀 때는 이 파일만 고치면 됩니다.
 * 화면(components)과 저장소(lib/storage)는 이 값을 그대로 가져다 씁니다.
 *
 * - 판형: A4 한 가지
 * - A4 흑백: 단면 50원/페이지, 양면 40원/페이지 (할인 공식 없이 페이지당 정확한 단가)
 * - A4 컬러: 단면 300원/페이지, 양면 250원/페이지 (흑백이 기본 선택)
 * - 제본: 없음(0원) / 스프링(1,500원~) / 와이어(1,500원~)
 *   스프링·와이어의 사이즈별 금액은 추후 확정하며, 견적에는 최소 금액(1,500원)을 적용합니다.
 */

export type PaperSize = 'A4';
export type ColorMode = 'mono' | 'color';
export type Sides = 'single' | 'double';
export type BindingId = 'none' | 'coil' | 'wire';
/** 상품 종류 — A4 출력·제본 / 명함 */
export type ProductKind = 'print' | 'card';

export const PAPER_SIZES: PaperSize[] = ['A4'];
export const DEFAULT_SIZE: PaperSize = 'A4';

/** 1페이지(1면)당 인쇄 단가 (원) */
export const PAGE_UNIT_PRICE: Record<ColorMode, Record<Sides, number>> = {
  mono: { single: 50, double: 40 },
  color: { single: 300, double: 250 },
};

/** 단가표에서 강조하는 대표 단가 */
export const A4_MONO_PRICE = PAGE_UNIT_PRICE.mono;

export const MIN_PAGES = 1;
export const MAX_PAGES = 2000;
export const MIN_COPIES = 1;
export const MAX_COPIES = 999;

export interface BindingOption {
  id: BindingId;
  label: string;
  /** 견적에 적용하는 금액 — startingAt=true 이면 최소 금액 */
  price: number;
  /** '~부터' 표시 여부 (사이즈별 금액 추후 확정) */
  startingAt: boolean;
  note: string;
}

export const BINDING_OPTIONS: BindingOption[] = [
  { id: 'none', label: '제본 없음', price: 0, startingAt: false, note: '낱장으로 출력 · 추가 비용 없음' },
  { id: 'coil', label: '스프링', price: 1500, startingAt: true, note: '사이즈별 금액 추후 확정' },
  { id: 'wire', label: '와이어', price: 1500, startingAt: true, note: '사이즈별 금액 추후 확정' },
];

export const BINDING_NOTE =
  '스프링·와이어는 1,500원부터 시작하며, 사이즈별 금액은 추후 확정해 안내드립니다. 견적서에는 최소 금액(1,500원)이 적용됩니다.';

export const PAPER_NOTE: Record<PaperSize, string> = {
  A4: '가장 일반적인 문서 크기 · A4 한 가지 규격',
};

export const COLOR_LABEL: Record<ColorMode, string> = { mono: '흑백', color: '컬러' };
export const SIDES_LABEL: Record<Sides, string> = { single: '단면', double: '양면' };

export const PRODUCT_LABEL: Record<ProductKind, string> = {
  print: 'A4 출력 · 제본',
  card: '명함',
};

export function isBindingId(value: unknown): value is BindingId {
  return value === 'none' || value === 'coil' || value === 'wire';
}

export function isColorMode(value: unknown): value is ColorMode {
  return value === 'mono' || value === 'color';
}

export function isSides(value: unknown): value is Sides {
  return value === 'single' || value === 'double';
}

export function isProductKind(value: unknown): value is ProductKind {
  return value === 'print' || value === 'card';
}

export function bindingById(id: BindingId): BindingOption {
  return BINDING_OPTIONS.find((option) => option.id === id) ?? BINDING_OPTIONS[0];
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/** 현재 규격·색상·인쇄면 기준 1페이지(1면) 단가 */
export function unitPagePrice(size: PaperSize, color: ColorMode, sides: Sides): number {
  void size;
  return PAGE_UNIT_PRICE[color][sides];
}
