"""카피박스 상품별 탭·페이지 분리 검증.

- 상단 탭 4개(A4 출력·제본 / 명함 / 내 주문 이력 / 관리자)
- 상품별 전용 페이지(소개·옵션·단가표·주문)와 해시 라우팅
- 견적 계산(인쇄·명함·여유특가·택배), 카드 결제 흐름, 이력·관리자 유지
- 360px · 390px · 1280px 가로 오버플로 0
- 콘솔 에러 0 · HTTP 4xx/5xx 0

사용법:
    python3 verify_product_tabs.py [BASE_URL]
기본값은 dist 를 직접 서빙하는 http://127.0.0.1:4199/copybox-app/ 입니다.
"""

from __future__ import annotations

import pathlib
import re
import sys

sys.path.insert(0, '/workspace/copybox-app/scripts')

from playwright.sync_api import sync_playwright  # noqa: E402

CHROME = '/workspace/.tools/chrome/chrome-headless-shell-linux64/chrome-headless-shell'
DOWNLOADS = pathlib.Path('/workspace/downloads')
SAMPLE = pathlib.Path('/workspace/copybox-app/scripts/sample-6p.pdf')

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4199/copybox-app/').rstrip('/') + '/'

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


OVERFLOW_JS = """() => ({
  doc: document.documentElement.scrollWidth,
  body: document.body.scrollWidth,
  win: window.innerWidth,
  offenders: Array.from(document.querySelectorAll('*'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
    })
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 36)}`)
})"""


def overflow(page, label: str) -> None:
    data = page.evaluate(OVERFLOW_JS)
    ok = data['doc'] <= data['win'] and data['body'] <= data['win']
    check(label, ok, f"doc={data['doc']} body={data['body']} win={data['win']} {data['offenders']}")


def total(page) -> int:
    page.wait_for_timeout(150)
    return int(page.get_attribute('[data-testid=total-amount]', 'data-total') or -1)


def set_number(page, testid: str, value: str) -> None:
    page.fill(f'[data-testid={testid}]', value)
    page.press(f'[data-testid={testid}]', 'Tab')
    page.wait_for_timeout(180)


def scroll_to(page, selector: str) -> None:
    page.evaluate(
        """(sel) => {
            document.documentElement.style.scrollBehavior = 'auto';
            const el = document.querySelector(sel);
            if (!el) return;
            window.scrollTo({top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant'});
        }""",
        selector,
    )
    page.wait_for_timeout(350)


def dismiss_notice(page) -> None:
    if page.locator('[data-testid=notice-popup]').count() > 0:
        page.click('[data-testid=notice-close]')
        page.wait_for_timeout(300)


server = None
if '127.0.0.1:4199' in BASE:
    from preview_server import serve

    server = serve()

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])

    # ==================================================================
    # 1) 데스크톱 1280 — 탭 구조 · 상품 페이지 분리 · 견적 · 주문
    # ==================================================================
    ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2)
    page = ctx.new_page()
    attach(page)
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(600)

    check('페이지 타이틀', '카피박스' in page.title(), page.title())
    tabs = [page.inner_text(f'[data-testid=tab-{t}]').strip() for t in ('print', 'card', 'history', 'admin')]
    check('상단 탭 4개 · 상품 2 + 이력 + 관리자', tabs == ['A4 출력 · 제본', '명함', '내 주문 이력', '관리자'], str(tabs))
    check('기본 진입 = A4 출력·제본 페이지', page.is_visible('[data-testid=product-page-print]'))
    check('A4 탭 활성 표시', page.get_attribute('[data-testid=tab-print]', 'aria-current') == 'page')
    dismiss_notice(page)
    overflow(page, '1280px · A4 페이지 첫 화면 오버플로 없음')

    # --- A4 페이지 구성 ---
    print_body = page.inner_text('body')
    for needle in ('PDF만 올리면,', 'A4 인쇄 단가표', '실시간 견적', 'A4 출력 실시간 견적'):
        check(f'A4 페이지 · {needle}', needle in print_body)
    check('A4 페이지 · 인쇄할 파일 업로더', page.inner_text('[data-testid=dropzone]').find('PDF') >= 0)
    check('A4 페이지 · 명함 단가 요약 교차 안내', page.locator('[data-testid=card-price-table]').count() == 1)
    check('A4 페이지 · 해시 라우트 #/a4', page.evaluate('location.hash') == '#/a4', page.evaluate('location.hash'))

    page.click('[data-testid=color-color]')
    check('A4 · 컬러 단면 300원', total(page) == 300, f'{total(page)}원')
    page.click('[data-testid=color-mono]')
    set_number(page, 'pages-input', '4')
    page.click('[data-testid=sides-double]')
    check('A4 · 흑백 양면 4페이지 = 160원', total(page) == 160, f'{total(page)}원')
    page.click('[data-testid=binding-coil]')
    check('A4 · 스프링 1,500원 더해 1,660원', total(page) == 1660, f'{total(page)}원')
    page.click('[data-testid=speed-eco]')
    check('A4 · 여유특가 인쇄비 10% 할인(16원) = 1,644원', total(page) == 1644, f'{total(page)}원')
    page.click('[data-testid=speed-normal]')
    page.click('[data-testid=binding-none]')

    # --- 옵션 카드의 상품 전환 = 페이지 이동 ---
    page.click('[data-testid=product-card]')
    page.wait_for_timeout(700)
    check('옵션 카드에서 명함 선택 시 명함 페이지로 이동', page.is_visible('[data-testid=product-page-card]'))
    check('명함 페이지 해시 #/card', page.evaluate('location.hash') == '#/card', page.evaluate('location.hash'))
    check('명함 탭 활성 표시', page.get_attribute('[data-testid=tab-card]', 'aria-current') == 'page')
    check('A4 옵션 카드 사라짐(페이지 분리)', page.locator('[data-testid=product-page-print]').count() == 0)
    overflow(page, '1280px · 명함 페이지 오버플로 없음')

    card_body = page.inner_text('body')
    for needle in ('명함은', '시안부터 만들어 드립니다', '명함 단가표', '명함 실시간 견적', '명함 제작 안내'):
        check(f'명함 페이지 · {needle}', needle in card_body)
    check('명함 페이지 · 디자인 파일 업로더', '명함 디자인 파일' in page.inner_text('#upload-title'))
    check('명함 페이지 · 지류 3종', all(page.locator(f'[data-testid=card-paper-{k}]').count() == 1 for k in ('coating', 'noncoating', 'imported')))
    check('명함 페이지 · 기본 200매 15,000원', total(page) == 15000, f'{total(page)}원')

    page.click('[data-testid=card-paper-imported]')
    set_number(page, 'card-units-input', '2')
    check('명함 · 수입지 400매 = 30,000원', total(page) == 30000, f'{total(page)}원')
    page.click('[data-testid=speed-eco]')
    check('명함 · 여유특가 10% = 27,000원', total(page) == 27000, f'{total(page)}원')
    page.click('[data-testid=speed-normal]')
    page.fill('[data-testid=card-text]', '카피박스 · 김영민 · 010-1111-2222\n일산 복사·출력·제본')
    check('명함 · 문구 입력', '김영민' in page.input_value('[data-testid=card-text]'))
    page.set_input_files('[data-testid=file-input]', str(SAMPLE))
    page.wait_for_timeout(600)
    check('명함 · 디자인 파일 첨부 표시', 'sample-6p.pdf' in page.inner_text('[data-testid=dropzone]'))
    check('명함 · 파일 첨부해도 금액 유지', total(page) == 30000, f'{total(page)}원')
    scroll_to(page, '#quote')
    page.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-desktop-card.png'))

    # --- 명함 주문 → 접수증 → 이력 ---
    scroll_to(page, '#order')
    check('명함 주문 화면 제목', '명함 주문 접수' in page.inner_text('#order'))
    check('주문 요약 · 명함 문구', '명함 문구' in page.inner_text('#order'))
    page.fill('[data-testid=order-name]', '박명함')
    page.fill('[data-testid=order-phone]', '01088887777')
    page.fill('[data-testid=order-notes]', '로고는 카톡으로 보내 드릴게요. 시안 먼저 보고 싶어요.')
    page.click('[data-testid=order-agree]')
    page.click('[data-testid=submit-order]')
    page.wait_for_selector('[data-testid=payment-step]', timeout=8000)
    page.click('[data-testid=confirm-payment]')
    page.wait_for_selector('[data-testid=receipt]', timeout=10000)
    receipt = page.inner_text('[data-testid=receipt]')
    card_order_no = page.inner_text('[data-testid=receipt-order-no]').strip()
    check('명함 접수증 표시', '주문이 접수됐어요' in receipt)
    check('명함 접수번호 형식', bool(re.fullmatch(r'CB-\d{6}-\d{6}', card_order_no)), card_order_no)
    check('명함 접수증 금액 30,000원', page.inner_text('[data-testid=receipt-total]').strip() == '30,000원')
    check('명함 접수증 문구', '김영민' in receipt)
    check('명함 접수증 파일', 'sample-6p.pdf' in receipt)
    page.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-desktop-card-receipt.png'))

    # --- A4 페이지로 복귀: 명함 접수증이 따라오지 않음 ---
    page.click('[data-testid=tab-print]')
    page.wait_for_timeout(600)
    check('A4 탭 복귀', page.is_visible('[data-testid=product-page-print]'))
    check('A4 페이지에 명함 접수증 없음', page.locator('[data-testid=receipt]').count() == 0)
    check('A4 탭 복귀 시 업로더 비어 있음', 'PDF를 여기로' in page.inner_text('[data-testid=dropzone]'))

    page.set_input_files('[data-testid=file-input]', str(SAMPLE))
    page.wait_for_selector('[data-testid=pagecount-badge]', timeout=15000)
    page.wait_for_function("document.querySelector('[data-testid=pages-input]').value === '6'")
    check('A4 · PDF 6페이지 자동 인식', '6페이지 자동 인식' in page.inner_text('[data-testid=pagecount-badge]'))
    page.click('[data-testid=sides-single]')
    check('A4 · 6페이지 흑백 단면 300원', total(page) == 300, f'{total(page)}원')
    scroll_to(page, '#quote')
    page.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-desktop-a4.png'))

    # --- 명함 주문이 내 주문 이력에 ---
    page.click('[data-testid=tab-history]')
    page.wait_for_selector('[data-testid=history-order]', timeout=8000)
    page.wait_for_timeout(400)
    history = page.inner_text('body')
    check('이력 · 명함 주문 표시', card_order_no in history)
    check('이력 · 상품 표시', '명함' in history and '수입지' in history)
    page.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-desktop-history.png'))

    # --- 관리자 탭 유지 ---
    page.click('[data-testid=tab-admin]')
    page.wait_for_selector('[data-testid=admin-order]', timeout=8000)
    page.wait_for_timeout(500)
    check('관리자 탭 유지 · 주문 표시', card_order_no in page.inner_text('body'))
    check('관리자 · 상태 변경 버튼', page.locator(f'[data-testid="admin-status-{card_order_no}-printing"]').count() == 1)
    check('관리자 · 5단계 상태 버튼(출고·배송 완료)', page.locator(f'[data-testid="admin-status-{card_order_no}-shipped"]').count() == 1 and page.locator(f'[data-testid="admin-status-{card_order_no}-delivered"]').count() == 1)
    page.click(f'[data-testid="admin-status-{card_order_no}-printing"]')
    page.wait_for_timeout(600)
    check('관리자 · 인쇄중 변경', '인쇄중' in page.locator(f'[data-order-number="{card_order_no}"]').inner_text())
    page.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-desktop-admin.png'))

    # --- 해시 딥링크: 새로고침해도 그 페이지 ---
    page.goto(BASE + '#/card', wait_until='networkidle')
    page.wait_for_timeout(700)
    dismiss_notice(page)
    check('딥링크 #/card 새로고침 유지', page.is_visible('[data-testid=product-page-card]'))
    page.goto(BASE + '#/a4', wait_until='networkidle')
    page.wait_for_timeout(500)
    check('딥링크 #/a4 새로고침 유지', page.is_visible('[data-testid=product-page-print]'))

    ctx.close()

    # ==================================================================
    # 2) 모바일 390 — 탭 줄바꿈·오버플로·상품 페이지 캡처
    # ==================================================================
    mctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    mpage = mctx.new_page()
    attach(mpage)
    mpage.goto(BASE, wait_until='networkidle')
    mpage.wait_for_timeout(900)

    # 기존 공지 팝업(--여유특가 바로 견적) 유지
    check('공지 팝업 유지', mpage.locator('[data-testid=notice-popup]').count() == 1)
    check('공지 팝업 · 여유특가 바로 견적', '여유특가 바로 견적' in mpage.inner_text('[data-testid=notice-popup]'))
    mpage.click('[data-testid=notice-eco-cta]')
    mpage.wait_for_timeout(600)
    check('공지 팝업 CTA → 여유특가 선택', mpage.get_attribute('[data-testid=speed-eco]', 'aria-pressed') == 'true')
    check('공지 팝업 CTA → 인쇄비 10% 할인 행', mpage.locator('[data-testid=discount-row]').count() == 1)
    mpage.click('[data-testid=speed-normal]')
    mpage.evaluate('window.scrollTo({top: 0, behavior: "instant"})')
    mpage.wait_for_timeout(300)

    mtabs = [mpage.inner_text(f'[data-testid=mtab-{t}]').strip() for t in ('print', 'card', 'history', 'admin')]
    check('390px · 모바일 탭 4개', mtabs == ['A4 출력', '명함', '주문 이력', '관리자'], str(mtabs))
    overflow(mpage, '390px · A4 페이지 오버플로 없음')
    mpage.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-a4.png'))
    check('A4 모바일 스크린샷 저장', (DOWNLOADS / 'copybox-product-tabs-a4.png').exists())

    for section in ('#quote', '#price', '#eco', '#store', '#order'):
        scroll_to(mpage, section)
        overflow(mpage, f'390px · A4 {section} 오버플로 없음')
    check('A4 페이지 · FAQ 유지', mpage.locator('[data-testid=faq-list]').count() == 1)
    mpage.click('[data-testid=faq-kakao]')
    mpage.wait_for_timeout(400)
    check('A4 페이지 · 카카오 문의 자리 안내', '카카오톡 채널 링크' in mpage.inner_text('[data-testid=toast]'))
    mpage.wait_for_selector('[data-testid=toast]', state='detached', timeout=8000)
    check('A4 페이지 · 후기 영역 유지', '후기' in mpage.inner_text('body'))
    check('푸터 · 14일 뒤 파기 안내', '14일 뒤 파기' in mpage.inner_text('footer'))
    scroll_to(mpage, '#quote')
    mpage.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-a4-quote.png'))

    mpage.click('[data-testid=mtab-card]')
    mpage.wait_for_timeout(700)
    mpage.evaluate('window.scrollTo({top: 0, behavior: "instant"})')
    mpage.wait_for_timeout(300)
    overflow(mpage, '390px · 명함 페이지 오버플로 없음')
    mpage.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-card.png'))
    check('명함 모바일 스크린샷 저장', (DOWNLOADS / 'copybox-product-tabs-card.png').exists())
    for section in ('#quote', '#price', '#eco', '#order'):
        scroll_to(mpage, section)
        overflow(mpage, f'390px · 명함 {section} 오버플로 없음')
    scroll_to(mpage, '#quote')
    mpage.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-card-quote.png'))
    check('390px · 명함 기본 금액 15,000원', total(mpage) == 15000, f'{total(mpage)}원')
    check('390px · 하단 고정 견적 바', '명함 200매' in mpage.inner_text('body'))

    mpage.click('[data-testid=mtab-history]')
    mpage.wait_for_timeout(500)
    overflow(mpage, '390px · 내 주문 이력 오버플로 없음')
    mpage.click('[data-testid=mtab-admin]')
    mpage.wait_for_timeout(600)
    overflow(mpage, '390px · 관리자 오버플로 없음')
    mctx.close()

    # ==================================================================
    # 3) 모바일 360 — 가장 좁은 폭에서 전 구간 확인
    # ==================================================================
    sctx = browser.new_context(viewport={'width': 360, 'height': 740}, device_scale_factor=2, is_mobile=True, has_touch=True)
    spage = sctx.new_page()
    attach(spage)
    spage.goto(BASE + '#/a4', wait_until='networkidle')
    spage.wait_for_timeout(600)
    dismiss_notice(spage)
    overflow(spage, '360px · A4 첫 화면 오버플로 없음')
    for section in ('#quote', '#price', '#order'):
        scroll_to(spage, section)
        overflow(spage, f'360px · A4 {section} 오버플로 없음')
    spage.click('[data-testid=mtab-card]')
    spage.wait_for_timeout(600)
    overflow(spage, '360px · 명함 첫 화면 오버플로 없음')
    for section in ('#quote', '#price', '#order'):
        scroll_to(spage, section)
        overflow(spage, f'360px · 명함 {section} 오버플로 없음')
    scroll_to(spage, '#price')
    spage.screenshot(path=str(DOWNLOADS / 'copybox-product-tabs-360-card-price.png'))
    sctx.close()

    browser.close()

    # ==================================================================
    # 4) 콘솔·HTTP
    # ==================================================================
    real_console = [c for c in CONSOLE if 'favicon' not in c]
    check('콘솔 에러 0건', len(real_console) == 0, ' | '.join(real_console[:3]))
    real_bad = [row for row in BAD if 'favicon' not in row]
    check('실패 HTTP 응답 0건', len(real_bad) == 0, ' | '.join(real_bad[:3]))

if server is not None:
    server.shutdown()

print('\n' + '=' * 70)
print(f'통과 {len(checks) - len(failures)} / {len(checks)}')
if failures:
    print('실패 항목:')
    for item in failures:
        print(' -', item)
    sys.exit(1)
print('모든 검증 통과')
