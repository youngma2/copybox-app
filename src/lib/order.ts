import { formatDateTime, todayCode } from './format';
import type { Quote } from './pricing';
import type { DemoUser } from './auth';
import { PROVIDER_LABEL } from './auth';

export type PickupMethod = 'store' | 'delivery';

export const PICKUP_LABEL: Record<PickupMethod, string> = {
  store: '매장 방문 수령',
  delivery: '택배 · 퀵',
};

export interface OrderRecord {
  orderNo: string;
  submittedAt: string;
  name: string;
  phone: string;
  pickup: PickupMethod;
  address: string;
  notes: string;
  memberLabel: string;
  fileName: string | null;
  filePages: number | null;
  autoDetected: boolean;
  quote: Quote;
}

export function createOrderRecord(input: {
  name: string;
  phone: string;
  pickup: PickupMethod;
  address: string;
  notes: string;
  user: DemoUser | null;
  fileName: string | null;
  filePages: number | null;
  autoDetected: boolean;
  quote: Quote;
}): OrderRecord {
  const now = new Date();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return {
    orderNo: `CB-${todayCode(now)}-${random}`,
    submittedAt: formatDateTime(now),
    name: input.name.trim(),
    phone: formatPhone(input.phone),
    pickup: input.pickup,
    address: input.address.trim(),
    notes: input.notes.trim(),
    memberLabel: input.user ? `${input.user.name} · ${PROVIDER_LABEL[input.user.provider]} 로그인` : '비회원 주문',
    fileName: input.fileName,
    filePages: input.filePages,
    autoDetected: input.autoDetected,
    quote: input.quote,
  };
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/[^0-9]/g, '');
  return /^0\d{8,10}$/.test(digits);
}
