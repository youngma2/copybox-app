import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import ProductPage from './components/ProductPage';
import HistorySection from './components/HistorySection';
import AdminSection from './components/AdminSection';
import NoticePopup from './components/NoticePopup';
import { PROVIDER_LABEL, type LoginProvider } from './lib/auth';
import { won } from './lib/format';
import { isValidPhone, type OrderFormValues } from './lib/order';
import { DEFAULT_QUOTE_INPUT, calculateQuote, type QuoteInput } from './lib/pricing';
import type { ProductKind } from './config/pricing';
import { PRODUCT_PAGES } from './config/products';
import { STORE } from './config/store';
import type { PickupMethod } from './config/delivery';
import { hashForView, isProductView, viewFromHash, type View } from './lib/routing';
import {
  STORE_MODE_LABEL,
  store,
  storeMode,
  type Customer,
  type Order,
  type OrderStatus,
  type OrderWithCustomer,
  type Review,
  type StatusHistory,
} from './lib/storage';
import type { UploadedFileMeta } from './components/Uploader';
import type { CardProofLog, CardProofUploadInput } from './lib/storage/types';
import { IconArrowRight } from './components/Icons';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.';
}

export default function App() {
  const [view, setView] = useState<View>(() => viewFromHash(window.location.hash));
  const [options, setOptions] = useState<QuoteInput>(DEFAULT_QUOTE_INPUT);
  const [files, setFiles] = useState<Record<ProductKind, UploadedFileMeta | null>>({ print: null, card: null });
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [publicReviews, setPublicReviews] = useState<Review[]>([]);
  const [allOrders, setAllOrders] = useState<OrderWithCustomer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [adminReviews, setAdminReviews] = useState<Review[]>([]);
  const [proofLogs, setProofLogs] = useState<CardProofLog[]>([]);
  const [busyProofOrderId, setBusyProofOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [reorderSource, setReorderSource] = useState<string | null>(null);

  /** 지금 보고 있는 상품 (이력·관리자 화면에서는 마지막으로 보던 상품) */
  const activeProduct: ProductKind = view === 'card' ? 'card' : view === 'print' ? 'print' : options.product;
  const activeOptions = useMemo<QuoteInput>(() => ({ ...options, product: activeProduct }), [options, activeProduct]);
  const quote = useMemo(() => calculateQuote(activeOptions), [activeOptions]);
  const file = files[activeProduct];
  const visibleReceipt = receipt && receipt.product === activeProduct ? receipt : null;

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 해시 라우팅 — 새로고침·뒤로가기·링크 공유가 그대로 동작합니다.
  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', hashForView(viewFromHash('')));
    }
    const onHashChange = () => setView(viewFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const refreshHistory = useCallback(
    async (customerId: string) => {
      setLoading(true);
      try {
        const [rows, reviews, logs] = await Promise.all([
          store.listOrdersByCustomer(customerId),
          store.listReviewsForCustomer(customerId),
          store.listCardProofLogs({ customerId }),
        ]);
        setOrders(rows);
        setMyReviews(reviews);
        setProofLogs(logs);
      } catch (error) {
        showToast(errorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  const refreshPublicReviews = useCallback(async () => {
    try {
      setPublicReviews(await store.listReviews());
    } catch {
      /* 후기는 없어도 화면이 뜨도록 둡니다. */
    }
  }, []);

  const refreshAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const [all, customerRows, historyRows, reviewRows, logs] = await Promise.all([
        store.listAllOrders(),
        store.listCustomers(),
        store.listStatusHistory(),
        store.listReviews(),
        store.listCardProofLogs(),
      ]);
      setAllOrders(all);
      setCustomers(customerRows);
      setStatusHistory(historyRows);
      setAdminReviews(reviewRows);
      setProofLogs(logs);
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const session = await store.getSessionCustomer();
        if (!alive) return;
        if (session) {
          setCustomer(session);
          const rows = await store.listOrdersByCustomer(session.id);
          const reviews = await store.listReviewsForCustomer(session.id);
          const logs = await store.listCardProofLogs({ customerId: session.id });
          if (alive) {
            setOrders(rows);
            setMyReviews(reviews);
            setProofLogs(logs);
          }
        }
        await refreshPublicReviews();
      } catch (error) {
        showToast(errorMessage(error));
      }
    })();
    return () => {
      alive = false;
    };
  }, [showToast, refreshPublicReviews]);

  function patchOptions(patch: Partial<QuoteInput>) {
    setOptions((current) => ({ ...current, ...patch }));
  }

  function scrollTo(sectionId: string, delay = 80) {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, delay);
  }

  function handleNavigate(next: View) {
    setView(next);
    const hash = hashForView(next);
    if (window.location.hash !== hash) window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // 탭이 바뀌면(해시 이동 포함) 그 화면의 데이터를 새로 읽습니다.
  useEffect(() => {
    if (view === 'admin') void refreshAdmin();
    else if (view === 'history' && customer) void refreshHistory(customer.id);
  }, [view, customer, refreshAdmin, refreshHistory]);

  function handleProductChange(product: ProductKind) {
    if (view === product) {
      scrollTo('quote', 0);
      return;
    }
    setReceipt(null);
    setReorderSource(null);
    handleNavigate(product);
    showToast(`${PRODUCT_PAGES[product].navLabel} 페이지로 이동했어요.`);
  }

  function handleEcoQuote() {
    // 여유 제작 특가는 A4 출력 전용입니다. 명함에서는 A4 페이지로 안내합니다.
    const target: ProductKind = 'print';
    if (view !== target) handleNavigate(target);
    patchOptions({ deliverySpeed: 'eco' });
    setReceipt(null);
    showToast('🌿 여유 제작 특가를 선택했어요. 인쇄비 10%가 자동 할인됩니다.');
    scrollTo('quote');
  }

  function handleKakao() {
    if (STORE.kakaoUrl) {
      window.open(STORE.kakaoUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    showToast('카카오톡 채널 링크 연결 전 자리입니다. 준비되면 이 버튼으로 바로 채널이 열립니다.');
  }

  async function handleLogin(provider: LoginProvider) {
    const signedIn = await store.signInDemo(provider);
    setCustomer(signedIn);
    setLoginOpen(false);
    await refreshHistory(signedIn.id);
    showToast(`${signedIn.name}님으로 로그인했어요 (${PROVIDER_LABEL[provider]}). 내 주문 이력에서 지난 주문을 확인하세요.`);
  }

  async function handleLookup(name: string, phone: string) {
    if (!isValidPhone(phone)) throw new Error('휴대폰 번호를 정확히 입력해 주세요.');
    const found = await store.findCustomer({ name, phone });
    if (!found) {
      throw new Error('해당 성함·연락처로 접수된 이력이 없어요. 주문할 때 입력한 정보와 같아야 합니다.');
    }
    await store.startSession(found.id);
    setCustomer(found);
    setLoginOpen(false);
    await refreshHistory(found.id);
    showToast(`${found.name}님의 주문 이력을 불러왔어요.`);
  }

  async function handleLogout() {
    await store.signOut();
    setCustomer(null);
    setOrders([]);
    setMyReviews([]);
    showToast('로그아웃되었습니다. 비회원으로도 견적을 낼 수 있어요.');
  }

  async function handleOrder(values: OrderFormValues) {
    let owner = customer;
    if (!owner) {
      owner = await store.ensureCustomer({
        name: values.name,
        phone: values.phone,
        email: values.email,
        provider: 'guest',
      });
      await store.startSession(owner.id);
      setCustomer(owner);
    }
    if (owner.email === null && values.email.trim()) {
      owner = await store.ensureCustomer({
        name: owner.name,
        phone: owner.phone,
        email: values.email,
        provider: owner.provider,
      });
      setCustomer(owner);
    }
    const order = await store.createOrder({
      customerId: owner.id,
      quote,
      customerRequest: values.notes,
      pickup: activeOptions.pickup,
      address: values.address,
      file: file ? { name: file.name, size: file.size, pages: file.pages } : null,
      paymentMethod: values.paymentMethod,
    });
    setReceipt(order);
    setReorderSource(null);
    await refreshHistory(owner.id);
    await refreshPublicReviews();
    showToast(`주문이 접수됐어요 (${order.orderNumber}). 입금 확인 후 인쇄를 시작합니다.`);
  }

  function handleReset() {
    setReceipt(null);
    setFileForProduct(activeProduct, null);
    setOptions(DEFAULT_QUOTE_INPUT);
    setReorderSource(null);
    scrollTo('quote', 40);
  }

  function handleReorder(order: Order) {
    setOptions({
      product: order.product,
      size: order.paperSize,
      color: order.colorMode,
      sides: order.sides,
      pages: order.pages,
      copies: order.copies,
      binding: order.binding,
      cardPaper: order.cardPaper ?? 'snow250',
      cardPrint: order.cardPrint ?? 'single4',
      cardInfo: order.cardInfo ?? DEFAULT_QUOTE_INPUT.cardInfo,
      cardUnits: order.cardQty ? Math.max(1, Math.round(order.cardQty / 200)) : 1,
      cardText: order.cardText ?? '',
      pickup: order.pickup,
      deliverySpeed: order.deliverySpeed,
    });
    setFileForProduct(order.product, null);
    setReceipt(null);
    setReorderSource(order.orderNumber);
    handleNavigate(order.product);
    showToast(`${order.orderNumber} 옵션을 그대로 불러왔어요. 파일만 다시 올려 주세요.`);
    scrollTo('quote', 140);
  }

  function setFileForProduct(product: ProductKind, next: UploadedFileMeta | null) {
    setFiles((current) => ({ ...current, [product]: next }));
  }

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    setBusyOrderId(orderId);
    try {
      await store.updateOrderStatus(orderId, status);
      await refreshAdmin();
      if (customer) await refreshHistory(customer.id);
      showToast(`주문 상태를 '${status}'로 바꿨어요.`);
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleConfirmPayment(orderId: string) {
    setBusyOrderId(orderId);
    try {
      await store.confirmPayment(orderId);
      await refreshAdmin();
      if (customer) await refreshHistory(customer.id);
      showToast('입금 확인 완료로 표시했어요. 확인 시각이 주문 이력에 저장됩니다.');
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleAddPhoto(orderId: string, dataUrl: string) {
    try {
      await store.addPickupPhoto(orderId, dataUrl);
      await refreshAdmin();
      if (customer) await refreshHistory(customer.id);
      showToast('보관 사진을 올렸어요. 손님 내 주문 이력에서 바로 보입니다.');
    } catch (error) {
      showToast(errorMessage(error));
      throw error;
    }
  }

  async function handleRemovePhoto(orderId: string, photoId: string) {
    try {
      await store.removePickupPhoto(orderId, photoId);
      await refreshAdmin();
      if (customer) await refreshHistory(customer.id);
    } catch (error) {
      showToast(errorMessage(error));
      throw error;
    }
  }

  async function handleSaveReview(order: Order, input: { rating: number; body: string; photoUrl: string | null }) {
    if (!customer) throw new Error('로그인이 필요합니다.');
    await store.saveReview({
      orderId: order.id,
      customerId: customer.id,
      rating: input.rating,
      body: input.body,
      photoUrl: input.photoUrl,
    });
    await refreshHistory(customer.id);
    await refreshPublicReviews();
    showToast('후기를 남겨 주셔서 감사합니다!');
  }

  async function handleReviewVisibility(reviewId: string, visible: boolean) {
    try {
      await store.setReviewVisibility(reviewId, visible);
      await refreshAdmin();
      await refreshPublicReviews();
      showToast(visible ? '리뷰를 다시 공개했어요.' : '리뷰를 숨겼어요.');
    } catch (error) {
      showToast(errorMessage(error));
    }
  }

  async function handleReviewReply(reviewId: string, reply: string) {
    try {
      await store.replyReview(reviewId, reply);
      await refreshAdmin();
      await refreshPublicReviews();
      showToast('사장님 답글을 저장했어요.');
    } catch (error) {
      showToast(errorMessage(error));
    }
  }

  async function handleDeleteAccount() {
    if (!customer) return;
    await store.deleteMyData(customer.id);
    setCustomer(null);
    setOrders([]);
    setMyReviews([]);
    showToast('탈퇴 처리했어요. 이름·연락처·주소·파일은 파기되고 결제 기록만 비식별로 보관됩니다.');
  }

  async function handleUploadProof(orderId: string, input: CardProofUploadInput) {
    setBusyProofOrderId(orderId);
    try {
      await store.uploadCardProof(orderId, input);
      await refreshAdmin();
      if (customer) await refreshHistory(customer.id);
      showToast('시안을 올렸어요. 고객에게 [안내 문구 복사]나 [고객 메일 쓰기]로 확인을 요청하세요.');
    } catch (error) {
      showToast(errorMessage(error));
      throw error;
    } finally {
      setBusyProofOrderId(null);
    }
  }

  async function handleRequestRevision(orderId: string, body: string) {
    setBusyProofOrderId(orderId);
    try {
      await store.requestCardRevision(orderId, body);
      if (customer) await refreshHistory(customer.id);
      await refreshAdmin();
      showToast('수정 요청을 보냈어요. 사장님이 새 시안을 올려 드립니다.');
    } catch (error) {
      showToast(errorMessage(error));
      throw error;
    } finally {
      setBusyProofOrderId(null);
    }
  }

  async function handleConfirmProof(orderId: string) {
    setBusyProofOrderId(orderId);
    try {
      await store.confirmCardProof(orderId);
      if (customer) await refreshHistory(customer.id);
      await refreshAdmin();
      showToast('시안을 확정했어요. 확정 시각과 시안이 기록되고 인쇄가 시작됩니다.');
    } catch (error) {
      showToast(errorMessage(error));
      throw error;
    } finally {
      setBusyProofOrderId(null);
    }
  }

  async function handleSeed() {
    try {
      await store.seedSampleData();
      await refreshAdmin();
      await refreshPublicReviews();
      if (customer) await refreshHistory(customer.id);
      showToast('시안 예시 주문을 넣었어요. 관리자 화면에서 상태를 바꿔 보세요.');
    } catch (error) {
      showToast(errorMessage(error));
    }
  }

  function handlePickupChange(pickup: PickupMethod) {
    patchOptions({ pickup });
  }

  const showQuoteBar =
    isProductView(view) &&
    !visibleReceipt &&
    (file !== null ||
      options.pages > 1 ||
      options.copies > 1 ||
      options.binding !== 'none' ||
      activeProduct === 'card');

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-paper">
      <Header
        view={view}
        onNavigate={handleNavigate}
        user={customer}
        onLoginClick={() => setLoginOpen(true)}
        onLogout={() => void handleLogout()}
      />

      <main className="min-w-0 flex-1">
        {isProductView(view) && (
          <ProductPage
            key={view}
            product={view}
            options={activeOptions}
            quote={quote}
            file={file}
            pagesAuto={Boolean(file?.autoDetected)}
            customer={customer}
            receipt={visibleReceipt}
            storeMode={storeMode}
            reorderSource={reorderSource}
            reviews={publicReviews}
            onFileChange={(next) => setFileForProduct(view, next)}
            onPagesChange={(pages) => patchOptions({ pages })}
            onOptionsChange={patchOptions}
            onProductChange={handleProductChange}
            onPickupChange={handlePickupChange}
            onLoginClick={() => setLoginOpen(true)}
            onSubmit={handleOrder}
            onReset={handleReset}
            onViewHistory={() => handleNavigate('history')}
            onEcoQuote={handleEcoQuote}
            onKakao={handleKakao}
            onSampleAction={showToast}
            onDismissReorder={() => setReorderSource(null)}
          />
        )}

        {view === 'history' && (
          <HistorySection
            customer={customer}
            orders={orders}
            reviews={myReviews}
            loading={loading}
            storeMode={storeMode}
            onLoginClick={() => setLoginOpen(true)}
            onLogout={() => void handleLogout()}
            onReorder={handleReorder}
            onNewOrder={() => handleNavigate('print')}
            onDeleteAccount={handleDeleteAccount}
            onSaveReview={handleSaveReview}
            proofLogs={proofLogs}
            busyProofOrderId={busyProofOrderId}
            onRequestRevision={handleRequestRevision}
            onConfirmProof={handleConfirmProof}
            onNotice={showToast}
          />
        )}

        {view === 'admin' && (
          <AdminSection
            orders={allOrders}
            customers={customers}
            history={statusHistory}
            reviews={adminReviews}
            loading={loading}
            storeMode={storeMode}
            busyOrderId={busyOrderId}
            onStatusChange={(orderId, status) => void handleStatusChange(orderId, status)}
            onConfirmPayment={(orderId) => void handleConfirmPayment(orderId)}
            onAddPhoto={handleAddPhoto}
            onRemovePhoto={handleRemovePhoto}
            proofLogs={proofLogs}
            onUploadProof={handleUploadProof}
            onRefresh={() => void refreshAdmin()}
            onSeed={() => void handleSeed()}
            onSetReviewVisibility={(reviewId, visible) => void handleReviewVisibility(reviewId, visible)}
            onReplyReview={(reviewId, reply) => void handleReviewReply(reviewId, reply)}
            onNotice={showToast}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-ink-100 bg-ink-900 pb-24 pt-10 text-white lg:pb-10">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M7 3.5h7L18.5 8v12.5h-11z" fill="currentColor" />
                    <path d="M14 3.5V8h4.5" fill="none" stroke="#1E4FD8" strokeWidth="1.4" />
                  </svg>
                </span>
                <span className="text-[15px] font-extrabold tracking-tight">카피박스</span>
                <span className="text-[10px] font-semibold tracking-[0.2em] text-white/40">COPYBOX</span>
              </div>
              <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-white/50">
                일산 복사·출력·제본 전문점.
                <br />
                파일만 보내면 나머지는 저희가 준비합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-[12px] sm:gap-14">
              <div>
                <p className="font-bold text-white/80">상품</p>
                <ul className="mt-2.5 space-y-1.5 text-white/50">
                  <li>
                    <button type="button" onClick={() => handleNavigate('print')} className="transition hover:text-white">
                      {PRODUCT_PAGES.print.navLabel}
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => handleNavigate('card')} className="transition hover:text-white">
                      {PRODUCT_PAGES.card.navLabel}
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => handleNavigate('history')} className="transition hover:text-white">
                      내 주문 이력
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => handleNavigate('admin')} className="transition hover:text-white">
                      관리자
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-white/80">문의</p>
                <ul className="mt-2.5 space-y-1.5 text-white/50">
                  <li className="num">{STORE.phone}</li>
                  <li>카카오톡 {STORE.kakaoChannel}</li>
                  <li className="break-words">{STORE.address}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-[10px] leading-relaxed text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-words">
              {STORE.isSample
                ? '시안용 페이지입니다. 상호·주소·연락처·계좌는 샘플이며 실제 매장 정보로 교체해 주세요.'
                : '카피박스 · 사업자 정보는 실제 매장 정보로 표시됩니다.'}
              <br />
              {STORE_MODE_LABEL[storeMode]} · 인쇄 PDF는 출고·배송 완료 14일 뒤 파기 · 주민번호·카드번호 미수집
            </p>
            <p className="shrink-0">© 2026 COPYBOX. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* 모바일 하단 고정 견적 바 */}
      {showQuoteBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-ink-400">
                {activeProduct === 'card'
                  ? `총 예상 금액 · 명함 ${quote.cardQty}매`
                  : `총 예상 금액 · ${quote.pages}페이지 × ${quote.copies}부`}
              </p>
              <p className="num text-[19px] font-extrabold leading-tight text-ink-900">{won(quote.total)}</p>
            </div>
            <button type="button" onClick={() => scrollTo('order', 0)} className="btn-primary shrink-0 !px-4 !py-3 !text-[13px]">
              주문 접수
              <IconArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <NoticePopup onEcoQuote={handleEcoQuote} ecoAvailable={view !== 'card'} />

      <LoginModal
        open={loginOpen}
        mode={storeMode}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        onLookup={handleLookup}
      />

      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          data-testid="toast"
          className="fixed inset-x-4 bottom-[86px] z-[60] mx-auto max-w-sm animate-fade-up break-words rounded-xl bg-ink-900/95 px-4 py-3 text-center text-[12px] font-medium leading-relaxed text-white shadow-lift lg:bottom-6"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
