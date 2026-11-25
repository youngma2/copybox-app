export type LoginProvider = 'kakao' | 'naver' | 'google';

export interface DemoUser {
  name: string;
  provider: LoginProvider;
}

export const PROVIDER_LABEL: Record<LoginProvider, string> = {
  kakao: '카카오',
  naver: '네이버',
  google: '구글',
};

/** 시안용 데모 계정 — 실제 로그인 연동 전에는 이 이름으로 표시됩니다. */
export const DEMO_USER_NAME = '홍길동';
