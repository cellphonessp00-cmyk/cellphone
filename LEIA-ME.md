# Cellphones SP — Smartphones e Periféricos (integrado ao Instagram)

Site no ar: https://cellphonessp00-cmyk.github.io/cellphone/
Para atualizar: edite os arquivos → GitHub Desktop → *Commit to main* → *Push origin*.

## Arquivos
| Arquivo | Para que serve |
|---|---|
| `index.html` | Página do site |
| `styles.css` | Visual (tema escuro, animações, versão para celular) |
| `app.js` | Catálogo, filtros, carrinho, ilustrações e Kit Instagram |
| **`produtos.js`** | **Único lugar para editar**: dados da loja + todos os produtos |
| `gemini/gerar_imagens.py` | Gera fotos ilustrativas com o Gemini e liga cada uma ao produto |
| `imagens/` | Onde ficam as imagens geradas (criada pelo script) |

## 1. Configure a loja
Abra `produtos.js` e edite o bloco `LOJA`: nome, `instagram` (sem @), `whatsapp` (só dígitos, com 55 + DDD), `site`, parcelas e hashtags.

## 2. Produtos, preços e estoque
Cada produto é uma linha em `PRODUTOS`. Para mudar a disponibilidade, altere `estoque`:
- `0` → aparece **Esgotado** no site e na arte do Instagram
- `1` a `3` → aparece **Últimas unidades**
- `destaque: true` → entra no carrossel "Em destaque" e no topo da grade do Instagram

Os preços e especificações são exemplos: troque pelos seus.

## 3. Como site e Instagram se conversam
- **Link de cada produto:** `seusite.com.br/#p=iphone-17-pro` abre o produto direto. Use no link da bio, nos Stories (figurinha de link) e nas respostas do Direct.
- **Kit Instagram** (dentro de cada produto, no final): 
  - *Baixar arte* — gera PNG pronto (feed 4:5 ou story 9:16) com foto, preço, parcelas e selo (Lançamento / -%OFF / Esgotado).
  - *Copiar legenda* — legenda com specs, preço, estoque, link do produto e hashtags.
  - *Copiar prompt* — texto pronto para o Gemini gerar a imagem.
- **Pedidos:** o carrinho envia o pedido montado pelo WhatsApp ou copia o texto e abre o seu Direct.

Mudou preço ou estoque? Edite `produtos.js` e gere a arte de novo — site e post ficam iguais.

## 4. Imagens com o Gemini
**Sem programar:** no produto → Kit Instagram → *Copiar prompt* → *Abrir Gemini* → cole, baixe a imagem, salve como `imagens/<id-do-produto>.png` e em `produtos.js` troque `"imagem":null` por `"imagem":"imagens/<id>.png"`.

**Automático (todos de uma vez):**
```bash
pip install google-genai
```
```bash
set GEMINI_API_KEY=sua_chave
```
```bash
python gemini/gerar_imagens.py
```
A chave é criada em https://aistudio.google.com/apikey. O script preenche o campo `imagem` sozinho. Enquanto um produto não tiver imagem, o site usa a ilustração automática na cor do produto.

> As imagens são **ilustrativas** (o site e as artes já avisam isso). Para fotos oficiais, use as do material de divulgação do seu fornecedor.

## 5. Testar no computador
Abrir o `index.html` com dois cliques já funciona. Para baixar artes que usem fotos da pasta `imagens/`, rode um servidor local na pasta do site:
```bash
python -m http.server 8000
```
e acesse http://localhost:8000

## 6. Publicar (grátis)
Arraste a pasta para **Netlify Drop** (app.netlify.com/drop), ou use GitHub Pages / Vercel. Depois coloque o endereço em `LOJA.site` e no link da bio do Instagram.
