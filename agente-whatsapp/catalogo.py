"""Catálogo das lojas: lê os mesmos produtos.js dos sites e oferece as ferramentas do agente.

O agente busca o produtos.js publicado no site (atualiza a cada 5 minutos). Assim, quando você
muda preço ou estoque no site e dá Push, o WhatsApp já responde com o valor novo.
Se o site estiver fora do ar, usa os arquivos locais do repositório.
"""
import json
import os
import re
import threading
import time
import unicodedata
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# nome da loja -> (URL do produtos.js publicado, arquivo local)
FONTES = {
    "cellphones": ("https://cellphonessp00-cmyk.github.io/cellphone/produtos.js", RAIZ / "produtos.js"),
    "megacasa": ("https://cellphonessp00-cmyk.github.io/cellphone/megacasa/produtos.js", RAIZ / "megacasa" / "produtos.js"),
}
SITES = {
    "cellphones": "https://cellphonessp00-cmyk.github.io/cellphone/",
    "megacasa": "https://cellphonessp00-cmyk.github.io/cellphone/megacasa/",
}
VALIDADE = 300  # segundos


# ---------- leitura do produtos.js (objeto JavaScript -> Python) ----------
def _extrair(texto: str, nome: str):
    """Acha `const NOME = {...}` ou `[...]` e converte o literal JS em objeto Python."""
    m = re.search(r"const\s+" + nome + r"\s*=\s*", texto)
    if not m:
        return None
    i = m.end()
    while texto[i].isspace() or texto.startswith("/*", i):  # pula /*INICIO_PRODUTOS*/
        i = texto.find("*/", i) + 2 if texto.startswith("/*", i) else i + 1
    abre = texto[i]
    fecha = {"{": "}", "[": "]"}[abre]
    nivel, j, em_str, esc = 0, i, None, False
    saida = []
    while j < len(texto):
        c = texto[j]
        if em_str:
            saida.append(c)
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
            saida.append('"' if c == "'" else c)
            j += 1
            continue
        if texto.startswith("//", j):  # comentário de linha
            j = texto.find("\n", j)
            continue
        if texto.startswith("/*", j):  # comentário de bloco (ex.: /*INICIO_PRODUTOS*/)
            j = texto.find("*/", j) + 2
            continue
        if c.isalpha() or c == "_":
            k = j
            while k < len(texto) and (texto[k].isalnum() or texto[k] == "_"):
                k += 1
            palavra = texto[j:k]
            resto = texto[k:].lstrip()
            if resto.startswith(":") and palavra not in ("true", "false", "null"):
                saida.append(json.dumps(palavra))  # chave sem aspas -> "chave"
            else:
                saida.append(palavra)
            j = k
            continue
        if c == abre:
            nivel += 1
        elif c == fecha:
            nivel -= 1
            if nivel == 0:
                saida.append(c)
                break
        saida.append(c)
        j += 1
    bruto = "".join(saida)
    bruto = re.sub(r",(\s*[}\]])", r"\1", bruto)  # vírgula sobrando no fim
    return json.loads(bruto)


def _carregar_loja(loja: str):
    url, local = FONTES[loja]
    texto = None
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            texto = r.read().decode("utf-8")
    except Exception:
        if local.exists():
            texto = local.read_text(encoding="utf-8")
    if not texto:
        raise RuntimeError(f"Não consegui ler o catálogo da loja {loja}")
    info = _extrair(texto, "LOJA") or {}
    produtos = _extrair(texto, "PRODUTOS") or []
    cats = _extrair(texto, "CATEGORIAS") or {}
    if isinstance(cats, list):  # Mega Casa: lista de {id, nome}; Cellphones: {id: nome}
        cats = {c["id"]: c["nome"] for c in cats}
    for p in produtos:
        p["_loja"] = loja
        p["_lojaNome"] = info.get("nome", loja)
        p["_categoriaNome"] = cats.get(p.get("categoria"), p.get("categoria"))
        p["_link"] = SITES[loja] + "#p=" + p["id"]
    return info, produtos


class Catalogo:
    def __init__(self, lojas):
        self.lojas = lojas
        self._trava = threading.Lock()
        self._quando = 0
        self.info = {}
        self.produtos = []

    def atualizar(self, forcar=False):
        with self._trava:
            if not forcar and time.time() - self._quando < VALIDADE and self.produtos:
                return
            info, produtos = {}, []
            for loja in self.lojas:
                i, ps = _carregar_loja(loja)
                info[loja] = i
                produtos += ps
            self.info, self.produtos, self._quando = info, produtos, time.time()

    def por_id(self, pid):
        self.atualizar()
        return next((p for p in self.produtos if p["id"] == pid), None)


# ---------- regras de preço (iguais às dos sites) ----------
def _norm(s):
    return unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower()


def brl(v):
    return "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _cond(cat: Catalogo, p):
    info = cat.info.get(p["_loja"], {})
    parcelas = info.get("parcelas", 10)
    pix = info.get("descontoPix", 0)               # Cellphones SP não tem desconto no Pix
    frete_acima = info.get("freteGratisAcima")      # None = sem regra de frete grátis por valor
    return parcelas, pix, frete_acima


def _specs_texto(p):
    s = p.get("specs") or {}
    return " ".join(map(str, s.values() if isinstance(s, dict) else s))


def _resumo(cat, p):
    parcelas, pix, frete_acima = _cond(cat, p)
    preco = p["preco"]
    antigo = p.get("precoAntigo") or 0
    r = {
        "id": p["id"],
        "nome": p["nome"],
        "marca": p.get("marca"),
        "loja": p["_lojaNome"],
        "categoria": p["_categoriaNome"],
        "preco": brl(preco),
        "parcelamento": f"{parcelas}x de {brl(preco / parcelas)} sem juros",
        "estoque": "esgotado" if p.get("estoque", 0) <= 0 else (f"últimas {p['estoque']} unidades" if p["estoque"] <= 3 else "disponível"),
        "link": p["_link"],
    }
    if pix:
        r["preco_pix"] = brl(preco * (1 - pix / 100))
    if antigo > preco:
        r["de"] = brl(antigo)
        r["desconto"] = f"{round((1 - preco / antigo) * 100)}% OFF"
    if p.get("voltagens"):
        r["voltagens"] = p["voltagens"]
    if p.get("freteGratis") or (frete_acima and preco >= frete_acima):
        r["frete"] = "grátis"
    return r


# ---------- ferramentas que o Claude pode chamar ----------
FERRAMENTAS = [
    {
        "name": "buscar_produtos",
        "description": "Busca produtos no catálogo das lojas (preço, preço no Pix, parcelas, estoque e link). "
                       "Use sempre antes de citar qualquer preço ou disponibilidade. Termo vazio lista os destaques.",
        "input_schema": {
            "type": "object",
            "properties": {
                "termo": {"type": "string", "description": "Palavras da busca, ex.: 'iphone 16', 'air fryer', 'moto elétrica'"},
                "preco_max": {"type": "number", "description": "Preço máximo em reais (opcional)"},
                "so_disponiveis": {"type": "boolean", "description": "true para esconder esgotados"},
            },
            "required": ["termo"],
            "additionalProperties": False,
        },
    },
    {
        "name": "detalhes_produto",
        "description": "Ficha completa de um produto (especificações, descrição, voltagens) pelo id retornado na busca.",
        "input_schema": {
            "type": "object",
            "properties": {"id": {"type": "string"}},
            "required": ["id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "calcular_frete",
        "description": "Estima frete e prazo de entrega de um produto para um CEP.",
        "input_schema": {
            "type": "object",
            "properties": {"cep": {"type": "string"}, "id": {"type": "string"}},
            "required": ["cep", "id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "registrar_pedido",
        "description": "Registra o pedido do cliente e avisa a equipe para confirmar estoque, frete e enviar o pagamento. "
                       "Só chame depois de o cliente confirmar os itens, quantidades e a forma de pagamento.",
        "input_schema": {
            "type": "object",
            "properties": {
                "itens": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "quantidade": {"type": "integer", "minimum": 1},
                            "voltagem": {"type": "string"},
                        },
                        "required": ["id", "quantidade"],
                        "additionalProperties": False,
                    },
                },
                "nome_cliente": {"type": "string"},
                "cep": {"type": "string"},
                "pagamento": {"type": "string", "enum": ["pix", "cartao", "boleto", "a_combinar"]},
                "observacoes": {"type": "string"},
            },
            "required": ["itens", "pagamento"],
            "additionalProperties": False,
        },
    },
    {
        "name": "chamar_atendente",
        "description": "Passa a conversa para um atendente humano: reclamação, troca/garantia, negociação de preço, "
                       "pedido do cliente para falar com pessoa, ou qualquer coisa que você não consiga resolver.",
        "input_schema": {
            "type": "object",
            "properties": {"motivo": {"type": "string"}},
            "required": ["motivo"],
            "additionalProperties": False,
        },
    },
]


def buscar_produtos(cat: Catalogo, termo="", preco_max=None, so_disponiveis=False):
    cat.atualizar()
    termos = _norm(termo).split()
    achados = []
    for p in cat.produtos:
        texto = _norm(" ".join([p["nome"], p.get("marca", ""), p["_categoriaNome"] or "", p.get("descricao", ""),
                                p["_lojaNome"], _specs_texto(p)]))
        if termos:
            bate = sum(t in texto for t in termos)
            if bate < max(1, len(termos) - 1):  # tolera uma palavra que não bate
                continue
            nome = _norm(p["nome"] + " " + p.get("marca", ""))
            pontos = bate * 10 + sum(t in nome for t in termos) * 5 - (bate < len(termos)) * 20
        elif not p.get("destaque"):
            continue
        else:
            pontos = 0
        if preco_max and p["preco"] > preco_max:
            continue
        if so_disponiveis and p.get("estoque", 0) <= 0:
            continue
        achados.append((pontos, p.get("estoque", 0) > 0, p))
    achados.sort(key=lambda x: (-x[0], not x[1], x[2]["preco"]))
    res = [_resumo(cat, p) for _, _, p in achados[:8]]
    return {"resultados": res, "total": len(achados)} if res else {"resultados": [], "aviso": "Nada encontrado com esse termo."}


def detalhes_produto(cat: Catalogo, id):
    p = cat.por_id(id)
    if not p:
        return {"erro": f"Produto '{id}' não existe. Use buscar_produtos para achar o id."}
    r = _resumo(cat, p)
    r["descricao"] = p.get("descricao")
    r["especificacoes"] = p.get("specs")
    return r


def calcular_frete(cat: Catalogo, cep, id):
    p = cat.por_id(id)
    if not p:
        return {"erro": f"Produto '{id}' não existe."}
    d = re.sub(r"\D", "", cep)
    if len(d) != 8:
        return {"erro": "CEP inválido: precisa ter 8 números."}
    _, _, frete_acima = _cond(cat, p)
    n = int(d[:2])
    capital, grande_sp, sp = n <= 5, n <= 9, n <= 19
    if p.get("entregaRapida") and capital:
        prazo = "amanhã"
    elif capital:
        prazo = "1 a 2 dias úteis"
    elif grande_sp:
        prazo = "2 a 3 dias úteis"
    elif sp:
        prazo = "3 a 5 dias úteis"
    else:
        prazo = "5 a 10 dias úteis"
    gratis = p.get("freteGratis") or (frete_acima and p["preco"] >= frete_acima)
    valor = "grátis" if gratis else brl(19.9 if sp else 39.9)
    return {"cep": f"{d[:5]}-{d[5:]}", "frete": valor, "prazo": prazo, "observacao": "estimativa; a equipe confirma no fechamento"}


def montar_pedido(cat: Catalogo, itens, pagamento, nome_cliente=None, cep=None, observacoes=None):
    linhas, total, erros = [], 0.0, []
    for it in itens:
        p = cat.por_id(it["id"])
        if not p:
            erros.append(f"produto '{it['id']}' não existe")
            continue
        if p.get("estoque", 0) <= 0:
            erros.append(f"{p['nome']} está esgotado")
            continue
        q = min(int(it["quantidade"]), p["estoque"])
        sub = p["preco"] * q
        total += sub
        linhas.append({"id": p["id"], "nome": p["nome"], "quantidade": q, "voltagem": it.get("voltagem"), "subtotal": brl(sub)})
    if erros and not linhas:
        return None, {"erro": "; ".join(erros)}
    pix = cat.info.get(cat.por_id(linhas[0]["id"])["_loja"], {}).get("descontoPix", 0)
    pedido = {
        "itens": linhas,
        "total": brl(total),
        "total_pix": brl(total * (1 - pix / 100)) if pix else None,
        "pagamento": pagamento,
        "nome_cliente": nome_cliente,
        "cep": cep,
        "observacoes": observacoes,
    }
    if erros:
        pedido["avisos"] = erros
    return pedido, None
