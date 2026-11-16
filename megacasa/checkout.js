/* Checkout: identificação, entrega (ViaCEP) e pagamento via Mercado Pago.
   Os valores mostrados aqui são só uma prévia: o servidor recalcula tudo antes de gerar o pagamento. */
const $ = (s, el = document) => el.querySelector(s);
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const porId = id => PRODUTOS.find(p => p.id === id);

const form = $("#form");
let carrinho = ler("mc_carrinho", []).map(i => ({ ...i, p: porId(i.id) })).filter(i => i.p);

$("#dadosEmpresa").textContent = `${LOJA.razaoSocial} · CNPJ ${LOJA.cnpj} · ${LOJA.endereco}`;

/* ---------- máscaras ---------- */
const mascaras = {
  cpf: v => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
  telefone: v => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/[-\s(]+$/, ""); },
  cep: v => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"),
  uf: v => v.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase()
};
form.addEventListener("input", e => {
  const m = mascaras[e.target.name];
  if (m) e.target.value = m(e.target.value);
  e.target.classList.remove("invalido");
  if (e.target.name === "cep" && e.target.value.length === 9) buscarCep(e.target.value);
  if (e.target.name === "pagamento" || e.target.name === "cep") resumo();
});
form.addEventListener("change", e => { if (e.target.name === "pagamento") resumo(); });

function cpfValido(c) {
  const d = c.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const t of [9, 10]) {
    let s = 0; for (let i = 0; i < t; i++) s += +d[i] * (t + 1 - i);
    if ((s * 10 % 11) % 10 !== +d[t]) return false;
  }
  return true;
}

async function buscarCep(cep) {
  const info = $("#cepInfo");
  info.textContent = "Buscando endereço…";
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`);
    const d = await r.json();
    if (d.erro) throw 0;
    form.rua.value = d.logradouro || form.rua.value;
    form.bairro.value = d.bairro || form.bairro.value;
    form.cidade.value = d.localidade || "";
    form.uf.value = d.uf || "";
    info.textContent = "✓ Endereço encontrado";
    (d.logradouro ? form.numero : form.rua).focus();
  } catch { info.textContent = "CEP não encontrado. Preencha o endereço manualmente."; }
  resumo();
}

/* ---------- valores (prévia; mesma regra do servidor) ---------- */
const r2 = v => Math.round(v * 100 + 1e-7) / 100;
function calcular(pagForcado) {
  const pag = pagForcado || form.pagamento?.value || "pix";
  const sub = carrinho.reduce((s, i) => s + i.p.preco * i.qtd, 0);
  // mesmo arredondamento do servidor: desconto por unidade (cadastro primeiro, depois Pix)
  const fc = 1 - CONTA.desconto() / 100, fp = pag === "pix" ? 1 - LOJA.descontoPix / 100 : 1;
  const comCad = carrinho.reduce((s, i) => s + r2(i.p.preco * fc) * i.qtd, 0);
  const pago = carrinho.reduce((s, i) => s + r2(r2(i.p.preco * fc) * fp) * i.qtd, 0);
  const descCad = sub - comCad, desc = sub - pago;
  const d = form.cep.value.replace(/\D/g, "");
  const n = d.length === 8 ? +d.slice(0, 2) : null;
  const gratis = carrinho.every(i => i.p.freteGratis) || sub >= LOJA.freteGratisAcima;
  const sp = n !== null && n <= 19, capital = n !== null && n <= 5, gsp = n !== null && n <= 9;
  const frete = n === null ? null : gratis ? 0 : sp ? 19.9 : 39.9;
  const rapida = carrinho.every(i => i.p.entregaRapida);
  const prazo = n === null ? "" : capital && rapida ? "amanhã" : capital ? "em 1 a 2 dias úteis" : gsp ? "em 2 a 3 dias úteis" : sp ? "em 3 a 5 dias úteis" : "em 5 a 10 dias úteis";
  return { sub, desc, descCad, descPix: desc - descCad, frete, prazo, total: sub - desc + (frete || 0) };
}

function opcoesPagamento() {
  const atual = form.pagamento?.value || "pix";
  const pix = calcular("pix").sub - calcular("pix").desc, outro = calcular("cartao").sub - calcular("cartao").desc;
  $("#opcoesPag").innerHTML = `
    <label class="opcao"><input type="radio" name="pagamento" value="pix" ${atual === "pix" ? "checked" : ""}><span>💠</span><div><b>Pix</b><small>+${LOJA.descontoPix}% de desconto · aprovação na hora</small></div><span class="valor">${fmt(pix)}</span></label>
    <label class="opcao"><input type="radio" name="pagamento" value="cartao" ${atual === "cartao" ? "checked" : ""}><span>💳</span><div><b>Cartão de crédito</b><small>em até ${LOJA.parcelas}x de ${fmt(outro / LOJA.parcelas)} sem juros</small></div><span class="valor">${fmt(outro)}</span></label>
    <label class="opcao"><input type="radio" name="pagamento" value="boleto" ${atual === "boleto" ? "checked" : ""}><span>🧾</span><div><b>Boleto bancário</b><small>aprovação em até 3 dias úteis</small></div><span class="valor">${fmt(outro)}</span></label>`;
}

function infoConta() {
  const box = $("#contaInfo"), c = CONTA.atual;
  if (CONTA.logado()) {
    box.innerHTML = `<div class="beneficio">🎁 Olá, <b>${esc(c.nome)}</b>! Seu desconto de cadastro de <b>${CONTA.desconto()}%</b> foi aplicado. <a href="#" data-sair>Não é você?</a></div>`;
    if (!form.nome.value) form.nome.value = `${c.nome} ${c.sobrenome}`;
    if (!form.email.value) form.email.value = c.email;
    if (!form.telefone.value) form.telefone.value = mascaras.telefone(c.telefone || "");
  } else if (LOJA.descontoCadastro) {
    box.innerHTML = `<div class="beneficio">🎁 Clientes cadastrados ganham <b>${LOJA.descontoCadastro}% de desconto</b>.
      <a href="#" data-abrir-conta="entrar">Entrar</a> ou <a href="#" data-abrir-conta="cadastrar"><b>cadastrar agora</b></a> (leva 30 segundos).</div>`;
  }
}
document.addEventListener("click", e => { if (e.target.closest("[data-sair]")) { e.preventDefault(); CONTA.sair(); } });
document.addEventListener("conta-mudou", () => { if (carrinho.length) { infoConta(); opcoesPagamento(); resumo(); } });

function resumo() {
  const v = calcular();
  $("#resumoItens").innerHTML = carrinho.map(i => `<div class="item"><div class="mini">${i.p.imagens?.[0] ? `<img src="${esc(i.p.imagens[0])}" alt="">` : "📦"}</div>
    <div><h4>${esc(i.p.nome)}</h4><small>${i.qtd} un.${i.volt ? " · " + i.volt : ""}</small></div><b>${fmt(i.p.preco * i.qtd)}</b></div>`).join("");
  $("#resumoValores").innerHTML = `
    <div class="linha"><span>Subtotal (${carrinho.reduce((s, i) => s + i.qtd, 0)} itens)</span><span>${fmt(v.sub)}</span></div>
    ${v.descCad ? `<div class="linha roxo"><span>🎁 Desconto de cadastro</span><span>− ${fmt(v.descCad)}</span></div>` : ""}
    ${v.descPix ? `<div class="linha verde"><span>Desconto Pix</span><span>− ${fmt(v.descPix)}</span></div>` : ""}
    <div class="linha"><span>Frete</span><span>${v.frete === null ? "informe o CEP" : v.frete ? fmt(v.frete) : "<b style='color:var(--verde)'>Grátis</b>"}</span></div>
    <div class="linha total"><span>Total</span><span>${fmt(v.total)}</span></div>`;
  $("#prazoTxt").textContent = v.prazo ? `🚚 Entrega prevista ${v.prazo} após a confirmação do pagamento.` : "";
}

/* ---------- envio ---------- */
function validar() {
  const erros = [];
  const marcar = (nome, ok, msg) => { if (!ok) { form[nome].classList.add("invalido"); erros.push(msg); } };
  marcar("nome", form.nome.value.trim().split(/\s+/).length >= 2, "Informe nome e sobrenome.");
  marcar("email", /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.value.trim()), "E-mail inválido.");
  marcar("telefone", [10, 11].includes(form.telefone.value.replace(/\D/g, "").length), "Celular inválido.");
  marcar("cpf", cpfValido(form.cpf.value), "CPF inválido.");
  marcar("cep", form.cep.value.replace(/\D/g, "").length === 8, "CEP inválido.");
  ["rua", "numero", "bairro", "cidade", "uf"].forEach(n => marcar(n, form[n].value.trim(), "Preencha o endereço completo."));
  if (!form.aceite.checked) erros.push("Aceite os termos para continuar.");
  return [...new Set(erros)];
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const erro = $("#erro"), btn = $("#pagar");
  const erros = validar();
  if (erros.length) { erro.textContent = erros.join(" "); erro.hidden = false; form.querySelector(".invalido")?.focus(); return; }
  erro.hidden = true; btn.disabled = true; btn.textContent = "Gerando pagamento seguro…";
  const f = Object.fromEntries(new FormData(form));
  try {
    const r = await fetch("api/checkout", {
      method: "POST", headers: { "Content-Type": "application/json", ...CONTA.auth() },
      body: JSON.stringify({
        itens: carrinho.map(i => ({ id: i.id, quantidade: i.qtd, voltagem: i.volt })),
        cliente: { nome: f.nome, email: f.email, cpf: f.cpf, telefone: f.telefone },
        entrega: { cep: f.cep, rua: f.rua, numero: f.numero, complemento: f.complemento, bairro: f.bairro, cidade: f.cidade, uf: f.uf },
        pagamento: f.pagamento, aceite: !!f.aceite
      })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.redirecionar) throw new Error(d.erro || "Não foi possível gerar o pagamento.");
    try { localStorage.setItem("mc_ultimo_pedido", d.pedido); localStorage.removeItem("mc_carrinho"); } catch {}
    location.href = d.redirecionar;
  } catch (ex) {
    erro.textContent = ex.message; erro.hidden = false;
    btn.disabled = false; btn.textContent = "🔒 Ir para o pagamento";
  }
});

if (!carrinho.length) $("#vazio").hidden = false;
else { form.hidden = false; infoConta(); opcoesPagamento(); resumo(); }
