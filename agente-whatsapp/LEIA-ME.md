# Agente de vendas no WhatsApp (Claude + WhatsApp Cloud API)

Atende os clientes 24h no WhatsApp das lojas **Cellphones SP** e **Mega Casa SP**:
busca produtos, informa preço, Pix, parcelas e estoque, calcula frete pelo CEP, manda o link do produto no site,
registra o pedido e chama você quando o cliente quer falar com uma pessoa.

**Site e WhatsApp sempre iguais:** o agente lê o `produtos.js` publicado no site (atualiza a cada 5 min).
Mudou preço ou estoque no site e deu *Push*? O WhatsApp já responde com o valor novo.

```
Cliente no WhatsApp ──> Meta (WhatsApp Cloud API) ──> este servidor (agente.py) ──> Claude
                                                              └──> catálogo dos sites
```

## Arquivos
| Arquivo | O que é |
|---|---|
| `agente.py` | Servidor do webhook + o agente (conversa, ferramentas, envio das respostas) |
| `catalogo.py` | Lê os produtos dos sites e faz busca, frete e pedido |
| `.env.exemplo` | Modelo das configurações. Copie para `.env` e preencha |
| `pedidos.jsonl` | Criado sozinho: um pedido por linha |

---

## Passo 1 — Chave do Claude
1. Entre em **platform.claude.com**, coloque créditos (US$ 5 já dão para muitos testes) e crie uma chave em *API Keys*.
2. Copie `.env.exemplo` para `.env` e cole a chave em `ANTHROPIC_API_KEY=`.

## Passo 2 — Testar o agente no computador (sem WhatsApp)
```bash
pip install -r requirements.txt
```
```bash
python agente.py --teste
```
```bash
python agente.py --chat
```
O `--teste` confere o catálogo (não gasta nada). O `--chat` abre uma conversa no terminal, igual o cliente veria.

## Passo 3 — App do WhatsApp na Meta
1. **developers.facebook.com** → *Meus apps* → *Criar app* → tipo **Empresa** → adicione o produto **WhatsApp**.
2. Em *WhatsApp → Configuração da API* você recebe um **número de teste grátis**. Anote:
   - **Token de acesso temporário** → `WHATSAPP_TOKEN` (vale 24h; o permanente está no Passo 6)
   - **Identificação do número de telefone** → `WHATSAPP_PHONE_NUMBER_ID`
3. Em *Para*, adicione o seu celular como destinatário de teste.
4. *Configurações do app → Básico → Chave secreta do app* → `META_APP_SECRET`.
5. Invente uma senha qualquer para `WHATSAPP_VERIFY_TOKEN` (ex.: `cellphones-2026-xyz`).

## Passo 4 — Colocar o servidor no ar (Render)
1. **render.com** → entre com o GitHub → *New* → **Web Service** → escolha o repositório `cellphone`.
2. Preencha:
   - **Root Directory:** `agente-whatsapp`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python agente.py`
3. Em *Environment*, crie as mesmas variáveis do seu `.env` (não suba o `.env` para o GitHub).
4. Crie o serviço. Quando estiver *Live*, você terá um endereço como `https://agente-cellphones.onrender.com`.

> O plano grátis do Render "dorme" após 15 min sem uso e a primeira mensagem demora ~1 min. Para atendimento de verdade,
> use o plano pago mais barato (sempre ligado).

## Passo 5 — Ligar o WhatsApp ao servidor
1. Na Meta: *WhatsApp → Configuração* → **Webhook** → *Editar*:
   - **URL de callback:** `https://SEU-ENDERECO.onrender.com/webhook`
   - **Token de verificação:** o mesmo `WHATSAPP_VERIFY_TOKEN`
2. Em *Campos do webhook*, assine **messages**.
3. Mande um "oi" do seu celular para o número de teste. 🎉

## Passo 6 — Usar o número real da loja
1. *WhatsApp → Configuração da API → Adicionar número de telefone* (o número não pode estar ativo no app WhatsApp comum;
   se estiver, apague a conta dele no app primeiro).
2. Verifique a empresa no **Gerenciador de Negócios** (business.facebook.com → Central de segurança).
3. **Token permanente:** Gerenciador de Negócios → *Usuários do sistema* → crie um usuário Admin → *Gerar token*
   com as permissões `whatsapp_business_messaging` e `whatsapp_business_management` → troque o `WHATSAPP_TOKEN` no Render.

---

## Avisos para você (dono)
Coloque seu celular em `DONO_WHATSAPP`. Você recebe:
- 🛒 cada pedido registrado (itens, total, CEP e forma de pagamento)
- 🙋 quando o cliente pede um atendente (reclamação, troca, negociação…)

Regra da Meta: o número da loja só consegue te mandar mensagem se **você** tiver falado com ele nas últimas 24h.
Mande um "oi" para o número da loja todo dia de manhã, ou acompanhe os pedidos nos **Logs** do Render.

Para responder você mesmo um cliente, use o app **WhatsApp Business** no mesmo número (modo *coexistência*), ou a caixa de entrada do
Business Suite.

## Custos
- **WhatsApp:** responder quem chamou a loja (até 24h da última mensagem do cliente) não é cobrado. Mensagens que a loja
  inicia (promoções, avisos) são cobradas por mensagem. Veja a tabela em *developers.facebook.com → WhatsApp → Preços*.
- **Claude:** cobrado por uso. Com `claude-opus-5-5` (padrão, o mais inteligente) uma resposta típica (com 1 ou 2 consultas
  ao catálogo) custa por volta de US$ 0,02 a 0,06. Para gastar bem menos, troque `CLAUDE_MODELO` para `claude-haiku-5-5`. Acompanhe em platform.claude.com → *Usage*.
- **Servidor:** Render grátis para testar; plano pago a partir de ~US$ 7/mês.

## Segurança
- O agente **não recebe pagamentos** e nunca pede cartão ou senha: ele registra o pedido e a equipe envia o pagamento.
- Preço e estoque vêm só do catálogo do site; ele não inventa desconto. Pedidos de desconto vão para você.
- Com `META_APP_SECRET` preenchido, o servidor recusa mensagens que não venham da Meta.
- O agente usa o recurso de *fallback* da API do Claude: se o modelo recusar uma mensagem por engano, outro modelo responde.

## Ajustes rápidos
- **Jeito de falar / regras:** função `instrucoes()` em `agente.py`.
- **Só uma loja:** `LOJAS=megacasa` ou `LOJAS=cellphones`.
- **Prazo e valor do frete:** função `calcular_frete()` em `catalogo.py` (mesma regra do site).
