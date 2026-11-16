"""/api/conta — cadastro e login de clientes (quem tem cadastro ganha o desconto de LOJA.descontoCadastro).

POST {acao:"cadastrar", nome, sobrenome, email, telefone, senha, aceite, ofertas}
POST {acao:"entrar", email, senha}
GET  (Authorization: Bearer <token>)  -> dados da conta
"""
import os
import re
import sys
import time
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
import _loja as L  # noqa: E402


def publico(c):
    return {"nome": c["nome"], "sobrenome": c["sobrenome"], "email": c["email"], "telefone": c["telefone"]}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        c = L.conta_da_requisicao(self)
        if not c:
            return L.responder(self, 401, {"erro": "Faça login novamente."})
        loja, _ = L.catalogo()
        return L.responder(self, 200, {"conta": publico(c), "desconto": loja.get("descontoCadastro", 0)})

    def do_POST(self):
        try:
            d = L.ler_json(self)
            acao = d.get("acao")
            loja, _ = L.catalogo()
            email = L.limpar(d.get("email"), 120).lower()

            if acao == "cadastrar":
                if not L.limitar(self, "cadastro", 10):
                    return L.responder(self, 429, {"erro": "Muitas tentativas. Aguarde alguns minutos."})
                nome = L.limpar(d.get("nome"), 40)
                sobrenome = L.limpar(d.get("sobrenome"), 60)
                tel = re.sub(r"\D", "", d.get("telefone") or "")
                senha = str(d.get("senha") or "")
                erros = []
                if len(nome) < 2:
                    erros.append("Informe seu nome.")
                if len(sobrenome) < 2:
                    erros.append("Informe seu sobrenome.")
                if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                    erros.append("E-mail inválido.")
                if len(tel) not in (10, 11):
                    erros.append("Telefone inválido (DDD + número).")
                if len(senha) < 8 or not re.search(r"\d", senha) or not re.search(r"[A-Za-z]", senha):
                    erros.append("A senha precisa de pelo menos 8 caracteres, com letras e números.")
                if not d.get("aceite"):
                    erros.append("Aceite os termos e a política de privacidade.")
                if erros:
                    return L.responder(self, 400, {"erro": " ".join(erros)})
                if L.ler_conta(email):
                    return L.responder(self, 409, {"erro": "Este e-mail já tem cadastro. Use \"Entrar\"."})
                c = {"nome": nome, "sobrenome": sobrenome, "email": email, "telefone": tel, "senha": L.hash_senha(senha),
                     "ofertas": bool(d.get("ofertas")), "criado": L.agora_iso(), "criado_ts": time.time(),
                     "pedidos": 0, "total_comprado": 0}
                L.salvar_conta(c)
                L.planilha("clientes", L.linha_cliente(c, L.agora_iso()))
                return L.responder(self, 200, {"token": L.token_conta(email), "conta": publico(c),
                                               "desconto": loja.get("descontoCadastro", 0)})

            if acao == "entrar":
                if not L.limitar(self, "entrar", 10):
                    return L.responder(self, 429, {"erro": "Muitas tentativas. Aguarde 10 minutos."})
                c = L.ler_conta(email)
                if not c or not L.senha_confere(str(d.get("senha") or ""), c["senha"]):
                    return L.responder(self, 401, {"erro": "E-mail ou senha incorretos."})
                L.planilha("clientes", {"E-mail": email, "Último acesso": L.agora_iso()})
                return L.responder(self, 200, {"token": L.token_conta(email), "conta": publico(c),
                                               "desconto": loja.get("descontoCadastro", 0)})

            return L.responder(self, 400, {"erro": "ação inválida"})
        except Exception as ex:
            print("conta erro:", repr(ex), flush=True)
            return L.responder(self, 500, {"erro": "Não foi possível concluir agora. Tente de novo."})
