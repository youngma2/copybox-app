/**
 * 시안(데모) 저장소 — 브라우저 localStorage
 *
 * 운영에서는 Supabase(lib/storage/supabase.ts) + Cloudflare R2 로 바뀌지만,
 * 화면은 CopyboxStore 창구만 쓰기 때문에 코드 수정 없이 전환됩니다.
 *
 * 저장 구조는 customer_id 중심입니다.
 *   customers 1 — N orders 1 — N (order_files · pickup_photos · order_messages)
 *   reviews 는 order_id + customer_id 에 함께 묶입니다.
 */

import { DEMO_USER_NAME, DEMO_USER_PHONE, type AccountProvider } from '../auth';
import { createOrderNumber, phoneDigits } from '../order';
import { calculateQuote } from '../pricing';
import { dueShipDate, pdfPurgeDate } from '../../config/delivery';
import type { OrderStatus, PaymentMethod } from '../../config/status';
import type { CardPaper } from '../../config/business-card';
import { BINDING_OPTIONS } from '../../config/pricing';
import {
  StoreError,
  type CopyboxStore,
  type CreateOrderInput,
  type Customer,
  type Order,
  type OrderFile,
  type OrderMessage,
  type PickupPhoto,
  type Review,
  type ReviewInput,
  type StatusHistory,
} from './types';

/* ------------------------------------------------------------------ */
/* 공통 유틸                                                           */
/* ------------------------------------------------------------------ */

function uid(): string {
  const cryptoApi = typeof crypto !== 'undefined' ? crypto : undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sortByCreatedDesc<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(days: number, hour = 11, minute = 20): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/* ------------------------------------------------------------------ */
/* 데모 DB                                                             */
/* ------------------------------------------------------------------ */

const DEMO_KEY = 'copybox.v3.db';

interface DemoDb {
  version: 3;
  customers: Customer[];
  orders: Order[];
  statusHistory: StatusHistory[];
  messages: OrderMessage[];
  reviews: Review[];
  sessionCustomerId: string | null;
}

function emptyDb(): DemoDb {
  return {
    version: 3,
    customers: [],
    orders: [],
    statusHistory: [],
    messages: [],
    reviews: [],
    sessionCustomerId: null,
  };
}

let memoryDb: DemoDb | null = null;

/** v2 → v3 마이그레이션: 새 컬럼(입금·출고 속도·명함·택배비)을 채웁니다. */
function migrateOrder(raw: Partial<Order> & Record<string, unknown>): Order {
  const createdAt = String(raw.createdAt ?? nowIso());
  const binding = (raw.binding as Order['binding']) ?? 'none';
  const bindingOption = BINDING_OPTIONS.find((option) => option.id === binding) ?? BINDING_OPTIONS[0];
  const printCost =
    typeof raw.printCost === 'number'
      ? raw.printCost
      : Number(raw.pageUnitPrice ?? 0) * Number(raw.pages ?? 1) * Number(raw.copies ?? 1);
  const bindingCost = bindingOption.price * Number(raw.copies ?? 1);
  const status = (raw.status as OrderStatus) ?? 'received';
  const shippedAt = ['shipped', 'delivered'].includes(status) ? new Date(createdAt) : null;
  const order: Order = {
    id: String(raw.id ?? uid()),
    orderNumber: String(raw.orderNumber ?? createOrderNumber()),
    customerId: String(raw.customerId ?? ''),
    status,
    product: (raw.product as Order['product']) ?? 'print',
    paperSize: 'A4',
    colorMode: (raw.colorMode as Order['colorMode']) ?? 'mono',
    sides: (raw.sides as Order['sides']) ?? 'single',
    pages: Number(raw.pages ?? 1),
    copies: Number(raw.copies ?? 1),
    binding,
    cardPaper: (raw.cardPaper as CardPaper | null) ?? null,
    cardQty: (raw.cardQty as number | null) ?? null,
    cardText: (raw.cardText as string | null) ?? null,
    pageUnitPrice: Number(raw.pageUnitPrice ?? 0),
    bindingUnitPrice: Number(raw.bindingUnitPrice ?? bindingOption.price),
    printCost,
    discount: Number(raw.discount ?? 0),
    shippingFee: Number(raw.shippingFee ?? 0),
    packagingFee: Number(raw.packagingFee ?? 0),
    totalPrice: Number(raw.totalPrice ?? printCost + bindingCost),
    deliverySpeed: (raw.deliverySpeed as Order['deliverySpeed']) ?? 'normal',
    dueShipDate:
      (raw.dueShipDate as string) ?? isoDate(dueShipDate(createdAt, (raw.deliverySpeed as Order['deliverySpeed']) ?? 'normal')),
    paymentStatus: (raw.paymentStatus as Order['paymentStatus']) ?? 'confirmed',
    paymentMethod: (raw.paymentMethod as PaymentMethod) ?? 'bank_transfer',
    paymentConfirmedAt: (raw.paymentConfirmedAt as string | null) ?? createdAt,
    customerRequest: (raw.customerRequest as string | null) ?? null,
    pickup: (raw.pickup as Order['pickup']) ?? 'store',
    address: (raw.address as string | null) ?? null,
    pdfPurgeAt:
      (raw.pdfPurgeAt as string | null) ??
      (shippedAt ? pdfPurgeDate(shippedAt.toISOString())?.toISOString() ?? null : null),
    createdAt,
    updatedAt: String(raw.updatedAt ?? createdAt),
    files: Array.isArray(raw.files) ? (raw.files as OrderFile[]) : [],
    pickupPhotos: Array.isArray(raw.pickupPhotos) ? (raw.pickupPhotos as PickupPhoto[]) : [],
  };
  return order;
}

function loadDb(): DemoDb {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(DEMO_KEY) ?? localStorage.getItem('copybox.v2.db');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoDb> & {
        orders?: (Partial<Order> & Record<string, unknown>)[];
      };
      if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.orders)) {
        memoryDb = {
          version: 3,
          customers: parsed.customers as Customer[],
          orders: parsed.orders.map(migrateOrder),
          statusHistory: Array.isArray(parsed.statusHistory) ? (parsed.statusHistory as StatusHistory[]) : [],
          messages: Array.isArray(parsed.messages) ? (parsed.messages as OrderMessage[]) : [],
          reviews: Array.isArray(parsed.reviews) ? (parsed.reviews as Review[]) : [],
          sessionCustomerId: parsed.sessionCustomerId ?? null,
        };
        return memoryDb;
      }
    }
  } catch {
    /* localStorage를 쓸 수 없으면 메모리 저장소로 동작 */
  }
  memoryDb = emptyDb();
  return memoryDb;
}

function saveDb(db: DemoDb): void {
  memoryDb = db;
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(db));
  } catch {
    /* 저장 공간이 없거나 차단된 경우 메모리에만 유지 */
  }
}

function uniqueOrderNumber(db: DemoDb): string {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = createOrderNumber();
    if (!db.orders.some((order) => order.orderNumber === candidate)) return candidate;
  }
  return `CB-${Date.now().toString().slice(-8)}`;
}

function findCustomerInDb(db: DemoDb, input: { name: string; phone: string }): Customer | undefined {
  const phone = phoneDigits(input.phone);
  const name = normalizeName(input.name);
  return db.customers.find(
    (customer) => !customer.deletedAt && customer.phone === phone && normalizeName(customer.name) === name,
  );
}

function orderStorageName(name: string): string {
  const safe = name.replace(/[^\w.\-가-힣]/g, '_').slice(-80);
  return `${Date.now()}-${safe}`;
}

function buildOrder(
  db: DemoDb,
  customer: Customer,
  input: Omit<CreateOrderInput, 'customerId'>,
  createdAtIso: string,
): Order {
  const { quote } = input;
  const createdAt = createdAtIso;
  const order: Order = {
    id: uid(),
    orderNumber: uniqueOrderNumber(db),
    customerId: customer.id,
    status: 'received',
    product: quote.product,
    paperSize: quote.size,
    colorMode: quote.color,
    sides: quote.sides,
    pages: quote.pages,
    copies: quote.copies,
    binding: quote.binding.id,
    cardPaper: quote.product === 'card' ? quote.cardPaper : null,
    cardQty: quote.product === 'card' ? quote.cardQty : null,
    cardText: quote.product === 'card' ? quote.cardText.trim() || null : null,
    pageUnitPrice: quote.unitPrice,
    bindingUnitPrice: quote.binding.price,
    printCost: quote.printCost,
    discount: quote.discount,
    shippingFee: quote.shippingFee,
    packagingFee: quote.packagingFee,
    totalPrice: quote.total,
    deliverySpeed: quote.deliverySpeed,
    dueShipDate: isoDate(dueShipDate(createdAt, quote.deliverySpeed)),
    // 주문 행은 결제(입금 신청) 완료 시점에만 만들어지므로 입금 대기 상태로 시작합니다.
    paymentStatus: 'awaiting_deposit',
    paymentMethod: input.paymentMethod,
    paymentConfirmedAt: null,
    customerRequest: input.customerRequest.trim() ? input.customerRequest.trim() : null,
    pickup: input.pickup,
    address: input.pickup === 'delivery' ? input.address.trim() || null : null,
    pdfPurgeAt: null,
    createdAt,
    updatedAt: createdAt,
    files: input.file
      ? [
          {
            id: uid(),
            orderId: '',
            customerId: customer.id,
            fileName: input.file.name,
            fileSize: input.file.size,
            pageCount: input.file.pages,
            storagePath: `demo/${customer.id}/${orderStorageName(input.file.name)}`,
            createdAt,
          },
        ]
      : [],
    pickupPhotos: [],
  };
  order.files = order.files.map((file) => ({ ...file, orderId: order.id }));
  db.orders.unshift(order);
  db.statusHistory.unshift({
    id: uid(),
    orderId: order.id,
    customerId: customer.id,
    fromStatus: null,
    toStatus: 'received',
    changedBy: null,
    note: '결제 완료 · 주문 접수',
    createdAt,
  });
  return order;
}

function updateDemoStatus(db: DemoDb, orderId: string, status: OrderStatus): void {
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) throw new StoreError('해당 주문을 찾을 수 없습니다.');
  if (order.status === status) return;
  const createdAt = nowIso();
  const previous = order.status;
  order.status = status;
  order.updatedAt = createdAt;
  if ((status === 'shipped' || status === 'delivered') && !order.pdfPurgeAt) {
    order.pdfPurgeAt = pdfPurgeDate(createdAt)?.toISOString() ?? null;
  }
  db.statusHistory.unshift({
    id: uid(),
    orderId: order.id,
    customerId: order.customerId,
    fromStatus: previous,
    toStatus: status,
    changedBy: null,
    note: '사장님 상태 변경',
    createdAt,
  });
}

/* ------------------------------------------------------------------ */
/* 데모 저장소 구현                                                     */
/* ------------------------------------------------------------------ */

const demoStore: CopyboxStore = {
  mode: 'demo',

  async getSessionCustomer() {
    const db = loadDb();
    if (!db.sessionCustomerId) return null;
    const customer = db.customers.find((row) => row.id === db.sessionCustomerId && !row.deletedAt);
    return customer ? clone(customer) : null;
  },

  async findCustomer({ name, phone }) {
    const db = loadDb();
    const found = findCustomerInDb(db, { name, phone });
    return found ? clone(found) : null;
  },

  async startSession(customerId) {
    const db = loadDb();
    if (!db.customers.some((row) => row.id === customerId && !row.deletedAt)) {
      throw new StoreError('손님 정보를 찾을 수 없습니다.');
    }
    db.sessionCustomerId = customerId;
    saveDb(db);
  },

  async ensureCustomer({ name, phone, provider }) {
    const db = loadDb();
    const existing = findCustomerInDb(db, { name, phone });
    if (existing) {
      if (provider !== 'guest' && existing.provider !== provider) {
        existing.provider = provider;
        existing.updatedAt = nowIso();
        saveDb(db);
      }
      return clone(existing);
    }
    const createdAt = nowIso();
    const customer: Customer = {
      id: uid(),
      authUserId: null,
      name: normalizeName(name),
      phone: phoneDigits(phone),
      email: null,
      provider,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    };
    db.customers.unshift(customer);
    saveDb(db);
    return clone(customer);
  },

  async signInDemo(provider) {
    const customer = await demoStore.ensureCustomer({
      name: DEMO_USER_NAME,
      phone: DEMO_USER_PHONE,
      provider,
    });
    const db = loadDb();
    db.sessionCustomerId = customer.id;
    saveDb(db);
    return customer;
  },

  async signOut() {
    const db = loadDb();
    db.sessionCustomerId = null;
    saveDb(db);
  },

  async listOrdersByCustomer(customerId) {
    const db = loadDb();
    return clone(
      sortByCreatedDesc(db.orders.filter((order) => order.customerId === customerId)),
    ).map((order) => ({
      ...order,
      pickupPhotos: order.pickupPhotos ?? [],
      files: order.files ?? [],
    }));
  },

  async listAllOrders() {
    const db = loadDb();
    // 사장님 화면에는 결제가 끝난 주문만 — 미결제 초안·작성 중 이탈 건은 보이지 않습니다.
    return sortByCreatedDesc(db.orders.filter((order) => order.paymentStatus !== 'unpaid')).map((order) => ({
      ...clone(order),
      pickupPhotos: order.pickupPhotos ?? [],
      customer: clone(db.customers.find((customer) => customer.id === order.customerId) ?? null),
    }));
  },

  async listCustomers() {
    const db = loadDb();
    return clone(db.customers.filter((customer) => !customer.deletedAt));
  },

  async createOrder(input) {
    const db = loadDb();
    const customer = db.customers.find((row) => row.id === input.customerId && !row.deletedAt);
    if (!customer) throw new StoreError('손님 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');
    const { customerId: _customerId, ...rest } = input;
    void _customerId;
    const order = buildOrder(db, customer, rest, nowIso());
    saveDb(db);
    return clone(order);
  },

  async updateOrderStatus(orderId, status) {
    const db = loadDb();
    updateDemoStatus(db, orderId, status);
    saveDb(db);
  },

  async confirmPayment(orderId) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === orderId);
    if (!order) throw new StoreError('해당 주문을 찾을 수 없습니다.');
    if (order.paymentStatus === 'confirmed') return;
    order.paymentStatus = 'confirmed';
    order.paymentConfirmedAt = nowIso();
    order.updatedAt = order.paymentConfirmedAt;
    db.statusHistory.unshift({
      id: uid(),
      orderId: order.id,
      customerId: order.customerId,
      fromStatus: order.status,
      toStatus: order.status,
      changedBy: null,
      note: '입금 확인 완료',
      createdAt: order.paymentConfirmedAt,
    });
    saveDb(db);
  },

  async addPickupPhoto(orderId, photoUrl, caption) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === orderId);
    if (!order) throw new StoreError('해당 주문을 찾을 수 없습니다.');
    order.pickupPhotos = order.pickupPhotos ?? [];
    if (order.pickupPhotos.length >= 2) {
      throw new StoreError('보관 사진은 주문당 최대 2장까지 올릴 수 있어요.');
    }
    order.pickupPhotos.push({
      id: uid(),
      orderId: order.id,
      customerId: order.customerId,
      photoUrl,
      caption: caption ?? null,
      createdAt: nowIso(),
    });
    order.updatedAt = nowIso();
    saveDb(db);
    return clone(order.pickupPhotos);
  },

  async removePickupPhoto(orderId, photoId) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === orderId);
    if (!order) throw new StoreError('해당 주문을 찾을 수 없습니다.');
    order.pickupPhotos = (order.pickupPhotos ?? []).filter((photo) => photo.id !== photoId);
    order.updatedAt = nowIso();
    saveDb(db);
    return clone(order.pickupPhotos);
  },

  async listMessages(orderId) {
    const db = loadDb();
    return clone(
      db.messages
        .filter((message) => message.orderId === orderId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  },

  async addMessage({ orderId, author, body }) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === orderId);
    if (!order) throw new StoreError('해당 주문을 찾을 수 없습니다.');
    const trimmed = body.trim();
    if (!trimmed) throw new StoreError('메시지 내용을 입력해 주세요.');
    const message: OrderMessage = {
      id: uid(),
      orderId,
      customerId: order.customerId,
      author,
      body: trimmed.slice(0, 500),
      createdAt: nowIso(),
    };
    db.messages.push(message);
    saveDb(db);
    return clone(message);
  },

  async listReviews() {
    const db = loadDb();
    return clone(sortByCreatedDesc(db.reviews));
  },

  async listReviewsForCustomer(customerId) {
    const db = loadDb();
    return clone(sortByCreatedDesc(db.reviews.filter((review) => review.customerId === customerId)));
  },

  async saveReview(input: ReviewInput) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === input.orderId && row.customerId === input.customerId);
    if (!order) throw new StoreError('리뷰를 남길 주문을 찾을 수 없습니다.');
    if (order.status !== 'delivered') {
      throw new StoreError('리뷰는 배송 완료된 주문에만 남길 수 있어요.');
    }
    const existing = db.reviews.find((review) => review.orderId === input.orderId);
    if (existing) throw new StoreError('이 주문에는 이미 리뷰를 남겼어요.');
    const review: Review = {
      id: uid(),
      orderId: input.orderId,
      customerId: input.customerId,
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      body: input.body.trim().slice(0, 200),
      photoUrl: input.photoUrl,
      visible: true,
      adminReply: null,
      adminReplyAt: null,
      createdAt: nowIso(),
    };
    db.reviews.push(review);
    saveDb(db);
    return clone(review);
  },

  async setReviewVisibility(reviewId, visible) {
    const db = loadDb();
    const review = db.reviews.find((row) => row.id === reviewId);
    if (!review) throw new StoreError('리뷰를 찾을 수 없습니다.');
    review.visible = visible;
    saveDb(db);
  },

  async replyReview(reviewId, reply) {
    const db = loadDb();
    const review = db.reviews.find((row) => row.id === reviewId);
    if (!review) throw new StoreError('리뷰를 찾을 수 없습니다.');
    review.adminReply = reply.trim() || null;
    review.adminReplyAt = review.adminReply ? nowIso() : null;
    saveDb(db);
  },

  async listStatusHistory() {
    const db = loadDb();
    return clone(sortByCreatedDesc(db.statusHistory));
  },

  async deleteMyData(customerId) {
    const db = loadDb();
    const customer = db.customers.find((row) => row.id === customerId);
    if (!customer) throw new StoreError('손님 정보를 찾을 수 없습니다.');
    const now = nowIso();

    // 인쇄 PDF·보관 사진·메시지·요청사항·주소 등 개인 정보는 즉시 파기
    db.orders
      .filter((order) => order.customerId === customerId)
      .forEach((order) => {
        order.files = [];
        order.pickupPhotos = [];
        order.address = null;
        order.customerRequest = null;
        order.cardText = null;
        order.updatedAt = now;
      });
    db.messages = db.messages.filter((message) => message.customerId !== customerId);
    db.reviews
      .filter((review) => review.customerId === customerId)
      .forEach((review) => {
        review.photoUrl = null;
        review.body = '탈퇴한 고객의 리뷰입니다.';
      });

    // 결제 기록만 비식별로 5년 보관 (전자상거래법)
    customer.name = '탈퇴한 고객';
    customer.phone = '00000000000';
    customer.email = null;
    customer.deletedAt = now;
    customer.updatedAt = now;
    if (db.sessionCustomerId === customerId) db.sessionCustomerId = null;
    saveDb(db);
  },

  async seedSampleData() {
    const db = loadDb();
    if (db.orders.length > 0) return;

    const seeds: {
      name: string;
      phone: string;
      provider: AccountProvider;
      request: string;
      createdAt: Date;
      status: OrderStatus;
      payment: 'awaiting' | 'confirmed';
      quoteInput: Parameters<typeof calculateQuote>[0];
      file: { name: string; size: number; pages: number | null } | null;
      address?: string;
    }[] = [
      {
        name: DEMO_USER_NAME,
        phone: DEMO_USER_PHONE,
        provider: 'kakao',
        request: '표지 컬러로, 나머지는 흑백 / 방문 수령 때 사진으로 확인할게요',
        createdAt: daysAgo(12, 10, 12),
        status: 'delivered',
        payment: 'confirmed',
        quoteInput: {
          product: 'print',
          size: 'A4',
          color: 'mono',
          sides: 'double',
          pages: 24,
          copies: 2,
          binding: 'coil',
          cardPaper: 'coating',
          cardUnits: 1,
          cardText: '',
          pickup: 'store',
          deliverySpeed: 'normal',
        },
        file: { name: '중간고사-기출-수학.pdf', size: 842_112, pages: 24 },
      },
      {
        name: '김민수',
        phone: '01023456789',
        provider: 'naver',
        request: '회사 제출용이라 깔끔하게 부탁드려요',
        createdAt: daysAgo(0, 9, 40),
        status: 'printing',
        payment: 'awaiting',
        quoteInput: {
          product: 'print',
          size: 'A4',
          color: 'mono',
          sides: 'single',
          pages: 18,
          copies: 1,
          binding: 'none',
          cardPaper: 'coating',
          cardUnits: 1,
          cardText: '',
          pickup: 'delivery',
          deliverySpeed: 'normal',
        },
        file: { name: '2026-사업계획서.pdf', size: 1_240_552, pages: 18 },
        address: '서울 마포구 월드컵북로 100, 3층',
      },
      {
        name: '이서연',
        phone: '01034567890',
        provider: 'google',
        request: '와이어 제본으로 3부, 급하지 않습니다',
        createdAt: daysAgo(6, 15, 5),
        status: 'shipped',
        payment: 'confirmed',
        quoteInput: {
          product: 'print',
          size: 'A4',
          color: 'mono',
          sides: 'double',
          pages: 62,
          copies: 3,
          binding: 'wire',
          cardPaper: 'coating',
          cardUnits: 1,
          cardText: '',
          pickup: 'delivery',
          deliverySpeed: 'eco',
        },
        file: { name: '졸업논문-최종.pdf', size: 3_402_880, pages: 62 },
        address: '경기 고양시 일산동구 중앙로 100',
      },
      {
        name: '박지훈',
        phone: '01045678901',
        provider: 'guest',
        request: '디자인 파일 없이 문구만 남깁니다. 시안 먼저 보여 주세요.',
        createdAt: daysAgo(3, 18, 30),
        status: 'received',
        payment: 'awaiting',
        quoteInput: {
          product: 'card',
          size: 'A4',
          color: 'color',
          sides: 'single',
          pages: 1,
          copies: 1,
          binding: 'none',
          cardPaper: 'coating',
          cardUnits: 1,
          cardText: '카피박스 · 김대표 · 010-1234-5678\n일산 복사·출력·제본 전문',
          pickup: 'store',
          deliverySpeed: 'normal',
        },
        file: null,
      },
      {
        name: '최유진',
        phone: '01056789012',
        provider: 'kakao',
        request: '스프링 제본, 표지 없이',
        createdAt: daysAgo(1, 20, 10),
        status: 'done',
        payment: 'confirmed',
        quoteInput: {
          product: 'print',
          size: 'A4',
          color: 'mono',
          sides: 'double',
          pages: 60,
          copies: 1,
          binding: 'coil',
          cardPaper: 'coating',
          cardUnits: 1,
          cardText: '',
          pickup: 'store',
          deliverySpeed: 'eco',
        },
        file: { name: '강의자료-모음.pdf', size: 2_100_400, pages: 60 },
      },
    ];

    for (const seed of seeds) {
      const customer = await demoStore.ensureCustomer({
        name: seed.name,
        phone: seed.phone,
        provider: seed.provider,
      });
      const createdAt = seed.createdAt.toISOString();
      const order = buildOrder(
        db,
        customer,
        {
          quote: calculateQuote(seed.quoteInput, seed.createdAt),
          customerRequest: seed.request,
          pickup: seed.quoteInput.pickup,
          address: seed.address ?? '',
          file: seed.file,
          paymentMethod: 'bank_transfer',
        },
        createdAt,
      );
      if (seed.payment === 'confirmed') {
        order.paymentStatus = 'confirmed';
        order.paymentConfirmedAt = new Date(seed.createdAt.getTime() + 25 * 60 * 1000).toISOString();
      }
      // 상태 이력도 당시 시각으로 남깁니다.
      if (seed.status !== 'received') {
        const flow: OrderStatus[] = ['printing', 'done', 'shipped', 'delivered'];
        const target = flow.indexOf(seed.status);
        flow.slice(0, target + 1).forEach((status, index) => {
          const at = new Date(seed.createdAt.getTime() + (index + 1) * 6 * 60 * 60 * 1000).toISOString();
          order.status = status;
          order.updatedAt = at;
          if ((status === 'shipped' || status === 'delivered') && !order.pdfPurgeAt) {
            order.pdfPurgeAt = pdfPurgeDate(at)?.toISOString() ?? null;
          }
          db.statusHistory.unshift({
            id: uid(),
            orderId: order.id,
            customerId: order.customerId,
            fromStatus: null,
            toStatus: status,
            changedBy: null,
            note: '사장님 상태 변경',
            createdAt: at,
          });
        });
      }
      if (seed.name === DEMO_USER_NAME) {
        db.messages.push({
          id: uid(),
          orderId: order.id,
          customerId: order.customerId,
          author: 'customer',
          body: '혹시 오늘 저녁 7시까지 찾을 수 있을까요?',
          createdAt: new Date(seed.createdAt.getTime() + 60 * 60 * 1000).toISOString(),
        });
        db.messages.push({
          id: uid(),
          orderId: order.id,
          customerId: order.customerId,
          author: 'admin',
          body: '네, 6시까지 준비해 두겠습니다. 보관 사진도 올려 둘게요!',
          createdAt: new Date(seed.createdAt.getTime() + 80 * 60 * 1000).toISOString(),
        });
        db.reviews.push({
          id: uid(),
          orderId: order.id,
          customerId: order.customerId,
          rating: 5,
          body: '깔끔하게 잘 나왔고 보관 사진까지 확인할 수 있어서 좋았어요.',
          photoUrl: null,
          visible: true,
          adminReply: '감사합니다! 다음에도 정성껏 준비해 두겠습니다.',
          adminReplyAt: new Date(seed.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(seed.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    saveDb(db);
  },
};

export { demoStore, DEMO_KEY };
