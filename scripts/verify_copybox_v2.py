"""카피박스 v2 검증 — A4 단가 개편 · 제본 3종 · 손님 이력 · 관리자 · 모바일 오버플로 · 배포.

사용법:
    python3 verify_copybox_v2.py [BASE_URL]
"""

from __future__ import annotations

import base64
import pathlib
import re
import sys

from playwright.sync_api import sync_playwright

CHROME = '/workspace/.tools/chrome/chrome-headless-shell-linux64/chrome-headless-shell'
DOWNLOADS = pathlib.Path('/workspace/downloads')
SAMPLE = pathlib.Path('/workspace/copybox-app/scripts/sample-6p.pdf')
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4175/copybox-app/').rstrip('/') + '/'

checks: list[str] = []
failures: list[str] = []


def check(label: str, ok: bool, detail: str = '') -> None:
    checks.append(f"{'PASS' if ok else 'FAIL'} · {label}{(' · ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)
    print(checks[-1])


CONSOLE: list[str] = []
BAD: list[str] = []


def attach(page) -> None:
    page.on('console', lambda m: CONSOLE.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: CONSOLE.append(f'pageerror: {e}'))
    page.on('response', lambda r: BAD.append(f'{r.status} {r.url}') if r.status >= 400 else None)


DROP_JS = """async (b64) => {
  const res = await fetch('data:application/pdf;base64,' + b64);
  const blob = await res.blob();
  const file = new File([blob], '수학-중간고사-기출.pdf', {type: 'application/pdf'});
  const dt = new DataTransfer();
  dt.items.add(file);
  const dz = document.querySelector('[data-testid=dropzone]');
  dz.dispatchEvent(new DragEvent('dragenter', {bubbles: true, dataTransfer: dt}));
  dz.dispatchEvent(new DragEvent('dragover', {bubbles: true, dataTransfer: dt, cancelable: true}));
  dz.dispatchEvent(new DragEvent('drop', {bubbles: true, dataTransfer: dt, cancelable: true}));
  return file.name;
}"""

b64_pdf = base64.b64encode(SAMPLE.read_bytes()).decode()

OVERFLOW_JS = """() => ({
  doc: document.documentElement.scrollWidth,
  body: document.body.scrollWidth,
  win: window.innerWidth,
  offenders: Array.from(document.querySelectorAll('*'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
    })
    .slice(0, 6)
    .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 40)}`)
})"""


def overflow(page, label: str) -> None:
    data = page.evaluate(OVERFLOW_JS)
    ok = data['doc'] <= data['win'] and data['body'] <= data['win']
    check(label, ok, f"doc={data['doc']} body={data['body']} win={data['win']} {data['offenders']}")


def total(page) -> int:
    page.wait_for_timeout(120)
    return int(page.get_attribute('[data-testid=total-amount]', 'data-total') or -1)


def set_number(page, testid: str, value: str) -> None:
    page.fill(f'[data-testid={testid}]', value)
    page.press(f'[data-testid={testid}]', 'Tab')
    page.wait_for_timeout(150)


def scroll_to(page, selector: str) -> None:
    page.evaluate(
        """(sel) => {
            document.documentElement.style.scrollBehavior = 'auto';
            const el = document.querySelector(sel);
            window.scrollTo({top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant'});
        }""",
        selector,
    )
    page.wait_for_timeout(350)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])

    # =====================================================================
    # 1) 데스크톱 — 단가·제본·PDF·주문·이력·관리자
    # =====================================================================
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, device_scale_factor=2)
    page = ctx.new_page()
    attach(page)
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_timeout(500)

    check('페이지 타이틀', '카피박스' in page.title(), page.title())
    check('데스크톱 가로 오버플로 없음', page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    body = page.inner_text('body')
    check('A4 단가표 · 흑백 단면 50원', '50원' in body)
    check('A4 단가표 · 흑백 양면 40원', '40원' in body)
    check('A3 판형 제거', not re.search(r'\bA3\b', body))
    check('B4 판형 제거', not re.search(r'\bB4\b', body))
    check('무선 제본 제거', '무선' not in body)
    check('중철 제본 제거', '중철' not in body)
    check('코팅 옵션 제거', '코팅' not in body)
    for label in ('제본 없음', '스프링', '와이어'):
        check(f'제본 3종 · {label}', label in body)
    check('제본 최소가 표기(1,500원~)', '1,500원~' in body or '1,500원부터' in body)

    check('단가표 A4 흑백 단면 50원', page.inner_text('[data-testid=price-mono-single]').strip() == '50원')
    check('단가표 A4 흑백 양면 40원', page.inner_text('[data-testid=price-mono-double]').strip() == '40원')
    check('단가표 A4 컬러 단면 300원', page.inner_text('[data-testid=price-color-single]').strip() == '300원')
    check('단가표 A4 컬러 양면 250원', page.inner_text('[data-testid=price-color-double]').strip() == '250원')
    check('A4 단일 규격 타일', page.is_visible('[data-testid=size-a4]'))
    check('기본 색상 흑백 선택', page.get_attribute('[data-testid=color-mono]', 'aria-pressed') == 'true')

    check('기본 견적 1페이지 50원', total(page) == 50, f'{total(page)}원')
    set_number(page, 'pages-input', '3')
    check('3페이지 단면 흑백 = 150원', total(page) == 150, f'{total(page)}원')
    page.click('[data-testid=sides-double]')
    check('양면 40원/페이지 · 3페이지 = 120원', total(page) == 120, f'{total(page)}원')
    page.click('[data-testid=binding-coil]')
    check('스프링 1,500원 더해 1,620원', total(page) == 1620, f'{total(page)}원')
    set_number(page, 'copies-input', '2')
    check('2부 · 인쇄 240 + 스프링 3,000 = 3,240원', total(page) == 3240, f'{total(page)}원')
    page.click('[data-testid=binding-wire]')
    check('와이어도 1,500원~ 적용(3,240원)', total(page) == 3240, f'{total(page)}원')
    page.click('[data-testid=binding-none]')
    check('제본 없음 0원 → 240원', total(page) == 240, f'{total(page)}원')

    # PDF 6페이지 드래그&드롭
    set_number(page, 'copies-input', '1')
    page.click('[data-testid=sides-single]')
    page.evaluate(DROP_JS, b64_pdf)
    page.wait_for_selector('[data-testid=pagecount-badge]', timeout=15000)
    page.wait_for_function("document.querySelector('[data-testid=pages-input]').value === '6'")
    check('PDF 6페이지 자동 인식', '6페이지 자동 인식' in page.inner_text('[data-testid=pagecount-badge]'))
    check('6페이지 흑백 단면 = 300원', total(page) == 300, f'{total(page)}원')
    page.click('[data-testid=sides-double]')
    check('6페이지 흑백 양면 = 240원', total(page) == 240, f'{total(page)}원')
    page.click('[data-testid=color-color]')
    check('6페이지 컬러 양면 = 1,500원', total(page) == 1500, f'{total(page)}원')
    page.click('[data-testid=color-mono]')
    check('흑백으로 되돌림 = 240원', total(page) == 240, f'{total(page)}원')

    settle = page.inner_text('aside[aria-label="예상 견적 요약"]')
    check('견적 요약 · 40원/페이지 × 6페이지', '40원/페이지 × 6페이지 × 1부' in settle)
    check('견적 요약 · 제본 0원', '0원' in settle)
    check('견적 요약 · 총액 240원', '240원' in settle)

    scroll_to(page, '#quote')
    page.screenshot(path=str(DOWNLOADS / 'copybox_v2_desktop.png'))
    page.locator('#quote').screenshot(path=str(DOWNLOADS / 'copybox_v2_desktop_quote.png'))
    check('데스크톱 스크린샷 저장', (DOWNLOADS / 'copybox_v2_desktop.png').exists())

    # 로그인 모달
    page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    page.wait_for_timeout(200)
    page.click('[data-testid=login-open]')
    page.wait_for_selector('[data-testid=login-modal]')
    modal = page.inner_text('[data-testid=login-modal]')
    for label in ('카카오로 시작하기', '네이버로 시작하기', 'Google로 계속하기'):
        check(f'로그인 모달 · {label}', label in modal)
    check('로그인 모달 · 연락처 이력 찾기', '성함 · 연락처로 이력 찾기' in modal)
    page.screenshot(path=str(DOWNLOADS / 'copybox_v2_login.png'))
    page.click('[data-testid=login-kakao]')
    page.wait_for_selector('[data-testid=user-chip]')
    check('카카오 데모 로그인', '홍길동' in page.inner_text('[data-testid=user-chip]'))

    # 주문 접수 (세션 로그인 상태)
    scroll_to(page, '#order')
    check('주문자 이름 자동 입력', page.input_value('[data-testid=order-name]') == '홍길동')
    check('연락처 자동 입력', page.input_value('[data-testid=order-phone]') == '010-0000-0000')
    long_note = ('표지는 컬러로, 나머지는 흑백으로 부탁드립니다. 오늘 5시까지 찾으러 갈게요. '
                 '요청사항이 아주 길게 들어가도 카드가 화면 밖으로 넘치지 않아야 합니다.')
    page.fill('[data-testid=order-notes]', long_note)
    page.click('[data-testid=submit-order]')
    page.wait_for_selector('[data-testid=receipt]', timeout=10000)
    receipt = page.inner_text('[data-testid=receipt]')
    order_no = page.inner_text('[data-testid=receipt-order-no]').strip()
    check('접수증 표시', '주문 접수가 완료됐어요' in receipt)
    check('접수번호 형식 CB-YYMMDD-XXXXXX', bool(re.fullmatch(r'CB-\d{6}-\d{6}', order_no)), order_no)
    check('접수증 A4·흑백·양면', 'A4 흑백 양면' in receipt)
    check('접수증 총액 240원', page.inner_text('[data-testid=receipt-total]').strip() == '240원')
    check('접수증 요청사항', '표지는 컬러로' in receipt)
    check('접수증 첨부파일', '수학-중간고사-기출.pdf' in receipt)
    check('접수증 고객 ID 표시', '고객 ID:' in receipt)
    check('접수증 localStorage 저장 안내', 'localStorage' in receipt)
    scroll_to(page, '#order')
    page.screenshot(path=str(DOWNLOADS / 'copybox_v2_receipt.png'))

    # 내 주문 이력
    page.click('[data-testid=receipt-history-link]')
    page.wait_for_selector('[data-testid=history-order]')
    page.wait_for_timeout(400)
    hist = page.inner_text('body')
    check('이력 · 주문 1건', page.inner_text('[data-testid=history-count]').strip() == '1건')
    check('이력 · 접수번호', order_no in hist)
    check('이력 · 옵션 표시', 'A4 · 흑백 · 양면 · 6페이지 × 1부 · 제본 없음' in hist)
    check('이력 · 요청사항', '표지는 컬러로' in hist)
    check('이력 · 첨부파일명', '수학-중간고사-기출.pdf' in hist)
    check('이력 · 금액', page.inner_text('[data-testid=history-order-total]').strip() == '240원')
    check('이력 · 손님 ID 표시', bool(re.fullmatch(r'[0-9a-f-]{36}', page.inner_text('[data-testid=history-customer-id]').strip())))
    check('이력 · 최신순 1건', page.locator('[data-testid=history-order]').count() == 1)
    page.screenshot(path=str(DOWNLOADS / 'copybox_v2_history.png'))

    stored = page.evaluate("localStorage.getItem('copybox.v2.db')")
    check('localStorage · customer_id 로 저장', bool(stored) and '"customerId"' in stored and order_no in stored)
    check('localStorage 키 분리(공부 앱과 다름)', page.evaluate("localStorage.getItem('copybox.v2.db') !== null"))

    # 새로고침 후에도 세션·이력 유지
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(600)
    check('새로고침 후 로그인 유지', page.is_visible('[data-testid=user-chip]'))
    page.click('[data-testid=tab-history]')
    page.wait_for_selector('[data-testid=history-order]')
    check('새로고침 후 이력 유지', order_no in page.inner_text('body'))

    # 이 옵션으로 다시 주문
    page.click(f'[data-testid="reorder-{order_no}"]')
    page.wait_for_timeout(700)
    check('다시 주문 · 견적 화면 이동', page.is_visible('#quote'))
    check('다시 주문 · 안내 문구', page.is_visible('[data-testid=reorder-hint]'))
    check('다시 주문 · 옵션 복원(6페이지)', page.input_value('[data-testid=pages-input]') == '6')
    check('다시 주문 · 양면 유지', page.get_attribute('[data-testid=sides-double]', 'aria-pressed') == 'true')
    check('다시 주문 · 금액 240원', total(page) == 240, f'{total(page)}원')

    # 관리자
    page.click('[data-testid=tab-admin]')
    page.wait_for_selector('[data-testid=admin-order]')
    page.wait_for_timeout(400)
    check('관리자 · 전체 주문 1건', '1건' in page.inner_text('[data-testid=admin-stat-total]'))
    check('관리자 · 접수됨 1건', '1건' in page.inner_text('[data-testid=admin-stat-received]'))
    check('관리자 · 손님 이름', '홍길동' in page.inner_text('[data-testid=admin-order]'))
    check('관리자 · 손님 ID 표시', '고객 ID' in page.inner_text('[data-testid=admin-order]'))
    page.click(f'[data-testid="admin-status-{order_no}-printing"]')
    page.wait_for_timeout(700)
    card = page.locator(f'[data-order-number="{order_no}"]').inner_text()
    check('관리자 · 인쇄중 변경', '인쇄중' in card)
    page.click(f'[data-testid="admin-status-{order_no}-done"]')
    page.wait_for_timeout(700)
    card = page.locator(f'[data-order-number="{order_no}"]').inner_text()
    check('관리자 · 완료 변경', '완료' in card)
    check('관리자 · 상태 이력 3건', '상태 변경 이력 3건' in card)
    check('관리자 · 손님 필터', page.locator('[data-testid=admin-customer-all]').is_visible())
    page.screenshot(path=str(DOWNLOADS / 'copybox_v2_admin.png'))

    # 관리자 상태가 손님 이력에도 반영
    page.click('[data-testid=tab-history]')
    page.wait_for_timeout(500)
    check('이력에 완료 상태 반영', '완료' in page.inner_text('[data-testid=history-order]'))

    # 연락처로 이력 찾기 (로그아웃 후)
    page.click('[data-testid=history-logout]')
    page.wait_for_timeout(500)
    check('로그아웃 후 로그인 버튼', page.is_visible('[data-testid=login-open]'))
    page.click('[data-testid=login-open]')
    page.wait_for_selector('[data-testid=login-modal]')
    page.fill('[data-testid=lookup-name]', '홍길동')
    page.fill('[data-testid=lookup-phone]', '01099998888')
    page.click('[data-testid=lookup-submit]')
    page.wait_for_timeout(500)
    check('연락처 불일치 시 조회 거부', '없어요' in page.inner_text('[data-testid=login-modal]'))
    page.fill('[data-testid=lookup-phone]', '01000000000')
    page.click('[data-testid=lookup-submit]')
    page.wait_for_timeout(800)
    check('성함·연락처 일치 시 이력 조회', order_no in page.inner_text('body'))
    check('로그인 없이 비회원 이력 조회', page.is_hidden('[data-testid=login-modal]'))

    ctx.close()

    # =====================================================================
    # 2) 모바일 390×844 — 비회원 주문 · 오버플로 · 이력 · 관리자
    # =====================================================================
    mctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    mpage = mctx.new_page()
    attach(mpage)
    mpage.goto(BASE, wait_until='networkidle')
    mpage.wait_for_timeout(600)
    overflow(mpage, '390px · 첫 화면 오버플로 없음')
    check('390px · 모바일 탭 노출', mpage.is_visible('[data-testid=mtab-shop]') and mpage.is_visible('[data-testid=mtab-history]'))

    mpage.click('[data-testid=mtab-history]')
    mpage.wait_for_timeout(300)
    overflow(mpage, '390px · 내 주문 이력(비로그인) 오버플로 없음')
    check('비로그인 이력 안내', '로그인하면 지난 주문' in mpage.inner_text('body'))
    mpage.click('[data-testid=mtab-shop]')
    mpage.wait_for_timeout(300)
    scroll_to(mpage, '#quote')
    overflow(mpage, '390px · 견적 화면 오버플로 없음')
    mpage.screenshot(path=str(DOWNLOADS / 'copybox_v2_mobile.png'))

    set_number(mpage, 'pages-input', '2')
    mpage.click('[data-testid=binding-wire]')
    check('모바일 · 2페이지 + 와이어 1,500원 = 1,600원', total(mpage) == 1600, f'{total(mpage)}원')

    scroll_to(mpage, '#order')
    mpage.fill('[data-testid=order-name]', '김모바일')
    mpage.fill('[data-testid=order-phone]', '01077776666')
    mpage.fill('[data-testid=order-notes]', '모바일에서 접수한 비회원 주문입니다. 요청사항이 길어도 화면이 넘치지 않아야 합니다.')
    mpage.click('[data-testid=submit-order]')
    mpage.wait_for_selector('[data-testid=receipt]', timeout=10000)
    morder_no = mpage.inner_text('[data-testid=receipt-order-no]').strip()
    check('모바일 비회원 주문 접수', bool(re.fullmatch(r'CB-\d{6}-\d{6}', morder_no)), morder_no)
    check('모바일 접수증 총액 1,600원', mpage.inner_text('[data-testid=receipt-total]').strip() == '1,600원')
    overflow(mpage, '390px · 접수증 오버플로 없음')
    mpage.screenshot(path=str(DOWNLOADS / 'copybox_v2_mobile_receipt.png'))

    mpage.click('[data-testid=receipt-history-link]')
    mpage.wait_for_selector('[data-testid=history-order]')
    mpage.wait_for_timeout(400)
    overflow(mpage, '390px · 내 주문 이력 오버플로 없음')
    check('모바일 이력 · 비회원 이름', '김모바일' in mpage.inner_text('body'))
    check('모바일 이력 · 첨부 없음', '첨부 없음' in mpage.inner_text('[data-testid=history-order]'))
    check('모바일 이력 · 요청사항', '모바일에서 접수한 비회원 주문' in mpage.inner_text('[data-testid=history-order]'))
    mpage.screenshot(path=str(DOWNLOADS / 'copybox_v2_mobile_history.png'))

    mpage.reload(wait_until='networkidle')
    mpage.wait_for_timeout(500)
    mpage.click('[data-testid=mtab-history]')
    mpage.wait_for_selector('[data-testid=history-order]')
    check('모바일 새로고침 후 이력 유지', morder_no in mpage.inner_text('body'))

    mpage.click('[data-testid=mtab-admin]')
    mpage.wait_for_selector('[data-testid=admin-order]')
    mpage.wait_for_timeout(400)
    overflow(mpage, '390px · 관리자 화면 오버플로 없음')
    check('모바일 관리자 · 접수 주문', morder_no in mpage.inner_text('body'))
    mpage.click(f'[data-testid="admin-status-{morder_no}-printing"]')
    mpage.wait_for_timeout(700)
    check('모바일 관리자 · 상태 변경', '인쇄중' in mpage.locator(f'[data-order-number="{morder_no}"]').inner_text())
    mpage.screenshot(path=str(DOWNLOADS / 'copybox_v2_mobile_admin.png'))

    mctx.close()

    # =====================================================================
    # 3) 360×740 — 오버플로 전 구간 + 예시 데이터
    # =====================================================================
    sctx = browser.new_context(viewport={'width': 360, 'height': 740}, device_scale_factor=2, is_mobile=True, has_touch=True)
    spage = sctx.new_page()
    attach(spage)
    spage.goto(BASE, wait_until='networkidle')
    spage.wait_for_timeout(500)
    overflow(spage, '360px · 첫 화면 오버플로 없음')
    for section in ('#quote', '#price', '#store', '#order'):
        scroll_to(spage, section)
        overflow(spage, f'360px · {section} 오버플로 없음')
    spage.screenshot(path=str(DOWNLOADS / 'copybox_v2_360.png'))

    spage.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    spage.wait_for_timeout(200)
    spage.click('[data-testid=login-open]')
    spage.wait_for_selector('[data-testid=login-modal]')
    spage.wait_for_timeout(300)
    overflow(spage, '360px · 로그인 모달 오버플로 없음')
    spage.screenshot(path=str(DOWNLOADS / 'copybox_v2_mobile_login.png'))
    spage.keyboard.press('Escape')
    spage.wait_for_timeout(300)
    check('로그인 모달 닫힘', spage.is_hidden('[data-testid=login-modal]'))

    spage.click('[data-testid=mtab-admin]')
    spage.wait_for_timeout(400)
    overflow(spage, '360px · 관리자(빈 상태) 오버플로 없음')
    check('관리자 빈 상태 안내', '아직 접수된 주문이 없어요' in spage.inner_text('body'))
    spage.click('[data-testid=admin-seed]')
    spage.wait_for_selector('[data-testid=admin-order]')
    spage.wait_for_timeout(500)
    check('시안 예시 주문 3건', spage.locator('[data-testid=admin-order]').count() == 3)
    check('예시 데이터 · 손님 3명', '홍길동' in spage.inner_text('body') and '김민수' in spage.inner_text('body'))
    overflow(spage, '360px · 관리자(주문 3건) 오버플로 없음')
    check('예시 주문 · 고객 ID 표시', spage.inner_text('body').count('고객 ID') >= 3)
    spage.screenshot(path=str(DOWNLOADS / 'copybox_v2_360_admin.png'))
    sctx.close()

    browser.close()

    # =====================================================================
    # 4) 콘솔 에러·실패 응답
    # =====================================================================
    check('콘솔 에러 0건', len(CONSOLE) == 0, ' | '.join(CONSOLE[:3]))
    real_bad = [row for row in BAD if 'cdn.jsdelivr.net' not in row and 'favicon' not in row]
    check('실패 HTTP 응답 0건(CDN 제외)', len(real_bad) == 0, ' | '.join(real_bad[:3]))

print('\n' + '=' * 70)
print(f'총 {len(checks)}개 · PASS {len(checks) - len(failures)} · FAIL {len(failures)}')
if failures:
    print('실패 항목:')
    for item in failures:
        print(' -', item)
    sys.exit(1)
