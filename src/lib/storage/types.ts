/**
 * 저장소 공통 타입 — 화면은 이 타입과 CopyboxStore 창구만 알고,
 * 실제 저장 위치(localStorage 시안 / Supabase+R2)는 lib/storage/index.ts 가 고릅니다.
 */

import type { AccountProvider } from '../auth';
import type { Quote } from '../pricing';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../../config/status';
import type { DeliverySpeed, PickupMethod } from '../../config/delivery';
import type { CardPaper } from '../../config/business-card';
import type { BindingId, ColorMode, PaperSize, ProductKind, Sides } from '../../config/pricing';

export type StoreMode = 'demo' | 'supabase';

export interface Customer {
  id: string;
  authUserId: string | null;
  name: string;
  phone: string;
  email: string | null;
  provider: AccountProvider;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrderFile {
  id: string;
  orderId: string;
  customerId: string;
  fileName: string;
  fileSize: number | null;
  pageCount: number | null;
  storagePath: string | null;
  createdAt: string;
}

/** 방문 수령 보관 사진 (주문당 최대 2장) */
export interface PickupPhoto {
  id: string;
  orderId: string;
  customerId: string;
  /** 시안 모드에서는 브라우저에 저장한 data URL, 운영 모드에서는 R2 경로 */
  photoUrl: string;
  caption: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  product: ProductKind;
  paperSize: PaperSize;
  colorMode: ColorMode;
  sides: Sides;
  pages: number;
  copies: number;
  binding: BindingId;
  cardPaper: CardPaper | null;
  cardQty: number | null;
  cardText: string | null;
  pageUnitPrice: number;
  bindingUnitPrice: number;
  printCost: number;
  discount: number;
  shippingFee: number;
  packagingFee: number;
  totalPrice: number;
  deliverySpeed: DeliverySpeed;
  dueShipDate: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentConfirmedAt: string | null;
  customerRequest: string | null;
  pickup: PickupMethod;
  address: string | null;
  /** 출고·배송 완료 뒤 14일 뒤 PDF 원본 파기 예정 시각 */
  pdfPurgeAt: string | null;
  createdAt: string;
  updatedAt: string;
  files: OrderFile[];
  pickupPhotos: PickupPhoto[];
}

export interface OrderWithCustomer extends Order {
  customer: Customer | null;
}

/** 손님 ↔ 사장님 짧은 메시지 (주문별 보존) */
export interface OrderMessage {
  id: string;
  orderId: string;
  customerId: string;
  author: 'customer' | 'admin';
  body: string;
  createdAt: string;
}

/** 배송 완료 주문에만 남길 수 있는 리뷰 */
export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  rating: number;
  body: string;
  photoUrl: string | null;
  visible: boolean;
  adminReply: string | null;
  adminReplyAt: string | null;
  createdAt: string;
}

export interface StatusHistory {
  id: string;
  orderId: string;
  customerId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreateOrderInput {
  customerId: string;
  quote: Quote;
  customerRequest: string;
  pickup: PickupMethod;
  address: string;
  file: { name: string; size: number; pages: number | null } | null;
  paymentMethod: PaymentMethod;
}

export interface ReviewInput {
  orderId: string;
  customerId: string;
  rating: number;
  body: string;
  photoUrl: string | null;
}

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreError';
  }
}

export interface CopyboxStore {
  mode: StoreMode;
  getSessionCustomer(): Promise<Customer | null>;
  findCustomer(input: { name: string; phone: string }): Promise<Customer | null>;
  ensureCustomer(input: { name: string; phone: string; provider: AccountProvider }): Promise<Customer>;
  startSession(customerId: string): Promise<void>;
  signInDemo(provider: 'kakao' | 'naver' | 'google'): Promise<Customer>;
  signOut(): Promise<void>;
  listOrdersByCustomer(customerId: string): Promise<Order[]>;
  /** 사장님 화면 — 결제 완료(입금 대기 포함)된 주문만. 미결제 초안은 제외됩니다. */
  listAllOrders(): Promise<OrderWithCustomer[]>;
  listCustomers(): Promise<Customer[]>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
  confirmPayment(orderId: string): Promise<void>;
  addPickupPhoto(orderId: string, photoUrl: string, caption?: string): Promise<PickupPhoto[]>;
  removePickupPhoto(orderId: string, photoId: string): Promise<PickupPhoto[]>;
  listMessages(orderId: string): Promise<OrderMessage[]>;
  addMessage(input: { orderId: string; author: 'customer' | 'admin'; body: string }): Promise<OrderMessage>;
  listReviews(): Promise<Review[]>;
  listReviewsForCustomer(customerId: string): Promise<Review[]>;
  saveReview(input: ReviewInput): Promise<Review>;
  setReviewVisibility(reviewId: string, visible: boolean): Promise<void>;
  replyReview(reviewId: string, reply: string): Promise<void>;
  listStatusHistory(): Promise<StatusHistory[]>;
  /** 회원 탈퇴 — 이름·연락처·주소·파일 즉시 파기, 결제 기록만 비식별 보관 */
  deleteMyData(customerId: string): Promise<void>;
  seedSampleData(): Promise<void>;
}

export const STORE_MODE_LABEL: Record<StoreMode, string> = {
  demo: '데모 저장소 · 이 브라우저(localStorage)에 손님 ID 기준으로 저장',
  supabase: 'Supabase 연결됨 · 손님 정보는 RLS로 보호',
};
