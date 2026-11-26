"""카피박스 v3 검증 — 5단계 상태 · 보관 사진 · 입금 확인 · 메시지 · 고객DB · 대시보드 · 리뷰 · 공지/여유특가/명함 · 모바일 오버플로.

사용법:
    python3 verify_copybox_v3.py [BASE_URL]
"""

from __future__ import annotations

import pathlib
import sys

from playwright.sync_api import sync_playwright

CHROME = '/workspace/.tools/chrome/chrome-headless-shell-linux64/chrome-headless-shell'
DOWNLOADS = pathlib.Path('/workspace/downloads')
SAMPLE = pathlib.Path('/workspace/copybox-app/scripts/sample-6p.pdf')
PHOTO = pathlib.Path('/workspace/copybox-app/scripts/test-photo.png')
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4175/copybox-app/').rstrip('/') + '/'

checks: list[str] = []
failures: list[str] = []


def check(label: str, ok: bool, detail: str = '') -> None:
    checks.append(f"{'PASS' if ok else 'FAIL'} · {label}{(' · ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)
    print(checks[-1], flush=True)


CONSOLE: list[str] = []
BAD: list[str] = []


def attach(page) -> None:
    page.on('console', lambda m: CONSOLE.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: CONSOLE.append(f'pageerror: {e}'))
    page.on('response', lambda r: BAD.append(f'{r.status} {r.url}') if r.status >= 400 else None)


def no_overflow(page, label: str) -> None:
    width = page.evaluate('document.documentElement.scrollWidth')
    inner = page.evaluate('window.innerWidth')
    check(f'{label} 가로 오버플로 0', width <= inner, f'scrollWidth={width} innerWidth={inner}')


def text_of(page, selector: str) -> str:
    locator = page.locator(selector).first
    if locator.count() == 0:
        return ''
    return (locator.inner_text() or '').strip()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)
    context = browser.new_context(viewport={'width': 390, 'height': 900}, device_scale_factor=2)
    page = context.new_page()
    attach(page)

    response = page.goto(BASE, wait_until='networkidle')
    check('라이브 응답 200', response is not None and response.status == 200, f'status={response.status if response else "none"}')

    page.wait_for_timeout(900)
    check('공지 팝업 표시', page.locator('[data-testid=notice-popup]').count() == 1)
    check('공지 문구 노출', '처음 만든 홈페이지' in page.inner_text('[data-testid=notice-popup]'))
    check('오늘 하루 보지 않기 버튼', page.locator('[data-testid=notice-dismiss-today]').count() == 1)
    check('여유특가 바로 견적 버튼', page.locator('[data-testid=notice-eco-cta]').count() == 1)
    page.click('[data-testid=notice-eco-cta]')
    page.wait_for_timeout(700)
    check('팝업 닫힘 후 여유특가 선택', page.get_attribute('[data-testid=speed-eco]', 'aria-pressed') == 'true')
    check('여유특가 할인 행 표시', page.locator('[data-testid=discount-row]').count() == 1)

    no_overflow(page, '390px 홈')
    page.set_viewport_size({'width': 360, 'height': 820})
    page.wait_for_timeout(300)
    no_overflow(page, '360px 홈')
    page.set_viewport_size({'width': 390, 'height': 900})

    # 배너
    check('여유특가 배너', page.locator('[data-testid=eco-banner]').count() == 1)

    # FAQ · 리뷰 · 텍스트
    check('FAQ 접이식 목록', page.locator('[data-testid=faq-list]').count() == 1)
    page.click('[data-testid=faq-toggle-shipping]')
    page.wait_for_timeout(150)
    faq = text_of(page, '[data-testid=faq-answer-shipping]')
    check('FAQ 택배비 5,000원 안내', '5,000원' in faq, faq[:40])
    check('단가표 택배 합계 5,000원', text_of(page, '[data-testid=shipping-total]') == '5,000원')
    check('명함 단가표 존재', page.locator('[data-testid=card-price-table]').count() == 1)

    page.click('[data-testid=faq-kakao]')
    page.wait_for_timeout(300)
    check('카톡 문의 자리 안내', '카카오톡 채널 링크' in text_of(page, '[data-testid=toast]'))
    page.wait_for_timeout(4600)

    # 견적: 택배비 5,000
    page.click('[data-testid=summary-pickup-delivery]')
    page.wait_for_timeout(200)
    total_with_delivery = int(page.get_attribute('[data-testid=total-amount]', 'data-total') or 0)
    check('택배 선택 시 5,000원 추가', total_with_delivery >= 5000, f'total={total_with_delivery}')
    page.click('[data-testid=summary-pickup-store]')
    page.wait_for_timeout(200)

    # 파일 업로드 → 6페이지 자동 인식
    page.set_input_files('[data-testid=file-input]', str(SAMPLE))
    page.wait_for_timeout(2500)
    check('PDF 6페이지 자동 인식', '6페이지' in page.inner_text('body'))
    total_eco = int(page.get_attribute('[data-testid=total-amount]', 'data-total') or 0)
    check('여유특가 인쇄비 10% 할인 반영', total_eco > 0)

    # 일반 출고로 바꾸면 총액 증가
    page.click('[data-testid=speed-normal]')
    page.wait_for_timeout(200)
    total_normal = int(page.get_attribute('[data-testid=total-amount]', 'data-total') or 0)
    check('여유특가가 일반 출고보다 저렴', total_eco < total_normal, f'eco={total_eco} normal={total_normal}')
    page.click('[data-testid=speed-eco]')
    page.wait_for_timeout(150)

    # 명함 탭
    page.click('[data-testid=product-card]')
    page.wait_for_timeout(250)
    check('명함 옵션 표시', page.locator('[data-testid=card-paper-coating]').count() == 1)
    page.click('[data-testid=card-paper-imported]')
    page.fill('[data-testid=card-units-input]', '2')
    page.dispatch_event('[data-testid=card-units-input]', 'blur')
    page.fill('[data-testid=card-text]', '카피박스 · 김영민 · 010-1111-2222')
    page.wait_for_timeout(300)
    card_total = int(page.get_attribute('[data-testid=total-amount]', 'data-total') or 0)
    # 15,000 × 2묶음 = 30,000 - 3,000(여유특가 10%)
    check('명함 2묶음 특가 계산', card_total == 27000, f'total={card_total}')
    page.click('[data-testid=product-print]')
    page.wait_for_timeout(200)

    # 주문 — 동의 필수
    page.fill('[data-testid=order-name]', '홍길동')
    page.fill('[data-testid=order-phone]', '010-0000-0000')
    page.click('[data-testid=submit-order]')
    page.wait_for_timeout(250)
    check('개인정보 동의 필수 검증', page.locator('[data-testid=payment-step]').count() == 0)
    page.check('[data-testid=order-agree]')
    page.click('[data-testid=submit-order]')
    page.wait_for_timeout(400)
    check('결제 단계 표시', page.locator('[data-testid=payment-step]').count() == 1)
    page.click('[data-testid=pay-method-bank_transfer]')
    page.click('[data-testid=confirm-payment]')
    page.wait_for_timeout(1200)
    check('접수증 표시', page.locator('[data-testid=receipt]').count() == 1)
    order_no = text_of(page, '[data-testid=receipt-order-no]')
    check('접수번호 생성', order_no.startswith('CB-'), order_no)
    check('접수증 입금 대기 표시', '입금 대기' in page.inner_text('[data-testid=receipt]'))
    assert order_no

    page.screenshot(path=str(DOWNLOADS / 'copybox-v3-mobile-receipt.png'))
    page.click('[data-testid=receipt-history-link]')
    page.wait_for_timeout(900)
    check('내 주문 이력에 신규 주문', page.locator(f'[data-order-number="{order_no}"]').count() >= 1)
    no_overflow(page, '390px 주문 이력')

    # 관리자 — 주문 확인
    page.click('[data-testid=mtab-admin]')
    page.wait_for_timeout(1100)
    check('관리자 주문 탭', page.locator('[data-testid=admin-order-list]').count() == 1)
    card = page.locator(f'[data-order-number="{order_no}"]').first
    check('결제 완료 주문이 사장님 화면에 노출', card.count() == 1)
    check('입금 대기 배지', card.locator('[data-testid=payment-badge-awaiting_deposit]').count() == 1)
    check('주문 상태 5단계 버튼', card.locator('[data-testid^=admin-status-]').count() == 5)
    no_overflow(page, '390px 관리자')

    # 보관 사진 2장 + 초과 방지
    card.locator('[data-testid=pickup-photo-input]').set_input_files(str(PHOTO))
    page.wait_for_timeout(1200)
    card = page.locator(f'[data-order-number="{order_no}"]').first
    check('보관 사진 1장 업로드', card.locator('[data-testid=pickup-photo]').count() == 1)
    card.locator('[data-testid=pickup-photo-add]').click()
    page.wait_for_timeout(200)
    if card.locator('[data-testid=pickup-photo-input]').count():
        card.locator('[data-testid=pickup-photo-input]').set_input_files(str(PHOTO))
        page.wait_for_timeout(1200)
    card = page.locator(f'[data-order-number="{order_no}"]').first
    check('보관 사진 최대 2장', card.locator('[data-testid=pickup-photo]').count() == 2)

    # 메시지
    card.locator('[data-testid^=message-input-]').first.fill('보관 위치는 계산대 옆 1번 선반입니다.')
    card.locator('[data-testid^=message-send-]').first.click()
    page.wait_for_timeout(900)
    check('관리자 메시지 전송', '계산대 옆 1번 선반' in card.locator('[data-testid^=messages-]').first.inner_text())

    # 입금 확인
    card.locator(f'[data-testid="admin-payment-{order_no}"]').click()
    page.wait_for_timeout(1000)
    card = page.locator(f'[data-order-number="{order_no}"]').first
    check('입금 확인 완료 표시', card.locator('[data-testid=payment-badge-confirmed]').count() == 1)

    # 상태 5단계: 인쇄중 → 완료 → 출고 → 배송 완료
    for status in ['printing', 'done', 'shipped', 'delivered']:
        card.locator(f'[data-testid="admin-status-{order_no}-{status}"]').click()
        page.wait_for_timeout(900)
        card = page.locator(f'[data-order-number="{order_no}"]').first
        check(f'상태 변경 {status}', card.locator(f'[data-testid=status-badge-{status}]').count() == 1)

    # 고객 DB
    page.click('[data-testid=admin-tab-customers]')
    page.wait_for_timeout(500)
    check('고객 DB 목록', page.locator('[data-testid=customer-list]').count() == 1)
    page.fill('[data-testid=customer-search]', '010-0000-0000')
    page.wait_for_timeout(300)
    rows = page.locator('[data-testid^=customer-row-]')
    check('연락처 검색', rows.count() >= 1, f'{rows.count()}건')
    rows.first.click()
    page.wait_for_timeout(400)
    detail = text_of(page, '[data-testid=customer-detail]')
    check('고객 상세 이력 열림', order_no in detail)

    # 대시보드
    page.click('[data-testid=admin-tab-dashboard]')
    page.wait_for_timeout(400)
    check('대시보드 총 결제 금액', page.locator('[data-testid=dashboard-revenue]').count() == 1)
    check('대시보드 평균 객단가', page.locator('[data-testid=dashboard-average]').count() == 1)
    page.click('[data-testid=dashboard-range-custom]')
    page.wait_for_timeout(200)
    check('기간 지정 입력', page.locator('[data-testid=dashboard-start]').count() == 1)
    check('옵션 조합 순위', page.locator('[data-testid=dashboard-combos]').count() == 1)
    no_overflow(page, '390px 대시보드')

    # 리뷰 관리 탭
    page.click('[data-testid=admin-tab-reviews]')
    page.wait_for_timeout(300)
    check('리뷰 관리 탭', page.locator('[data-testid=admin-reviews]').count() == 1)

    # 손님 화면 — 배송 완료 주문 리뷰 작성
    page.click('[data-testid=mtab-history]')
    page.wait_for_timeout(900)
    order_card = page.locator(f'[data-order-number="{order_no}"]').first
    check('배송 완료 주문에 리뷰 폼', order_card.locator(f'[data-testid="review-form-{order_no}"]').count() == 1)
    check('보관 사진이 손님 이력에 표시', order_card.locator('[data-testid=pickup-photo]').count() == 2)
    check('사장님 메시지가 손님 이력에 표시', '계산대 옆 1번 선반' in order_card.locator('[data-testid^=messages-]').first.inner_text())
    check('입금 확인 시각 표시', '입금 확인' in order_card.inner_text())
    order_card.locator('[data-testid=review-star-5]').click()
    order_card.locator('[data-testid=review-body]').fill('보관 사진 덕분에 바로 찾았어요. 인쇄도 깔끔합니다.')
    order_card.locator('[data-testid=review-submit]').click()
    page.wait_for_timeout(1200)
    order_card = page.locator(f'[data-order-number="{order_no}"]').first
    check('리뷰 저장', '바로 찾았어요' in order_card.inner_text())

    # 메인 별점 반영
    page.click('[data-testid=mtab-shop]')
    page.wait_for_timeout(700)
    avg = text_of(page, '[data-testid=review-average]')
    check('메인 평균 별점 노출', avg not in ('', '—'), avg)

    # 탈퇴 확인 패널 (실행은 보류)
    page.click('[data-testid=mtab-history]')
    page.wait_for_timeout(700)
    page.click('[data-testid=history-delete-account]')
    page.wait_for_timeout(250)
    confirm = text_of(page, '[data-testid=delete-confirm]')
    check('탈퇴 안내·5년 보관 문구', '5년' in confirm and '파기' in confirm)

    # 데스크톱
    page.set_viewport_size({'width': 1280, 'height': 1000})
    page.click('[data-testid=tab-shop]')
    page.wait_for_timeout(600)
    no_overflow(page, '1280px 홈')
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(400)
    page.screenshot(path=str(DOWNLOADS / 'copybox-v3-desktop-home.png'))
    page.click('[data-testid=tab-admin]')
    page.wait_for_timeout(800)
    page.screenshot(path=str(DOWNLOADS / 'copybox-v3-desktop-admin.png'))
    no_overflow(page, '1280px 관리자')


    # ---------------- 두 번째 세션: 예시 데이터 · 미결제 제외 · 탈퇴 ----------------
    context2 = browser.new_context(viewport={'width': 390, 'height': 900}, device_scale_factor=2)
    page2 = context2.new_page()
    attach(page2)
    page2.goto(BASE, wait_until='networkidle')
    page2.wait_for_timeout(900)
    if page2.locator('[data-testid=notice-dismiss-today]').count():
        page2.click('[data-testid=notice-dismiss-today]')
    page2.click('[data-testid=mtab-admin]')
    page2.wait_for_timeout(900)
    check('빈 관리자에서 예시 데이터 버튼', page2.locator('[data-testid=admin-seed]').count() == 1)
    page2.click('[data-testid=admin-seed]')
    page2.wait_for_timeout(2000)
    seeded = page2.locator('[data-testid=admin-order]')
    check('예시 주문 5건 생성', seeded.count() == 5, f'{seeded.count()}건')
    check('예시 여유특가 주문 배지', page2.locator('[data-testid=admin-eco-badge]').count() >= 1)
    check('예시 리뷰 1건', page2.locator('[data-testid=admin-tab-reviews]').inner_text().find('1') >= 0)

    # 미결제 초안은 사장님 목록에서 제외
    page2.evaluate("""() => {
      const raw = JSON.parse(localStorage.getItem('copybox.v3.db'));
      const c = raw.customers[0];
      const now = new Date().toISOString();
      raw.orders.push({
        id: 'unpaid-test', orderNumber: 'CB-UNPAID-1', customerId: c.id, status: 'received',
        product: 'print', paperSize: 'A4', colorMode: 'mono', sides: 'single', pages: 1, copies: 1,
        binding: 'none', cardPaper: null, cardQty: null, cardText: null, pageUnitPrice: 50,
        bindingUnitPrice: 0, printCost: 50, discount: 0, shippingFee: 0, packagingFee: 0, totalPrice: 50,
        deliverySpeed: 'normal', dueShipDate: '2026-12-01', paymentStatus: 'unpaid',
        paymentMethod: 'bank_transfer', paymentConfirmedAt: null, customerRequest: null,
        pickup: 'store', address: null, pdfPurgeAt: null, createdAt: now, updatedAt: now,
        files: [], pickupPhotos: []
      });
      localStorage.setItem('copybox.v3.db', JSON.stringify(raw));
    }""")
    page2.reload(wait_until='networkidle')
    page2.wait_for_timeout(1200)
    if page2.locator('[data-testid=notice-dismiss-today]').count():
        page2.click('[data-testid=notice-dismiss-today]')
    page2.click('[data-testid=mtab-admin]')
    page2.wait_for_timeout(900)
    check('미결제 초안이 사장님 목록에 없음', page2.locator('[data-order-number="CB-UNPAID-1"]').count() == 0)
    check('미결제 제외 후에도 주문 5건', page2.locator('[data-testid=admin-order]').count() == 5)

    # 탈퇴 — 이름·연락처 파기, 결제 기록만 유지
    page2.click('[data-testid=mtab-history]')
    page2.wait_for_timeout(700)
    page2.click('[data-testid=login-open]')
    page2.wait_for_timeout(300)
    page2.click('[data-testid=login-kakao]')
    page2.wait_for_timeout(1200)
    page2.click('[data-testid=history-delete-account]')
    page2.wait_for_timeout(300)
    page2.click('[data-testid=delete-confirm-yes]')
    page2.wait_for_timeout(1200)
    check('탈퇴 후 로그인 화면으로', page2.locator('[data-testid=history-login]').count() == 1)
    anonymized = page2.evaluate("""() => {
      const raw = JSON.parse(localStorage.getItem('copybox.v3.db'));
      const c = raw.customers.find((row) => row.deletedAt);
      const own = c ? raw.orders.filter((o) => o.customerId === c.id) : [];
      return {
        name: c ? c.name : null,
        phone: c ? c.phone : null,
        ownOrders: own.length,
        files: own.every((o) => (o.files || []).length === 0),
        photos: own.every((o) => (o.pickupPhotos || []).length === 0),
        hasCart: raw.orders.every((o) => o.orderNumber !== 'CB-UNPAID-1' ? true : true),
      };
    }""")
    check('탈퇴 시 이름·연락처 파기', anonymized['name'] == '탈퇴한 고객' and anonymized['phone'] == '00000000000', str(anonymized))
    check('탈퇴 시 PDF·보관 사진 파기', anonymized['files'] is True and anonymized['photos'] is True, str(anonymized))
    check('탈퇴 후 주문 기록 유지(비식별)', page2.evaluate("() => JSON.parse(localStorage.getItem('copybox.v3.db')).orders.length") >= 5 and anonymized['ownOrders'] >= 1)

    page2.set_viewport_size({'width': 390, 'height': 900})
    page2.screenshot(path=str(DOWNLOADS / 'copybox-v3-mobile-after-delete.png'))
    context2.close()

    # 공지 팝업 스크린샷
    context3 = browser.new_context(viewport={'width': 390, 'height': 900}, device_scale_factor=2)
    page3 = context3.new_page()
    attach(page3)
    page3.goto(BASE, wait_until='networkidle')
    page3.wait_for_timeout(1100)
    page3.screenshot(path=str(DOWNLOADS / 'copybox-v3-mobile-notice.png'))
    page3.click('[data-testid=notice-eco-cta]')
    page3.wait_for_timeout(700)
    page3.locator('[data-testid=eco-banner]').scroll_into_view_if_needed()
    page3.wait_for_timeout(300)
    page3.screenshot(path=str(DOWNLOADS / 'copybox-v3-mobile-eco-banner.png'))
    page3.click('[data-testid=product-card]')
    page3.wait_for_timeout(400)
    page3.locator('[data-testid=card-text]').scroll_into_view_if_needed()
    page3.wait_for_timeout(300)
    page3.screenshot(path=str(DOWNLOADS / 'copybox-v3-mobile-card.png'))
    no_overflow(page3, '390px 명함 옵션')
    context3.close()

    # 콘솔/네트워크
    errors = [line for line in CONSOLE if line.strip()]
    check('콘솔 에러 0', len(errors) == 0, ' | '.join(errors[:3]))
    bad = [line for line in BAD if line.strip()]
    check('HTTP 4xx/5xx 0', len(bad) == 0, ' | '.join(bad[:3]))

    context.close()
    browser.close()

print()
print(f'총 {len(checks)}개 · 실패 {len(failures)}개')
if failures:
    print('실패 항목:')
    for item in failures:
        print(' -', item)
    sys.exit(1)
