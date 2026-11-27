"""카피박스 v4 검증 — 명함 시안 확인·수정 2회 제한·확정, 개인정보 제거, 여유특가 A4 전용,
명함 배송비 3,000원, 면·도수 옵션·지류 정식 품명, 관리자 시안 첨부·안내 문구·시안 요청서.

사용법:
    python3 verify_copybox_v4.py [BASE_URL]
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
PROOF_IMAGE = pathlib.Path('/workspace/copybox-app/scripts/test-photo.png')

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
    page.wait_for_timeout(300)


def dismiss_notice(page) -> None:
    """공지 팝업은 화면이 뜬 뒤 450ms 후에 나타나므로, 없으면 한 번 더 기다립니다."""
    if page.locator('[data-testid=notice-popup]').count() == 0:
        page.wait_for_timeout(700)
    if page.locator('[data-testid=notice-popup]').count() > 0:
        page.click('[data-testid=notice-close]')
        page.wait_for_timeout(250)


def clipboard(page) -> str:
    return page.evaluate('() => navigator.clipboard.readText()')


def place_card_order(page, name: str, phone: str, email: str, delivery: bool) -> str:
    """명함 주문을 끝까지 접수하고 접수번호를 돌려줍니다."""
    page.click('[data-testid=tab-card]')
    page.wait_for_timeout(500)
    page.evaluate("document.documentElement.style.scrollBehavior = 'auto'")
    if delivery:
        page.click('[data-testid=summary-pickup-delivery]')
    dismiss_notice(page)
    page.fill('[data-testid=order-name]', name)
    page.fill('[data-testid=order-phone]', phone)
    page.fill('[data-testid=order-email]', email)
    if delivery and page.locator('[data-testid=order-address]').count() > 0:
        page.fill('[data-testid=order-address]', '경기도 고양시 일산동구 중앙로 100, 3층')

    page.fill('[data-testid=order-notes]', '시안 먼저 보여 주세요.')
    page.click('[data-testid=order-agree]')
    page.click('[data-testid=submit-order]')
    page.wait_for_selector('[data-testid=payment-step]', timeout=8000)
    page.click('[data-testid=confirm-payment]')
    page.wait_for_selector('[data-testid=receipt]', timeout=10000)
    return page.inner_text('[data-testid=receipt-order-no]').strip()


server = None
if '127.0.0.1:4199' in BASE:
    from preview_server import serve

    server = serve()

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])

    # ==================================================================
    # 1) 데스크톱 1280 — A4는 그대로, 명함은 새 기준
    # ==================================================================
    ctx = browser.new_context(
        viewport={'width': 1280, 'height': 900},
        device_scale_factor=2,
        permissions=['clipboard-read', 'clipboard-write'],
    )
    page = ctx.new_page()
    attach(page)
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(500)
    dismiss_notice(page)

    print_body = page.inner_text('body')
    check('A4 · 여유특가 배너 유지', page.is_visible('[data-testid=eco-banner]'))
    check('A4 · 여유특가 옵션 유지', page.locator('[data-testid=speed-eco]').count() == 1)
    check('A4 · 택배+포장 5,000원 유지', '5,000원' in page.inner_text('[data-testid=shipping-table]'))
    page.click('[data-testid=binding-none]')
    check('A4 · 기본 1페이지 흑백 단면 50원', total(page) == 50, f'{total(page)}원')
    page.click('[data-testid=speed-eco]')
    check('A4 · 여유특가 인쇄비 10% 할인(45원)', total(page) == 45, f'{total(page)}원')
    page.click('[data-testid=speed-normal]')
    page.click('[data-testid=summary-pickup-delivery]')
    check('A4 · 택배+포장 5,000원 더해 5,050원', total(page) == 5050, f'{total(page)}원')
    page.click('[data-testid=summary-pickup-store]')
    overflow(page, '1280px · A4 페이지 오버플로 없음')

    # ---------------- 명함 페이지 ----------------
    page.click('[data-testid=tab-card]')
    page.wait_for_timeout(600)
    dismiss_notice(page)
    card_body = page.inner_text('body')

    check('명함 · 시안 확인 배너', page.is_visible('[data-testid=card-proof-banner]'))
    check('명함 · "시안 확정 후 영업일 2~3일 출고" 표시', '시안 확정 후 영업일 2~3일 출고' in card_body)
    check('명함 · 시안 수정 2회 제한 안내', '시안 수정은 최대 2회까지 가능합니다' in card_body)
    check('명함 · 여유특가 배너 제거', page.locator('[data-testid=eco-banner]').count() == 0)
    check('명함 · 여유특가 옵션 제거', page.locator('[data-testid=speed-eco]').count() == 0)
    check('명함 · 여유특가 단가 카드 제거', page.locator('[data-testid=eco-price-table]').count() == 0)
    check('명함 · 본문에 여유특가 선택지 없음', '여유 제작 특가 (영업일' not in card_body)

    # 개인정보 미노출 (본문 + 입력 예시)
    placeholders = page.evaluate(
        "() => Array.from(document.querySelectorAll('input,textarea')).map((el) => el.placeholder || '').join(' | ')"
    )
    inputs = page.evaluate("() => Array.from(document.querySelectorAll('input,textarea')).map((el) => el.value || '').join(' | ')")
    for label, haystack in (('본문', card_body), ('입력 예시', placeholders), ('입력값', inputs)):
        leaked = [needle for needle in ('김영민', '010-8651', '8651-3966', 'youngma2@naver.com') if needle in haystack]
        check(f'명함 · 개인정보 미노출 ({label})', not leaked, str(leaked))
    check('명함 · 예시 이름 홍길동', page.get_attribute('[data-testid=card-info-name]', 'placeholder') == '홍길동')
    check('명함 · 예시 이메일 hong@example.com', page.get_attribute('[data-testid=card-info-email]', 'placeholder') == 'hong@example.com')

    # 지류 5종 · 면·도수 4종
    papers = ('snow250', 'snow300', 'banu250', 'arte310', 'randevu240')
    check('명함 · 지류 5종 정식 품명', all(page.locator(f'[data-testid=card-paper-{k}]').count() == 1 for k in papers))
    check('명함 · 지류 품명 표기', '스노우지 250g' in card_body and '아르떼 울트라화이트 310g' in card_body)
    check('명함 · 지류 샘플 사진 슬롯 분리', page.locator('[data-testid=paper-sample-snow250]').count() == 1)
    prints = ('single1', 'single4', 'double1', 'double4')
    check('명함 · 면·도수 4종', all(page.locator(f'[data-testid=card-print-{k}]').count() == 1 for k in prints))

    # 금액: 지류 기준가 + 면·도수 차액
    default_total = total(page)
    check('명함 · 기본(스노우지 250g·단면 컬러) 200매 15,000원', default_total == 15000, f'{default_total}원')
    page.click('[data-testid=card-print-single1]')
    check('명함 · 단면 흑백 11,000원', total(page) == 11000, f'{total(page)}원')
    page.click('[data-testid=card-print-double4]')
    check('명함 · 양면 컬러 21,000원', total(page) == 21000, f'{total(page)}원')
    page.click('[data-testid=card-print-single4]')
    page.click('[data-testid=card-paper-arte310]')
    check('명함 · 아르떼 310g 단면 컬러 24,000원', total(page) == 24000, f'{total(page)}원')
    page.click('[data-testid=card-paper-snow250]')
    set_number(page, 'card-units-input', '2')
    check('명함 · 2묶음(400매) 30,000원', total(page) == 30000, f'{total(page)}원')

    # 배송비 3,000원 (포장재비 없음)
    page.click('[data-testid=summary-pickup-delivery]')
    check('명함 · 택배 선택 시 배송비 3,000원만 추가', total(page) == 33000, f'{total(page)}원')
    summary = page.inner_text("aside[aria-label='예상 견적 요약']")
    check('명함 · 요약에 배송비 3,000원 표시', '배송비 (인쇄소 직배송)' in summary and '3,000원' in summary)
    check('명함 · 요약에 포장재비 항목 없음', '박스 · 포장재비' not in summary)
    check('명함 · 단가표 배송비 3,000원', '3,000원' in page.inner_text('[data-testid=shipping-table]'))
    check('명함 · 출고 안내 = 시안 확정 후', '시안 확인 필수' in summary)
    overflow(page, '1280px · 명함 페이지 오버플로 없음')
    scroll_to(page, '#quote')
    page.screenshot(path=str(DOWNLOADS / 'copybox-v4-card-desktop.png'))

    # ---------------- ① 주문 → 접수증 ----------------
    order_no = place_card_order(page, '박명함', '01088887777', 'order@example.com', True)
    check('명함 · 접수번호 형식', bool(re.fullmatch(r'CB-\d{6}-\d{6}', order_no)), order_no)
    check('명함 · 접수증 총액 33,000원', page.inner_text('[data-testid=receipt-total]').strip() == '33,000원')
    check('명함 · 접수증 시안 상태 = 시안 준비 중', '시안 준비 중' in page.inner_text('[data-testid=receipt-proof-status]'))
    check('명함 · 접수증에 확정 후 환불 불가 안내', '환불이 불가' in page.inner_text('[data-testid=receipt]'))
    page.screenshot(path=str(DOWNLOADS / 'copybox-v4-card-receipt.png'))

    # ---------------- ⑦ 고객 이력 · 시안 패널 ----------------
    page.click('[data-testid=tab-history]')
    page.wait_for_selector(f'[data-testid=card-proof-{order_no}]', timeout=8000)
    page.wait_for_timeout(300)
    check('이력 · 시안 확인 패널', page.locator(f'[data-testid=card-proof-{order_no}]').count() == 1)
    check('이력 · 수정 횟수 0/2회', '수정 0/2회' in page.inner_text(f'[data-testid=card-proof-revision-count-{order_no}]'))
    check('이력 · 시안 없을 때 확정 버튼 비활성', page.get_attribute(f'[data-testid=card-proof-confirm-{order_no}]', 'disabled') is not None)
    check('이력 · 시안 준비 중 안내', '시안을 만드는 중' in page.inner_text(f'[data-testid=card-proof-{order_no}]'))
    check('이력 · 진행 단계에 시안 확정 포함', '시안 확인 요청 → 시안 확정' in page.inner_text(f'[data-order-number="{order_no}"]'))

    # ---------------- ⑥⑧ 관리자 시안 첨부 · 복사 · 메일 ----------------
    page.click('[data-testid=tab-admin]')
    page.wait_for_selector(f'[data-testid=admin-card-proof-{order_no}]', timeout=8000)
    page.wait_for_timeout(300)
    check('관리자 · 명함 시안 관리 영역', page.locator(f'[data-testid=admin-card-proof-{order_no}]').count() == 1)
    check('관리자 · 확정 전 인쇄 잠금 안내', '인쇄를 시작할 수 있습니다' in page.inner_text(f'[data-testid=admin-card-proof-{order_no}]'))
    check(
        '관리자 · 확정 전 인쇄중 버튼 비활성',
        page.get_attribute(f'[data-testid="admin-status-{order_no}-printing"]', 'disabled') is not None,
    )

    page.set_input_files(f'[data-testid=admin-proof-upload-{order_no}]', str(PROOF_IMAGE))
    page.wait_for_selector(f'[data-testid=admin-card-proof-{order_no}] img', timeout=15000)
    page.wait_for_timeout(600)
    admin_panel = page.inner_text(f'[data-testid=admin-card-proof-{order_no}]')
    check('관리자 · 시안 파일 첨부 후 v1 표시', 'v1' in admin_panel)
    check('관리자 · 시안 미리보기 이미지', page.locator(f'[data-testid=admin-card-proof-{order_no}] img').count() >= 1)
    check('관리자 · 시안 확인 요청 상태', '시안 확인 요청' in admin_panel)
    check('관리자 · 확정 전 인쇄중 여전히 잠금', page.get_attribute(f'[data-testid="admin-status-{order_no}-printing"]', 'disabled') is not None)

    page.click(f'[data-testid=admin-proof-guide-copy-{order_no}]')
    page.wait_for_timeout(400)
    guide = clipboard(page)
    check('관리자 · 안내 문구 복사(주문코드)', order_no in guide, guide[:60].replace('\n', ' '))
    check('관리자 · 안내 문구에 확인 링크', '#/history' in guide)
    check('관리자 · 안내 문구에 2회 제한·환불 불가', '최대 2회' in guide and '환불이 불가' in guide)

    page.click(f'[data-testid=admin-request-spec-{order_no}]')
    page.wait_for_timeout(400)
    spec = clipboard(page)
    for needle in ('쪼꼬 시안 요청서', '92×52mm', '90×50mm', 'CMYK', '수정 요청 원문', '박명함', 'order@example.com'):
        check(f'관리자 · 시안 요청서에 {needle}', needle in spec)

    mailto = page.get_attribute(f'[data-testid=admin-proof-mail-{order_no}]', 'data-mailto') or ''
    check('관리자 · 고객 메일 쓰기 = mailto 링크', mailto.startswith('mailto:'), mailto[:80])
    check('관리자 · 메일 제목에 주문번호', order_no in mailto)
    check('관리자 · 메일 본문에 시안 확인 링크', '%23%2Fhistory' in mailto or '#/history' in mailto)
    check('관리자 · 메일 수신자 = 고객 이메일', 'order@example.com' in mailto or 'order%40example.com' in mailto)
    scroll_to(page, f'[data-testid=admin-card-proof-{order_no}]')
    page.screenshot(path=str(DOWNLOADS / 'copybox-v4-admin-proof.png'))

    # ---------------- ②③④ 고객 수정 요청 → 확정 ----------------
    page.click('[data-testid=tab-history]')
    page.wait_for_selector(f'[data-testid=card-proof-preview-{order_no}]', timeout=8000)
    page.fill(f'[data-testid=card-proof-revision-input-{order_no}]', '연락처를 010-1234-5678로 바꿔 주세요.')
    page.click(f'[data-testid=card-proof-revision-send-{order_no}]')
    page.wait_for_timeout(900)
    panel = page.inner_text(f'[data-testid=card-proof-{order_no}]')
    check('고객 · 수정 요청 1회 반영(1/2회)', '수정 1/2회' in panel or '1/2회' in page.inner_text(f'[data-testid=card-proof-revision-count-{order_no}]'))
    check('고객 · 수정 요청 원문 보관', '010-1234-5678' in panel)

    # 시안 확정 — 버튼 위 경고 문구 확인
    check('고객 · 확정 전 경고 문구', '시안 확정 후에는 즉시 인쇄가 진행되어' in panel)
    page.click(f'[data-testid=card-proof-confirm-{order_no}]')
    page.wait_for_selector('[data-testid=card-proof-confirm-panel]', timeout=5000)
    check('고객 · 확정 확인 단계', '시안을 확정할까요?' in page.inner_text('[data-testid=card-proof-confirm-panel]'))
    page.click(f'[data-testid=card-proof-confirm-yes-{order_no}]')
    page.wait_for_selector('[data-testid=card-proof-confirmed]', timeout=8000)
    page.wait_for_timeout(500)
    confirmed_text = page.inner_text('[data-testid=card-proof-confirmed]')
    check('고객 · 시안 확정 완료 표시', '시안 확정 완료' in confirmed_text)
    check('고객 · 확정 시각 기록', re.search(r'202\d', confirmed_text) is not None, confirmed_text[:60].replace('\n', ' '))
    check('고객 · 확정 후 확정 버튼 사라짐', page.locator(f'[data-testid=card-proof-confirm-{order_no}]').count() == 0)

    # 새로고침 후에도 확정·타임라인 유지
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(800)
    dismiss_notice(page)
    check('이력 · 새로고침 후 시안 확정 유지', page.locator(f'[data-testid=card-proof-confirmed]').count() == 1)
    timeline = page.locator('[data-testid=card-proof-timeline]').first.text_content() or ''
    check('이력 · 타임라인 누적(주문 메모·시안·수정·확정)', all(k in timeline for k in ('주문 메모', '시안 v1 업로드', '수정 요청', '시안 확정')), timeline[:120].replace('\n', ' '))

    # 확정 후 관리자 인쇄 시작 가능
    page.click('[data-testid=tab-admin]')
    page.wait_for_selector(f'[data-testid=admin-card-proof-{order_no}]', timeout=8000)
    page.wait_for_timeout(400)
    check('관리자 · 확정 후 인쇄 가능', page.get_attribute(f'[data-testid="admin-status-{order_no}-printing"]', 'disabled') is None)
    page.click(f'[data-testid="admin-status-{order_no}-printing"]')
    page.wait_for_timeout(700)
    check('관리자 · 인쇄중 전환', '인쇄중' in page.locator(f'[data-order-number="{order_no}"]').inner_text())

    # ---------------- ③ 수정 2회 제한 ----------------
    page.click('[data-testid=tab-card]')
    page.wait_for_timeout(500)
    order2 = place_card_order(page, '이한도', '01077776666', 'han@example.com', False)
    page.click('[data-testid=tab-admin]')
    page.wait_for_selector(f'[data-testid=admin-card-proof-{order2}]', timeout=8000)
    page.set_input_files(f'[data-testid=admin-proof-upload-{order2}]', str(PROOF_IMAGE))
    page.wait_for_selector(f'[data-testid=admin-card-proof-{order2}] img', timeout=15000)
    page.wait_for_timeout(500)

    page.click('[data-testid=tab-history]')
    page.wait_for_selector(f'[data-testid=card-proof-preview-{order2}]', timeout=8000)
    for round_no in (1, 2):
        page.fill(f'[data-testid=card-proof-revision-input-{order2}]', f'{round_no}차 수정 요청입니다.')
        page.click(f'[data-testid=card-proof-revision-send-{order2}]')
        page.wait_for_timeout(800)
        if round_no == 1:
            page.click('[data-testid=tab-admin]')
            page.wait_for_selector(f'[data-testid=admin-card-proof-{order2}]', timeout=8000)
            page.set_input_files(f'[data-testid=admin-proof-upload-{order2}]', str(PROOF_IMAGE))
            page.wait_for_timeout(900)
            page.click('[data-testid=tab-history]')
            page.wait_for_selector(f'[data-testid=card-proof-preview-{order2}]', timeout=8000)
    page.wait_for_timeout(400)
    check('수정 2회 사용 표시', '2/2회' in page.inner_text(f'[data-testid=card-proof-revision-count-{order2}]'))
    check(
        '수정 2회 후 요청 버튼 비활성',
        page.get_attribute(f'[data-testid=card-proof-revision-send-{order2}]', 'disabled') is not None,
    )
    check(
        '수정 2회 초과 차단 안내',
        '2회 초과 수정은 불가합니다' in page.inner_text(f'[data-testid=card-proof-{order2}]'),
    )
    admin_revisions = page.inner_text(f'[data-testid=card-proof-revisions-{order2}]')
    check('수정 요청 원문 2건 보관', '1차 수정 요청입니다.' in admin_revisions and '2차 수정 요청입니다.' in admin_revisions)

    ctx.close()

    # ==================================================================
    # 1-2) 시안 예시 주문 — 명함 시안 v1이 올라온 상태로 시작
    # ==================================================================
    sctx = browser.new_context(viewport={'width': 1280, 'height': 900}, permissions=['clipboard-read', 'clipboard-write'])
    spage = sctx.new_page()
    attach(spage)
    spage.goto(BASE + '#/admin', wait_until='networkidle')
    spage.wait_for_timeout(700)
    dismiss_notice(spage)
    spage.click('[data-testid=admin-seed]')
    spage.wait_for_timeout(1500)
    seeded = spage.locator('[data-testid^="admin-card-proof-"]').first
    check('시안 예시 · 명함 주문에 시안 관리 영역', seeded.count() == 1)
    seeded_text = seeded.inner_text()
    check('시안 예시 · 시안 확인 요청 상태', '시안 확인 요청' in seeded_text)
    check('시안 예시 · 시안 미리보기 표시', seeded.locator('img').count() >= 1)
    check('시안 예시 · 지류 정식 품명으로 표시', '스노우지' in spage.inner_text('body') or '반누보' in spage.inner_text('body'))
    sctx.close()

    # ==================================================================
    # 2) 모바일 390 / 360
    # ==================================================================
    for width in (390, 360):
        mctx = browser.new_context(
            viewport={'width': width, 'height': 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        mpage = mctx.new_page()
        attach(mpage)
        mpage.goto(BASE + '#/card', wait_until='networkidle')
        mpage.wait_for_timeout(800)
        dismiss_notice(mpage)
        overflow(mpage, f'{width}px · 명함 페이지 오버플로 없음')
        check(f'{width}px · 지류 단가표', mpage.is_visible('[data-testid=card-paper-price-list]'))
        check(f'{width}px · 시안 확인 배너', mpage.is_visible('[data-testid=card-proof-banner]'))
        body = mpage.inner_text('body')
        check(f'{width}px · 확정 후 출고 안내', '시안 확정 후 영업일 2~3일 출고' in body)
        scroll_to(mpage, '#quote')
        mpage.screenshot(path=str(DOWNLOADS / f'copybox-v4-card-{width}.png'))
        mctx.close()

    browser.close()

# ======================================================================
# 3) 빌드 산출물에 개인정보 문자열이 남아 있지 않은지
# ======================================================================
dist = pathlib.Path('/workspace/copybox-app/dist')
blob = '\n'.join(path.read_text(errors='ignore') for path in dist.rglob('*') if path.is_file())
for needle in ('김영민', '8651-3966', 'youngma2@naver.com', '010-8651'):
    check(f'빌드 산출물에 "{needle}" 없음', needle not in blob)

print()
print(f'총 {len(checks)}개 · 실패 {len(failures)}개')
if CONSOLE:
    print('콘솔 에러:', CONSOLE[:5])
if BAD:
    print('HTTP 실패:', BAD[:5])
check('콘솔 에러 0', not CONSOLE, str(CONSOLE[:3]))
check('HTTP 4xx·5xx 0', not BAD, str(BAD[:3]))

sys.exit(1 if failures else 0)
