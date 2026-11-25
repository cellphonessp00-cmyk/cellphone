"""Núcleo do backend da loja (Vercel Python Functions).

- Catálogo: lê o produtos.js do site (fonte única de preços). O preço NUNCA vem do navegador.
- Banco: Upstash Redis (Vercel Marketplace) via REST. Sem as variáveis, usa um arquivo local (testes).
- Mercado Pago: cria a preferência (Checkout Pro) e consulta pagamentos.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BR = timezone(timedelta(hours=-3))

ENV = os.environ.get
# Nome oficial: MP_ACCESS_TOKEN. Aceita também "MP_ACESSTOKEN" (nome como foi salvo na Vercel; a Vercel não
# deixa renomear variável sensível). Ao recriar a variável com o nome oficial, este apelido pode sair.
MP_TOKEN = lambda: (ENV("MP_ACCESS_TOKEN") or ENV("MP_ACESSTOKEN") or "").strip()
_segredo = {}


def SEGREDO():
    """Chave que assina links de pedido e logins. Usa SEGREDO_APP se existir; senão gera uma
    aleatória na primeira vez e guarda no banco (assim não é preciso configurar nada)."""
    if ENV("SEGREDO_APP"):
        return ENV("SEGREDO_APP")
    if "v" not in _segredo:
        redis("SET", "app:segredo", secrets.token_urlsafe(48), "NX")
        _segredo["v"] = redis("GET", "app:segredo")
    return _segredo["v"]


def SITE():
    """Endereço público do site: SITE_URL, ou o endereço de produção que a Vercel informa sozinha."""
    url = ENV("SITE_URL")
    if not url and ENV("VERCEL_PROJECT_PRODUCTION_URL"):
        url = "https://" + ENV("VERCEL_PROJECT_PRODUCTION_URL")
    return (url or "http://localhost:8790").rstrip("/")


# ===================== catálogo =====================
def _extrair(texto, nome):
    m = re.search(r"const\s+" + nome + r"\s*=\s*", texto)
    if not m:
        return None
    i = m.end()
    while texto[i].isspace() or texto.startswith("/*", i):
        i = texto.find("*/", i) + 2 if texto.startswith("/*", i) else i + 1
    abre = texto[i]
    fecha = {"{": "}", "[": "]"}[abre]
    nivel, j, em_str, esc, out = 0, i, None, False, []
    while j < len(texto):
        c = texto[j]
        if em_str:
            out.append(c)
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == em_str:
                em_str = None
            j += 1
            continue
        if c in "\"'":
            em_str = c
            out.append('"' if c == "'" else c)
            j += 1
            continue
        if texto.startswith("//", j):
            j = texto.find("\n", j)
            continue
        if texto.startswith("/*", j):
            j = texto.find("*/", j) + 2
            continue
        if c.isalpha() or c == "_":
            k = j
            while k < len(texto) and (texto[k].isalnum() or texto[k] == "_"):
                k += 1
            palavra = texto[j:k]
            if texto[k:].lstrip().startswith(":") and palavra not in ("true", "false", "null"):
                out.append(json.dumps(palavra))
            else:
                out.append(palavra)
            j = k
            continue
        if c == abre:
            nivel += 1
        elif c == fecha:
            nivel -= 1
            if nivel == 0:
                out.append(c)
                break
        out.append(c)
        j += 1
    return json.loads(re.sub(r",(\s*[}\]])", r"\1", "".join(out)))


_cache = {}


def catalogo():
    arq = RAIZ / "produtos.js"
    mt = arq.stat().st_mtime
    if _cache.get("mt") != mt:
        t = arq.read_text(encoding="utf-8")
        _cache.update(mt=mt, loja=_extrair(t, "LOJA"), produtos={p["id"]: p for p in _extrair(t, "PRODUTOS")})
    return _cache["loja"], _cache["produtos"]


# ===================== banco (Upstash Redis REST) =====================
def _redis_cfg():
    url = ENV("KV_REST_API_URL") or ENV("UPSTASH_REDIS_REST_URL")
    tok = ENV("KV_REST_API_TOKEN") or ENV("UPSTASH_REDIS_REST_TOKEN")
    return (url, tok) if url and tok else (None, None)


_LOCAL = RAIZ / ".dados-local.json"


def _local():
    try:
        return json.loads(_LOCAL.read_text(encoding="utf-8"))
    except Exception:
        return {"kv": {}, "z": {}}


def redis(*cmd):
    url, tok = _redis_cfg()
    if url:
        req = urllib.request.Request(url, data=json.dumps([str(c) for c in cmd]).encode(),
                                     headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read()).get("result")
    # ---- modo local (só para testes no computador) ----
    d = _local()
    op, args = cmd[0].upper(), [str(a) for a in cmd[1:]]
    res = None
    if op == "GET":
        res = d["kv"].get(args[0])
    elif op == "SET":
        if "NX" in args[2:] and args[0] in d["kv"]:
            return None
        d["kv"][args[0]] = args[1]
        res = "OK"
    elif op == "MGET":
        res = [d["kv"].get(k) for k in args]
    elif op == "DEL":
        res = int(d["kv"].pop(args[0], None) is not None)
    elif op == "INCRBY":
        v = int(d["kv"].get(args[0], 0)) + int(args[1])
        d["kv"][args[0]] = str(v)
        res = v
    elif op == "ZADD":
        d["z"].setdefault(args[0], {})[args[2]] = float(args[1])
        res = 1
    elif op == "ZREVRANGE":
        z = sorted(d["z"].get(args[0], {}).items(), key=lambda x: -x[1])
        res = [k for k, _ in z[int(args[1]): int(args[2]) + 1 if int(args[2]) >= 0 else None]]
    elif op == "KEYS":
        pre = args[0].rstrip("*")
        res = [k for k in d["kv"] if k.startswith(pre)]
    _LOCAL.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    return res


def salvar_pedido(p):
    redis("SET", f"pedido:{p['id']}", json.dumps(p, ensure_ascii=False))
    redis("ZADD", "pedidos", p["criado_ts"], p["id"])


def ler_pedido(pid):
    v = redis("GET", f"pedido:{pid}")
    return json.loads(v) if v else None


def listar_pedidos(limite=500):
    ids = redis("ZREVRANGE", "pedidos", 0, limite - 1) or []
    if not ids:
        return []
    vals = redis("MGET", *[f"pedido:{i}" for i in ids]) or []
    return [json.loads(v) for v in vals if v]


def estoque_atual(pid):
    """Estoque controlado pelo CRM. Na primeira vez usa o número do produtos.js."""
    v = redis("GET", f"estoque:{pid}")
    if v is None:
        _, prods = catalogo()
        return int(prods[pid].get("estoque", 0)) if pid in prods else 0
    return int(v)


def todos_estoques():
    _, prods = catalogo()
    vals = redis("MGET", *[f"estoque:{i}" for i in prods]) or [None] * len(prods)
    return {pid: (int(v) if v is not None else int(p.get("estoque", 0))) for (pid, p), v in zip(prods.items(), vals)}


def baixar_estoque(itens):
    for it in itens:
        atual = estoque_atual(it["id"])
        redis("SET", f"estoque:{it['id']}", max(0, atual - int(it["quantidade"])))


# ===================== regras comerciais =====================
def frete(cep, itens, subtotal):
    """Mesma regra do site. Retorna (valor, prazo_texto)."""
    loja, prods = catalogo()
    d = re.sub(r"\D", "", cep or "")
    n = int(d[:2]) if len(d) == 8 else 99
    capital, gsp, sp = n <= 5, n <= 9, n <= 19
    todos_gratis = all(prods[i["id"]].get("freteGratis") for i in itens)
    gratis = todos_gratis or subtotal >= loja.get("freteGratisAcima", 10 ** 9)
    rapida = all(prods[i["id"]].get("entregaRapida") for i in itens)
    prazo = "amanhã" if (capital and rapida) else "1 a 2 dias úteis" if capital else "2 a 3 dias úteis" if gsp \
        else "3 a 5 dias úteis" if sp else "5 a 10 dias úteis"
    valor = 0.0 if gratis else (19.9 if sp else 39.9)
    return valor, prazo


def montar_carrinho(itens_cliente, pagamento, cep, cadastrado=False):
    """Recalcula tudo no servidor a partir do catálogo. Retorna (carrinho, erro)."""
    loja, prods = catalogo()
    if not isinstance(itens_cliente, list) or not itens_cliente or len(itens_cliente) > 30:
        return None, "Carrinho vazio ou inválido."
    itens = []
    for it in itens_cliente:
        pid = str(it.get("id", ""))
        p = prods.get(pid)
        if not p:
            return None, "Um produto do carrinho não existe mais. Atualize a página."
        q = int(it.get("quantidade", 1))
        if q < 1 or q > int(loja.get("limitePorProduto", 5)):
            return None, f"Quantidade inválida para {p['nome']} (máximo {loja.get('limitePorProduto', 5)} por pedido)."
        volt = it.get("voltagem")
        if p.get("voltagens"):
            if volt not in p["voltagens"]:
                return None, f"Escolha a voltagem de {p['nome']}."
        else:
            volt = None
        disp = estoque_atual(pid)
        if disp < q:
            return None, (f"{p['nome']} esgotou." if disp <= 0 else f"Só temos {disp} unidade(s) de {p['nome']}.")
        itens.append({"id": pid, "nome": p["nome"], "marca": p.get("marca"), "quantidade": q, "voltagem": volt,
                      "preco_unit": float(p["preco"]), "categoria": p.get("categoria")})
    f_cad = (1 - loja.get("descontoCadastro", 0) / 100) if cadastrado else 1
    f_pix = (1 - loja.get("descontoPix", 0) / 100) if pagamento == "pix" else 1
    for i in itens:  # preço efetivamente cobrado por unidade (é o mesmo enviado ao Mercado Pago)
        i["preco_cadastro"] = round(i["preco_unit"] * f_cad + 1e-9, 2)
        i["preco_pago"] = round(i["preco_cadastro"] * f_pix + 1e-9, 2)
    subtotal = round(sum(i["preco_unit"] * i["quantidade"] for i in itens), 2)
    desc_cad = round(subtotal - sum(i["preco_cadastro"] * i["quantidade"] for i in itens), 2)
    desconto = round(subtotal - sum(i["preco_pago"] * i["quantidade"] for i in itens), 2)
    vfrete, prazo = frete(cep, itens, subtotal)
    total = round(subtotal - desconto + vfrete, 2)
    return {"itens": itens, "subtotal": subtotal, "desconto": desconto, "desconto_cadastro": desc_cad,
            "desconto_pix": round(desconto - desc_cad, 2), "frete": vfrete, "prazo": prazo, "total": total}, None


# ===================== validações =====================
def cpf_valido(cpf):
    d = re.sub(r"\D", "", cpf or "")
    if len(d) != 11 or d == d[0] * 11:
        return False
    for t in (9, 10):
        s = sum(int(d[i]) * (t + 1 - i) for i in range(t))
        if (s * 10 % 11) % 10 != int(d[t]):
            return False
    return True


def limpar(s, n=120):
    return re.sub(r"[<>\x00-\x1f]", "", str(s or "")).strip()[:n]


# ===================== tokens =====================
def assinar(texto):
    return hmac.new(SEGREDO().encode(), texto.encode(), hashlib.sha256).hexdigest()[:32]


def novo_id():
    return datetime.now(BR).strftime("%y%m%d") + "-" + secrets.token_hex(3).upper()


def token_admin(validade_h=12):
    exp = int(time.time()) + validade_h * 3600
    return f"{exp}.{assinar('admin:' + str(exp))}"


def admin_ok(token):
    try:
        exp, sig = token.split(".")
        return int(exp) > time.time() and hmac.compare_digest(sig, assinar("admin:" + exp))
    except Exception:
        return False


# ===================== contas de clientes =====================
def hash_senha(senha, sal=None):
    sal = sal or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", senha.encode(), bytes.fromhex(sal), 200_000).hex()
    return f"pbkdf2${sal}${h}"


def senha_confere(senha, guardado):
    try:
        _, sal, h = guardado.split("$")
        return hmac.compare_digest(hash_senha(senha, sal).split("$")[2], h)
    except Exception:
        return False


def ler_conta(email):
    v = redis("GET", f"conta:{email.lower()}")
    return json.loads(v) if v else None


def salvar_conta(c):
    redis("SET", f"conta:{c['email']}", json.dumps(c, ensure_ascii=False))
    redis("ZADD", "contas", c.get("criado_ts", time.time()), c["email"])


def listar_contas(limite=2000):
    emails = redis("ZREVRANGE", "contas", 0, limite - 1) or []
    if not emails:
        return []
    vals = redis("MGET", *[f"conta:{e}" for e in emails]) or []
    contas = [json.loads(v) for v in vals if v]
    for c in contas:
        c.pop("senha", None)
    return contas


def token_conta(email, dias=30):
    exp = int(time.time()) + dias * 86400
    corpo = base64.urlsafe_b64encode(email.encode()).decode().rstrip("=")
    return f"{corpo}.{exp}.{assinar('conta:' + email + ':' + str(exp))}"


def conta_do_token(token):
    """Retorna a conta se o token (cabeçalho Authorization) for válido."""
    try:
        corpo, exp, sig = (token or "").split(".")
        email = base64.urlsafe_b64decode(corpo + "=" * (-len(corpo) % 4)).decode()
        if int(exp) < time.time() or not hmac.compare_digest(sig, assinar("conta:" + email + ":" + exp)):
            return None
        return ler_conta(email)
    except Exception:
        return None


def conta_da_requisicao(h):
    return conta_do_token((h.headers.get("Authorization") or "").removeprefix("Bearer ").strip())


# ===================== planilhas Google (via Apps Script) =====================
def planilha(tipo, dados):
    """Envia uma linha para a planilha (tipo 'clientes' ou 'pedidos'). Falha não interrompe a venda."""
    url, seg = ENV("PLANILHA_URL", ""), ENV("PLANILHA_SEGREDO", "")
    if not (url and seg):
        print(f"[planilha {tipo}] não configurada:", json.dumps(dados, ensure_ascii=False)[:200], flush=True)
        return False
    try:
        req = urllib.request.Request(url, data=json.dumps({"segredo": seg, "tipo": tipo, "dados": dados}).encode(),
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=12) as r:
            ok = json.loads(r.read() or b"{}").get("ok")
        if not ok:
            print(f"[planilha {tipo}] recusada", flush=True)
        return bool(ok)
    except Exception as ex:
        print(f"[planilha {tipo}] erro:", repr(ex), flush=True)
        return False


def linha_cliente(c, acesso=None):
    return {"Data do cadastro": c.get("criado", ""), "Nome": c["nome"], "Sobrenome": c["sobrenome"], "E-mail": c["email"],
            "Telefone": c["telefone"], "Aceita ofertas": "Sim" if c.get("ofertas") else "Não",
            "Último acesso": acesso, "Pedidos": c.get("pedidos"), "Total comprado (R$)": c.get("total_comprado")}


NOMES_STATUS = {"aguardando_pagamento": "Aguardando pagamento", "em_analise": "Em análise", "pagamento_recusado": "Pagamento recusado",
                "pago": "Pago", "em_separacao": "Em separação", "faturado": "Faturado", "enviado": "Enviado", "entregue": "Entregue",
                "cancelado": "Cancelado", "reembolsado": "Reembolsado", "estornado": "Estornado"}


def linha_pedido(p):
    c, e = p["cliente"], p["entrega"]
    return {"Pedido": p["id"], "Data": p["criado"], "Status": NOMES_STATUS.get(p["status"], p["status"]),
            "Cliente cadastrado": "Sim" if p.get("conta") else "Não", "Nome": c["nome"], "E-mail": c["email"],
            "Telefone": c["telefone"], "CPF": c["cpf"], "CEP": e["cep"], "Endereço": e["rua"], "Número": e["numero"],
            "Complemento": e.get("complemento", ""), "Bairro": e["bairro"], "Cidade": e["cidade"], "UF": e["uf"],
            "Itens": " | ".join(f"{i['quantidade']}x {i['nome']}{' (' + i['voltagem'] + ')' if i.get('voltagem') else ''}" for i in p["itens"]),
            "Pagamento": {"pix": "Pix", "cartao": "Cartão", "boleto": "Boleto"}.get(p["pagamento"], p["pagamento"]),
            "Subtotal (R$)": p["subtotal"], "Desconto cadastro (R$)": p.get("desconto_cadastro", 0),
            "Desconto Pix (R$)": p.get("desconto_pix", 0), "Frete (R$)": p["frete"], "Total (R$)": p["total"],
            "Rastreio": p.get("rastreio", ""), "Atualizado em": agora_iso()}


def registrar_compra_na_conta(ped):
    """Soma o pedido pago no cadastro do cliente (para o CRM e a planilha de clientes)."""
    if not ped.get("conta"):
        return
    c = ler_conta(ped["conta"])
    if not c:
        return
    c["pedidos"] = int(c.get("pedidos") or 0) + 1
    c["total_comprado"] = round(float(c.get("total_comprado") or 0) + ped["total"], 2)
    salvar_conta(c)
    planilha("clientes", linha_cliente(c))


# ===================== Mercado Pago =====================
def mp(metodo, caminho, corpo=None, idem=None):
    if not MP_TOKEN():
        raise RuntimeError("MP_ACCESS_TOKEN não configurado")
    h = {"Authorization": f"Bearer {MP_TOKEN()}", "Content-Type": "application/json"}
    if idem:
        h["X-Idempotency-Key"] = idem
    req = urllib.request.Request("https://api.mercadopago.com" + caminho, method=metodo, headers=h,
                                 data=json.dumps(corpo).encode() if corpo is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Mercado Pago {e.code}: {e.read().decode()[:400]}")


def publicado():
    """True quando o site roda na Vercel (no ar). No ar NUNCA existe pagamento simulado."""
    return bool(ENV("VERCEL")) or SITE().startswith("https://")


def modo_mp():
    """'teste' (token TEST-...), 'producao' (APP_USR-...) ou None se não houver token. Nunca expõe o token."""
    t = MP_TOKEN()
    if not t:
        return None
    return "teste" if t.startswith("TEST-") else "producao"


def criar_preferencia(pedido):
    """Cria a preferência do Checkout Pro no Mercado Pago para um pedido já salvo.
    Devolve o link de pagamento (init_point). Valores vêm do pedido, que o servidor calculou."""
    loja, prods = catalogo()
    pid, site = pedido["id"], SITE()
    acompanhar = f"{site}/pedido.html?id={pid}&k={pedido['chave']}"
    itens_mp = []
    for it in pedido["itens"]:
        p = prods.get(it["id"]) or {}
        img = (p.get("imagens") or [None])[0]
        itens_mp.append({
            "id": it["id"], "title": (it["nome"] + (f" ({it['voltagem']})" if it.get("voltagem") else ""))[:250],
            "description": (p.get("descricao") or "")[:250], "category_id": "home_appliances",
            "quantity": int(it["quantidade"]), "currency_id": "BRL", "unit_price": float(it["preco_pago"]),
            **({"picture_url": f"{site}/{img}"} if img else {}),
        })
    c, e = pedido["cliente"], pedido["entrega"]
    partes = c["nome"].split()
    excluir = {"pix": ["credit_card", "debit_card", "ticket", "prepaid_card"],
               "cartao": ["bank_transfer", "ticket", "atm"],
               "boleto": ["credit_card", "debit_card", "bank_transfer", "prepaid_card"]}[pedido["pagamento"]]
    pref = {
        "items": itens_mp,
        "payer": {"name": partes[0], "surname": " ".join(partes[1:]), "email": c["email"],
                  "phone": {"area_code": c["telefone"][:2], "number": c["telefone"][2:]},
                  "identification": {"type": "CPF", "number": c["cpf"]},
                  "address": {"zip_code": e["cep"].replace("-", ""), "street_name": e["rua"], "street_number": e["numero"]}},
        "shipments": {"cost": float(pedido["frete"]), "mode": "not_specified"},
        "payment_methods": {"excluded_payment_types": [{"id": t} for t in excluir],
                            "installments": int(loja.get("parcelas", 10))},
        "back_urls": {"success": acompanhar, "pending": acompanhar, "failure": acompanhar},
        "external_reference": pid,
        "statement_descriptor": (loja.get("faturaCartao") or "MEGACASASP")[:13],
        "expires": True,
        "expiration_date_to": (datetime.now(BR) + timedelta(hours=72)).isoformat(timespec="milliseconds"),
        "metadata": {"pedido_id": pid},
    }
    if site.startswith("https://"):
        pref["auto_return"] = "approved"  # o MP só aceita auto_return com endereço https
        pref["notification_url"] = f"{site}/api/webhook?source_news=webhooks"
    tentativa = int(pedido.get("tentativas_pagamento", 0)) + 1
    r = mp("POST", "/checkout/preferences", pref, idem=f"{pid}-{tentativa}")
    link = (r.get("sandbox_init_point") if modo_mp() == "teste" else None) or r["init_point"]
    pedido.update(mp_preferencia=r.get("id"), link_pagamento=link, tentativas_pagamento=tentativa)
    salvar_pedido(pedido)
    return link


def webhook_assinatura_ok(headers, data_id):
    """Confere o cabeçalho x-signature do Mercado Pago (chave secreta do webhook)."""
    segredo = ENV("MP_WEBHOOK_SECRET", "")
    if not segredo:
        return True  # sem segredo configurado: confiamos só na consulta direta ao MP (ver webhook.py)
    partes = dict(p.split("=", 1) for p in (headers.get("x-signature") or "").split(",") if "=" in p)
    ts, v1 = partes.get("ts", ""), partes.get("v1", "")
    rid = headers.get("x-request-id") or ""
    did = data_id.lower() if data_id.isalnum() else data_id
    manifesto = f"id:{did};request-id:{rid};ts:{ts};"
    calc = hmac.new(segredo.encode(), manifesto.encode(), hashlib.sha256).hexdigest()
    return bool(v1) and hmac.compare_digest(calc, v1)


STATUS_MP = {
    "approved": "pago", "authorized": "pago", "pending": "aguardando_pagamento", "in_process": "em_analise",
    "in_mediation": "em_analise", "rejected": "pagamento_recusado", "cancelled": "cancelado",
    "refunded": "reembolsado", "charged_back": "estornado",
}


def atualizar_por_pagamento(pag):
    pid = pag.get("external_reference")
    ped = ler_pedido(pid) if pid else None
    if not ped:
        return None
    novo = STATUS_MP.get(pag.get("status"), ped["status"])
    ped["pagamento_mp"] = {
        "id": pag.get("id"), "status": pag.get("status"), "detalhe": pag.get("status_detail"),
        "metodo": pag.get("payment_method_id"), "tipo": pag.get("payment_type_id"),
        "parcelas": pag.get("installments"), "valor": pag.get("transaction_amount"),
        "aprovado_em": pag.get("date_approved"),
    }
    # só avança status de pagamento; não volta pedido já em separação/enviado
    if ped["status"] in ("aguardando_pagamento", "em_analise", "pagamento_recusado") or novo in ("reembolsado", "estornado", "cancelado"):
        if novo == "pago" and not ped.get("estoque_baixado"):
            baixar_estoque(ped["itens"])
            ped["estoque_baixado"] = True
            registrar_compra_na_conta(ped)
        mudou = ped["status"] != novo
        if mudou:
            ped.setdefault("historico", []).append({"quando": agora_iso(), "status": novo, "por": "Mercado Pago"})
        ped["status"] = novo
        if mudou:
            planilha("pedidos", linha_pedido(ped))
    salvar_pedido(ped)
    return ped


def agora_iso():
    return datetime.now(BR).isoformat(timespec="seconds")


# ===================== HTTP helpers =====================
def ler_json(h):
    n = int(h.headers.get("Content-Length") or 0)
    if n > 100_000:
        raise ValueError("corpo grande demais")
    return json.loads(h.rfile.read(n) or b"{}")


def responder(h, codigo, dados):
    corpo = json.dumps(dados, ensure_ascii=False).encode()
    h.send_response(codigo)
    h.send_header("Content-Type", "application/json; charset=utf-8")
    h.send_header("Cache-Control", "no-store")
    h.send_header("X-Content-Type-Options", "nosniff")
    h.end_headers()
    h.wfile.write(corpo)


def query(h):
    from urllib.parse import parse_qs, urlparse
    return {k: v[0] for k, v in parse_qs(urlparse(h.path).query).items()}


def ip(h):
    return (h.headers.get("x-forwarded-for") or h.client_address[0] or "").split(",")[0].strip()


def limitar(h, chave, maximo, janela=600):
    """Limite simples de tentativas por IP (protege login e checkout de abuso)."""
    k = f"lim:{chave}:{ip(h)}:{int(time.time() // janela)}"
    n = redis("INCRBY", k, 1)
    if n == 1 and _redis_cfg()[0]:
        redis("EXPIRE", k, janela)
    return int(n) <= maximo
