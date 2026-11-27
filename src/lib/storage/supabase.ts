/**
 * Supabase 저장소 — PostgREST(REST) 경유
 *
 * · VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY 가 있으면 이 저장소가 선택됩니다.
 * · RLS 때문에 로그인 세션(access token)이 있어야 읽고 쓸 수 있습니다.
 * · 인쇄 PDF 원본·보관 사진은 Cloudflare R2 에 두고, 여기에는 경로(메타데이터)만 남깁니다.
 * · 사장님 화면 목록은 payment_status <> 'unpaid' 만 조회해 미결제 건을 제외합니다.
 */

import { createOrderNumber, phoneDigits } from '../order';
import { pdfPurgeDate } from '../../config/delivery';
import { asOrderStatus, asPaymentStatus, type OrderStatus, type PaymentMethod } from '../../config/status';
import {
  isCardPrintMode,
  isCardPaper,
  type CardInfo,
  type CardPaper,
  type CardPrintMode,
  type CardProofStatus,
} from '../../config/business-card';
import type { BindingId, ColorMode, Sides } from '../../config/pricing';
import {
  StoreError,
  type CardProofLog,
  type CardProofUploadInput,
  type CopyboxStore,
  type Customer,
  type Order,
  type OrderFile,
  type OrderMessage,
  type PickupPhoto,
  type Review,
} from './types';

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

interface PickupPhotoRow {
  id: string;
  order_id: string;
  customer_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  product: string | null;
  paper_size: string;
  color_mode: string;
  sides: string;
  pages: number;
  copies: number;
  binding: string;
  card_paper: string | null;
  card_print: string | null;
  card_qty: number | null;
  card_text: string | null;
  card_info: CardInfo | null;
  proof_status: string | null;
  proof_revision_count: number | null;
  proof_confirmed_at: string | null;
  proof_confirmed_version: number | null;
  page_unit_price: number;
  binding_unit_price: number;
  print_cost: number | null;
  discount_amount: number | null;
  shipping_fee: number | null;
  packaging_fee: number | null;
  total_price: number;
  delivery_speed: string | null;
  due_ship_date: string | null;
  payment_status: string | null;
  payment_method: string | null;
  payment_confirmed_at: string | null;
  customer_request: string | null;
  pickup: string | null;
  address: string | null;
  pdf_purge_at: string | null;
  created_at: string;
  updated_at: string;
  order_files?: OrderFileRow[];
  pickup_photos?: PickupPhotoRow[];
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

interface MessageRow {
  id: string;
  order_id: string;
  customer_id: string;
  author: string;
  body: string;
  created_at: string;
}

interface ReviewRow {
  id: string;
  order_id: string;
  customer_id: string;
  rating: number;
  body: string;
  photo_url: string | null;
  visible: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
}

interface CardProofLogRow {
  id: string;
  order_id: string;
  customer_id: string;
  kind: string;
  version: number | null;
  body: string | null;
  proof_url: string | null;
  proof_file_name: string | null;
  proof_file_type: string | null;
  actor: string;
  created_at: string;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    provider: (row.provider as Customer['provider']) ?? 'guest',
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

function mapPhoto(row: PickupPhotoRow): PickupPhoto {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    photoUrl: row.photo_url,
    caption: row.caption,
    createdAt: row.created_at,
  };
}

function mapOrder(row: OrderRow): Order {
  const binding = (row.binding === 'coil' || row.binding === 'wire' ? row.binding : 'none') as BindingId;
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    status: asOrderStatus(row.status),
    product: row.product === 'card' ? 'card' : 'print',
    paperSize: 'A4',
    colorMode: (row.color_mode === 'color' ? 'color' : 'mono') as ColorMode,
    sides: (row.sides === 'double' ? 'double' : 'single') as Sides,
    pages: row.pages,
    copies: row.copies,
    binding,
    cardPaper: isCardPaper(row.card_paper) ? (row.card_paper as CardPaper) : null,
    cardPrint: isCardPrintMode(row.card_print) ? (row.card_print as CardPrintMode) : null,
    cardQty: row.card_qty ?? null,
    cardText: row.card_text ?? null,
    cardInfo: (row.card_info as CardInfo | null) ?? null,
    proofStatus: (row.proof_status as CardProofStatus) ?? (row.product === 'card' ? 'not_requested' : 'confirmed'),
    proofRevisionCount: row.proof_revision_count ?? 0,
    proofConfirmedAt: row.proof_confirmed_at,
    proofConfirmedVersion: row.proof_confirmed_version,
    pageUnitPrice: row.page_unit_price,
    bindingUnitPrice: row.binding_unit_price,
    printCost: row.print_cost ?? row.page_unit_price * row.pages * row.copies,
    discount: row.discount_amount ?? 0,
    shippingFee: row.shipping_fee ?? 0,
    packagingFee: row.packaging_fee ?? 0,
    totalPrice: row.total_price,
    deliverySpeed: row.delivery_speed === 'eco' ? 'eco' : 'normal',
    dueShipDate: row.due_ship_date ?? '',
    paymentStatus: asPaymentStatus(row.payment_status),
    paymentMethod: (row.payment_method === 'kakaopay' ? 'kakaopay' : 'bank_transfer') as PaymentMethod,
    paymentConfirmedAt: row.payment_confirmed_at,
    customerRequest: row.customer_request,
    pickup: row.pickup === 'delivery' ? 'delivery' : 'store',
    address: row.address,
    pdfPurgeAt: row.pdf_purge_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    files: (row.order_files ?? []).map(mapFile),
    pickupPhotos: (row.pickup_photos ?? []).map(mapPhoto),
  };
}

function mapMessage(row: MessageRow): OrderMessage {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    author: row.author === 'admin' ? 'admin' : 'customer',
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    rating: row.rating,
    body: row.body,
    photoUrl: row.photo_url,
    visible: row.visible,
    adminReply: row.admin_reply,
    adminReplyAt: row.admin_reply_at,
    createdAt: row.created_at,
  };
}

function mapCardProofLog(row: CardProofLogRow): CardProofLog {
  const kind = row.kind === 'proof' || row.kind === 'revision' || row.kind === 'confirm' ? row.kind : 'note';
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    kind,
    version: row.version,
    body: row.body,
    proofUrl: row.proof_url,
    proofFileName: row.proof_file_name,
    proofFileType: row.proof_file_type,
    actor: row.actor === 'admin' ? 'admin' : row.actor === 'system' ? 'system' : 'customer',
    createdAt: row.created_at,
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

const ORDER_SELECT =
  'orders?select=*,order_files(*),pickup_photos(*),customers(*)&order=created_at.desc&limit=500';

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
        name.trim(),
      )}&deleted_at=is.null&limit=1`,
    );
    return rows[0] ? mapCustomer(rows[0]) : null;
  },

  async startSession() {
    // Supabase 모드의 세션은 로그인 access token 이 담당합니다.
  },

  async ensureCustomer({ name, phone, provider, email }) {
    const normalized = name.trim();
    const digits = phoneDigits(phone);
    const rows = await rest<CustomerRow[]>(
      `customers?select=*&phone=eq.${encodeURIComponent(digits)}&name=eq.${encodeURIComponent(
        normalized,
      )}&deleted_at=is.null&limit=1`,
    );
    if (rows[0]) {
      const found = mapCustomer(rows[0]);
      const trimmedEmail = email?.trim() ?? '';
      if (trimmedEmail && found.email !== trimmedEmail) {
        await rest<CustomerRow[]>(`customers?id=eq.${encodeURIComponent(found.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ email: trimmedEmail }),
        }).catch(() => undefined);
      }
      return found;
    }
    const created = await rest<CustomerRow[]>('customers', {
      method: 'POST',
      body: JSON.stringify({ name: normalized, phone: digits, provider, email: email?.trim() || null }),
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
      `orders?select=*,order_files(*),pickup_photos(*)&customer_id=eq.${encodeURIComponent(
        customerId,
      )}&order=created_at.desc`,
    );
    return rows.map(mapOrder);
  },

  async listAllOrders() {
    // 사장님 화면 — 결제가 끝난 주문만 (미결제 초안 제외)
    const rows = await rest<OrderRow[]>(`${ORDER_SELECT}&payment_status=neq.unpaid`);
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
        product: quote.product,
        paper_size: quote.size,
        color_mode: quote.color,
        sides: quote.sides,
        pages: quote.pages,
        copies: quote.copies,
        binding: quote.binding.id,
        card_paper: quote.product === 'card' ? quote.cardPaper : null,
        card_print: quote.product === 'card' ? quote.cardPrint : null,
        card_qty: quote.product === 'card' ? quote.cardQty : null,
        card_text: quote.product === 'card' ? quote.cardText.trim() || null : null,
        card_info: quote.product === 'card' ? quote.cardInfo : null,
        proof_status: quote.product === 'card' ? 'not_requested' : 'confirmed',
        page_unit_price: quote.unitPrice,
        binding_unit_price: quote.binding.price,
        print_cost: quote.printCost,
        discount_amount: quote.discount,
        shipping_fee: quote.shippingFee,
        packaging_fee: quote.packagingFee,
        total_price: quote.total,
        delivery_speed: quote.deliverySpeed,
        due_ship_date: quote.dueDate,
        payment_status: 'awaiting_deposit',
        payment_method: input.paymentMethod,
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
          storage_path: `r2/${input.customerId}/${orderNumber}/${input.file.name}`,
        }),
      });
      files = fileRows.map(mapFile);
    }

    if (quote.product === 'card') {
      // ⑦ 주문 메모·명함 정보를 시안 타임라인의 첫 기록으로 남깁니다.
      const noteBody = [
        quote.cardText.trim() ? `명함 문구: ${quote.cardText.trim()}` : '',
        quote.cardInfo ? `명함 정보: ${JSON.stringify(quote.cardInfo)}` : '',
        input.customerRequest.trim() ? `주문 메모: ${input.customerRequest.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      await rest<CardProofLogRow[]>('card_proof_logs', {
        method: 'POST',
        body: JSON.stringify({
          order_id: row.id,
          customer_id: input.customerId,
          kind: 'note',
          body: noteBody || null,
          actor: 'customer',
        }),
      }).catch(() => undefined);
    }

    return { ...mapOrder(row), files };
  },

  async updateOrderStatus(orderId, status: OrderStatus) {
    const body: Record<string, unknown> = { status };
    if (status === 'shipped' || status === 'delivered') {
      body.pdf_purge_at = pdfPurgeDate(new Date().toISOString())?.toISOString() ?? null;
    }
    await rest<OrderRow[]>(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  async confirmPayment(orderId) {
    await rest<OrderRow[]>(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status: 'confirmed', payment_confirmed_at: new Date().toISOString() }),
    });
  },

  async addPickupPhoto(orderId, photoUrl, caption) {
    const orderRows = await rest<OrderRow[]>(
      `orders?select=customer_id,pickup_photos(*)&id=eq.${encodeURIComponent(orderId)}&limit=1`,
    );
    const order = orderRows[0];
    if (!order) throw new StoreError('해당 주문을 찾을 수 없습니다.');
    if ((order.pickup_photos ?? []).length >= 2) {
      throw new StoreError('보관 사진은 주문당 최대 2장까지 올릴 수 있어요.');
    }
    await rest<PickupPhotoRow[]>('pickup_photos', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        customer_id: order.customer_id,
        photo_url: photoUrl,
        caption: caption ?? null,
      }),
    });
    const current = await rest<PickupPhotoRow[]>(
      `pickup_photos?select=*&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,
    );
    return current.map(mapPhoto);
  },

  async removePickupPhoto(orderId, photoId) {
    await rest<void>(`pickup_photos?id=eq.${encodeURIComponent(photoId)}`, { method: 'DELETE' });
    const rows = await rest<PickupPhotoRow[]>(
      `pickup_photos?select=*&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,
    );
    return rows.map(mapPhoto);
  },

  async listMessages(orderId) {
    const rows = await rest<MessageRow[]>(
      `order_messages?select=*&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,
    );
    return rows.map(mapMessage);
  },

  async addMessage({ orderId, author, body }) {
    const trimmed = body.trim();
    if (!trimmed) throw new StoreError('메시지 내용을 입력해 주세요.');
    const orderRows = await rest<OrderRow[]>(
      `orders?select=customer_id&id=eq.${encodeURIComponent(orderId)}&limit=1`,
    );
    const order = orderRows[0];
    if (!order) throw new StoreError('해당 주문을 찾을 수 없습니다.');
    const rows = await rest<MessageRow[]>('order_messages', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        customer_id: order.customer_id,
        author,
        body: trimmed.slice(0, 500),
      }),
    });
    if (!rows[0]) throw new StoreError('메시지를 저장하지 못했습니다.');
    return mapMessage(rows[0]);
  },

  async listReviews() {
    const rows = await rest<ReviewRow[]>('reviews?select=*&order=created_at.desc&limit=200');
    return rows.map(mapReview);
  },

  async listReviewsForCustomer(customerId) {
    const rows = await rest<ReviewRow[]>(
      `reviews?select=*&customer_id=eq.${encodeURIComponent(customerId)}&order=created_at.desc`,
    );
    return rows.map(mapReview);
  },

  async saveReview(input) {
    const rows = await rest<ReviewRow[]>('reviews', {
      method: 'POST',
      body: JSON.stringify({
        order_id: input.orderId,
        customer_id: input.customerId,
        rating: input.rating,
        body: input.body.trim().slice(0, 200),
        photo_url: input.photoUrl,
      }),
    });
    if (!rows[0]) throw new StoreError('리뷰를 저장하지 못했습니다.');
    return mapReview(rows[0]);
  },

  async setReviewVisibility(reviewId, visible) {
    await rest<ReviewRow[]>(`reviews?id=eq.${encodeURIComponent(reviewId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ visible }),
    });
  },

  async replyReview(reviewId, reply) {
    await rest<ReviewRow[]>(`reviews?id=eq.${encodeURIComponent(reviewId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        admin_reply: reply.trim() || null,
        admin_reply_at: reply.trim() ? new Date().toISOString() : null,
      }),
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
      fromStatus: row.from_status ? asOrderStatus(row.from_status) : null,
      toStatus: asOrderStatus(row.to_status),
      changedBy: row.changed_by,
      note: row.note,
      createdAt: row.created_at,
    }));
  },

  async listCardProofLogs(filter) {
    const params: string[] = ['select=*', 'order=created_at.asc', 'limit=500'];
    if (filter?.orderId) params.push(`order_id=eq.${encodeURIComponent(filter.orderId)}`);
    if (filter?.customerId) params.push(`customer_id=eq.${encodeURIComponent(filter.customerId)}`);
    const rows = await rest<CardProofLogRow[]>(`card_proof_logs?${params.join('&')}`);
    return rows.map(mapCardProofLog);
  },

  async uploadCardProof(orderId, input: CardProofUploadInput) {
    const orderRows = await rest<OrderRow[]>(
      `orders?select=id,customer_id,product,proof_status&id=eq.${encodeURIComponent(orderId)}&limit=1`,
    );
    const order = orderRows[0];
    if (!order) throw new StoreError('해당 주문을 찾을 수 없습니다.');
    if (order.product !== 'card') throw new StoreError('명함 주문에만 시안을 올릴 수 있습니다.');
    if (order.proof_status === 'confirmed') {
      throw new StoreError('고객이 시안을 확정한 주문에는 새 시안을 올릴 수 없습니다. 새 주문으로 진행해 주세요.');
    }
    const existing = await rest<CardProofLogRow[]>(
      `card_proof_logs?select=version&order_id=eq.${encodeURIComponent(orderId)}&kind=eq.proof`,
    );
    const version = existing.reduce((max, row) => Math.max(max, row.version ?? 0), 0) + 1;
    const rows = await rest<CardProofLogRow[]>('card_proof_logs', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        customer_id: order.customer_id,
        kind: 'proof',
        version,
        body: `${version}차 시안 업로드`,
        proof_url: input.fileUrl,
        proof_file_name: input.fileName,
        proof_file_type: input.fileType,
        actor: 'admin',
      }),
    });
    await rest<OrderRow[]>(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ proof_status: 'requested' }),
    });
    if (!rows[0]) throw new StoreError('시안을 저장하지 못했습니다.');
    return mapCardProofLog(rows[0]);
  },

  async requestCardRevision(orderId, body) {
    // 손님은 주문 행을 직접 고칠 수 없어 RPC(security definer)로 기록·상태를 함께 저장합니다.
    const trimmed = body.trim();
    if (!trimmed) throw new StoreError('수정하실 내용을 적어 주세요.');
    const rows = await rest<CardProofLogRow[]>('rpc/copybox_request_card_revision', {
      method: 'POST',
      body: JSON.stringify({ p_order_id: orderId, p_body: trimmed.slice(0, 1000) }),
    });
    if (!rows[0]) throw new StoreError('수정 요청을 저장하지 못했습니다.');
    return mapCardProofLog(rows[0]);
  },

  async confirmCardProof(orderId) {
    const rows = await rest<CardProofLogRow[]>('rpc/copybox_confirm_card_proof', {
      method: 'POST',
      body: JSON.stringify({ p_order_id: orderId }),
    });
    if (!rows[0]) throw new StoreError('시안 확정을 저장하지 못했습니다.');
    return mapCardProofLog(rows[0]);
  },

  async deleteMyData(customerId) {
    // 앱에서는 DELETE 권한이 없습니다. 개인정보 파기는 RPC(security definer)로만 수행합니다.
    await rest<void>('rpc/copybox_delete_my_data', {
      method: 'POST',
      body: JSON.stringify({ p_customer_id: customerId }),
    });
    try {
      sessionStorage.removeItem(SUPABASE_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },

  async seedSampleData() {
    throw new StoreError('Supabase 모드에서는 예시 데이터를 넣지 않습니다.');
  },
};

export { supabaseStore };
export const supabaseConfigured = isSupabaseConfigured;
