"""Servidor para testar a loja no computador (site + /api), imitando a Vercel.

    python dev_server.py          -> http://localhost:8790

Sem MP_ACCESS_TOKEN o pagamento é simulado (modo demonstração). Senha do painel local: admin
"""
import importlib.util
import mimetypes
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

RAIZ = Path(__file__).resolve().parent
os.chdir(RAIZ)
sys.path.insert(0, str(RAIZ / "api"))
for linha in (RAIZ / ".env").read_text(encoding="utf-8").splitlines() if (RAIZ / ".env").exists() else []:
    if "=" in linha and not linha.strip().startswith("#"):
        k, v = linha.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())
os.environ.setdefault("SITE_URL", "http://localhost:8790")
mimetypes.add_type("application/javascript", ".js")


def modulo(nome):
    spec = importlib.util.spec_from_file_location(nome, RAIZ / "api" / f"{nome}.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


class Dev(SimpleHTTPRequestHandler):
    def _api(self, metodo):
        nome = urlparse(self.path).path[len("/api/"):].strip("/")
        if not nome.isidentifier() or nome.startswith("_") or not (RAIZ / "api" / f"{nome}.py").exists():
            self.send_error(404)
            return
        fn = getattr(modulo(nome).handler, metodo, None)
        if not fn:
            self.send_error(405)
            return
        fn(self)

    def do_GET(self):
        p = urlparse(self.path).path
        if p.startswith("/api/"):
            return self._api("do_GET")
        if p.endswith("/") and (RAIZ / p.lstrip("/") / "index.html").exists():
            pass
        elif not Path(p).suffix and (RAIZ / (p.lstrip("/") + ".html")).exists():
            self.path = p + ".html"  # cleanUrls, como na Vercel
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path.startswith("/api/"):
            return self._api("do_POST")
        self.send_error(405)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, f, *a):
        if "/api/" in str(a[0] if a else ""):
            sys.stderr.write("api " + (f % a) + "\n")


if __name__ == "__main__":
    porta = int(os.environ.get("PORT", 8790))
    print(f"Loja em http://localhost:{porta}  ·  painel: http://localhost:{porta}/admin/  ·  Mercado Pago: "
          f"{'configurado' if os.environ.get('MP_ACCESS_TOKEN') else 'modo demonstração'}")
    ThreadingHTTPServer(("127.0.0.1", porta), Dev).serve_forever()
