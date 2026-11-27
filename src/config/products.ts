/**
 * 상품 페이지 설정 (설정·규칙층)
 *
 * 상품 하나가 곧 상단 탭 하나입니다.
 * 새 상품(예: 포스터·배너)을 추가할 때는
 *   1) config/pricing.ts 의 ProductKind 에 id 추가
 *   2) 이 파일 PRODUCT_PAGES 에 문구·탭 이름 추가
 *   3) components/ProductPage.tsx 에 옵션·단가 화면 연결
 * 순서로 확장하면 탭·라우트·헤더가 한 번에 따라옵니다.
 */

import type { ProductKind } from './pricing';

export interface ProductTitleLine {
  lead?: string;
  /** 노란 형광펜 강조 */
  highlight?: string;
  tail?: string;
  text?: string;
}

export interface ProductStep {
  no: string;
  title: string;
  body: string;
}

export interface ProductPageContent {
  id: ProductKind;
  /** 해시 라우트 — 새로고침·링크 공유해도 같은 상품 페이지가 열립니다. */
  route: string;
  /** 데스크톱 상단 탭 이름 */
  navLabel: string;
  /** 모바일 탭 이름 (좁은 화면용) */
  navShort: string;
  /** 상단 안내 띠 문구 */
  ticker: string;
  eyebrow: string;
  titleLines: ProductTitleLine[];
  description: string;
  chips: string[];
  steps: ProductStep[];
  /** 옵션 카드 위 안내 문구 */
  quoteIntro: string;
}

export const PRODUCT_PAGES: Record<ProductKind, ProductPageContent> = {
  print: {
    id: 'print',
    route: '#/a4',
    navLabel: 'A4 출력 · 제본',
    navShort: 'A4 출력',
    ticker: 'A4 흑백 단면 50원 · 양면 40원 · 🌿 여유특가 인쇄비 10% 할인',
    eyebrow: 'A4 출력 · 제본',
    titleLines: [{ text: 'PDF만 올리면,' }, { lead: '견적은 ', highlight: '바로', tail: ' 나옵니다.' }],
    description:
      '파일을 끌어다 놓으면 페이지 수를 자동으로 세고, 인쇄비와 제본비를 실시간으로 계산해 드립니다. 회원가입 없이도 3초면 견적이 끝나요.',
    chips: ['A4 흑백 단면 50원', 'PDF 페이지 자동 인식', '제본 3종 · 스프링/와이어', '🌿 여유특가 인쇄비 10% 할인'],
    steps: [
      {
        no: '01',
        title: '파일 올리기',
        body: 'PDF·HWP·DOCX·이미지를 끌어다 놓으면 페이지 수를 자동으로 세어요.',
      },
      {
        no: '02',
        title: '옵션 고르기',
        body: '흑백/컬러 · 단면/양면 · 제본 3종을 고르면 금액이 바로 바뀝니다.',
      },
      {
        no: '03',
        title: '접수하고 수령',
        body: '연락처만 남기면 접수 끝. 매장 방문 또는 택배·퀵으로 받아요.',
      },
    ],
    quoteIntro: '파일을 올리고 옵션만 고르면 금액이 바로 계산돼요. 로그인은 필요 없습니다.',
  },
  card: {
    id: 'card',
    route: '#/card',
    navLabel: '명함',
    navShort: '명함',
    ticker: '명함 200매 15,000원~ 오픈 특가 · 지류 5종 · 시안 확정 후 영업일 2~3일 출고',
    eyebrow: '명함 · 90 × 50 mm',
    titleLines: [{ lead: '명함은 ', highlight: '문구만', tail: ' 주셔도,' }, { text: '시안부터 만들어 드립니다.' }],
    description:
      '디자인 파일이 없어도 괜찮습니다. 넣고 싶은 문구만 남겨 주시면 90×50mm 규격으로 시안을 잡아 드리고, 지류와 인쇄 면·도수, 수량을 고르는 즉시 금액이 계산됩니다. 시안을 확인해 확정해 주신 뒤에 인쇄를 시작합니다.',
    chips: [
      '200매 15,000원~ 오픈 특가',
      '지류 5종 · 평량·질감 안내',
      '시안 확정 후 영업일 2~3일 출고',
      '시안 수정 최대 2회',
    ],
    steps: [
      {
        no: '01',
        title: '문구·디자인 올리기',
        body: '디자인 파일이 있으면 올리고, 없으면 명함에 넣을 정보와 문구만 적어 주세요.',
      },
      {
        no: '02',
        title: '지류·면도수 고르기',
        body: '지류 5종과 단면·양면, 흑백·컬러를 고르고 200매 단위로 수량을 정하면 금액이 바로 나온다.',
      },
      {
        no: '03',
        title: '시안 확인 후 인쇄',
        body: '시안 확인 요청 → 고객 [시안 확정(OK)] 후 인쇄·재단합니다. 확정 후 영업일 2~3일 내 출고됩니다.',
      },
    ],
    quoteIntro:
      '지류와 인쇄 면·도수를 고르면 금액이 바로 계산됩니다. 디자인 파일이 없으면 문구만 적어 주세요. 시안 확인·확정 후 인쇄를 시작합니다.',
  },
};

/** 탭·페이지 노출 순서 */
export const PRODUCT_ORDER: ProductKind[] = ['print', 'card'];

export function productPage(id: ProductKind): ProductPageContent {
  return PRODUCT_PAGES[id];
}
