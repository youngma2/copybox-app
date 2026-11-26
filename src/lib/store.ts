/**
 * 카피박스 손님·주문 저장소
 *
 * - Supabase(VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)가 설정되면 Supabase REST(PostgREST)를 사용합니다.
 *   (RLS 때문에 로그인 세션 access token 이 필요합니다 — README 'Supabase 연동' 참고)
 * - 설정이 없으면 localStorage 데모 저장소를 사용합니다. 모든 레코드는 customer_id 로 묶여
 *   손님별 과거 주문·요청사항·첨부파일을 그대로 다시 조회할 수 있습니다.
 * - 공부 체크 앱과는 저장 키·테이블·버킷이 모두 분리되어 있습니다.
 */

import { DEMO_USER_NAME, DEMO_USER_PHONE, type AccountProvider, type LoginProvider } from './auth';
import { createOrderNumber, phoneDigits, type PickupMethod } from './order';
import type { PaperSize, Quote } from './pricing';

export type StoreMode = 'demo' | 'supabase';

export type OrderStatus = 'received' | 'printing' | 'done' | 'canceled';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: '접수됨',
  printing: '인쇄중',
  done: '완료',
  canceled: '취소',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = ['received', 'printing', 'done'];

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

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  paperSize: PaperSize;
  colorMode: 'mono' | 'color';
  sides: 'single' | 'double';
  pages: number;
  copies: number;
  binding: 'none' | 'coil' | 'wire';
  pageUnitPrice: number;
  bindingUnitPrice: number;
  totalPrice: number;
  customerRequest: string | null;
  pickup: PickupMethod;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  files: OrderFile[];
}

export interface OrderWithCustomer extends Order {
  customer: Customer | null;
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
  signInDemo(provider: LoginProvider): Promise<Customer>;
  signOut(): Promise<void>;
  listOrdersByCustomer(customerId: string): Promise<Order[]>;
  listAllOrders(): Promise<OrderWithCustomer[]>;
  listCustomers(): Promise<Customer[]>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
  listStatusHistory(): Promise<StatusHistory[]>;
  seedSampleData(): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* 공통 유틸                                                            */
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

/* ------------------------------------------------------------------ */
/* 데모 저장소 (localStorage)                                           */
/* ------------------------------------------------------------------ */

const DEMO_KEY = 'copybox.v2.db';

interface DemoDb {
  version: 2;
  customers: Customer[];
  orders: Order[];
  statusHistory: StatusHistory[];
  sessionCustomerId: string | null;
}

function emptyDb(): DemoDb {
  return { version: 2, customers: [], orders: [], statusHistory: [], sessionCustomerId: null };
}

let memoryDb: DemoDb | null = null;

function loadDb(): DemoDb {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoDb>;
      if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.orders)) {
        memoryDb = {
          version: 2,
          customers: parsed.customers,
          orders: parsed.orders,
          statusHistory: Array.isArray(parsed.statusHistory) ? parsed.statusHistory : [],
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

function insertDemoOrder(db: DemoDb, customer: Customer, input: Omit<CreateOrderInput, 'customerId'>): Order {
  const { quote } = input;
  const createdAt = nowIso();
  const order: Order = {
    id: uid(),
    orderNumber: uniqueOrderNumber(db),
    customerId: customer.id,
    status: 'received',
    paperSize: quote.size,
    colorMode: quote.color,
    sides: quote.sides,
    pages: quote.pages,
    copies: quote.copies,
    binding: quote.binding.id,
    pageUnitPrice: quote.unitPrice,
    bindingUnitPrice: quote.binding.price,
    totalPrice: quote.total,
    customerRequest: input.customerRequest.trim() ? input.customerRequest.trim() : null,
    pickup: input.pickup,
    address: input.pickup === 'delivery' ? input.address.trim() || null : null,
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
    note: '주문 접수',
    createdAt,
  });
  return order;
}

function orderStorageName(name: string): string {
  const safe = name.replace(/[^\w.\-가-힣]/g, '_').slice(-80);
  return `${Date.now()}-${safe}`;
}

function updateDemoStatus(db: DemoDb, orderId: string, status: OrderStatus): void {
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) throw new StoreError('해당 주문을 찾을 수 없습니다.');
  if (order.status === status) return;
  const createdAt = nowIso();
  const previous = order.status;
  order.status = status;
  order.updatedAt = createdAt;
  db.statusHistory.unshift({
    id: uid(),
    orderId: order.id,
    customerId: order.customerId,
    fromStatus: previous,
    toStatus: status,
    changedBy: null,
    note: '관리자 상태 변경',
    createdAt,
  });
}

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
    return clone(sortByCreatedDesc(db.orders.filter((order) => order.customerId === customerId)));
  },

  async listAllOrders() {
    const db = loadDb();
    return sortByCreatedDesc(db.orders).map((order) => ({
      ...clone(order),
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
    const order = insertDemoOrder(db, customer, rest);
    saveDb(db);
    return clone(order);
  },

  async updateOrderStatus(orderId, status) {
    const db = loadDb();
    updateDemoStatus(db, orderId, status);
    saveDb(db);
  },

  async listStatusHistory() {
    const db = loadDb();
    return clone(sortByCreatedDesc(db.statusHistory));
  },

  async seedSampleData() {
    const db = loadDb();
    if (db.orders.length > 0) return;
    const samples: {
      name: string;
      phone: string;
      provider: AccountProvider;
      request: string;
      file: { name: string; size: number; pages: number | null } | null;
      quote: { color: 'mono' | 'color'; sides: 'single' | 'double'; pages: number; copies: number; binding: 'none' | 'coil' | 'wire' };
      status: OrderStatus;
    }[] = [
      {
        name: DEMO_USER_NAME,
        phone: DEMO_USER_PHONE,
        provider: 'kakao',
        request: '표지 컬러로, 나머지는 흑백 / 오늘 5시까지 찾으러 갈게요',
        file: { name: '중간고사-기출-수학.pdf', size: 842_112, pages: 24 },
        quote: { color: 'mono', sides: 'double', pages: 24, copies: 2, binding: 'coil' },
        status: 'done',
      },
      {
        name: '김민수',
        phone: '01023456789',
        provider: 'naver',
        request: '회사 제출용이라 깔끔하게 부탁드려요',
        file: { name: '2026-사업계획서.pdf', size: 1_240_552, pages: 18 },
        quote: { color: 'mono', sides: 'single', pages: 18, copies: 1, binding: 'none' },
        status: 'printing',
      },
      {
        name: '이서연',
        phone: '01034567890',
        provider: 'google',
        request: '와이어 제본으로 3부 부탁드립니다',
        file: { name: '졸업논문-최종.pdf', size: 3_402_880, pages: 62 },
        quote: { color: 'mono', sides: 'double', pages: 62, copies: 3, binding: 'wire' },
        status: 'received',
      },
    ];

    for (const sample of samples) {
      const customer = await demoStore.ensureCustomer({
        name: sample.name,
        phone: sample.phone,
        provider: sample.provider,
      });
      const order = await demoStore.createOrder({
        customerId: customer.id,
        quote: calculateSampleQuote(sample.quote),
        customerRequest: sample.request,
        pickup: 'store',
        address: '',
        file: sample.file,
      });
      if (sample.status !== 'received') {
        await demoStore.updateOrderStatus(order.id, sample.status);
      }
    }
  },
};

/** 예시 데이터용 견적 — pricing.calculateQuote 와 같은 규칙 */
function calculateSampleQuote(input: {
  color: 'mono' | 'color';
  sides: 'single' | 'double';
  pages: number;
  copies: number;
  binding: 'none' | 'coil' | 'wire';
}): Quote {
  const unitPrice = input.color === 'mono' ? (input.sides === 'single' ? 50 : 40) : input.sides === 'single' ? 300 : 250;
  const bindingPrice = input.binding === 'none' ? 0 : 1500;
  const printCost = unitPrice * input.pages * input.copies;
  const bindingCost = bindingPrice * input.copies;
  return {
    size: 'A4',
    color: input.color,
    sides: input.sides,
    pages: input.pages,
    copies: input.copies,
    binding: {
      id: input.binding,
      label: input.binding === 'none' ? '제본 없음' : input.binding === 'coil' ? '스프링' : '와이어',
      price: bindingPrice,
      startingAt: input.binding !== 'none',
      note: input.binding === 'none' ? '낱장으로 출력 · 추가 비용 없음' : '사이즈별 금액 추후 확정',
    },
    unitPrice,
    printCost,
    bindingCost,
    total: printCost + bindingCost,
    sheetsPerCopy: input.sides === 'double' ? Math.ceil(input.pages / 2) : input.pages,
  };
}

/* ------------------------------------------------------------------ */
/* Supabase 저장소 (PostgREST)                                          */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const SUPABASE_TOKEN_KEY = 'copybox.supabase.access_token';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function supabaseToken(): string {
  try {
    return (
      sessionStorage.getItem(SUPABASE_TOKEN_KEY) ||
      (import.meta.env.VITE_SUPABASE_ACCESS_TOKEN as string | undefined) ||
      ''
    );
  } catch {
    return '';
  }
}

interface CustomerRow {
  id: string;
  auth_user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  provider: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface OrderFileRow {
  id: string;
  order_id: string;
  customer_id: string;
  file_name: string;
  file_size: number | null;
  page_count: number | null;
  storage_path: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  paper_size: string;
  color_mode: string;
  sides: string;
  pages: number;
  copies: number;
  binding: string;
  page_unit_price: number;
  binding_unit_price: number;
  total_price: number;
  customer_request: string | null;
  pickup: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  order_files?: OrderFileRow[];
  customers?: CustomerRow | null;
}

interface StatusHistoryRow {
  id: string;
  order_id: string;
  customer_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

function asStatus(value: string | null | undefined): OrderStatus {
  return value === 'printing' || value === 'done' || value === 'canceled' ? value : 'received';
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    provider: (row.provider as AccountProvider) ?? 'guest',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapFile(row: OrderFileRow): OrderFile {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    pageCount: row.page_count,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    status: asStatus(row.status),
    paperSize: 'A4',
    colorMode: row.color_mode === 'color' ? 'color' : 'mono',
    sides: row.sides === 'double' ? 'double' : 'single',
    pages: row.pages,
    copies: row.copies,
    binding: row.binding === 'coil' || row.binding === 'wire' ? row.binding : 'none',
    pageUnitPrice: row.page_unit_price,
    bindingUnitPrice: row.binding_unit_price,
    totalPrice: row.total_price,
    customerRequest: row.customer_request,
    pickup: row.pickup === 'delivery' ? 'delivery' : 'store',
    address: row.address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    files: (row.order_files ?? []).map(mapFile),
  };
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = supabaseToken();
  if (!token) {
    throw new StoreError(
      'Supabase에 연결됐지만 로그인 세션(access token)이 없습니다. 손님 정보 보호를 위해 로그인 후에만 읽고 쓸 수 있습니다.',
    );
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { message?: string; hint?: string };
      detail = body.message ?? '';
    } catch {
      /* ignore */
    }
    throw new StoreError(`Supabase 요청에 실패했습니다 (${response.status}). ${detail}`.trim());
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const supabaseStore: CopyboxStore = {
  mode: 'supabase',

  async getSessionCustomer() {
    if (!supabaseToken()) return null;
    const rows = await rest<CustomerRow[]>('customers?select=*&deleted_at=is.null&limit=1');
    return rows[0] ? mapCustomer(rows[0]) : null;
  },

  async findCustomer({ name, phone }) {
    const rows = await rest<CustomerRow[]>(
      `customers?select=*&phone=eq.${encodeURIComponent(phoneDigits(phone))}&name=eq.${encodeURIComponent(
        normalizeName(name),
      )}&deleted_at=is.null&limit=1`,
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
  },

  async startSession() {
    // Supabase 모드의 세션은 로그인 access token 이 담당합니다.
  },

  async ensureCustomer({ name, phone, provider }) {
    const normalized = normalizeName(name);
    const digits = phoneDigits(phone);
    const rows = await rest<CustomerRow[]>(
      `customers?select=*&phone=eq.${encodeURIComponent(digits)}&name=eq.${encodeURIComponent(
        normalized,
      )}&deleted_at=is.null&limit=1`,
    );
    if (rows[0]) return mapCustomer(rows[0]);
    const created = await rest<CustomerRow[]>('customers', {
      method: 'POST',
      body: JSON.stringify({ name: normalized, phone: digits, provider }),
    });
    if (!created[0]) throw new StoreError('손님 정보를 저장하지 못했습니다.');
    return mapCustomer(created[0]);
  },

  async signInDemo() {
    throw new StoreError(
      'Supabase 모드에서는 카카오·네이버·구글 OAuth 연동이 필요합니다. 연동 전에는 연락처로 이어서 주문할 수 있어요.',
    );
  },

  async signOut() {
    try {
      sessionStorage.removeItem(SUPABASE_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },

  async listOrdersByCustomer(customerId) {
    const rows = await rest<OrderRow[]>(
      `orders?select=*,order_files(*)&customer_id=eq.${encodeURIComponent(customerId)}&order=created_at.desc`,
    );
    return rows.map(mapOrder);
  },

  async listAllOrders() {
    const rows = await rest<OrderRow[]>(
      'orders?select=*,order_files(*),customers(*)&order=created_at.desc&limit=500',
    );
    return rows.map((row) => ({ ...mapOrder(row), customer: row.customers ? mapCustomer(row.customers) : null }));
  },

  async listCustomers() {
    const rows = await rest<CustomerRow[]>('customers?select=*&deleted_at=is.null&order=created_at.desc&limit=500');
    return rows.map(mapCustomer);
  },

  async createOrder(input) {
    const { quote } = input;
    const orderNumber = createOrderNumber();
    const orderRows = await rest<OrderRow[]>('orders', {
      method: 'POST',
      body: JSON.stringify({
        order_number: orderNumber,
        customer_id: input.customerId,
        status: 'received',
        paper_size: quote.size,
        color_mode: quote.color,
        sides: quote.sides,
        pages: quote.pages,
        copies: quote.copies,
        binding: quote.binding.id,
        page_unit_price: quote.unitPrice,
        binding_unit_price: quote.binding.price,
        total_price: quote.total,
        customer_request: input.customerRequest.trim() || null,
        pickup: input.pickup,
        address: input.pickup === 'delivery' ? input.address.trim() || null : null,
      }),
    });
    const row = orderRows[0];
    if (!row) throw new StoreError('주문을 저장하지 못했습니다.');

    let files: OrderFile[] = [];
    if (input.file) {
      const fileRows = await rest<OrderFileRow[]>('order_files', {
        method: 'POST',
        body: JSON.stringify({
          order_id: row.id,
          customer_id: input.customerId,
          file_name: input.file.name,
          file_size: input.file.size,
          page_count: input.file.pages,
          storage_path: `${input.customerId}/${orderNumber}/${input.file.name}`,
        }),
      });
      files = fileRows.map(mapFile);
    }

    return { ...mapOrder(row), files };
  },

  async updateOrderStatus(orderId, status) {
    await rest<OrderRow[]>(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async listStatusHistory() {
    const rows = await rest<StatusHistoryRow[]>(
      'order_status_history?select=*&order=created_at.desc&limit=500',
    );
    return rows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      customerId: row.customer_id,
      fromStatus: row.from_status ? asStatus(row.from_status) : null,
      toStatus: asStatus(row.to_status),
      changedBy: row.changed_by,
      note: row.note,
      createdAt: row.created_at,
    }));
  },

  async seedSampleData() {
    throw new StoreError('Supabase 모드에서는 예시 데이터를 넣지 않습니다.');
  },
};

export const storeMode: StoreMode = isSupabaseConfigured ? 'supabase' : 'demo';
export const store: CopyboxStore = isSupabaseConfigured ? supabaseStore : demoStore;

export const STORE_MODE_LABEL: Record<StoreMode, string> = {
  demo: '데모 저장소 · 이 브라우저(localStorage)에 손님 ID 기준으로 저장',
  supabase: 'Supabase 연결됨 · 손님 정보는 RLS로 보호',
};
