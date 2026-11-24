"""POST /api/checkout — valida o pedido e grava no CRM como "aguardando pagamento".
Devolve {pedido, k}; em seguida o navegador chama /api/preferencia, que cria o Checkout Pro no Mercado Pago.

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
            if L.publicado() and not L.MP_TOKEN():  # no ar, sem Mercado Pago não aceita pedido (nada de simulação)
                print("checkout: MP_ACCESS_TOKEN ausente no servidor", flush=True)
                return L.responder(self, 503, {"erro": "Pagamento indisponível no momento. Tente novamente em instantes."})
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

            conta = L.conta_da_requisicao(self)  # cliente logado ganha o desconto de cadastro
            carrinho, erro = L.montar_carrinho(d.get("itens"), pagamento, cep, cadastrado=bool(conta))
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
                **{k: carrinho[k] for k in ("itens", "subtotal", "desconto", "desconto_cadastro", "desconto_pix", "frete", "total")},
                "conta": conta["email"] if conta else None,
                "historico": [{"quando": L.agora_iso(), "status": "aguardando_pagamento", "por": "site"}],
                "notas": "",
            }

            # O pedido fica salvo como "aguardando pagamento"; o link do Mercado Pago é gerado por /api/preferencia
            L.salvar_pedido(pedido)
            L.planilha("pedidos", L.linha_pedido(pedido))  # planilha de pedidos com o endereço de entrega
            return L.responder(self, 200, {"ok": True, "pedido": pid, "k": chave})
        except Exception as ex:  # nunca devolve detalhes internos ao cliente
            print("checkout erro:", repr(ex), flush=True)
            return L.responder(self, 500, {"erro": "Não conseguimos iniciar o pagamento agora. Tente de novo em instantes."})
