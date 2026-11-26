import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from '../config/status';
import type { OrderStatus, PaymentStatus } from '../config/status';

export default function StatusBadge({ status, className = '' }: { status: OrderStatus; className?: string }) {
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${ORDER_STATUS_TONE[status]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function PaymentBadge({ status, className = '' }: { status: PaymentStatus; className?: string }) {
  return (
    <span
      data-testid={`payment-badge-${status}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${PAYMENT_STATUS_TONE[status]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}
