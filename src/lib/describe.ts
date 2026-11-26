import { CARD_SPEC, cardPaperOption } from '../config/business-card';
import { DELIVERY_SPEED_OPTIONS } from '../config/delivery';
import { BINDING_OPTIONS, COLOR_LABEL, SIDES_LABEL } from '../config/pricing';
import type { Order } from './storage';

type OrderOptionFields = Pick<
  Order,
  | 'product'
  | 'paperSize'
  | 'colorMode'
  | 'sides'
  | 'pages'
  | 'copies'
  | 'binding'
  | 'cardPaper'
  | 'cardQty'
>;

export function bindingLabel(id: OrderOptionFields['binding']): string {
  return BINDING_OPTIONS.find((option) => option.id === id)?.label ?? '제본 없음';
}

/** "A4 · 흑백 · 단면 · 3페이지 × 1부 · 스프링" / "명함 코팅 · 90×50mm · 200매" */
export function describeOrderOptions(order: OrderOptionFields): string {
  if (order.product === 'card') {
    const paper = cardPaperOption(order.cardPaper ?? 'coating');
    return `명함 ${paper.label.replace(' 명함', '')} · ${CARD_SPEC.widthMm}×${CARD_SPEC.heightMm}mm · ${
      order.cardQty ?? 200
    }매`;
  }
  return [
    order.paperSize,
    COLOR_LABEL[order.colorMode],
    SIDES_LABEL[order.sides],
    `${order.pages}페이지 × ${order.copies}부`,
    bindingLabel(order.binding),
  ].join(' · ');
}

/** "🌿 여유 제작 특가" | "" */
export function deliverySpeedBadge(order: Pick<Order, 'deliverySpeed'>): string {
  if (order.deliverySpeed !== 'eco') return '';
  const option = DELIVERY_SPEED_OPTIONS.find((row) => row.id === 'eco');
  return option ? `${option.emoji} 여유특가` : '여유특가';
}

export function deliverySpeedLabel(order: Pick<Order, 'deliverySpeed'>): string {
  const option = DELIVERY_SPEED_OPTIONS.find((row) => row.id === order.deliverySpeed);
  return option ? `${option.emoji} ${option.label}` : '🚀 일반 출고';
}

/** "2026-12-03" → "2026년 12월 3일 (목)" */
export function formatDateLabel(iso: string | null): string {
  if (!iso) return '-';
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}
