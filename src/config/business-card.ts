/**
 * 명함 제작 설정 (설정·규칙층)
 *
 * 성원애드피아 표준 규격(재단 90×50mm · 도련 포함 작업 92×52mm)을 기준으로 한 오픈 특가입니다.
 *
 * · 지류는 제지사 정식 품명으로 적고, 평량(g/㎡)과 질감은 카피박스가 직접 쓴 설명만 씁니다.
 *   (다른 인쇄소의 문구·사진은 가져오지 않습니다.)
 * · 판매가는 `지류 기준가(단면 4도) + 면·도수 차액`으로 계산합니다. 두 표만 고치면 전체 금액이 바뀝니다.
 * · 직접 촬영한 샘플북 사진은 `public/samples/card-paper/{지류 id}.jpg` 규칙으로 넣으면
 *   해당 지류 카드에 사진이 표시되고, 없으면 준비 중 안내가 나옵니다.
 */

import { clamp } from './pricing';

/** 지류 id — 제지사 품명 기준 */
export type CardPaper = 'snow250' | 'snow300' | 'banu250' | 'arte310' | 'randevu240';

/** 인쇄 면·도수 — 성원애드피아 명함 옵션 기준 */
export type CardPrintMode = 'single1' | 'single4' | 'double1' | 'double4';

/** 시안 확인 상태 — 주문 상태(5단계)와 별도로 관리합니다. */
export type CardProofStatus = 'not_requested' | 'requested' | 'revision_requested' | 'confirmed';

/** 명함에 넣을 고객 정보 */
export interface CardInfo {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  address: string;
}

/** 입력 예시로만 쓰는 더미 정보 — 실제 고객·사장님 정보가 아닙니다. */
export const CARD_DUMMY: CardInfo = {
  name: '홍길동',
  title: '대표',
  company: '카피박스',
  phone: '010-0000-0000',
  email: 'hong@example.com',
  address: '경기도 고양시 일산동구 중앙로 1234',
};

export const EMPTY_CARD_INFO: CardInfo = {
  name: '',
  title: '',
  company: '',
  phone: '',
  email: '',
  address: '',
};

export const CARD_SPEC = {
  widthMm: 90,
  heightMm: 50,
  bleedMm: 2,
  workWidthMm: 92,
  workHeightMm: 52,
  label: '명함 90 × 50 mm',
  note: '성원애드피아 표준 규격 기준 · 작업 92 × 52 mm / 재단 90 × 50 mm / CMYK',
  /** 인쇄소에 넘기는 규격 한 줄 */
  printSpecLine: '92×52mm 작업 / 90×50mm 재단 / CMYK',
};

/** 1묶음 = 200매 */
export const CARD_SHEETS_PER_UNIT = 200;
export const CARD_MIN_UNITS = 1;
export const CARD_MAX_UNITS = 20;

export interface CardPaperOption {
  id: CardPaper;
  /** 제지사 정식 품명 */
  name: string;
  /** 좁은 카드에 쓰는 짧은 이름 */
  short: string;
  /** 평량 g/㎡ */
  gsm: number;
  /** 질감 설명 (카피박스 자체 문구) */
  texture: string;
  /** 어울리는 용도 */
  best: string;
  /** 단면 4도(컬러) 200매 기준가 (원) */
  price: number;
  /** 직접 촬영한 샘플북 사진 경로 — 비어 있으면 '준비 중' 안내 */
  photoUrl: string | null;
}

export const CARD_PAPER_OPTIONS: CardPaperOption[] = [
  {
    id: 'snow250',
    name: '스노우지 250g',
    short: '스노우지 250g',
    gsm: 250,
    texture: '표면이 고르고 매끈한 무광 백색지 · 잉크가 번짐 없이 또렷하게 앉습니다.',
    best: '사진·로고가 들어가는 기본 명함',
    price: 15000,
    photoUrl: null,
  },
  {
    id: 'snow300',
    name: '스노우지 300g',
    short: '스노우지 300g',
    gsm: 300,
    texture: '스노우지 250g과 같은 질감에 두께를 더해 손에 잡히는 느낌이 단단합니다.',
    best: '기본 명함을 조금 더 두껍게',
    price: 17000,
    photoUrl: null,
  },
  {
    id: 'banu250',
    name: '반누보 화이트 250g',
    short: '반누보 화이트',
    gsm: 250,
    texture: '살짝 아이보리 기운이 도는 자연스러운 백색 · 손끝에 닿는 결이 은은합니다.',
    best: '차분한 톤을 좋아하는 분',
    price: 20000,
    photoUrl: null,
  },
  {
    id: 'arte310',
    name: '아르떼 울트라화이트 310g',
    short: '아르떼 울트라화이트',
    gsm: 310,
    texture: '비침이 적은 두툼한 백색 무광지 · 컬러 사진을 넣어도 색이 맑게 올라옵니다.',
    best: '컬러 인쇄가 많은 명함',
    price: 24000,
    photoUrl: null,
  },
  {
    id: 'randevu240',
    name: '랑데뷰 내추럴 240g',
    short: '랑데뷰 내추럴',
    gsm: 240,
    texture: '재생펄프 특유의 부드러운 베이지 톤 · 잔결이 살아 있어 손맛이 좋습니다.',
    best: '따뜻하고 자연스러운 분위기',
    price: 23000,
    photoUrl: null,
  },
];

export interface CardPrintOption {
  id: CardPrintMode;
  /** 단가표·주문서 표기 */
  label: string;
  /** 좁은 화면 표기 */
  short: string;
  sides: 'single' | 'double';
  colors: 1 | 4;
  /** 지류 기준가(단면 4도)에 더하는 차액 (원 / 200매) */
  priceDelta: number;
  note: string;
}

export const CARD_PRINT_OPTIONS: CardPrintOption[] = [
  {
    id: 'single1',
    label: '단면 1도(흑백)',
    short: '단면 흑백',
    sides: 'single',
    colors: 1,
    priceDelta: -4000,
    note: '한 면을 검정 한 가지 색으로 인쇄합니다.',
  },
  {
    id: 'single4',
    label: '단면 4도(컬러)',
    short: '단면 컬러',
    sides: 'single',
    colors: 4,
    priceDelta: 0,
    note: '한 면을 CMYK 4도 컬러로 인쇄합니다.',
  },
  {
    id: 'double1',
    label: '양면 1도(흑백)',
    short: '양면 흑백',
    sides: 'double',
    colors: 1,
    priceDelta: 2000,
    note: '앞뒤 모두 검정 한 가지 색으로 인쇄합니다.',
  },
  {
    id: 'double4',
    label: '양면 4도(컬러)',
    short: '양면 컬러',
    sides: 'double',
    colors: 4,
    priceDelta: 6000,
    note: '앞뒤 모두 CMYK 4도 컬러로 인쇄합니다.',
  },
];

/** 시안 확인 · 출고 기준 */
export const CARD_PROOF = {
  /** 시안 수정 가능 횟수 */
  maxRevisions: 2,
  /** 확정 후 출고까지 영업일 */
  leadBusinessDays: 3,
  leadMinDays: 2,
  leadLabel: '시안 확정 후 영업일 2~3일 출고',
  leadShort: '시안 확정 후 2~3일 출고',
  requiresProof: true,
  revisionNotice: '※ 시안 수정은 최대 2회까지 가능합니다 (2회 초과 수정 불가)',
  confirmWarning:
    '수정 횟수가 정해져 있으니 오타·연락처·배치를 꼼꼼히 확인하신 뒤 확정 버튼을 눌러 주세요. 시안 확정 후에는 즉시 인쇄가 진행되어 수정·취소·환불이 불가합니다.',
  confirmNote: '시안 확정 전에는 인쇄가 시작되지 않습니다. 확정 시각과 확정 시안은 그대로 보관됩니다.',
  mailSubjectPrefix: '[카피박스] 명함 시안 확인 요청',
} as const;

export const CARD_PROOF_STATUS_LABEL: Record<CardProofStatus, string> = {
  not_requested: '시안 준비 중',
  requested: '시안 확인 요청',
  revision_requested: '수정 요청 접수',
  confirmed: '시안 확정',
};

export const CARD_PROOF_STATUS_TONE: Record<CardProofStatus, string> = {
  not_requested: 'bg-ink-50 text-ink-500 border-ink-200',
  requested: 'bg-amber-50 text-amber-700 border-amber-200',
  revision_requested: 'bg-rose-50 text-rose-700 border-rose-200',
  confirmed: 'bg-mint/10 text-mint border-mint/30',
};

export const CARD_OPEN_BADGE = '오픈 특가';
export const CARD_NOTICE =
  '지류·수량·인쇄 면을 고르면 금액이 바로 계산됩니다. 200매 기준 임시 단가이며, 지류·수량에 따라 추후 조정될 수 있습니다.';

export function cardPaperOption(id: CardPaper | string | null | undefined): CardPaperOption {
  return CARD_PAPER_OPTIONS.find((option) => option.id === id) ?? CARD_PAPER_OPTIONS[0];
}

export function isCardPaper(value: unknown): value is CardPaper {
  return CARD_PAPER_OPTIONS.some((option) => option.id === value);
}

export function cardPrintOption(id: CardPrintMode | string | null | undefined): CardPrintOption {
  return CARD_PRINT_OPTIONS.find((option) => option.id === id) ?? CARD_PRINT_OPTIONS[1];
}

export function isCardPrintMode(value: unknown): value is CardPrintMode {
  return CARD_PRINT_OPTIONS.some((option) => option.id === value);
}

/** "스노우지 250g" 처럼 평량까지 붙인 품명 */
export function cardSheetLabel(paper: CardPaper | string | null | undefined): string {
  return cardPaperOption(paper).name;
}

/** 200매 1묶음 판매가 = 지류 기준가 + 면·도수 차액 */
export function cardUnitPrice(paper: CardPaper | string | null | undefined, print: CardPrintMode | string | null | undefined): number {
  return Math.max(0, cardPaperOption(paper).price + cardPrintOption(print).priceDelta);
}

/** 샘플북 사진 주소 — 직접 찍은 사진을 public/samples/card-paper/ 에 넣고 photoUrl 에 경로를 적습니다. */
export function cardPaperPhotoUrl(option: CardPaperOption): string | null {
  if (!option.photoUrl) return null;
  if (/^(https?:|data:|\/)/.test(option.photoUrl)) return option.photoUrl;
  return `${import.meta.env.BASE_URL}${option.photoUrl.replace(/^\.?\//, '')}`;
}

export function cardUnits(value: number): number {
  return clamp(value, CARD_MIN_UNITS, CARD_MAX_UNITS);
}

export function cardSheets(units: number): number {
  return cardUnits(units) * CARD_SHEETS_PER_UNIT;
}

/** "0/2회" ~ "2/2회" */
export function revisionCounterLabel(count: number): string {
  const used = Math.max(0, Math.min(CARD_PROOF.maxRevisions, Math.floor(count)));
  return `${used}/${CARD_PROOF.maxRevisions}회`;
}

export function canRequestRevision(count: number): boolean {
  return count < CARD_PROOF.maxRevisions;
}
