import { BINDING_OPTIONS, COLOR_LABEL, SIDES_LABEL } from './pricing';
import type { Order } from './store';

type OrderOptionFields = Pick<Order, 'paperSize' | 'colorMode' | 'sides' | 'pages' | 'copies' | 'binding'>;

export function bindingLabel(id: OrderOptionFields['binding']): string {
  return BINDING_OPTIONS.find((option) => option.id === id)?.label ?? '제본 없음';
}

/** "A4 · 흑백 · 단면 · 3페이지 × 1부 · 스프링" */
export function describeOrderOptions(order: OrderOptionFields): string {
  return [
    order.paperSize,
    COLOR_LABEL[order.colorMode],
    SIDES_LABEL[order.sides],
    `${order.pages}페이지 × ${order.copies}부`,
    bindingLabel(order.binding),
  ].join(' · ');
}
