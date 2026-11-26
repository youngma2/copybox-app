export type LoginProvider = 'kakao' | 'naver' | 'google';

/** 손님 계정의 가입 경로 — 비회원 주문도 손님 레코드(provider='guest')로 남습니다. */
export type AccountProvider = LoginProvider | 'guest';

export const PROVIDER_LABEL: Record<AccountProvider, string> = {
  kakao: '카카오',
  naver: '네이버',
  google: '구글',
  guest: '비회원',
};

/** 시안용 데모 계정 — 실제 OAuth 연동 전에는 이 이름/번호로 손님이 만들어집니다. */
export const DEMO_USER_NAME = '홍길동';
export const DEMO_USER_PHONE = '010-0000-0000';
