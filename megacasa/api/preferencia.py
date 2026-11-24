"""/api/preferencia — gera o link de pagamento do Checkout Pro (Mercado Pago) para um pedido.

POST {id, k}  -> {"init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=..."}
    O pedido já foi criado e validado por /api/checkout (preços recalculados no servidor).
    `k` é a assinatura do pedido: ninguém gera pagamento de pedido alheio.
GET           -> diagnóstico sem segredos: o token do Mercado Pago está configurado? teste ou produção?

Usa a variável de ambiente MP_ACCESS_TOKEN (Vercel → Settings → Environment Variables).
No site publicado, sem token, devolve erro: não existe mais pagamento simulado no ar.
"""
import hmac
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
import _loja as L  # noqa: E402

PAGAVEIS = ("aguardando_pagamento", "pagamento_recusado")


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        L.responder(self, 200, {
            "mercado_pago": L.modo_mp() or "NAO CONFIGURADO (crie MP_ACCESS_TOKEN e faça Redeploy)",
            "webhook_assinado": bool(L.ENV("MP_WEBHOOK_SECRET")),
            "banco_de_dados": bool(L._redis_cfg()[0]),
            "site": L.SITE(),
            "publicado": L.publicado(),
        })

    def do_POST(self):
        try:
            if not L.limitar(self, "preferencia", 30):
                return L.responder(self, 429, {"erro": "Muitas tentativas. Aguarde alguns minutos."})
            d = L.ler_json(self)
            pid, k = str(d.get("id") or ""), str(d.get("k") or "")
            if not pid or not hmac.compare_digest(k, L.assinar("pedido:" + pid)):
                return L.responder(self, 404, {"erro": "Pedido não encontrado."})
            ped = L.ler_pedido(pid)
            if not ped:
                return L.responder(self, 404, {"erro": "Pedido não encontrado."})
            if ped["status"] not in PAGAVEIS:
                return L.responder(self, 409, {"erro": "Este pedido não está aguardando pagamento.",
                                               "acompanhar": f"pedido.html?id={pid}&k={k}"})

            if not L.MP_TOKEN():
                if L.publicado():
                    print("preferencia: MP_ACCESS_TOKEN ausente no servidor", flush=True)
                    return L.responder(self, 503, {"erro": "Pagamento indisponível no momento. Tente novamente em instantes."})
                # só no computador (python dev_server.py): simulação para testar o fluxo sem Mercado Pago
                link = f"{L.SITE()}/pedido.html?id={pid}&k={k}&demo=1"
                ped.update(mp_preferencia="demo", link_pagamento=link)
                L.salvar_pedido(ped)
                return L.responder(self, 200, {"init_point": link, "modo": "simulacao-local"})

            link = L.criar_preferencia(ped)
            print(f"preferencia: pedido {pid} -> {ped.get('mp_preferencia')} ({L.modo_mp()})", flush=True)
            return L.responder(self, 200, {"init_point": link, "modo": L.modo_mp()})
        except Exception as ex:  # detalhes só no log da Vercel, nunca para o cliente
            print("preferencia erro:", repr(ex), flush=True)
            return L.responder(self, 502, {"erro": "Não conseguimos gerar o link de pagamento. Tente de novo em instantes."})
