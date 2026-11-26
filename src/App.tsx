import { useCallback, useEffect, useMemo, useState } from 'react';
import Header, { type View } from './components/Header';
import Hero from './components/Hero';
import LoginModal from './components/LoginModal';
import OptionsCard from './components/OptionsCard';
import OrderSection from './components/OrderSection';
import PriceTable from './components/PriceTable';
import StoreInfo from './components/StoreInfo';
import SummaryCard from './components/SummaryCard';
import Uploader, { type UploadedFileMeta } from './components/Uploader';
import HistorySection from './components/HistorySection';
import AdminSection from './components/AdminSection';
import { PROVIDER_LABEL, type LoginProvider } from './lib/auth';
import { won } from './lib/format';
import { isValidPhone, type OrderFormValues } from './lib/order';
import { calculateQuote, type QuoteInput } from './lib/pricing';
import {
  STORE_MODE_LABEL,
  store,
  storeMode,
  type Customer,
  type Order,
  type OrderStatus,
  type OrderWithCustomer,
  type StatusHistory,
} from './lib/store';
import { IconArrowRight, IconShield } from './components/Icons';

const DEFAULT_OPTIONS: QuoteInput = {
  size: 'A4',
  color: 'mono',
  sides: 'single',
  pages: 1,
  copies: 1,
  binding: 'none',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.';
}

export default function App() {
  const [view, setView] = useState<View>('shop');
  const [file, setFile] = useState<UploadedFileMeta | null>(null);
  const [options, setOptions] = useState<QuoteInput>(DEFAULT_OPTIONS);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<OrderWithCustomer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [reorderSource, setReorderSource] = useState<string | null>(null);

  const quote = useMemo(() => calculateQuote(options), [options]);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const refreshHistory = useCallback(
    async (customerId: string) => {
      setLoading(true);
      try {
        const rows = await store.listOrdersByCustomer(customerId);
        setOrders(rows);
      } catch (error) {
        showToast(errorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  const refreshAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const [all, customerRows, historyRows] = await Promise.all([
        store.listAllOrders(),
        store.listCustomers(),
        store.listStatusHistory(),
      ]);
      setAllOrders(all);
      setCustomers(customerRows);
      setStatusHistory(historyRows);
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
          if (alive) setOrders(rows);
        }
      } catch (error) {
        showToast(errorMessage(error));
      }
    })();
    return () => {
      alive = false;
    };
  }, [showToast]);

  function patchOptions(patch: Partial<QuoteInput>) {
    setOptions((current) => ({ ...current, ...patch }));
  }

  function scrollToShop(sectionId: string) {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  function handleNavigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (next === 'admin') void refreshAdmin();
    if (next === 'history' && customer) void refreshHistory(customer.id);
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
    showToast('로그아웃되었습니다. 비회원으로도 견적을 낼 수 있어요.');
  }

  async function handleOrder(values: OrderFormValues) {
    let owner = customer;
    if (!owner) {
      owner = await store.ensureCustomer({ name: values.name, phone: values.phone, provider: 'guest' });
      await store.startSession(owner.id);
      setCustomer(owner);
    }
    const order = await store.createOrder({
      customerId: owner.id,
      quote,
      customerRequest: values.notes,
      pickup: values.pickup,
      address: values.address,
      file: file ? { name: file.name, size: file.size, pages: file.pages } : null,
    });
    setReceipt(order);
    setReorderSource(null);
    await refreshHistory(owner.id);
    showToast(`주문이 접수됐어요 (${order.orderNumber}). 내 주문 이력에 저장했습니다.`);
  }

  function handleReset() {
    setReceipt(null);
    setFile(null);
    setOptions(DEFAULT_OPTIONS);
    setReorderSource(null);
    window.setTimeout(() => {
      document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  function handleReorder(order: Order) {
    setOptions({
      size: 'A4',
      color: order.colorMode,
      sides: order.sides,
      pages: order.pages,
      copies: order.copies,
      binding: order.binding,
    });
    setFile(null);
    setReceipt(null);
    setReorderSource(order.orderNumber);
    setView('shop');
    showToast(`${order.orderNumber} 옵션을 그대로 불러왔어요. 파일만 다시 올려 주세요.`);
    scrollToShop('quote');
  }

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    setBusyOrderId(orderId);
    try {
      await store.updateOrderStatus(orderId, status);
      await refreshAdmin();
      if (customer) await refreshHistory(customer.id);
      showToast('주문 상태를 변경했어요.');
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleSeed() {
    try {
      await store.seedSampleData();
      await refreshAdmin();
      if (customer) await refreshHistory(customer.id);
      showToast('시안 예시 주문을 넣었어요. 관리자 화면에서 상태를 바꿔 보세요.');
    } catch (error) {
      showToast(errorMessage(error));
    }
  }

  const showQuoteBar =
    view === 'shop' &&
    !receipt &&
    (file !== null || options.pages > 1 || options.copies > 1 || options.binding !== 'none');

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
        {view === 'shop' && (
          <>
            <Hero />

            <section id="quote" className="container-page pt-12 sm:pt-16">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-[0.18em] text-brand-600">QUOTE</p>
                  <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[32px]">
                    실시간 견적 계산기
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    A4 한 가지 규격 · 파일을 올리고 옵션만 고르면 금액이 바로 계산돼요. 로그인은 필요 없습니다.
                  </p>
                </div>
                <p className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600">
                  <IconShield className="h-3.5 w-3.5 text-mint" />
                  파일은 브라우저에서만 확인
                </p>
              </div>

              {reorderSource && (
                <div
                  data-testid="reorder-hint"
                  className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5"
                >
                  <p className="min-w-0 break-words text-[12px] font-semibold text-brand-800">
                    접수번호 <span className="num">{reorderSource}</span>의 옵션을 불러왔어요. 파일만 다시 올려 주세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setReorderSource(null)}
                    className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700 shadow-card"
                  >
                    닫기
                  </button>
                </div>
              )}

              <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_356px]">
                <div className="min-w-0 space-y-4">
                  <Uploader
                    file={file}
                    pages={options.pages}
                    onFileChange={setFile}
                    onPagesChange={(pages) => patchOptions({ pages })}
                  />
                  <OptionsCard
                    value={options}
                    pagesAuto={Boolean(file?.autoDetected)}
                    fileName={file?.name ?? null}
                    onChange={patchOptions}
                  />
                </div>
                <div className="min-w-0">
                  <SummaryCard quote={quote} file={file} onOrder={() => scrollToShop('order')} />
                </div>
              </div>
            </section>

            <PriceTable />

            <StoreInfo onSampleAction={showToast} />

            <OrderSection
              quote={quote}
              file={file}
              customer={customer}
              receipt={receipt}
              storeMode={storeMode}
              onLoginClick={() => setLoginOpen(true)}
              onSubmit={handleOrder}
              onReset={handleReset}
              onViewHistory={() => handleNavigate('history')}
            />
          </>
        )}

        {view === 'history' && (
          <HistorySection
            customer={customer}
            orders={orders}
            loading={loading}
            storeMode={storeMode}
            onLoginClick={() => setLoginOpen(true)}
            onLogout={() => void handleLogout()}
            onReorder={handleReorder}
            onNewOrder={() => handleNavigate('shop')}
          />
        )}

        {view === 'admin' && (
          <AdminSection
            orders={allOrders}
            customers={customers}
            history={statusHistory}
            loading={loading}
            storeMode={storeMode}
            busyOrderId={busyOrderId}
            onStatusChange={(orderId, status) => void handleStatusChange(orderId, status)}
            onRefresh={() => void refreshAdmin()}
            onSeed={() => void handleSeed()}
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
                <p className="font-bold text-white/80">바로가기</p>
                <ul className="mt-2.5 space-y-1.5 text-white/50">
                  <li>
                    <button type="button" onClick={() => handleNavigate('shop')} className="transition hover:text-white">
                      견적 계산기
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => handleNavigate('shop')} className="transition hover:text-white">
                      단가표
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
                  <li className="num">031-000-0000</li>
                  <li>카카오톡 @카피박스</li>
                  <li className="break-words">경기도 고양시 일산동구 중앙로 1234</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-[10px] leading-relaxed text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-words">
              시안용 페이지입니다. 상호·주소·연락처는 샘플이며 실제 매장 정보로 교체해 주세요.
              <br />
              {STORE_MODE_LABEL[storeMode]}
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
                총 예상 금액 · {quote.pages}페이지 × {quote.copies}부
              </p>
              <p className="num text-[19px] font-extrabold leading-tight text-ink-900">{won(quote.total)}</p>
            </div>
            <button type="button" onClick={() => scrollToShop('order')} className="btn-primary shrink-0 !px-4 !py-3 !text-[13px]">
              주문 접수
              <IconArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
