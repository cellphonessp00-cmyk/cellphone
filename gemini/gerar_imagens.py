"""
Gera imagens ilustrativas dos produtos com o Gemini e liga cada imagem
ao produto em produtos.js — o site e as artes do Instagram passam a usá-las.

Uso (na pasta do site):
    pip install google-genai
    set GEMINI_API_KEY=sua_chave          (Windows)   |  export GEMINI_API_KEY=sua_chave  (Mac/Linux)
    python gemini/gerar_imagens.py                    # gera só os que ainda não têm imagem
    python gemini/gerar_imagens.py iphone-17-pro      # gera/regera produtos específicos
    python gemini/gerar_imagens.py --todos            # regera tudo

A chave é criada em https://aistudio.google.com/apikey
Modelo padrão pode ser trocado com a variável GEMINI_IMAGE_MODEL.
"""
import json
import os
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARQ_PRODUTOS = RAIZ / "produtos.js"
PASTA_IMG = RAIZ / "imagens"
MODELO = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
PADRAO = re.compile(r"(/\*INICIO_PRODUTOS\*/)(.*?)(/\*FIM_PRODUTOS\*/)", re.S)


def ler_produtos():
    texto = ARQ_PRODUTOS.read_text(encoding="utf-8")
    m = PADRAO.search(texto)
    if not m:
        sys.exit("Não encontrei os marcadores /*INICIO_PRODUTOS*/ ... /*FIM_PRODUTOS*/ em produtos.js")
    return texto, json.loads(m.group(2))


def salvar_produtos(texto, produtos):
    linhas = ",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in produtos)
    novo = PADRAO.sub(lambda m: f"{m.group(1)}[\n{linhas}\n]{m.group(3)}", texto)
    ARQ_PRODUTOS.write_text(novo, encoding="utf-8")


def prompt(p):
    # mesmo texto do botão "Copiar prompt" do site
    cel = p["categoria"] == "celulares"
    vista = (", mostrando a frente com a tela acesa e a traseira com o módulo de câmeras lado a lado"
             if cel else ", em ângulo de três quartos")
    return (f"Crie uma fotografia de produto ilustrativa, estilo estúdio premium, de um {p['nome']} na cor {p['corNome']}{vista}. "
            f"Fundo escuro em degradê com um brilho suave na cor {p['corNome']}, iluminação de recorte, reflexo sutil no chão, "
            "nitidez alta, aparência realista. Sem texto, sem marcas d'água, sem pessoas. Composição centralizada com espaço "
            "livre acima e abaixo do produto, formato vertical 4:5 (1080x1350) para post de Instagram.")


def main():
    try:
        from google import genai
    except ImportError:
        sys.exit("Instale a biblioteca primeiro:  pip install google-genai")
    if not (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")):
        sys.exit("Defina a variável GEMINI_API_KEY com a sua chave do Google AI Studio.")

    args = sys.argv[1:]
    texto, produtos = ler_produtos()
    if "--todos" in args:
        alvo = produtos
    elif args:
        alvo = [p for p in produtos if p["id"] in args]
    else:
        alvo = [p for p in produtos if not p.get("imagem")]
    if not alvo:
        print("Nada para gerar. Use --todos ou informe ids.")
        return

    PASTA_IMG.mkdir(exist_ok=True)
    cliente = genai.Client()
    for i, p in enumerate(alvo, 1):
        print(f"[{i}/{len(alvo)}] {p['nome']}…", end=" ", flush=True)
        try:
            resp = cliente.models.generate_content(model=MODELO, contents=[prompt(p)])
            dados = next((parte.inline_data for parte in resp.candidates[0].content.parts
                          if getattr(parte, "inline_data", None)), None)
            if not dados:
                print("sem imagem na resposta (talvez bloqueada); pulei.")
                continue
            ext = ".jpg" if "jpeg" in (dados.mime_type or "") else ".png"
            destino = PASTA_IMG / f"{p['id']}{ext}"
            destino.write_bytes(dados.data)
            p["imagem"] = f"imagens/{destino.name}"
            salvar_produtos(texto, produtos)          # salva a cada imagem (não perde progresso)
            texto = ARQ_PRODUTOS.read_text(encoding="utf-8")
            print(f"ok → {p['imagem']}")
        except Exception as e:  # segue para o próximo produto
            print(f"erro: {e}")
    print("\nPronto! Recarregue o site para ver as novas imagens.")


if __name__ == "__main__":
    main()
