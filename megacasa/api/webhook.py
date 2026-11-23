"""POST /api/webhook — o Mercado Pago avisa aqui quando um pagamento muda de status.

Segurança: confere a assinatura (MP_WEBHOOK_SECRET) e, mesmo assim, nunca confia no conteúdo do aviso:
busca o pagamento direto na API do Mercado Pago antes de mudar o pedido.
"""
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
import _loja as L  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            q = L.query(self)
            try:
                corpo = L.ler_json(self)
            except Exception:
                corpo = {}
            tipo = q.get("type") or q.get("topic") or corpo.get("type") or corpo.get("topic")
            data_id = str(q.get("data.id") or (corpo.get("data") or {}).get("id") or q.get("id") or "")
            if tipo != "payment" or not data_id:
                return L.responder(self, 200, {"ok": True, "ignorado": True})
            if not L.webhook_assinatura_ok({k.lower(): v for k, v in self.headers.items()}, data_id):
                print("webhook: assinatura inválida", flush=True)
                return L.responder(self, 401, {"erro": "assinatura"})
            try:
                pag = L.mp("GET", f"/v1/payments/{data_id}")
            except RuntimeError as ex:
                if "Mercado Pago 404" in str(ex):  # pagamento inexistente (ex.: botão "simular" do painel do MP)
                    print(f"webhook: pagamento {data_id} não existe, ignorado", flush=True)
                    return L.responder(self, 200, {"ok": True, "ignorado": True})
                raise
            ped = L.atualizar_por_pagamento(pag)
            print(f"webhook: pagamento {data_id} {pag.get('status')} pedido {ped and ped['id']}", flush=True)
            return L.responder(self, 200, {"ok": True})
        except Exception as ex:
            print("webhook erro:", repr(ex), flush=True)
            return L.responder(self, 500, {"erro": "falha"})  # o MP tenta de novo depois

    def do_GET(self):
        return L.responder(self, 200, {"ok": True})
