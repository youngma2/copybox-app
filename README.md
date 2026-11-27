# 카피박스 (COPYBOX) — 자동견적 · PDF 접수 · 손님 이력 · 사장님 관리자

**배포 주소: https://youngma2.github.io/copybox-app/** (GitHub Pages, `main` = 소스 / `gh-pages` = 빌드)

일산 복사·출력·제본 매장 **카피박스**의 주문 홈페이지입니다.
PDF를 끌어다 놓으면 브라우저 안에서 페이지 수를 세고, 옵션을 고르는 즉시 견적이 계산됩니다.
주문은 손님 ID(`customer_id`)에 묶여 저장되어 **내 주문 이력**에서 접수번호·옵션·요청사항·첨부파일·보관 사진·메시지·리뷰까지 다시 볼 수 있고,
사장님은 **관리자** 화면에서 주문·입금·고객 DB·매출 대시보드를 관리합니다.

## 2026-11-27 일괄 반영 내용

| 항목 | 내용 |
| --- | --- |
| **상품별 탭·페이지** | 상단 탭이 **A4 출력·제본 / 명함 / 내 주문 이력 / 관리자** 4개. 상품마다 전용 페이지(`#/a4`, `#/card`)에 소개·옵션·단가표·주문 흐름이 따로 있습니다 |
| 코드 3단 분리 | `src/config/`(단가·제본·택배비·주문상태·명함·상품 페이지) · `src/lib/storage/`(저장소 어댑터) · `src/components/`(화면) |
| 주문 상태 | **접수됨 → 인쇄중 → 완료 → 출고 → 배송 완료** (5단계) |
| 결제 후 노출 | 주문은 결제(입금 신청)를 마친 시점에만 생성 → 사장님 목록에는 결제 완료 건만. 미결제·작성 중 이탈 건은 저장조차 되지 않음 |
| 입금 확인 | 주문별 `입금 대기 / 입금 확인 완료` + 확인 시각 저장 (`payment_confirmed_at`) |
| 방문 수령 보관 사진 | 주문별 최대 2장 업로드/삭제, 손님 내 주문 이력에서 확인 |
| 주문 메시지 | 손님 ↔ 사장님 짧은 메모를 `order_id`·`customer_id` 에 묶어 보존 |
| 택배비 | 기본 택배비 4,000원 + 박스·포장재비 1,000원 = **5,000원** (방문 수령 0원, 퀵 착불, 제주·도서산간 별도) |
| 여유 제작 특가 | 영업일 4일 이내 **출고** 기준 · **인쇄비 10% 자동 할인** · 관리자 출고마감일 배지 |
| 명함 | 코팅·비코팅·수입지 200매 15,000원(임시) · 90×50mm · 문구 입력·파일 업로드 · 오픈 특가 배지 |
| 첫 화면 공지 | 오픈 인사 팝업 + 여유특가 배너 + `오늘 하루 보지 않기` · `여유특가 바로 견적` |
| 고객 DB | 전체 고객 목록 + 이름/연락처/고객 ID 검색 + 누적 주문·총 결제·최근 주문일 + 클릭 시 전체 이력 |
| 매출 대시보드 | 일/주/월/연/기간 지정 · 총 결제금액·주문량·평균 객단가 · 요일·시간대 추이 · 옵션 조합 순위 |
| 리뷰 | 배송 완료 주문에만 별점(1~5)·한줄 후기·사진 · 메인 평균 별점 노출 · 관리자 답글/숨김 |
| FAQ·카톡 | 제작 기간·파일 형식·택배비·보관 사진·개인정보 접이식 FAQ + 카카오톡 채널 문의 버튼(링크 전 자리) |
| 탈퇴 | 내 주문 이력에서 회원 탈퇴 — 이름·연락처·주소·PDF·보관 사진·메시지 즉시 파기, 결제 기록만 5년 비식별 보관 |
| 보안 | 최소 수집(주민번호·카드번호 미수집) · 출고·배송 완료 14일 뒤 PDF 원본 자동 파기 · 동의 체크 필수 · 사장님 계정 + MFA 설계 |

## 실행

```bash
export PATH=/workspace/.tools/node/bin:$PATH
cd /workspace/copybox-app
npm install
npm run dev        # 개발 서버 (127.0.0.1:5175/copybox-app/)
npm run build      # tsc --noEmit + vite build
npm run preview    # 빌드 미리보기 (127.0.0.1:4175/copybox-app/)
```

검증(Playwright, 모바일 360·390px / 데스크톱 1280px / 콘솔 에러 0):

```bash
export LD_LIBRARY_PATH=/workspace/.tools/chrome/lib
python3 scripts/verify_product_tabs.py            # 상품 탭·페이지 분리 94개 (dist 를 직접 서빙)
```

`scripts/verify_copybox_v3.py` · `verify_copybox_v2.py` 는 탭 구조 이전(단일 견적 화면) 기준의 기록용 검증입니다.

## 구조 (3단 분리)

```
copybox-app/
  src/
    config/                  # ── 설정·규칙층 (가격/메뉴는 여기만 고치면 됩니다)
      products.ts            #   상품 페이지 문구·탭 이름·해시 라우트 (새 상품 추가 지점)
      pricing.ts             #   A4 50/40 · 컬러 300/250 · 제본 3종 · 한도
      delivery.ts            #   택배 4,000 + 포장 1,000 · 여유특가 10% · 영업일 계산 · 14일 파기
      status.ts              #   주문 상태 5단계 · 입금 상태 · 결제 수단
      business-card.ts       #   명함 90×50mm · 지류 3종 200매 15,000원
      store.ts               #   매장 정보(샘플) · 공지/배너 문구 · FAQ
      index.ts
    lib/
      pricing.ts             #   설정값으로 견적 계산 (Quote)
      storage/               # ── 저장소 어댑터 (환경설정만으로 전환)
        types.ts             #   Customer/Order/PickupPhoto/OrderMessage/Review + CopyboxStore
        demo.ts              #   localStorage 시안 모드 (v2 → v3 자동 마이그레이션)
        supabase.ts          #   Supabase REST (R2 경로만 저장)
        index.ts             #   VITE_SUPABASE_* 유무로 demo ↔ supabase 선택
      order.ts / describe.ts / image.ts / auth.ts / format.ts / routing.ts
    components/              # ── 화면층
      ProductPage            #   상품 전용 페이지 조립(소개→견적→단가표→안내→주문)
      ProductHero            #   상품별 히어로(소개 문구·가격 요약·3단계 안내·예시 목업)
      Header / Uploader / OptionsCard / SummaryCard / PriceTable
      EcoPromo               #   여유특가 배너 + 전용 안내 탭
      NoticePopup            #   공지 팝업(오늘 하루 보지 않기)
      OrderSection           #   주문 폼 → 결제 확인 → 접수증
      HistorySection         #   내 주문 이력(보관 사진·메시지·리뷰·탈퇴)
      Reviews                #   별점·후기·관리자 답글/숨김
      FaqSection / StoreInfo
      AdminSection           #   관리자 탭 컨테이너
      admin/AdminOrders      #   주문·입금·상태·보관 사진·메시지
      admin/AdminCustomers   #   고객 DB + 전체 이력
      admin/AdminDashboard   #   매출·주문 대시보드
      PickupPhotos / OrderMessages / StatusBadge
    App.tsx                  # 해시 라우팅·상품 전환·손님 세션·관리자 데이터
  supabase/schema.sql        # 카피박스 전용 스키마 v3 (공부 체크 앱과 완전 분리)
  scripts/verify_product_tabs.py # 상품 탭·페이지 검증 94개
  scripts/preview_server.py      # dist 를 /copybox-app/ 으로 서빙하는 테스트 서버
```

## 상품 페이지 추가하는 법

1. `src/config/pricing.ts` 의 `ProductKind` 에 새 상품 id 추가
2. `src/config/products.ts` 의 `PRODUCT_PAGES` 에 탭 이름·소개 문구·3단계 안내·`route`(`#/poster` 등) 추가
3. `src/components/ProductPage.tsx` 에서 그 상품의 옵션·단가표를 연결

탭·해시 라우트·헤더·푸터가 `PRODUCT_ORDER` 를 따라 자동으로 늘어납니다.

## 저장소 전환 (시안 ↔ 운영)

`.env` 에 아래 두 값을 넣으면 `lib/storage/supabase.ts` 가 선택되고, 없으면 localStorage 시안 모드입니다.

```
VITE_SUPABASE_URL=https://<프로젝트>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

- **Supabase(무료 500MB)** — 손님·주문·상태·메시지·리뷰·파일 경로(메타데이터)만 저장
- **Cloudflare R2(무료 10GB · 전송료 0원)** — 인쇄 PDF 원본·보관 사진 저장, Worker 서명 URL로만 접근
- 앱은 파일 원본을 서버로 올리지 않고 **경로(`r2/<customer_id>/<order_number>/<file>`)만** 기록합니다.
  실제 업로드·서명 URL 발급은 Supabase 키와 R2 Worker가 연결된 뒤 켜집니다.
- 시안에서는 보관 사진·리뷰 사진을 브라우저에서 축소해 data URL 로 저장합니다(`lib/image.ts`).

## 개인정보·보안 기준

- **최소 수집**: 이름·연락처·(택배일 때) 주소만. 주민번호·생년월일·카드번호는 받지 않습니다(결제는 계좌이체·카카오페이 → 추후 PG).
- **동의 필수**: 주문 화면의 개인정보 수집·이용 동의 체크박스가 없으면 결제 단계로 넘어가지 않습니다.
- **PDF 자동 파기**: 출고·배송 완료로 바뀌면 `pdf_purge_at = +14일`이 잡히고, 손님·사장님 화면에 파기 예정일이 표시됩니다.
  `copybox_purge_due_pdfs()` 가 파기 대상을 돌려주고, R2 Worker 가 실제 파일을 지웁니다.
- **탈퇴**: 이름·연락처·주소·PDF·보관 사진·메시지 즉시 파기, 결제 기록만 전자상거래법상 5년 비식별 보관.
- **관리자 인증**: 단순 PIN 대신 사장님 계정 인증 + **MFA(TOTP)** + `staff_members` 권한 검증 + RLS.
  지금은 완성 전 테스트를 위해 상단 `관리자` 탭을 열어 두었습니다(운영 전 숨김/권한 게이트 예정).

## Supabase 적용 순서

1. 카피박스 전용 Supabase 프로젝트 생성 → SQL Editor 에 `supabase/schema.sql` 전체 실행
   (이미 v2 로 만든 프로젝트라면 파일 맨 아래 `v3 추가분` 블록만 실행)
2. Authentication > Providers 에서 카카오·네이버·구글 활성화, **MFA(TOTP)** 켜기
3. 사장님 계정으로 로그인 후 `staff_members` 에 user id 등록
4. Storage `order-files` 버킷을 Private 으로, Cloudflare R2 Worker 연결
5. 앱 환경변수 설정 후 배포

## 시안에서 아직 비어 있는 값 (실제 정보 대기)

- 실제 매장 정보(주소·전화·영업시간·카카오톡 채널): `src/config/store.ts` 의 `STORE`
- 스프링·와이어 사이즈별 세부 단가표: `src/config/pricing.ts` 의 `BINDING_OPTIONS`
- 카피박스 전용 Supabase 키·R2 버킷: `.env`
- 입금 계좌·카카오페이 송금 링크: `OrderSection.tsx` 결제 안내 문구
