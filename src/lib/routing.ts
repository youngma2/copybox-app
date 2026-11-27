/**
 * 화면(탭) 라우팅 — 상품 페이지는 각자 해시 주소를 가집니다.
 *
 * #/a4 · #/card · #/history · #/admin
 * GitHub Pages(정적 호스팅)에서 새로고침해도 그대로 열리도록 해시 라우팅을 씁니다.
 */

import type { ProductKind } from '../config/pricing';
import { PRODUCT_PAGES } from '../config/products';

export type ProductView = ProductKind;
export type View = ProductView | 'history' | 'admin';

export const PRODUCT_VIEWS: ProductView[] = ['print', 'card'];
export const VIEWS: View[] = ['print', 'card', 'history', 'admin'];

const HASH: Record<View, string> = {
  print: PRODUCT_PAGES.print.route,
  card: PRODUCT_PAGES.card.route,
  history: '#/history',
  admin: '#/admin',
};

export function hashForView(view: View): string {
  return HASH[view];
}

export function isProductView(view: View): view is ProductView {
  return view === 'print' || view === 'card';
}

export function viewFromHash(hash: string): View {
  const clean = hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim().toLowerCase();
  if (clean === 'card' || clean === 'business-card' || clean === 'myeongham') return 'card';
  if (clean === 'history' || clean === 'orders') return 'history';
  if (clean === 'admin') return 'admin';
  return 'print';
}

/** 상품 페이지의 canonical-ish 주소 (문서 링크·공유용) */
export function productHash(product: ProductKind): string {
  return PRODUCT_PAGES[product].route;
}
