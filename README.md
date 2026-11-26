# 카피박스 (COPYBOX) — 자동견적 · PDF 접수 · 손님 이력

**배포 주소: https://youngma2.github.io/copybox-app/** (GitHub Pages, `main` = 소스 / `gh-pages` = 빌드)

일산 복사·출력·제본 매장 **카피박스**의 홈페이지입니다.
PDF를 끌어다 놓으면 브라우저 안에서 페이지 수를 세고, 옵션을 고르는 즉시 견적이 계산됩니다.
주문은 손님 ID(`customer_id`)에 묶여 저장되어 **내 주문 이력**에서 접수번호·옵션·요청사항·첨부파일까지 다시 볼 수 있고,
사장님은 **관리자** 화면에서 손님별 이력과 주문 상태(접수됨 → 인쇄중 → 완료)를 관리합니다.

## 2026-11 개편 내용

| 항목 | 내용 |
| --- | --- |
| 판형 | **A4 한 가지** (A3·B4 제거) |
| A4 흑백 | **단면 50원/페이지**, **양면 40원/페이지** (10% 할인 공식 삭제) |
| A4 컬러 | 단면 300원/페이지, 양면 250원/페이지 (흑백이 기본) |
| 제본 | **제본 없음 0원 / 스프링 1,500원~ / 와이어 1,500원~** (무선·중철·코팅 제거) |
| 제본 금액 | 스프링·와이어의 사이즈별 금액은 추후 확정. 견적서에는 **최소 금액 1,500원**을 적용하고 `~`로 표시 |
| 모바일 | 360px·390px에서 가로 오버플로 0 (`scrollWidth <= innerWidth`) |
| 손님 | `customers` + `orders` + `order_files` + `order_status_history`, 소프트 삭제·RLS |
| 화면 | 견적·주문 / **내 주문 이력** / **관리자** 탭 |

## 실행

```bash
export PATH=/workspace/.tools/node/bin:$PATH
cd /workspace/copybox-app
npm install
npm run dev        # 개발 서버 (127.0.0.1:5175/copybox-app/)
npm run build      # tsc --noEmit + vite build
npm run preview    # 빌드 미리보기
```

## 구조

```
copybox-app/
  src/
    App.tsx                  # 화면(견적·이력·관리자) 상태, 손님·주문 불러오기, 다시 주문
    components/
      Header.tsx             # 상단 고지 + 로고 + 탭(견적·주문 / 내 주문 이력 / 관리자) + 로그인
      Hero.tsx               # 히어로 + 예시 견적서(A4 흑백 양면 40원 기준)
      Uploader.tsx           # 드래그&드롭 업로드, pdf-lib 페이지 자동 인식
      OptionsCard.tsx        # A4 고정 · 흑백/컬러 · 단면/양면 · 페이지 · 부수 · 제본 3종
      SummaryCard.tsx        # 실시간 항목별 견적 + 총액
      PriceTable.tsx         # A4 단가표 + 제본 3종
      StoreInfo.tsx          # 매장 정보(샘플)
      OrderSection.tsx       # 주문 폼 + 접수증(접수번호·고객 ID·요청사항·첨부파일)
      LoginModal.tsx         # 간편 로그인(시안) + 성함·연락처로 이력 찾기
      HistorySection.tsx     # 내 주문 이력(최신순) + 이 옵션으로 다시 주문
      AdminSection.tsx       # 주문 전체·손님별 이력·상태 변경·상태 변경 이력
      StatusBadge.tsx
    lib/
      pricing.ts             # ★ 단가·제본 규칙 (A4 50/40, 스프링·와이어 1,500~)
      store.ts               # ★ 손님·주문 저장소 (Supabase REST ↔ localStorage 데모)
      order.ts               # 접수번호·전화번호·요청 폼 타입
      describe.ts            # 주문 옵션 문구("A4 · 흑백 · 양면 · 6페이지 × 1부 · 스프링")
      auth.ts / format.ts
  supabase/schema.sql        # 카피박스 전용 스키마 (공부 체크 앱과 분리)
  scripts/verify_copybox_v2.py   # Playwright 검증 110개
```

## 저장소 동작 (데모 ↔ Supabase)

`store.ts`는 두 구현을 같은 인터페이스로 제공합니다.

- **환경변수 없음(현재 라이브)**: `localStorage['copybox.v2.db']`에 `customer_id` 기준으로 저장합니다.
  새로고침해도 로그인·이력이 유지되고, 비회원 주문도 성함+연락처로 다시 찾을 수 있습니다.
  공부 체크 앱과 저장 키·테이블·버킷이 완전히 분리되어 있습니다.
- **`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` 설정 시**: Supabase REST(PostgREST)로 전환합니다.
  RLS 정책상 로그인 세션(access token)이 있어야 읽고 쓸 수 있으며, 토큰은
  `sessionStorage['copybox.supabase.access_token']`(또는 `VITE_SUPABASE_ACCESS_TOKEN`)에서 읽습니다.
  OAuth 로그인 연동 전에는 모달에서 안내 문구가 표시됩니다.

## Supabase 적용

1. **새 Supabase 프로젝트**를 만듭니다(공부 체크 앱과 같은 프로젝트 사용 금지).
2. SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다.
3. Authentication > Providers에서 카카오·네이버·구글을 켭니다.
4. 사장님 계정으로 로그인한 뒤 대시보드에서 사장님 user id를 등록합니다.
   ```sql
   insert into public.staff_members (user_id, name)
   select id, '카피박스 사장님' from auth.users where email = '사장님로그인메일';
   ```
5. Storage의 `order-files` 버킷이 **Private**인지 확인합니다(경로 `{customer_id}/{order_number}/{file_name}`).
6. 앱 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 넣고 다시 빌드합니다.

### 손님 정보 보호

- 모든 주문·첨부파일이 `customer_id`와 `order_id`에 함께 묶여 **과거 이력이 통째로** 남습니다.
- `customers`는 `deleted_at` **소프트 삭제**만 하며, 주문이 있으면 `ON DELETE RESTRICT`로 물리 삭제가 불가능합니다.
- RLS: 본인 `customers`·`orders`·`order_files`만 조회/생성, `DELETE` 정책 없음(+권한 회수), 임의 수정 불가.
- `order_status_history`는 트리거(security definer)만 기록해 손님이 위조할 수 없습니다.
- 비공개 버킷 `order-files`: 본인 폴더만 업로드/조회, 사장님은 전체 조회. 삭제 정책 없음.
- 총액·단가가 단가표와 다르면 DB CHECK 제약이 저장을 거부합니다.

## 단가 규칙

`src/lib/pricing.ts` 한 곳에서 견적·단가표·접수증이 모두 같은 값을 씁니다.

- A4 흑백: 단면 50원/페이지, 양면 40원/페이지
- A4 컬러: 단면 300원/페이지, 양면 250원/페이지
- 제본: 없음 0원 / 스프링 1,500원~ / 와이어 1,500원~ (부수마다 1회)
- 총액 = 페이지단가 × 페이지 수 × 부수 + 제본단가 × 부수
- 스프링·와이어는 최소 금액(1,500원)으로 계산하고 `~`와 "사이즈별 금액 추후 확정" 문구를 표시합니다.

## 검증

```bash
export PATH=/workspace/.tools/node/bin:$PATH
npm run build
cd /workspace/.preview   # dist를 /copybox-app/ 경로로 서빙
python3 -m http.server 4175 --bind 127.0.0.1 &
export LD_LIBRARY_PATH=/workspace/.tools/chrome/lib:$LD_LIBRARY_PATH
python3 /workspace/copybox-app/scripts/verify_copybox_v2.py http://127.0.0.1:4175/copybox-app/
```

검증 110개 항목:

- 데스크톱(1280×800) · 모바일(360×740, 390×844) **가로 오버플로 0**
- A4 흑백 단면 50원 / 양면 40원, 컬러 300/250원, 제본 3종(0·1,500·1,500원) 계산
- PDF 6페이지 자동 인식, 6페이지 × 양면 = 240원
- 주문 접수 → **내 주문 이력**에서 접수번호·옵션·요청사항·첨부파일·금액 조회, 새로고침 후 유지
- "이 옵션으로 다시 주문"으로 옵션 복원
- **관리자**에서 전체 주문·손님별 필터·상태 변경(접수됨→인쇄중→완료)·상태 이력
- 성함·연락처로 비회원 이력 찾기(불일치 시 거부)
- 콘솔 에러 0, 실패 응답 0

## 스크린샷 (`/workspace/downloads/`)

- `copybox_v2_desktop.png` — 데스크톱 견적 화면
- `copybox_v2_desktop_quote.png` — 견적 영역
- `copybox_v2_mobile.png` — 390px 견적
- `copybox_v2_mobile_receipt.png` — 모바일 접수증
- `copybox_v2_mobile_history.png` — 모바일 내 주문 이력
- `copybox_v2_mobile_admin.png` — 모바일 관리자
- `copybox_v2_360.png` — 360px 화면
- `copybox_v2_360_admin.png` — 360px 관리자(예시 주문 3건)
- `copybox_v2_admin.png` — 데스크톱 관리자
- `copybox_v2_history.png` — 데스크톱 내 주문 이력
- `copybox_v2_login.png`, `copybox_v2_mobile_login.png` — 로그인 모달

## 배포

```bash
bash /workspace/deploy-copybox-app.sh
```

`main`(소스)과 `gh-pages`(빌드)에 푸시하고 `https://youngma2.github.io/copybox-app/` HTTP 200을 확인합니다.
