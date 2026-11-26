import { useCallback, useEffect, useState } from 'react';
import { formatOrderDate } from '../lib/order';
import { store } from '../lib/storage';
import type { OrderMessage } from '../lib/storage/types';

interface OrderMessagesProps {
  orderId: string;
  role: 'customer' | 'admin';
  onNotice?: (message: string) => void;
}

export default function OrderMessages({ orderId, role, onNotice }: OrderMessagesProps) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMessages(await store.listMessages(orderId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '메시지를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await store.addMessage({ orderId, author: role, body });
      setBody('');
      await load();
      onNotice?.('메시지를 보냈어요.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '메시지를 보내지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3 py-2.5" data-testid={`messages-${orderId}`}>
      <p className="flex items-center justify-between gap-2 text-[11px] font-bold text-ink-800">
        <span>{role === 'admin' ? '손님과 주문 메모' : '사장님과 주문 메모'}</span>
        <span className="text-[10px] font-normal text-ink-400">주문에 묶여 계속 보관됩니다</span>
      </p>

      <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
        {loading ? (
          <p className="text-[10px] text-ink-400">메시지를 불러오는 중…</p>
        ) : messages.length === 0 ? (
          <p className="text-[10px] text-ink-400">아직 주고받은 메모가 없습니다.</p>
        ) : (
          messages.map((message) => {
            const mine = message.author === role;
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed ${
                    mine ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-800'
                  }`}
                >
                  <p className="break-words">{message.body}</p>
                  <p className={`mt-0.5 text-[9px] ${mine ? 'text-white/60' : 'text-ink-400'}`}>
                    {message.author === 'admin' ? '사장님' : '손님'} · {formatOrderDate(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 flex items-end gap-1.5">
        <input
          value={body}
          data-testid={`message-input-${orderId}`}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={role === 'admin' ? '손님에게 남길 짧은 메모' : '사장님께 짧게 남기기'}
          className="field min-w-0 flex-1 !py-1.5 !text-[11px]"
          aria-label="주문 메모 입력"
        />
        <button
          type="button"
          disabled={busy || !body.trim()}
          data-testid={`message-send-${orderId}`}
          onClick={() => void send()}
          className="shrink-0 rounded-lg bg-ink-900 px-2.5 py-2 text-[11px] font-bold text-white transition disabled:opacity-40"
        >
          보내기
        </button>
      </div>
      {error && <p className="mt-1 text-[10px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}
