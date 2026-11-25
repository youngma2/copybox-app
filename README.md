# 카피박스 (COPYBOX) — 자동견적 · PDF 접수 시안

일산 복사·출력·제본 매장 **카피박스**의 홈페이지 시안입니다.
PDF를 끌어다 놓으면 브라우저 안에서 페이지 수를 세고, 옵션을 고르는 즉시 견적이 계산됩니다.
회원 로그인(카카오·네이버·구글)은 **UI 시안 상태**이며, 비회원도 로그인 없이 견적·주문 접수가 가능합니다.

## 실행

```bash
export PATH=/workspace/.tools/node/bin:$PATH
cd /workspace/copybox-app
npm install
npm run dev        # 개발 서버 (127.0.0.1:5175)
npm run build      # tsc --noEmit + vite build
npm run preview    # 빌드 결과 미리보기 (127.0.0.1:4175)
```

## 구조

```
copybox-app/
  src/
    App.tsx                 # 전체 상태(파일·옵션·로그인·접수증)와 섹션 배치
    components/
      Header.tsx            # 상단 고지바 + 로고 + 메뉴 + 간편 로그인/내 정보
      LoginModal.tsx        # 카카오·네이버·구글 간편 로그인 시안 모달
      Hero.tsx              # 히어로 + 예시 견적서 비주얼 + 이용 3단계
      Uploader.tsx          # 드래그&드롭 업로드, pdf-lib 페이지 자동 인식
      OptionsCard.tsx       # 규격·색상·단면/양면·페이지·부수·제본 선택
      SummaryCard.tsx       # 실시간 항목별 견적 + 총액 + 주문 이동
      PriceTable.tsx        # 단가표(데스크톱 표 / 모바일 카드)
      StoreInfo.tsx         # 매장 정보(샘플) + 지도 자리 + 전화/카카오 버튼
      OrderSection.tsx      # 주문 폼 + 접수증(receipt)
    lib/
      pricing.ts            # ★ 단가·할인·제본비 계산 규칙
      order.ts              # 접수번호·전화번호 포맷
      auth.ts               # 로그인 제공자·데모 사용자
      format.ts             # 금액·용량·날짜 포맷
  scripts/make-sample-pdf.mjs   # 테스트용 6페이지 PDF 생성
  supabase/schema.sql           # 주문 저장 테이블(연동 준비)
```

## 단가 규칙 (샘플 — 실제 단가로 교체하세요)

- 1면(1페이지)당 인쇄 단가: `src/lib/pricing.ts`의 `BASE_PAGE_PRICE`
  - A4 흑백 50원 / 컬러 300원, A3 100 / 600, B4 80 / 400
- 양면 인쇄는 면당 10% 할인 (`DOUBLE_SIDE_RATE = 0.9` → A4 흑백 45원/면)
- 제본비는 **부수마다** 1회: 없음 0원 / 스프링 3,000 / 무선 3,500 / 중철 2,500 / 코팅 1,000
- 총액 = (면당 단가 × 페이지 수 × 부수) + (제본비 × 부수), 부가세 포함 가정

금액을 바꾸면 견적 계산기·단가표·접수증이 모두 같은 값을 사용합니다.

## 매장 정보 교체

`src/components/StoreInfo.tsx`, `src/components/Header.tsx`, `src/App.tsx`(푸터)에 있는
상호·주소·전화·영업시간·카카오톡 채널이 모두 샘플 값입니다.
지도는 `StoreInfo.tsx`의 "지도 영역" 자리에 네이버 지도/카카오맵을 넣으면 됩니다.

## 간편 로그인 (시안)

- 헤더 `간편 로그인` → 모달에서 카카오 / 네이버 / Google / 비회원 계속
- 선택하면 `시안 모드: 홍길동님으로 로그인됨` 토스트가 뜨고 헤더에 사용자 칩 표시
- 실제 OAuth 연동 시: `src/App.tsx`의 `handleLogin`을 각 제공자 SDK 호출로 바꾸고,
  `src/lib/auth.ts`의 `DEMO_USER_NAME` 대신 인증된 프로필을 넣으면 됩니다.
- 로그인 없이도 업로드·견적·주문이 모두 동작합니다(강제 로그인 없음).

## Supabase 연동 준비

`supabase/schema.sql`에 주문 테이블 정의가 있습니다.
접수는 현재 `src/components/OrderSection.tsx`의 `onSubmit` → `App.tsx`의 `handleOrder`에서
접수증만 표시하는 데모 상태입니다. 이 지점에서 `supabase.from('orders').insert(...)`를 호출하고
파일은 Storage 버킷(`order-files`)에 올리면 실제 접수가 됩니다.
(`OrderRecord` 타입은 `src/lib/order.ts`에 이미 정리되어 있습니다.)

## 검증

```bash
# 빌드 결과를 띄운 뒤
export LD_LIBRARY_PATH=/workspace/.tools/chrome/lib:$LD_LIBRARY_PATH
python3 /workspace/verify_copybox.py http://127.0.0.1:4175
```

- PDF 6페이지 드래그&드롭 → 페이지 자동 인식, 견적 300/270/540/6,540/7,080원 단계별 확인
- HWP 등 비PDF → 수동 페이지 입력
- 로그인 모달 3종 버튼 + 데모 로그인 상태 + 주문자 이름 자동 입력
- 주문 접수증(접수번호·총액·연락처) 및 시안 안내
- 모바일 390px 오버플로 없음, 콘솔 에러·실패 응답 0 확인

## 스크린샷

- `/workspace/downloads/copybox_desktop.png` (1280×800, 견적 화면)
- `/workspace/downloads/copybox_mobile.png` (390×844)
- 참고: `copybox_hero.png`, `copybox_login_modal.png`, `copybox_receipt.png`,
  `copybox_desktop_quote.png`, `copybox_mobile_full.png`
