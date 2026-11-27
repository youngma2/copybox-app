import { formatDateTime, todayCode } from './format';
import type { Quote } from './pricing';
import type { PaymentMethod } from '../config/status';

export { PICKUP_LABEL } from '../config/delivery';
export type { PickupMethod } from '../config/delivery';

export interface OrderFormValues {
  name: string;
  phone: string;
  /** 시안·안내를 받을 이메일 (선택) */
  email: string;
  address: string;
  notes: string;
  agree: boolean;
  paymentMethod: PaymentMethod;
}

export interface OrderDraft {
  name: string;
  phone: string;
  pickup: 'store' | 'delivery';
  address: string;
  notes: string;
  quote: Quote;
  fileName: string | null;
  fileSize: number | null;
  filePages: number | null;
}

/** 접수번호 — CB-YYMMDD-XXXXXX */
export function createOrderNumber(date: Date = new Date()): string {
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `CB-${todayCode(date)}-${random}`;
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

export function phoneDigits(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

export function isValidPhone(raw: string): boolean {
  return /^0\d{8,10}$/.test(phoneDigits(raw));
}

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatDateTime(date);
}
