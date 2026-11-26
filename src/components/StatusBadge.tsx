import { ORDER_STATUS_LABEL, type OrderStatus } from '../lib/store';

const STYLE: Record<OrderStatus, string> = {
  received: 'bg-brand-50 text-brand-700 border-brand-200',
  printing: 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-mint/10 text-mint border-mint/30',
  canceled: 'bg-ink-50 text-ink-400 border-ink-200',
};

export default function StatusBadge({ status, className = '' }: { status: OrderStatus; className?: string }) {
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${STYLE[status]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
