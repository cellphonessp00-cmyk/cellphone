"""POST /api/checkout — valida o pedido, grava no CRM e cria o pagamento no Mercado Pago (Checkout Pro).

O navegador manda só ids, quantidades, voltagens, dados do cliente e a forma de pagamento.
Preço, desconto, frete e estoque são recalculados aqui, a partir do catálogo.
"""
import os
import re
import sys
import time
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
import _loja as L  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            if not L.limitar(self, "checkout", 20):
                return L.responder(self, 429, {"erro": "Muitas tentativas. Aguarde alguns minutos."})
            d = L.ler_json(self)
            c = d.get("cliente") or {}
            e = d.get("entrega") or {}
            pagamento = d.get("pagamento")
            if pagamento not in ("pix", "cartao", "boleto"):
                return L.responder(self, 400, {"erro": "Escolha a forma de pagamento."})

            nome = L.limpar(c.get("nome"), 80)
            email = L.limpar(c.get("email"), 120).lower()
            cpf = re.sub(r"\D", "", c.get("cpf") or "")
            tel = re.sub(r"\D", "", c.get("telefone") or "")
            cep = re.sub(r"\D", "", e.get("cep") or "")
            erros = []
            if len(nome.split()) < 2:
                erros.append("Informe nome e sobrenome.")
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                erros.append("E-mail inválido.")
            if not L.cpf_valido(cpf):
                erros.append("CPF inválido.")
            if len(tel) not in (10, 11):
                erros.append("Celular inválido (DDD + número).")
            if len(cep) != 8:
                erros.append("CEP inválido.")
            for campo in ("rua", "numero", "bairro", "cidade", "uf"):
                if not L.limpar(e.get(campo)):
                    erros.append("Preencha o endereço completo.")
                    break
            if not d.get("aceite"):
                erros.append("Aceite os termos e a política de trocas.")
            if erros:
                return L.responder(self, 400, {"erro": " ".join(erros)})

            carrinho, erro = L.montar_carrinho(d.get("itens"), pagamento, cep)
            if erro:
                return L.responder(self, 409, {"erro": erro})

            loja, prods = L.catalogo()
            pid = L.novo_id()
            chave = L.assinar("pedido:" + pid)
            pedido = {
                "id": pid, "chave": chave, "criado": L.agora_iso(), "criado_ts": time.time(),
                "status": "aguardando_pagamento", "pagamento": pagamento,
                "cliente": {"nome": nome, "email": email, "cpf": cpf, "telefone": tel},
                "entrega": {"cep": f"{cep[:5]}-{cep[5:]}", "rua": L.limpar(e.get("rua")), "numero": L.limpar(e.get("numero"), 10),
                            "complemento": L.limpar(e.get("complemento"), 60), "bairro": L.limpar(e.get("bairro"), 60),
                            "cidade": L.limpar(e.get("cidade"), 60), "uf": L.limpar(e.get("uf"), 2).upper(),
                            "prazo": carrinho["prazo"]},
                **{k: carrinho[k] for k in ("itens", "subtotal", "desconto", "frete", "total")},
                "historico": [{"quando": L.agora_iso(), "status": "aguardando_pagamento", "por": "site"}],
                "notas": "",
            }

            site = L.SITE()
            acompanhar = f"{site}/pedido.html?id={pid}&k={chave}"
            itens_mp = []
            for it in carrinho["itens"]:
                p = prods[it["id"]]
                img = (p.get("imagens") or [None])[0]
                itens_mp.append({
                    "id": it["id"], "title": (it["nome"] + (f" ({it['voltagem']})" if it["voltagem"] else ""))[:250],
                    "description": (p.get("descricao") or "")[:250], "category_id": "home_appliances",
                    "quantity": it["quantidade"], "currency_id": "BRL",
                    "unit_price": it["preco_pago"],
                    **({"picture_url": f"{site}/{img}"} if img else {}),
                })

            excluir = {"pix": ["credit_card", "debit_card", "ticket", "prepaid_card"],
                       "cartao": ["bank_transfer", "ticket", "atm"],
                       "boleto": ["credit_card", "debit_card", "bank_transfer", "prepaid_card"]}[pagamento]
            partes_nome = nome.split()
            preferencia = {
                "items": itens_mp,
                "payer": {"name": partes_nome[0], "surname": " ".join(partes_nome[1:]), "email": email,
                          "phone": {"area_code": tel[:2], "number": tel[2:]},
                          "identification": {"type": "CPF", "number": cpf},
                          "address": {"zip_code": cep, "street_name": pedido["entrega"]["rua"],
                                      "street_number": pedido["entrega"]["numero"]}},
                "shipments": {"cost": carrinho["frete"], "mode": "not_specified"},
                "payment_methods": {"excluded_payment_types": [{"id": t} for t in excluir],
                                    "installments": int(loja.get("parcelas", 10))},
                "back_urls": {"success": acompanhar, "pending": acompanhar, "failure": acompanhar},
                "auto_return": "approved",
                "external_reference": pid,
                "statement_descriptor": (loja.get("faturaCartao") or "MEGACASASP")[:13],
                "binary_mode": False,
                "expires": True,
                "expiration_date_to": (L.datetime.now(L.BR) + L.timedelta(hours=72)).isoformat(timespec="milliseconds"),
                "metadata": {"pedido_id": pid},
            }
            if site.startswith("https://"):
                preferencia["notification_url"] = f"{site}/api/webhook?source_news=webhooks"

            if L.MP_TOKEN():
                r = L.mp("POST", "/checkout/preferences", preferencia, idem=pid)
                link = r["init_point"]
                pedido["mp_preferencia"] = r.get("id")
            else:
                # modo de demonstração (sem chave do Mercado Pago): simula o pagamento
                link = f"{site}/pedido.html?id={pid}&k={chave}&demo=1"
                pedido["mp_preferencia"] = "demo"
            pedido["link_pagamento"] = link
            L.salvar_pedido(pedido)
            return L.responder(self, 200, {"ok": True, "pedido": pid, "redirecionar": link})
        except Exception as ex:  # nunca devolve detalhes internos ao cliente
            print("checkout erro:", repr(ex), flush=True)
            return L.responder(self, 500, {"erro": "Não conseguimos iniciar o pagamento agora. Tente de novo em instantes."})
