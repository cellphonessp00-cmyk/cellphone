# Mega Casa SP — loja virtual com Mercado Pago, CRM e SEO

## Como a compra funciona
```
Vitrine → Página do produto (voltagem obrigatória) → Carrinho lateral → Checkout (dados + endereço + forma de pagamento)
   → servidor recalcula preço/estoque/frete → cria o pagamento no Mercado Pago (Checkout Pro)
   → cliente paga no ambiente do Mercado Pago (Pix, cartão até 10x, boleto)
   → Mercado Pago avisa o site (webhook) → pedido vira "Pago", estoque baixa → aparece no Painel (CRM)
```

**Segurança**
- O navegador nunca define preço: o servidor recalcula tudo pelo `produtos.js`, então ninguém consegue adulterar o valor.
- Os dados do cartão são digitados só no Mercado Pago. Nada de cartão passa pelo site.
- A chave do Mercado Pago fica só no servidor (variável de ambiente), nunca no código.
- O webhook confere a assinatura do Mercado Pago e consulta o pagamento direto na API antes de mudar o pedido.
- O site tem HTTPS, cabeçalhos de segurança (CSP, HSTS, anti-clickjacking) e limite de tentativas no login e no checkout.
- O painel é protegido por senha, e cada página de pedido só abre com a chave secreta do pedido.

## Arquivos
| Arquivo | O que é |
|---|---|
| `produtos.js` | **Catálogo e dados da loja** (preços, fotos, voltagens, CNPJ…) |
| `index.html`, `app.js`, `styles.css` | Vitrine, busca, filtros, página de produto e carrinho |
| `checkout.html/.js` | Finalização da compra |
| `pedido.html/.js` | "Acompanhe seu pedido" (volta do Mercado Pago) |
| `admin/` | **Painel de vendas (CRM)**: pedidos, clientes, estoque, indicadores, exportar CSV |
| `api/*.py` | Servidor: checkout, webhook, pedido, estoque, painel |
| `gerar_site.py` | Gera páginas de produto, páginas institucionais, sitemap e robots para o Google |
| `dev_server.py` | Testar tudo no computador |

---

## 1) Antes de publicar: preencha os dados reais
Em `produtos.js`, no bloco `LOJA`:
- `razaoSocial`, `cnpj`, `endereco`, `email`, `telefone`: a lei (Decreto 7.962/2013) obriga mostrar esses dados no site.
- `whatsapp` e `site` (o endereço final).

**Preços "de/por":** só use `precoAntigo` se foi mesmo o preço praticado antes. Desconto falso dá problema no Procon.
**Avaliações:** ficam escondidas (`mostrarAvaliacoes: false`) até você ter avaliações reais.

### Fotos reais dos produtos
1. Peça ao seu fornecedor ou distribuidor o **kit de imagens para revendedor**. Os fabricantes (Electrolux, Brastemp, Samsung, LG, Mondial…) têm portal de parceiros com as fotos oficiais liberadas para quem revende.
2. Salve em `img/<id-do-produto>/1.jpg`, `2.jpg`… (fundo branco, 1000×1000 px, até ~200 KB).
3. No produto, adicione: `imagens: ["img/airfryer-mondial-5l/1.jpg", "img/airfryer-mondial-5l/2.jpg"],`

> Não copie fotos de outras lojas (Casas Bahia, Magalu, Mercado Livre): elas têm direitos autorais e o Google pode
> rebaixar o site por conteúdo duplicado. Fotos suas, tiradas com o celular num fundo branco, também funcionam muito bem.

**Atalho:** salve as fotos em `img/` com o nome `<id>.jpg` (capa), `<id>-2.jpg`, `<id>-3.jpg`… A lista de nomes e os prompts do Gemini estão em `lista-imagens.md`. O `gerar_site.py` liga cada foto ao produto sozinho.

Depois de qualquer mudança em `produtos.js` ou nas fotos, rode:
```bash
python gerar_site.py
```

## 2) Testar no computador
```bash
python dev_server.py
```
Abra http://localhost:8790. Sem a chave do Mercado Pago, o pagamento é **simulado** (aprova na hora).
O painel fica em http://localhost:8790/admin/ e a senha local é `admin`.

## 3) Mercado Pago
1. Entre em **mercadopago.com.br/developers** → *Suas integrações* → *Criar aplicação* (tipo: **Pagamentos online / Checkout Pro**).
2. Em **Credenciais de teste**, copie o *Access Token* (começa com `TEST-`) para testar. Depois de testar, use as **Credenciais de produção** (`APP_USR-…`).
3. Em **Webhooks** → *Configurar notificações*:
   - URL: `https://SEU-SITE/api/webhook`
   - Evento: **Pagamentos**
   - Copie a **assinatura secreta** gerada → variável `MP_WEBHOOK_SECRET`.
4. **Parcelamento sem juros:** no app/site do Mercado Pago → *Seu negócio → Custos* → ative "Parcelamento sem juros" até 10x. Sem isso, o Mercado Pago cobra juros do cliente nas parcelas.

## 4) Publicar na Vercel (grátis)
1. **vercel.com** → entre com o GitHub → *Add New → Project* → escolha o repositório `cellphone`.
2. **Root Directory:** `megacasa`. Framework: *Other*. Clique em **Deploy**.
3. *Storage* → **Upstash for Redis** (Marketplace, plano grátis) → *Create* → conecte ao projeto. As variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` entram sozinhas. É o banco dos pedidos e do estoque.
4. *Settings → Environment Variables*, crie:

| Variável | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token do Mercado Pago (primeiro o `TEST-…`, depois o de produção) |
| `MP_WEBHOOK_SECRET` | Assinatura secreta do webhook |
| `ADMIN_SENHA` | Senha forte do painel (12+ caracteres) |
| `SEGREDO_APP` | Uma frase aleatória longa (assina os links dos pedidos) |
| `SITE_URL` | Endereço do site, ex.: `https://megacasasp.vercel.app` |
| `PLANILHA_URL` / `PLANILHA_SEGREDO` | Planilhas do Google (ver 4.1) |

5. *Deployments* → **Redeploy**. Faça uma compra de teste com o token `TEST-` e os
   [cartões de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/integration-test/test-cards).

> O site antigo no GitHub Pages (`…github.io/cellphone/megacasa`) não tem servidor, então o checkout não funciona lá. Divulgue só o endereço da Vercel.

## 4.1) Cadastro de clientes (10% OFF) e planilhas do Google
**Como funciona para o cliente**
- No topo do site, ele clica em **"Entre ou cadastre-se"** e informa nome, sobrenome, e-mail, telefone e senha.
- Logado, ganha **10% de desconto em todas as compras**, que soma com os 5% do Pix. O percentual fica em `LOJA.descontoCadastro`.
- O desconto é aplicado pelo servidor, então não dá para "forjar". No checkout, nome, e-mail e telefone já vêm preenchidos; ele só informa CPF e endereço.

**As 2 planilhas** ficam no seu Google Drive e se atualizam sozinhas:

| Planilha | O que guarda |
|---|---|
| **Mega Casa SP - Clientes** | Data do cadastro, nome, sobrenome, e-mail, telefone, aceita ofertas, último acesso, nº de pedidos e total comprado |
| **Mega Casa SP - Pedidos** | Nº do pedido, data, status (atualiza quando paga, envia, entrega), cliente, CPF, **endereço de entrega completo**, itens, forma de pagamento, descontos, frete, total e rastreio |

A senha do cliente **nunca** vai para a planilha: ela fica guardada criptografada (PBKDF2) no banco do site.

**Instalação (10 minutos, uma vez só)**
1. Entre em **script.google.com** com a conta Google da empresa → *Novo projeto*.
2. Apague o que estiver lá e cole todo o conteúdo de `planilhas/Codigo.gs`. Salve.
3. No menu de funções, escolha **configurar** → *Executar* → autorize. As duas planilhas são criadas no seu Drive.
4. Abra *Execuções* (ou *Registro*) e copie o valor de **PLANILHA_SEGREDO**.
5. **Implantar → Nova implantação → App da Web**. Em "Executar como", escolha *Eu*; em "Quem pode acessar", escolha *Qualquer pessoa*. Copie a URL que termina em `/exec`.
6. Na Vercel, crie as variáveis `PLANILHA_URL` (a URL do passo 5) e `PLANILHA_SEGREDO` (o valor do passo 4) e faça *Redeploy*.

> Se um dia você mudar o código do script, use *Implantar → Gerenciar implantações → Editar → Nova versão* para manter a mesma URL.

## 5) Aparecer no Google
1. **Domínio próprio (recomendado):** registre `megacasasp.com.br` no **registro.br** (~R$ 40/ano). Na Vercel: *Settings → Domains → Add*. Depois troque `site` em `produtos.js` e `SITE_URL`, e rode `python gerar_site.py`.
2. **Google Search Console** (search.google.com/search-console) → *Adicionar propriedade* → confirme o domínio → *Sitemaps* → envie `sitemap.xml`.
3. **Google Merchant Center** (merchants.google.com) → cadastre a loja → *Produtos → Fontes de dados → Rastreamento do site*. Os produtos aparecem de graça na aba **Shopping** do Google. As páginas já têm os dados estruturados (preço, estoque, frete, devolução) que o Google lê.
4. **Perfil da Empresa no Google** (business.google.com): aparece no Maps e nas buscas "loja de eletrodomésticos perto de mim".
5. Coloque o link do site na bio do Instagram e nas respostas do WhatsApp.

## 6) Se o site cair ou a compra parar de funcionar
**1. Confirme se caiu mesmo.** Abra https://megacasasp.vercel.app no celular usando o 4G (sem Wi-Fi).
Se abrir, o problema é na sua internet. Veja também se os serviços estão fora do ar:
- vercel-status.com (hospedagem)
- status.upstash.com (banco de dados)
- status.mercadopago.com (pagamentos)

Se um deles estiver com problema, é só esperar; não há nada a fazer do seu lado.

**2. O site não abre (erro na página inicial):**
1. vercel.com → projeto **megacasasp** → **Deployments**.
2. Se o último deploy estiver vermelho (*Error*): o site **continua no ar com a versão anterior**, porque uma atualização que falha não derruba o site. Mande o print do erro.
3. Se uma atualização recente entrou no ar e quebrou algo: no deploy anterior que funcionava (verde, *Ready*), clique em **⋯ → Promote to Production** (ou **Instant Rollback**). Em segundos o site volta como estava.

**3. O site abre, mas cadastro, carrinho ou checkout dão erro:**
1. Na Vercel, abra o projeto → **Logs** → filtre por `/api`. A mensagem vermelha diz a causa.
2. Causas comuns:
   - **Limite do banco grátis** (500 mil comandos/mês no Upstash). Veja em *Storage → Upstash → Open in Upstash*. Se lotar, troque para o plano *Pay As You Go* (centavos por mês no começo).
   - **Token do Mercado Pago trocado ou expirado.** Gere de novo no painel do Mercado Pago, atualize `MP_ACCESS_TOKEN` em *Settings → Environment Variables* e faça **Redeploy**.
   - **Variável alterada sem Redeploy.** Toda mudança em *Environment Variables* só vale depois de *Deployments → ⋯ → Redeploy*.

**4. Pagou e o pedido não virou "Pago":** confira no Mercado Pago, em *Suas integrações → Webhooks → Histórico de notificações*. Lá aparece se o aviso chegou ao site. No painel `/admin/`, abra o pedido e clique em **↻ Consultar Mercado Pago**: o site consulta o pagamento e atualiza o pedido.

**5. Cópia de segurança:** os pedidos ficam no banco (Upstash) **e** na planilha "Mega Casa SP - Pedidos". Uma vez por semana, exporte o CSV no painel (*Pedidos → ⬇ Exportar CSV*).

**6. Para testar no computador sem internet:** rode `python dev_server.py` e abra http://localhost:8790.

> Plano da Vercel: o plano grátis (*Hobby*) é para uso pessoal. Quando a loja começar a vender de verdade, passe para o **Pro**
> (*Settings → Billing*). É o que os termos da Vercel pedem para sites comerciais, e o plano dá mais limites e suporte.

## Painel de vendas (CRM) — `/admin/`
- **Visão geral:** vendas de hoje, 7 e 30 dias, ticket médio, conversão, gráfico de 14 dias, mais vendidos e alertas (pedidos para enviar, carrinhos sem pagamento há 24h, estoque baixo).
- **Pedidos:** busca e filtro por status. No detalhe: dados do cliente, endereço, itens com voltagem, pagamento no Mercado Pago, mudança de status (Pago → Em separação → Faturado → Enviado → Entregue), código de rastreio, anotações, WhatsApp do cliente, impressão e exportação CSV.
- **Clientes:** histórico de compras e total gasto por cliente, com exportação CSV.
- **Estoque:** baixa sozinho quando o pagamento é aprovado; ajuste aqui quando chegar mercadoria.
