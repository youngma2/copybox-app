/**
 * 명함 제작 설정 (설정·규칙층)
 *
 * 성원애드피아 표준 규격(90×50mm)을 바탕으로 한 오픈 특가입니다.
 * 코팅 · 비코팅 · 수입지 모두 200매 15,000원 (임시 단가).
 */

import { clamp } from './pricing';

export type CardPaper = 'coating' | 'noncoating' | 'imported';

export const CARD_SPEC = {
  widthMm: 90,
  heightMm: 50,
  bleedMm: 2,
  label: '명함 90 × 50 mm',
  note: '성원애드피아 표준 규격 기준 · 도련 포함 92 × 52 mm로 재단',
};

/** 1묶음 = 200매 */
export const CARD_SHEETS_PER_UNIT = 200;
export const CARD_MIN_UNITS = 1;
export const CARD_MAX_UNITS = 20;

export interface CardPaperOption {
  id: CardPaper;
  label: string;
  price: number;
  note: string;
}

export const CARD_PAPER_OPTIONS: CardPaperOption[] = [
  { id: 'coating', label: '코팅 명함', price: 15000, note: '200매 · 표면 코팅으로 스크래치에 강함' },
  { id: 'noncoating', label: '비코팅 명함', price: 15000, note: '200매 · 손글씨 메모가 잘 써짐' },
  { id: 'imported', label: '수입지 명함', price: 15000, note: '200매 · 두께감 있는 고급 지류' },
];

export const CARD_OPEN_BADGE = '오픈 특가';
export const CARD_NOTICE =
  '디자인 파일이 없어도 문구·요청사항만 남겨 주시면 시안을 만들어 드립니다. 200매 기준 임시 단가이며, 지류·수량에 따라 추후 조정될 수 있습니다.';

export function cardPaperOption(id: CardPaper): CardPaperOption {
  return CARD_PAPER_OPTIONS.find((option) => option.id === id) ?? CARD_PAPER_OPTIONS[0];
}

export function cardUnits(value: number): number {
  return clamp(value, CARD_MIN_UNITS, CARD_MAX_UNITS);
}

export function cardSheets(units: number): number {
  return cardUnits(units) * CARD_SHEETS_PER_UNIT;
}
