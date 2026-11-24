/* Página "Acompanhe seu pedido" — volta do Mercado Pago e link enviado ao cliente. */
const $ = s => document.querySelector(s);
const fmt = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
$("#dadosEmpresa").textContent = `${LOJA.razaoSocial} · CNPJ ${LOJA.cnpj} · ${LOJA.endereco} · ${LOJA.email}`;

const NOMES = {
  aguardando_pagamento: "Aguardando pagamento", em_analise: "Pagamento em análise", pagamento_recusado: "Pagamento não aprovado",
  pago: "Pagamento aprovado", em_separacao: "Em separação", faturado: "Nota fiscal emitida", enviado: "Pedido enviado",
  entregue: "Pedido entregue", cancelado: "Pedido cancelado", reembolsado: "Valor reembolsado", estornado: "Pagamento estornado"
};
const ETAPAS = ["aguardando_pagamento", "pago", "em_separacao", "faturado", "enviado", "entregue"];
const PAG = { pix: "Pix", cartao: "Cartão de crédito", boleto: "Boleto" };

const q = Object.fromEntries(new URLSearchParams(location.search));

function formularioBusca(msg = "") {
  $("#conteudo").innerHTML = `<section class="caixa"><h2>Acompanhe seu pedido</h2>
    <p class="muted">Use o link enviado no seu e-mail ou no WhatsApp após a compra. Não encontrou? Fale com a gente:</p>
    ${msg ? `<div class="erro-box">${esc(msg)}</div>` : ""}
    <p><a class="btn btn-verde" target="_blank" rel="noopener" href="https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent("Olá! Quero saber do meu pedido.")}">💬 Falar no WhatsApp</a></p></section>`;
}

async function carregar() {
  if (!q.id || !q.k) return formularioBusca();
  const params = new URLSearchParams({ id: q.id, k: q.k });
  ["payment_id", "collection_id", "demo"].forEach(k => q[k] && params.set(k, q[k]));
  let p;
  try {
    const r = await fetch(`api/pedido?${params}`, { cache: "no-store" });
    p = await r.json();
    if (!r.ok) return formularioBusca(p.erro || "Pedido não encontrado.");
  } catch { return formularioBusca("Não conseguimos carregar o pedido agora. Tente novamente em instantes."); }
  if (q.payment_id || q.demo) history.replaceState(null, "", `pedido.html?id=${encodeURIComponent(q.id)}&k=${encodeURIComponent(q.k)}`);

  const idx = ETAPAS.indexOf(p.status);
  const titulo = {
    pago: "🎉 Pagamento aprovado! Obrigado pela compra.", aguardando_pagamento: "Seu pedido foi recebido e aguarda o pagamento.",
    em_analise: "Seu pagamento está em análise.", pagamento_recusado: "Seu pagamento não foi aprovado.",
  }[p.status] || NOMES[p.status];
  $("#conteudo").innerHTML = `
  <section class="caixa">
    <p class="muted" style="margin:0 0 4px">Pedido nº <b>${esc(p.id)}</b> · ${new Date(p.criado).toLocaleString("pt-BR")}</p>
    <h2 style="font-size:22px">${esc(titulo)}</h2>
    <span class="status-tag ${esc(p.status)}">${esc(NOMES[p.status] || p.status)}</span>
    ${["aguardando_pagamento", "pagamento_recusado"].includes(p.status) ? `<p style="margin-top:14px"><button class="btn btn-pri" id="pagarAgora">${p.status === "pagamento_recusado" ? "Tentar pagar novamente" : "💳 Pagar agora"}</button></p><p class="erro-box" id="erroPagar" hidden></p>` : ""}
    ${p.status === "aguardando_pagamento" && p.pagamento === "boleto" ? `<p class="muted">O boleto pode levar até 3 dias úteis para compensar.</p>` : ""}
    ${p.rastreio ? `<p>📦 Código de rastreio: <b>${esc(p.rastreio)}</b> · <a href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noopener">Rastrear</a></p>` : ""}
  </section>
  ${idx >= 0 ? `<section class="caixa"><h2>Andamento</h2><ul class="linha-tempo">${ETAPAS.map((s, i) => `<li class="${i <= idx ? "feito" : ""}">${NOMES[s]}</li>`).join("")}</ul></section>` : ""}
  <section class="caixa"><h2>Itens do pedido</h2>
    ${p.itens.map(i => `<div class="linha" style="padding:6px 0;border-bottom:1px solid var(--borda)"><span>${i.quantidade}x ${esc(i.nome)}${i.voltagem ? " (" + esc(i.voltagem) + ")" : ""}</span><span>${fmt(i.preco_unit * i.quantidade)}</span></div>`).join("")}
    <div style="display:grid;gap:6px;margin-top:10px">
      <div class="linha"><span>Subtotal</span><span>${fmt(p.subtotal)}</span></div>
      ${p.desconto ? `<div class="linha verde"><span>Descontos (cadastro/Pix)</span><span>− ${fmt(p.desconto)}</span></div>` : ""}
      <div class="linha"><span>Frete</span><span>${p.frete ? fmt(p.frete) : "Grátis"}</span></div>
      <div class="linha total"><span>Total</span><span>${fmt(p.total)}</span></div>
      <div class="linha muted"><span>Pagamento</span><span>${PAG[p.pagamento] || p.pagamento}${p.pagamento_mp?.parcelas > 1 ? ` em ${p.pagamento_mp.parcelas}x` : ""}</span></div>
    </div>
  </section>
  <section class="caixa"><h2>Entrega</h2><p style="margin:0">${esc(p.entrega.bairro)} · ${esc(p.entrega.cidade)}/${esc(p.entrega.uf)}<br><span class="muted">Prazo estimado: ${esc(p.entrega.prazo)} após a aprovação do pagamento.</span></p>
    <p class="muted" style="font-size:13px">Confirmação enviada para ${esc(p.cliente.email)}.</p></section>
  <p style="text-align:center"><a href="./" class="btn btn-sec">Voltar para a loja</a>
  <a class="btn btn-verde" target="_blank" rel="noopener" href="https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent("Olá! Tenho uma dúvida sobre o pedido " + p.id)}">💬 Ajuda com este pedido</a></p>`;
  if (["aguardando_pagamento", "em_analise"].includes(p.status) && !window._poll) {
    window._poll = setInterval(async () => {
      const r = await fetch(`api/pedido?id=${encodeURIComponent(q.id)}&k=${encodeURIComponent(q.k)}`, { cache: "no-store" }).catch(() => null);
      const n = r && r.ok ? await r.json() : null;
      if (n && n.status !== p.status) { clearInterval(window._poll); window._poll = null; carregar(); }
    }, 8000);
  }
}

// "Pagar agora": pede ao servidor um link novo do Checkout Pro (Mercado Pago) e redireciona
document.addEventListener("click", async e => {
  const b = e.target.closest("#pagarAgora");
  if (!b) return;
  const erro = $("#erroPagar");
  b.disabled = true; b.textContent = "Abrindo o Mercado Pago…"; erro.hidden = true;
  try {
    const r = await fetch("api/preferencia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: q.id, k: q.k }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.init_point) throw new Error(d.erro || "Não foi possível abrir o pagamento.");
    location.href = d.init_point;
  } catch (ex) {
    erro.textContent = ex.message; erro.hidden = false;
    b.disabled = false; b.textContent = "💳 Pagar agora";
  }
});
carregar();
