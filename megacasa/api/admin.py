"""/api/admin — backend do CRM (protegido por senha: variável ADMIN_SENHA).

GET  /api/admin?acao=dados                         -> pedidos, estoques e produtos
POST /api/admin {acao:"login", senha}              -> token (12h)
POST /api/admin {acao:"pedido", id, status?, rastreio?, notas?}
POST /api/admin {acao:"estoque", id, quantidade}
POST /api/admin {acao:"sincronizar", id}           -> consulta o pagamento no Mercado Pago
"""
import hmac
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
import _loja as L  # noqa: E402

STATUS_CRM = ["aguardando_pagamento", "em_analise", "pagamento_recusado", "pago", "em_separacao", "faturado",
              "enviado", "entregue", "cancelado", "reembolsado", "estornado"]


def senha_admin():
    s = L.ENV("ADMIN_SENHA", "")
    if not s and not L.SITE().startswith("https://"):
        return "admin"  # só no computador, para testes
    return s


def autorizado(h):
    tok = (h.headers.get("Authorization") or "").removeprefix("Bearer ").strip()
    return L.admin_ok(tok)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not autorizado(self):
            return L.responder(self, 401, {"erro": "login"})
        try:
            loja, prods = L.catalogo()
            L.responder(self, 200, {
                "pedidos": L.listar_pedidos(),
                "estoques": L.todos_estoques(),
                "produtos": [{"id": p["id"], "nome": p["nome"], "preco": p["preco"], "categoria": p.get("categoria"),
                              "marca": p.get("marca")} for p in prods.values()],
                "status": STATUS_CRM,
                "mp_configurado": bool(L.MP_TOKEN()),
                "loja": loja.get("nome"),
            })
        except Exception as ex:
            print("admin erro:", repr(ex), flush=True)
            L.responder(self, 500, {"erro": "Falha ao carregar dados."})

    def do_POST(self):
        try:
            d = L.ler_json(self)
            acao = d.get("acao")
            if acao == "login":
                if not L.limitar(self, "login", 8):
                    return L.responder(self, 429, {"erro": "Muitas tentativas. Aguarde 10 minutos."})
                s = senha_admin()
                if s and hmac.compare_digest(str(d.get("senha", "")), s):
                    return L.responder(self, 200, {"token": L.token_admin()})
                return L.responder(self, 401, {"erro": "Senha incorreta."})

            if not autorizado(self):
                return L.responder(self, 401, {"erro": "login"})

            if acao == "estoque":
                _, prods = L.catalogo()
                if d.get("id") not in prods:
                    return L.responder(self, 404, {"erro": "produto"})
                q = max(0, min(100000, int(d.get("quantidade", 0))))
                L.redis("SET", f"estoque:{d['id']}", q)
                return L.responder(self, 200, {"ok": True, "quantidade": q})

            ped = L.ler_pedido(str(d.get("id", "")))
            if not ped:
                return L.responder(self, 404, {"erro": "Pedido não encontrado."})

            if acao == "pedido":
                st = d.get("status")
                if st and st != ped["status"]:
                    if st not in STATUS_CRM:
                        return L.responder(self, 400, {"erro": "status"})
                    if st == "pago" and not ped.get("estoque_baixado"):
                        L.baixar_estoque(ped["itens"])
                        ped["estoque_baixado"] = True
                    ped["status"] = st
                    ped.setdefault("historico", []).append({"quando": L.agora_iso(), "status": st, "por": "equipe"})
                if "rastreio" in d:
                    ped["rastreio"] = L.limpar(d["rastreio"], 60)
                if "notas" in d:
                    ped["notas"] = L.limpar(d["notas"], 2000)
                L.salvar_pedido(ped)
                return L.responder(self, 200, {"ok": True, "pedido": ped})

            if acao == "sincronizar":
                if not L.MP_TOKEN():
                    return L.responder(self, 400, {"erro": "Mercado Pago não configurado."})
                r = L.mp("GET", f"/v1/payments/search?external_reference={ped['id']}&sort=date_created&criteria=desc")
                res = r.get("results") or []
                if not res:
                    return L.responder(self, 200, {"ok": True, "pedido": ped, "aviso": "Nenhum pagamento encontrado ainda."})
                ped = L.atualizar_por_pagamento(res[0]) or ped
                return L.responder(self, 200, {"ok": True, "pedido": ped})

            return L.responder(self, 400, {"erro": "ação desconhecida"})
        except Exception as ex:
            print("admin erro:", repr(ex), flush=True)
            L.responder(self, 500, {"erro": "Falha ao salvar."})
