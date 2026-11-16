"""Gera as páginas que o Google indexa. Rode sempre que mudar produtos.js ou LOJA:

    python gerar_site.py

Cria/atualiza:
  produto/<id>/index.html     página própria de cada produto (título, descrição, dados estruturados Product)
  atendimento.html, entrega.html, trocas-e-devolucoes.html, politica-de-privacidade.html, termos-de-uso.html
  sitemap.xml, robots.txt, favicon.svg e as tags de SEO da página inicial
"""
import html
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
sys.path.insert(0, str(RAIZ / "api"))
from _loja import _extrair  # noqa: E402

def vincular_imagens():
    """Liga sozinho as fotos colocadas em img/: img/<id>.jpg (capa), img/<id>-2.jpg, img/<id>-3.jpg..."""
    arq = RAIZ / "produtos.js"
    t = arq.read_text(encoding="utf-8")
    pasta = RAIZ / "img"
    if not pasta.exists():
        return t
    novos = 0
    for p in _extrair(t, "PRODUTOS"):
        if p.get("imagens"):
            continue
        fotos = []
        for sufixo in [""] + [f"-{n}" for n in range(2, 9)]:
            for ext in ("jpg", "jpeg", "png", "webp"):
                f = pasta / f"{p['id']}{sufixo}.{ext}"
                if f.exists():
                    fotos.append(f"img/{f.name}")
                    break
        if fotos:
            t = t.replace(f'id:"{p["id"]}",', f'id:"{p["id"]}", imagens:{json.dumps(fotos)},', 1)
            novos += 1
    if novos:
        arq.write_text(t, encoding="utf-8")
        print(f"Fotos ligadas a {novos} produto(s).")
    return t


TEXTO = vincular_imagens()
LOJA = _extrair(TEXTO, "LOJA")
PRODUTOS = _extrair(TEXTO, "PRODUTOS")
CATS = {c["id"]: c["nome"] for c in _extrair(TEXTO, "CATEGORIAS")}
SITE = LOJA["site"].rstrip("/")
NOME = LOJA["nome"]
E = lambda s: html.escape(str(s or ""), quote=True)
brl = lambda v: "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

INDEX = (RAIZ / "index.html").read_text(encoding="utf-8")
CAB = INDEX[INDEX.index('<div class="topo-aviso">'): INDEX.index("</header>") + len("</header>")]
FIM = INDEX[INDEX.index('<footer class="rodape">'): INDEX.index('<script src="produtos.js">')]


def rebase(trecho, base):
    """Ajusta links relativos do cabeçalho/rodapé para páginas em subpastas."""
    trecho = re.sub(r'href="#"', f'href="{base}./"', trecho)
    return re.sub(r'(href|src)="(?!https?:|#|mailto:|tel:|\.\./)([^"]+)"', lambda m: f'{m.group(1)}="{base}{m.group(2)}"', trecho)


def pagina(caminho_rel, titulo, descricao, corpo, base="", extra_head="", body_attrs="", indexar=True, url=None):
    url = url or f"{SITE}/{caminho_rel}".replace("/index.html", "/")
    doc = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(titulo)}</title>
<meta name="description" content="{E(descricao)}">
<meta name="theme-color" content="#0b2d6b">
{'' if indexar else '<meta name="robots" content="noindex">'}
<link rel="canonical" href="{E(url)}">
<meta property="og:site_name" content="{E(NOME)}">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="{E(titulo)}">
<meta property="og:description" content="{E(descricao)}">
<meta property="og:url" content="{E(url)}">
{extra_head}
<link rel="icon" href="{base}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{base}styles.css">
</head>
<body data-base="{base}" {body_attrs}>
{rebase(CAB, base)}
<main class="cont">
{corpo}
</main>
{rebase(FIM, base)}
<script src="{base}produtos.js"></script>
<script src="{base}conta.js"></script>
<script src="{base}app.js"></script>
</body>
</html>
"""
    destino = RAIZ / caminho_rel
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(doc, encoding="utf-8")


# ---------------- produtos ----------------
def produto(p):
    pid = p["id"]
    fotos = [f"{SITE}/{f}" for f in p.get("imagens") or []]
    disp = "https://schema.org/InStock" if p.get("estoque", 0) > 0 else "https://schema.org/OutOfStock"
    desc = f"{p['nome']} por {brl(p['preco'])} ou {LOJA['parcelas']}x sem juros. {p.get('descricao', '')}"[:155]
    ld = {
        "@context": "https://schema.org", "@type": "Product", "name": p["nome"], "sku": pid,
        "description": p.get("descricao"), "brand": {"@type": "Brand", "name": p.get("marca")},
        "category": CATS.get(p["categoria"]),
        **({"image": fotos} if fotos else {}),
        "offers": {"@type": "Offer", "url": f"{SITE}/produto/{pid}/", "priceCurrency": "BRL", "price": f"{p['preco']:.2f}",
                   "availability": disp, "itemCondition": "https://schema.org/NewCondition",
                   "seller": {"@type": "Organization", "name": NOME},
                   "shippingDetails": {"@type": "OfferShippingDetails", "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "BR"},
                                       "shippingRate": {"@type": "MonetaryAmount", "value": "0" if p.get("freteGratis") else "19.90", "currency": "BRL"}},
                   "hasMerchantReturnPolicy": {"@type": "MerchantReturnPolicy", "applicableCountry": "BR",
                                               "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                                               "merchantReturnDays": 7, "returnFees": "https://schema.org/FreeReturn"}},
    }
    if LOJA.get("mostrarAvaliacoes") and p.get("avaliacoes"):
        ld["aggregateRating"] = {"@type": "AggregateRating", "ratingValue": p["avaliacao"], "reviewCount": p["avaliacoes"]}
    trilha = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Início", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": CATS.get(p["categoria"]), "item": f"{SITE}/#c={p['categoria']}"},
        {"@type": "ListItem", "position": 3, "name": p["nome"]}]}
    head = (f'<meta property="og:type" content="product">\n'
            + (f'<meta property="og:image" content="{E(fotos[0])}">\n' if fotos else "")
            + f'<meta property="product:price:amount" content="{p["preco"]:.2f}">\n<meta property="product:price:currency" content="BRL">\n'
            + f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n'
            + f'<script type="application/ld+json">{json.dumps(trilha, ensure_ascii=False)}</script>')
    specs = "".join(f"<tr><th>{E(k)}</th><td>{E(v)}</td></tr>" for k, v in (p.get("specs") or {}).items())
    # conteúdo estático (para o Google e para quem está sem JavaScript); o app.js substitui pela versão interativa
    corpo = f"""<div class="pagina-produto" id="produtoPagina">
  <nav class="trilha"><a href="../../">Início</a> › {E(CATS.get(p['categoria']))}</nav>
  <h1>{E(p['nome'])}</h1>
  <p>Marca: {E(p.get('marca'))}</p>
  <p class="preco">{brl(p['preco'])}</p>
  <p>Em até {LOJA['parcelas']}x sem juros no cartão ou {brl(p['preco'] * (1 - LOJA['descontoPix'] / 100))} no Pix.</p>
  <h2>Descrição do produto</h2><p>{E(p.get('descricao'))}</p>
  <h2>Ficha técnica</h2><table class="specs">{specs}</table>
</div>"""
    pagina(f"produto/{pid}/index.html", f"{p['nome']} | {NOME}", desc, corpo, base="../../", extra_head=head,
           body_attrs=f'data-produto="{E(pid)}"')


# ---------------- páginas institucionais ----------------
def institucional(arquivo, titulo, descricao, conteudo):
    corpo = f'<article class="caixa texto-legal" style="margin-top:16px"><h1>{E(titulo)}</h1>{conteudo}</article>'
    pagina(arquivo, f"{titulo} | {NOME}", descricao, corpo)


EMPRESA = f"{E(LOJA['razaoSocial'])}, CNPJ {E(LOJA['cnpj'])}, com sede em {E(LOJA['endereco'])}"
CONTATO = f"e-mail <b>{E(LOJA['email'])}</b>, telefone/WhatsApp <b>{E(LOJA['telefone'])}</b>"

PAGINAS = {
    "atendimento.html": ("Central de atendimento", "Fale com a Mega Casa SP: WhatsApp, e-mail, horário de atendimento e dúvidas frequentes.", f"""
<p>Atendimento de segunda a sábado, das 9h às 19h, pelo {CONTATO}.</p>
<p><a class="btn btn-verde" href="https://wa.me/{E(LOJA['whatsapp'])}" target="_blank" rel="noopener">💬 Falar no WhatsApp</a></p>
<h2>Dúvidas frequentes</h2>
<p><b>Como acompanho meu pedido?</b><br>Pelo link enviado após a compra, na página <a href="pedido.html">Acompanhe seu pedido</a>.</p>
<p><b>Quais as formas de pagamento?</b><br>Pix com {LOJA['descontoPix']}% de desconto, cartão de crédito em até {LOJA['parcelas']}x sem juros e boleto. Os pagamentos são processados pelo Mercado Pago; não armazenamos dados de cartão.</p>
<p><b>O produto tem garantia?</b><br>Todos os produtos são novos, com nota fiscal e garantia do fabricante.</p>
<p><b>Posso desistir da compra?</b><br>Sim, em até 7 dias corridos após o recebimento. Veja a <a href="trocas-e-devolucoes.html">política de trocas e devoluções</a>.</p>
<p><b>Quem vende?</b><br>{EMPRESA}.</p>"""),
    "entrega.html": ("Política de entrega", "Prazos, valores de frete e regras de entrega da Mega Casa SP.", f"""
<p>O prazo de entrega começa a contar após a aprovação do pagamento (Pix e cartão: na hora; boleto: até 3 dias úteis).</p>
<h2>Frete</h2><p>Frete grátis para compras a partir de {brl(LOJA['freteGratisAcima'])} e para produtos com o selo "Frete grátis". Para os demais, o valor é mostrado antes da finalização da compra.</p>
<h2>Prazos estimados</h2><ul><li>São Paulo capital: 1 a 2 dias úteis (produtos com entrega rápida: no dia seguinte)</li><li>Grande São Paulo: 2 a 3 dias úteis</li><li>Interior de SP: 3 a 5 dias úteis</li><li>Demais estados: 5 a 10 dias úteis</li></ul>
<h2>Produtos de grande porte</h2><p>Geladeiras, lavadoras e motos elétricas são entregues até a porta da residência, em horário comercial. Confira as medidas de portas, corredores e elevadores antes da compra. É necessário que um responsável maior de 18 anos receba e confira o produto no ato da entrega.</p>
<h2>Na entrega</h2><p>Recuse o produto se a embalagem estiver violada ou danificada e entre em contato conosco.</p>"""),
    "trocas-e-devolucoes.html": ("Trocas e devoluções", "Direito de arrependimento em 7 dias, trocas por defeito e garantia na Mega Casa SP.", f"""
<h2>Direito de arrependimento (7 dias)</h2><p>Conforme o artigo 49 do Código de Defesa do Consumidor, você pode desistir da compra em até 7 dias corridos após o recebimento, sem custo. O produto deve ser devolvido com todos os acessórios e, se possível, na embalagem original. O reembolso é feito na mesma forma de pagamento: estorno no cartão ou devolução via Pix/transferência em até 10 dias úteis após o recebimento do produto.</p>
<h2>Produto com defeito</h2><p>Até 90 dias após o recebimento (art. 26 do CDC), entre em contato para análise. Após esse período, a garantia é tratada diretamente com a assistência técnica autorizada do fabricante.</p>
<h2>Como solicitar</h2><p>Fale com a gente pelo {CONTATO}, informando o número do pedido.</p>"""),
    "politica-de-privacidade.html": ("Política de privacidade", "Como a Mega Casa SP coleta, usa e protege seus dados pessoais (LGPD).", f"""
<p>Esta política explica como {EMPRESA} ("nós") trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
<h2>Dados coletados</h2><p>Nome, CPF, e-mail, telefone e endereço de entrega, informados por você na finalização da compra. Os dados de pagamento (como número de cartão) são informados diretamente no Mercado Pago e <b>não</b> chegam até nós.</p>
<h2>Para que usamos</h2><ul><li>Processar e entregar seu pedido e emitir a nota fiscal;</li><li>Enviar informações sobre o pedido e prestar atendimento;</li><li>Cumprir obrigações legais e fiscais e prevenir fraudes.</li></ul>
<h2>Compartilhamento</h2><p>Somente com o Mercado Pago (pagamento), transportadoras (entrega) e autoridades quando exigido por lei. Não vendemos seus dados.</p>
<h2>Armazenamento e segurança</h2><p>Os dados ficam em servidores com acesso restrito e conexão criptografada (HTTPS), pelo tempo necessário para as finalidades acima e para cumprir prazos legais.</p>
<h2>Seus direitos</h2><p>Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, e revogar consentimentos, pelo {CONTATO}.</p>
<h2>Cookies</h2><p>Usamos apenas o armazenamento local do navegador para guardar seu carrinho, lista de desejos e CEP. Não usamos cookies de rastreamento de terceiros.</p>
<p class="muted">Atualizada em {date.today().strftime('%d/%m/%Y')}.</p>"""),
    "termos-de-uso.html": ("Termos de uso", "Condições de uso do site e de compra na Mega Casa SP.", f"""
<p>Este site é operado por {EMPRESA}. Ao comprar, você concorda com estes termos.</p>
<h2>Preços e ofertas</h2><p>Preços e condições valem para compras no site, enquanto durarem os estoques, e podem mudar sem aviso prévio. Vale o preço exibido no momento da finalização do pedido. Em caso de erro evidente de preço ou de cadastro, o pedido poderá ser cancelado com reembolso integral.</p>
<h2>Pagamento</h2><p>Os pagamentos são processados pelo Mercado Pago. O pedido só é confirmado após a aprovação do pagamento.</p>
<h2>Imagens</h2><p>As imagens são ilustrativas; as características válidas são as descritas na ficha técnica do produto.</p>
<h2>Motos e ciclomotores elétricos</h2><p>Verifique as regras de habilitação, emplacamento e uso de equipamentos obrigatórios conforme as resoluções do CONTRAN para cada categoria de veículo.</p>
<h2>Contato</h2><p>{CONTATO}.</p>"""),
}


def favicon():
    (RAIZ / "favicon.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b2d6b"/>'
                                      '<path d="M14 30 32 16l18 14v18H14z" fill="#ffd60a"/><rect x="27" y="34" width="10" height="14" fill="#0b2d6b"/></svg>', encoding="utf-8")


def seo_home():
    org = {"@context": "https://schema.org", "@type": "OnlineStore", "name": NOME, "url": SITE + "/", "email": LOJA["email"],
           "telephone": LOJA["telefone"], "taxID": LOJA["cnpj"], "legalName": LOJA["razaoSocial"],
           "sameAs": [f"https://www.instagram.com/{LOJA['instagram']}/"]}
    site = {"@context": "https://schema.org", "@type": "WebSite", "name": NOME, "url": SITE + "/",
            "potentialAction": {"@type": "SearchAction", "target": SITE + "/#q={search_term_string}", "query-input": "required name=search_term_string"}}
    bloco = (f'<!--SEO-->\n<link rel="canonical" href="{SITE}/">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="{E(NOME)}">\n'
             f'<meta property="og:title" content="{E(NOME)} | Eletrodomésticos e Motos Elétricas">\n<meta property="og:url" content="{SITE}/">\n<meta property="og:locale" content="pt_BR">\n'
             f'<script type="application/ld+json">{json.dumps(org, ensure_ascii=False)}</script>\n'
             f'<script type="application/ld+json">{json.dumps(site, ensure_ascii=False)}</script>\n<!--/SEO-->')
    novo = re.sub(r"<!--SEO-->.*?<!--/SEO-->|<!--SEO-->", lambda m: bloco, INDEX, count=1, flags=re.S)
    (RAIZ / "index.html").write_text(novo, encoding="utf-8")


def sitemap():
    hoje = date.today().isoformat()
    urls = [(SITE + "/", "1.0")] + [(f"{SITE}/produto/{p['id']}/", "0.8") for p in PRODUTOS] + [(f"{SITE}/{a}", "0.3") for a in PAGINAS]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"  <url><loc>{E(u)}</loc><lastmod>{hoje}</lastmod><priority>{pr}</priority></url>\n" for u, pr in urls) + "</urlset>\n"
    (RAIZ / "sitemap.xml").write_text(xml, encoding="utf-8")
    (RAIZ / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /checkout\nDisallow: /pedido\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")


if __name__ == "__main__":
    pasta = RAIZ / "produto"
    if pasta.exists():
        shutil.rmtree(pasta)  # remove páginas de produtos que saíram do catálogo
    for p in PRODUTOS:
        produto(p)
    for arq, (t, d, c) in PAGINAS.items():
        institucional(arq, t, d, c)
    favicon()
    seo_home()
    sitemap()
    print(f"OK: {len(PRODUTOS)} páginas de produto, {len(PAGINAS)} institucionais, sitemap.xml e robots.txt para {SITE}")
