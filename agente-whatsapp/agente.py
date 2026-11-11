"""Agente de vendas no WhatsApp — Cellphones SP e Mega Casa SP.

WhatsApp Cloud API (oficial da Meta)  ->  este servidor  ->  Claude (API da Anthropic)
                                                     +->  catálogo dos sites (produtos.js)

Como rodar:
  python agente.py           -> servidor do webhook (para a Meta chamar)
  python agente.py --chat    -> conversa com o agente no terminal (não precisa de WhatsApp)
  python agente.py --teste   -> testa catálogo e ferramentas (não precisa de nenhuma chave)
"""
import hashlib
import hmac
import json
import os
import sys
import threading
import time
import traceback
import urllib.error
import urllib.request
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import catalogo as cat_mod

PASTA = Path(__file__).resolve().parent


# ---------- configuração (.env) ----------
def carregar_env():
    arq = PASTA / ".env"
    if arq.exists():
        for linha in arq.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if linha and not linha.startswith("#") and "=" in linha:
                k, v = linha.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


carregar_env()
CFG = {
    "modelo": os.getenv("CLAUDE_MODELO", "claude-opus-5-5"),
    "esforco": os.getenv("CLAUDE_ESFORCO", "medium"),
    "lojas": [l.strip() for l in os.getenv("LOJAS", "cellphones,megacasa").split(",") if l.strip()],
    "wa_token": os.getenv("WHATSAPP_TOKEN", ""),
    "wa_phone_id": os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""),
    "verify_token": os.getenv("WHATSAPP_VERIFY_TOKEN", ""),
    "app_secret": os.getenv("META_APP_SECRET", ""),
    "graph": os.getenv("GRAPH_API_VERSAO", "v23.0"),
    "dono": os.getenv("DONO_WHATSAPP", ""),
    "porta": int(os.getenv("PORT", "8080")),
}
CATALOGO = cat_mod.Catalogo(CFG["lojas"])
REGISTRO = PASTA / "pedidos.jsonl"


def log(*a):
    print(datetime.now().strftime("%H:%M:%S"), *a, flush=True)


# ---------- WhatsApp Cloud API ----------
def wa_post(corpo):
    if not (CFG["wa_token"] and CFG["wa_phone_id"]):
        log("[simulado] enviaria:", json.dumps(corpo, ensure_ascii=False)[:300])
        return None
    req = urllib.request.Request(
        f"https://graph.facebook.com/{CFG['graph']}/{CFG['wa_phone_id']}/messages",
        data=json.dumps(corpo).encode(),
        headers={"Authorization": f"Bearer {CFG['wa_token']}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        log("Erro WhatsApp", e.code, e.read().decode()[:500])
    except Exception as e:
        log("Erro WhatsApp", e)
    return None


def wa_texto(para, texto):
    # WhatsApp aceita até 4096 caracteres por mensagem: divide por parágrafos se passar
    partes, atual = [], ""
    for par in texto.split("\n\n"):
        if len(atual) + len(par) + 2 > 3800 and atual:
            partes.append(atual)
            atual = par
        else:
            atual = f"{atual}\n\n{par}" if atual else par
    if atual:
        partes.append(atual)
    for p in partes:
        wa_post({"messaging_product": "whatsapp", "to": para, "type": "text",
                 "text": {"body": p[:4096], "preview_url": True}})


def wa_lido(msg_id):
    wa_post({"messaging_product": "whatsapp", "status": "read", "message_id": msg_id})


# ---------- o agente (Claude) ----------
def instrucoes():
    CATALOGO.atualizar()
    lojas = []
    for loja, info in CATALOGO.info.items():
        extras = []
        if info.get("descontoPix"):
            extras.append(f"{info['descontoPix']}% de desconto no Pix")
        extras.append(f"até {info.get('parcelas', 10)}x sem juros no cartão")
        if info.get("freteGratisAcima"):
            extras.append(f"frete grátis acima de R$ {info['freteGratisAcima']}")
        lojas.append(f"- {info.get('nome', loja)}: {info.get('slogan', '')} ({'; '.join(extras)}). Site: {cat_mod.SITES[loja]}")
    nomes = " e ".join(i.get("nome", l) for l, i in CATALOGO.info.items())
    return f"""Você é o assistente virtual de vendas no WhatsApp de {nomes}, lojas de São Paulo.

Lojas que você atende:
{chr(10).join(lojas)}

Como atender:
- Fale como um vendedor simpático e direto de São Paulo, em português do Brasil. Mensagens curtas: é WhatsApp.
- Formatação do WhatsApp: *negrito* com um asterisco, sem títulos com #, sem tabelas. No máximo 3 produtos por mensagem.
- Preço, estoque, frete e prazos vêm SEMPRE das ferramentas. Nunca invente preço, desconto, cupom, prazo ou especificação.
  Se o cliente pedir desconto além do anunciado, diga que vai verificar e use chamar_atendente.
- Ao indicar um produto, mande o link dele (campo "link") para o cliente ver fotos e detalhes no site.
- Produto esgotado: avise e sugira uma alternativa parecida que esteja disponível.
- Para fechar a compra: confirme itens, quantidades, voltagem (se houver), CEP e forma de pagamento; depois chame
  registrar_pedido e diga que a equipe vai confirmar e mandar o pagamento em seguida. Você não recebe pagamentos
  nem gera links de pagamento.
- Nunca peça nem aceite número de cartão, senha ou dados bancários. Se o cliente mandar, diga para não enviar.
- Reclamação, troca, garantia, negociação ou pedido para falar com uma pessoa: use chamar_atendente.
- Assuntos fora das lojas: responda em uma frase, com educação, e traga a conversa de volta para os produtos.
- Motos e ciclomotores elétricos: lembre que as regras de habilitação e emplacamento dependem do modelo (CONTRAN).
- Hoje é {datetime.now().strftime('%d/%m/%Y')}."""


def executar_ferramenta(nome, entrada, cliente):
    try:
        if nome == "buscar_produtos":
            return cat_mod.buscar_produtos(CATALOGO, **entrada)
        if nome == "detalhes_produto":
            return cat_mod.detalhes_produto(CATALOGO, **entrada)
        if nome == "calcular_frete":
            return cat_mod.calcular_frete(CATALOGO, **entrada)
        if nome == "registrar_pedido":
            pedido, erro = cat_mod.montar_pedido(CATALOGO, **entrada)
            if erro:
                return erro
            pedido.update({"cliente_whatsapp": cliente, "quando": datetime.now().isoformat(timespec="seconds")})
            with REGISTRO.open("a", encoding="utf-8") as f:
                f.write(json.dumps(pedido, ensure_ascii=False) + "\n")
            avisar_dono("🛒 *Novo pedido pelo WhatsApp*\n" + resumo_pedido(pedido))
            return {"ok": True, "pedido": pedido, "proximo_passo": "A equipe confirma estoque e frete e envia o pagamento."}
        if nome == "chamar_atendente":
            avisar_dono(f"🙋 *Cliente pediu atendimento*\nWhatsApp: +{cliente}\nMotivo: {entrada['motivo']}")
            return {"ok": True, "mensagem": "Equipe avisada; um atendente vai responder nesta conversa."}
        return {"erro": f"ferramenta desconhecida: {nome}"}
    except Exception as e:
        traceback.print_exc()
        return {"erro": f"falha ao executar {nome}: {e}"}


def resumo_pedido(p):
    itens = "\n".join(f"• {i['quantidade']}x {i['nome']}{' (' + i['voltagem'] + ')' if i.get('voltagem') else ''} — {i['subtotal']}" for i in p["itens"])
    return (f"Cliente: {p.get('nome_cliente') or '-'} (+{p['cliente_whatsapp']})\n{itens}\nTotal: {p['total']}"
            + (f" (Pix {p['total_pix']})" if p.get("total_pix") else "")
            + f"\nPagamento: {p['pagamento']}  CEP: {p.get('cep') or '-'}\nObs.: {p.get('observacoes') or '-'}")


def avisar_dono(texto):
    log("AVISO EQUIPE:", texto.replace("\n", " | "))
    if CFG["dono"]:
        # Obs.: a Meta só entrega esta mensagem se o número do dono tiver falado com o número da loja
        # nas últimas 24h. Fora disso, confira o arquivo pedidos.jsonl / os logs do servidor.
        wa_texto(CFG["dono"], texto)


_cliente_api = None


def api():
    global _cliente_api
    if _cliente_api is None:
        import anthropic
        _cliente_api = anthropic.Anthropic()  # lê ANTHROPIC_API_KEY do ambiente/.env
    return _cliente_api


class Conversa:
    """Histórico de um cliente. Só cresce (nunca editamos mensagens antigas); recomeça após inatividade."""
    LIMITE_HORAS = 12
    LIMITE_MSGS = 60

    def __init__(self):
        self.msgs, self.ultimo, self.trava = [], time.time(), threading.Lock()

    def renovar_se_preciso(self):
        if time.time() - self.ultimo > self.LIMITE_HORAS * 3600 or len(self.msgs) > self.LIMITE_MSGS:
            self.msgs = []
        self.ultimo = time.time()


CONVERSAS: dict[str, Conversa] = {}


def responder(cliente, texto):
    conv = CONVERSAS.setdefault(cliente, Conversa())
    with conv.trava:
        conv.renovar_se_preciso()
        conv.msgs.append({"role": "user", "content": texto})
        for _ in range(8):  # no máximo 8 rodadas de ferramentas por mensagem
            r = api().beta.messages.create(
                model=CFG["modelo"],
                max_tokens=16000,
                system=instrucoes(),
                tools=cat_mod.FERRAMENTAS,
                messages=conv.msgs,
                output_config={"effort": CFG["esforco"]},
                cache_control={"type": "ephemeral"},
                # se o modelo recusar algo por engano, a API tenta outro modelo automaticamente
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
            conv.msgs.append({"role": "assistant", "content": r.content})
            if r.stop_reason == "tool_use":
                resultados = []
                for b in r.content:
                    if b.type == "tool_use":
                        log(f"  ferramenta {b.name} {json.dumps(b.input, ensure_ascii=False)[:200]}")
                        res = executar_ferramenta(b.name, b.input, cliente)
                        resultados.append({"type": "tool_result", "tool_use_id": b.id,
                                           "content": json.dumps(res, ensure_ascii=False),
                                           "is_error": isinstance(res, dict) and "erro" in res})
                conv.msgs.append({"role": "user", "content": resultados})
                continue
            if r.stop_reason == "refusal":
                conv.msgs = []  # recomeça limpo
                return "Desculpe, não consigo ajudar com isso por aqui. Posso te mostrar nossos produtos? 😊"
            resposta = "\n".join(b.text for b in r.content if b.type == "text").strip()
            return resposta or "Pode repetir, por favor? 🙂"
        avisar_dono(f"⚠️ Agente travou em uma conversa: +{cliente}")
        return "Vou chamar um atendente para te ajudar com isso, só um instante! 🙏"


def tratar_mensagem(msg):
    cliente, tipo = msg["from"], msg.get("type")
    wa_lido(msg["id"])
    if tipo == "text":
        texto = msg["text"]["body"]
    elif tipo == "interactive":
        i = msg["interactive"]
        texto = (i.get("button_reply") or i.get("list_reply") or {}).get("title", "")
    elif tipo == "button":
        texto = msg["button"].get("text", "")
    else:
        wa_texto(cliente, "Por enquanto eu só leio mensagens de texto 🙏 Pode escrever o que você procura?")
        return
    log(f"<- +{cliente}: {texto[:200]}")
    try:
        resposta = responder(cliente, texto)
    except Exception as e:
        traceback.print_exc()
        resposta = "Tive um probleminha aqui 😅 Um atendente já vai te responder."
        avisar_dono(f"⚠️ Erro no agente com +{cliente}: {e}")
    log(f"-> +{cliente}: {resposta[:200]}")
    wa_texto(cliente, resposta)


# ---------- servidor do webhook ----------
VISTOS: dict[str, float] = {}


class Webhook(BaseHTTPRequestHandler):
    def _enviar(self, codigo, corpo=b""):
        self.send_response(codigo)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/webhook":  # verificação da Meta ao cadastrar o webhook
            q = parse_qs(u.query)
            if q.get("hub.mode", [""])[0] == "subscribe" and CFG["verify_token"] and \
                    hmac.compare_digest(q.get("hub.verify_token", [""])[0], CFG["verify_token"]):
                return self._enviar(200, q.get("hub.challenge", [""])[0].encode())
            return self._enviar(403, b"token invalido")
        self._enviar(200, b"Agente WhatsApp no ar")

    def do_POST(self):
        if urlparse(self.path).path != "/webhook":
            return self._enviar(404)
        corpo = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if CFG["app_secret"]:
            esperado = "sha256=" + hmac.new(CFG["app_secret"].encode(), corpo, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(esperado, self.headers.get("X-Hub-Signature-256", "")):
                log("Assinatura inválida: requisição ignorada")
                return self._enviar(401)
        self._enviar(200)  # responde logo; a Meta reenvia se demorar
        try:
            dados = json.loads(corpo)
        except ValueError:
            return
        agora = time.time()
        for k in [k for k, t in VISTOS.items() if agora - t > 3600]:
            VISTOS.pop(k, None)
        for entrada in dados.get("entry", []):
            for mud in entrada.get("changes", []):
                for msg in mud.get("value", {}).get("messages", []):
                    if msg["id"] in VISTOS:  # a Meta às vezes entrega a mesma mensagem duas vezes
                        continue
                    VISTOS[msg["id"]] = agora
                    threading.Thread(target=tratar_mensagem, args=(msg,), daemon=True).start()

    def log_message(self, *a):
        pass


def servidor():
    faltando = [k for k in ("ANTHROPIC_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN")
                if not os.getenv(k)]
    if faltando:
        log("Atenção, faltam no .env:", ", ".join(faltando))
    if not CFG["app_secret"]:
        log("Atenção: sem META_APP_SECRET o servidor não confere se as mensagens vieram mesmo da Meta.")
    CATALOGO.atualizar(forcar=True)
    log(f"Catálogo: {len(CATALOGO.produtos)} produtos ({', '.join(CFG['lojas'])}) · modelo {CFG['modelo']}")
    log(f"Webhook ouvindo em http://0.0.0.0:{CFG['porta']}/webhook")
    ThreadingHTTPServer(("0.0.0.0", CFG["porta"]), Webhook).serve_forever()


def chat():
    print("Conversa de teste com o agente (Ctrl+C para sair)\n")
    while True:
        try:
            t = input("Você: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if t:
            print("\nAgente:", responder("5511900000000", t), "\n")


def teste():
    CATALOGO.atualizar(forcar=True)
    print(f"{len(CATALOGO.produtos)} produtos carregados de: {', '.join(CATALOGO.info[l].get('nome', l) for l in CATALOGO.info)}")
    for termo in ["iphone", "air fryer", "moto eletrica", "teclado gamer", "geladeira inox"]:
        r = cat_mod.buscar_produtos(CATALOGO, termo=termo)
        print(f"\nbuscar '{termo}': {r.get('total', 0)} achados")
        for p in r["resultados"][:3]:
            print("  -", p["nome"], "|", p["preco"], "|", p.get("preco_pix", "sem Pix"), "|", p["estoque"], "|", p["link"])
    print("\nfrete:", cat_mod.calcular_frete(CATALOGO, "01310-100", "airfryer-mondial-5l"))
    print("frete:", cat_mod.calcular_frete(CATALOGO, "30140-071", "moto-eletrica-urban-3000"))
    pid = CATALOGO.produtos[0]["id"]
    print("detalhes:", json.dumps(cat_mod.detalhes_produto(CATALOGO, pid), ensure_ascii=False)[:300])
    print("pedido:", cat_mod.montar_pedido(CATALOGO, [{"id": "airfryer-mondial-5l", "quantidade": 2, "voltagem": "220V"}], "pix")[0])
    print("esgotado:", cat_mod.montar_pedido(CATALOGO, [{"id": "lava-loucas-brastemp-8", "quantidade": 1}], "pix")[1])


if __name__ == "__main__":
    if "--teste" in sys.argv:
        teste()
    elif "--chat" in sys.argv:
        chat()
    else:
        servidor()
