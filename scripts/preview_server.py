"""카피박스 상품 탭 — 미리보기용 정적 서버.

dist 는 vite base('/copybox-app/') 로 빌드되므로, /copybox-app/ 경로를 dist 폴더로 매핑합니다.
"""

from __future__ import annotations

import http.server
import pathlib
import socketserver
import threading

DIST = pathlib.Path('/workspace/copybox-app/dist')
PORT = 4199


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):  # 테스트 중에는 조용히
        pass

    def translate_path(self, path: str) -> str:  # noqa: D401
        clean = path.split('?', 1)[0].split('#', 1)[0]
        if clean.startswith('/copybox-app'):
            clean = clean[len('/copybox-app'):] or '/'
        target = (DIST / clean.lstrip('/')).resolve()
        if DIST.resolve() not in target.parents and target != DIST.resolve():
            return str(DIST / 'index.html')
        return str(target)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def serve(port: int = PORT) -> socketserver.TCPServer:
    httpd = Server(('127.0.0.1', port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


if __name__ == '__main__':
    serve()
    print(f'http://127.0.0.1:{PORT}/copybox-app/')
    threading.Event().wait()
