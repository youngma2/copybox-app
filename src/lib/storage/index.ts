/**
 * 저장소 어댑터 선택 (환경설정만으로 전환)
 *
 *   시안(localStorage)  ↔  운영(Supabase + Cloudflare R2)
 *
 * .env 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 있으면 운영 저장소,
 * 없으면 브라우저 시안 저장소를 씁니다. 화면 코드는 store 창구만 호출합니다.
 */

import { demoStore } from './demo';
import { isSupabaseConfigured, supabaseStore } from './supabase';
import { STORE_MODE_LABEL, type CopyboxStore, type StoreMode } from './types';

export * from './types';
export * from '../../config/status';

export const storeMode: StoreMode = isSupabaseConfigured ? 'supabase' : 'demo';
export const store: CopyboxStore = isSupabaseConfigured ? supabaseStore : demoStore;

export { STORE_MODE_LABEL };
