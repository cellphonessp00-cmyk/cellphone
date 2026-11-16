"""GET /api/pedido?id=...&k=... — status do pedido para o cliente (página "Acompanhe seu pedido").

A chave `k` é uma assinatura do id: sem ela ninguém consegue ver o pedido de outra pessoa.
Na volta do Mercado Pago (?payment_id=...), confirma o pagamento direto na API.
"""
import hmac
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
import _loja as L  # noqa: E402


def mascarar(ped):
    c, e = ped["cliente"], ped["entrega"]
    return {
        "id": ped["id"], "criado": ped["criado"], "status": ped["status"], "pagamento": ped["pagamento"],
        "itens": ped["itens"], "subtotal": ped["subtotal"], "desconto": ped["desconto"], "frete": ped["frete"],
        "total": ped["total"], "link_pagamento": ped.get("link_pagamento") if ped["status"] in ("aguardando_pagamento", "pagamento_recusado") else None,
        "rastreio": ped.get("rastreio"), "historico": ped.get("historico", []),
        "cliente": {"nome": c["nome"].split()[0], "email": c["email"][:2] + "•••" + c["email"][c["email"].find("@"):]},
        "entrega": {"cidade": e["cidade"], "uf": e["uf"], "bairro": e["bairro"], "prazo": e.get("prazo")},
        "pagamento_mp": {k: (ped.get("pagamento_mp") or {}).get(k) for k in ("status", "metodo", "parcelas")} if ped.get("pagamento_mp") else None,
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            q = L.query(self)
            pid, k = q.get("id", ""), q.get("k", "")
            if not pid or not hmac.compare_digest(k, L.assinar("pedido:" + pid)):
                return L.responder(self, 404, {"erro": "Pedido não encontrado."})
            ped = L.ler_pedido(pid)
            if not ped:
                return L.responder(self, 404, {"erro": "Pedido não encontrado."})
            pay = q.get("payment_id") or q.get("collection_id")
            if pay and pay.isdigit() and L.MP_TOKEN():
                pag = L.mp("GET", f"/v1/payments/{pay}")
                if str(pag.get("external_reference")) == pid:
                    ped = L.atualizar_por_pagamento(pag) or ped
            elif q.get("demo") == "1" and not L.MP_TOKEN() and ped["status"] == "aguardando_pagamento":
                # só no modo de demonstração local (sem Mercado Pago configurado)
                ped = L.atualizar_por_pagamento({"external_reference": pid, "status": "approved", "id": "demo",
                                                 "payment_method_id": ped["pagamento"], "installments": 1,
                                                 "transaction_amount": ped["total"], "status_detail": "demo"}) or ped
            return L.responder(self, 200, mascarar(ped))
        except Exception as ex:
            print("pedido erro:", repr(ex), flush=True)
            return L.responder(self, 500, {"erro": "Não foi possível carregar o pedido."})
