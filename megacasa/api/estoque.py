"""GET /api/estoque — estoque atual de cada produto (controlado pelo CRM). Público, só números."""
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
import _loja as L  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            L.responder(self, 200, L.todos_estoques())
        except Exception as ex:
            print("estoque erro:", repr(ex), flush=True)
            L.responder(self, 500, {})
