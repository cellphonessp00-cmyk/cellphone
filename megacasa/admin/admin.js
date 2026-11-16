/* CRM da loja: pedidos, clientes, estoque e indicadores. Dados vêm de /api/admin (protegido por senha). */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const dataBR = iso => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const cpfFmt = c => String(c || "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
const telFmt = t => String(t || "").replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");

const NOMES = {
  aguardando_pagamento: "Aguardando pagamento", em_analise: "Em análise", pagamento_recusado: "Pagamento recusado",
  pago: "Pago", em_separacao: "Em separação", faturado: "Faturado (NF emitida)", enviado: "Enviado", entregue: "Entregue",
  cancelado: "Cancelado", reembolsado: "Reembolsado", estornado: "Estornado"
};
const VENDA = ["pago", "em_separacao", "faturado", "enviado", "entregue"];
const PAG = { pix: "Pix", cartao: "Cartão", boleto: "Boleto" };

let token = sessionStorage.getItem("mc_admin") || "";
let D = null, abaAtual = "resumo";

async function api(metodo, corpo, query = "") {
  const r = await fetch("../api/admin" + query, {
    method: metodo, cache: "no-store",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && corpo?.acao !== "login") { sair(); throw new Error("Sessão expirada"); }
  if (!r.ok) throw new Error(d.erro || "Erro " + r.status);
  return d;
}
function aviso(t) { const a = $("#aviso"); a.textContent = t; a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => a.hidden = true, 2500); }

/* ---------- login ---------- */
$("#formLogin").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const d = await api("POST", { acao: "login", senha: e.target.senha.value });
    token = d.token; sessionStorage.setItem("mc_admin", token); e.target.reset(); entrar();
  } catch (ex) { $("#erroLogin").textContent = ex.message; $("#erroLogin").hidden = false; }
});
function sair() { token = ""; sessionStorage.removeItem("mc_admin"); $("#app").hidden = true; $("#telaLogin").hidden = false; }
$("#sair").addEventListener("click", sair);

async function entrar() {
  try { D = await api("GET", null, "?acao=dados"); } catch { return; }
  $("#telaLogin").hidden = true; $("#app").hidden = false;
  $("#mpStatus").innerHTML = D.mp_configurado ? "✅ Mercado Pago conectado" : "⚠️ Mercado Pago em modo demonstração";
  $("#filtroStatus").innerHTML = `<option value="">Todos os status</option>` + D.status.map(s => `<option value="${s}">${NOMES[s]}</option>`).join("");
  desenhar();
}
$("#atualizar").addEventListener("click", entrar);

/* ---------- abas ---------- */
$("#abas").addEventListener("click", e => {
  const b = e.target.closest("[data-aba]"); if (!b) return;
  abaAtual = b.dataset.aba;
  $$("#abas button").forEach(x => x.classList.toggle("ativo", x === b));
  $$("[data-tela]").forEach(s => s.hidden = s.dataset.tela !== abaAtual);
  desenhar();
});
function desenhar() { ({ resumo, pedidos, clientes, estoque })[abaAtual](); }

/* ---------- visão geral ---------- */
function resumo() {
  const ped = D.pedidos, agora = Date.now(), dia = 864e5;
  const vendas = ped.filter(p => VENDA.includes(p.status));
  const soma = (l) => l.reduce((s, p) => s + p.total, 0);
  const desde = d => vendas.filter(p => agora - p.criado_ts * 1000 < d * dia);
  const hoje = vendas.filter(p => new Date(p.criado).toDateString() === new Date().toDateString());
  const conv = ped.length ? Math.round(vendas.length / ped.length * 100) : 0;
  const aEnviar = ped.filter(p => ["pago", "em_separacao", "faturado"].includes(p.status));
  $("#kpis").innerHTML = [
    ["Vendas hoje", fmt(soma(hoje)), `${hoje.length} pedidos pagos`],
    ["Últimos 7 dias", fmt(soma(desde(7))), `${desde(7).length} pedidos`],
    ["Últimos 30 dias", fmt(soma(desde(30))), `${desde(30).length} pedidos`],
    ["Ticket médio", fmt(vendas.length ? soma(vendas) / vendas.length : 0), "pedidos pagos"],
    ["Conversão", conv + "%", `${vendas.length} pagos de ${ped.length} iniciados`],
    ["A enviar", aEnviar.length, "pagos aguardando envio"],
  ].map(([t, v, s]) => `<div class="kpi"><small>${t}</small><b>${v}</b><span>${s}</span></div>`).join("");

  const dias = [...Array(14)].map((_, i) => { const d = new Date(agora - (13 - i) * dia); return d.toDateString(); });
  const porDia = dias.map(d => soma(vendas.filter(p => new Date(p.criado).toDateString() === d)));
  const max = Math.max(1, ...porDia);
  $("#grafico").innerHTML = porDia.map((v, i) => `<div title="${fmt(v)}"><i style="height:${v / max * 100}%"></i>${new Date(dias[i]).getDate()}</div>`).join("");

  const cont = {};
  vendas.forEach(p => p.itens.forEach(i => { cont[i.nome] = cont[i.nome] || { q: 0, v: 0 }; cont[i.nome].q += i.quantidade; cont[i.nome].v += i.quantidade * i.preco_unit; }));
  const top = Object.entries(cont).sort((a, b) => b[1].v - a[1].v).slice(0, 8);
  $("#topProdutos").innerHTML = top.length ? top.map(([n, x]) => `<li>${esc(n)}<br><span>${x.q} un. · ${fmt(x.v)}</span></li>`).join("") : `<p class="muted">Ainda sem vendas pagas.</p>`;

  const baixos = D.produtos.filter(p => D.estoques[p.id] <= 2);
  const parados = ped.filter(p => p.status === "aguardando_pagamento" && agora - p.criado_ts * 1000 > dia);
  $("#atencao").innerHTML = [
    aEnviar.length ? `<p>📦 <b>${aEnviar.length}</b> pedido(s) pago(s) aguardando separação/envio. <a href="#" data-ir="pedidos">Ver pedidos</a></p>` : "",
    parados.length ? `<p>⏳ <b>${parados.length}</b> pedido(s) há mais de 24h sem pagamento: chame o cliente no WhatsApp para recuperar a venda.</p>` : "",
    baixos.length ? `<p>⚠️ Estoque baixo: ${baixos.map(p => `${esc(p.nome)} (${D.estoques[p.id]})`).join(", ")}</p>` : "",
  ].join("") || `<p class="muted">Tudo em dia ✅</p>`;
}
document.addEventListener("click", e => { const a = e.target.closest("[data-ir]"); if (a) { e.preventDefault(); $(`[data-aba="${a.dataset.ir}"]`).click(); } });

/* ---------- pedidos ---------- */
function filtrarPedidos() {
  const t = $("#buscaPed").value.trim().toLowerCase(), st = $("#filtroStatus").value;
  return D.pedidos.filter(p => (!st || p.status === st) && (!t || [p.id, p.cliente.nome, p.cliente.email, p.cliente.cpf, p.cliente.telefone, ...p.itens.map(i => i.nome)].join(" ").toLowerCase().includes(t)));
}
function pedidos() {
  const l = filtrarPedidos();
  $("#tabPedidos").innerHTML = `<thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Status</th></tr></thead><tbody>` +
    (l.map(p => `<tr class="clicavel" data-ped="${esc(p.id)}"><td><b>${esc(p.id)}</b></td><td>${dataBR(p.criado)}</td><td>${esc(p.cliente.nome)}<br><small class="muted">${esc(p.entrega.cidade)}/${esc(p.entrega.uf)}</small></td>
      <td>${p.itens.reduce((s, i) => s + i.quantidade, 0)} un.</td><td>${PAG[p.pagamento] || p.pagamento}</td><td><b>${fmt(p.total)}</b></td><td><span class="status-tag ${p.status}">${NOMES[p.status] || p.status}</span></td></tr>`).join("")
      || `<tr><td colspan="7" class="muted">Nenhum pedido encontrado.</td></tr>`) + "</tbody>";
}
$("#buscaPed").addEventListener("input", pedidos);
$("#filtroStatus").addEventListener("change", pedidos);
$("#tabPedidos").addEventListener("click", e => { const tr = e.target.closest("[data-ped]"); if (tr) abrirPedido(tr.dataset.ped); });

function abrirPedido(id) {
  const p = D.pedidos.find(x => x.id === id); if (!p) return;
  const c = p.cliente, en = p.entrega, mp = p.pagamento_mp;
  const whats = `https://wa.me/55${c.telefone}?text=${encodeURIComponent(`Olá, ${c.nome.split(" ")[0]}! Aqui é da ${D.loja}, sobre o seu pedido ${p.id}.`)}`;
  $("#detTit").textContent = "Pedido " + p.id;
  $("#detCorpo").innerHTML = `
    <div class="det-bloco"><span class="status-tag ${p.status}">${NOMES[p.status]}</span> <span class="muted">criado em ${new Date(p.criado).toLocaleString("pt-BR")}</span></div>
    <div class="det-bloco"><h4>Cliente</h4>${esc(c.nome)}<br>CPF ${cpfFmt(c.cpf)}<br>${esc(c.email)}<br>${telFmt(c.telefone)} · <a href="${whats}" target="_blank" rel="noopener">💬 WhatsApp</a></div>
    <div class="det-bloco"><h4>Entrega</h4>${esc(en.rua)}, ${esc(en.numero)}${en.complemento ? " – " + esc(en.complemento) : ""}<br>${esc(en.bairro)} · ${esc(en.cidade)}/${esc(en.uf)} · CEP ${esc(en.cep)}<br><span class="muted">Prazo informado: ${esc(en.prazo)}</span></div>
    <div class="det-bloco"><h4>Itens</h4>${p.itens.map(i => `<div class="linha"><span>${i.quantidade}x ${esc(i.nome)}${i.voltagem ? ` <b>(${esc(i.voltagem)})</b>` : ""}</span><span>${fmt(i.preco_unit * i.quantidade)}</span></div>`).join("")}
      <div class="linha"><span>Subtotal</span><span>${fmt(p.subtotal)}</span></div>${p.desconto ? `<div class="linha"><span>Desconto Pix</span><span>− ${fmt(p.desconto)}</span></div>` : ""}
      <div class="linha"><span>Frete</span><span>${fmt(p.frete)}</span></div><div class="linha total"><span>Total</span><span>${fmt(p.total)}</span></div></div>
    <div class="det-bloco"><h4>Pagamento</h4>${PAG[p.pagamento]} ${mp ? `· Mercado Pago nº ${esc(mp.id)} · ${esc(mp.status)}${mp.parcelas > 1 ? ` · ${mp.parcelas}x` : ""}${mp.aprovado_em ? ` · aprovado ${new Date(mp.aprovado_em).toLocaleString("pt-BR")}` : ""}` : "· ainda sem retorno do Mercado Pago"}
      ${p.link_pagamento && p.status === "aguardando_pagamento" ? `<br><a href="${esc(p.link_pagamento)}" target="_blank" rel="noopener">Link de pagamento</a> <button class="btn btn-sec" style="padding:4px 8px;font-size:12px" data-copiar="${esc(p.link_pagamento)}">Copiar</button>` : ""}</div>
    <div class="det-bloco"><h4>Atualizar pedido</h4>
      <label>Status<select id="detStatus">${D.status.map(s => `<option value="${s}" ${s === p.status ? "selected" : ""}>${NOMES[s]}</option>`).join("")}</select></label>
      <label>Código de rastreio<input id="detRastreio" value="${esc(p.rastreio || "")}" maxlength="60" placeholder="Ex.: AA123456789BR"></label>
      <label>Anotações internas<textarea id="detNotas" rows="3" maxlength="2000">${esc(p.notas || "")}</textarea></label></div>
    <div class="det-acoes"><button class="btn btn-pri" data-salvar="${esc(p.id)}">Salvar</button>
      <button class="btn btn-sec" data-sinc="${esc(p.id)}">↻ Consultar Mercado Pago</button><button class="btn btn-sec" data-imprimir>🖨 Imprimir</button></div>
    <div class="det-bloco"><h4>Histórico</h4><ul class="hist">${(p.historico || []).map(h => `<li>${new Date(h.quando).toLocaleString("pt-BR")} · ${NOMES[h.status] || h.status} · ${esc(h.por)}</li>`).join("")}</ul></div>`;
  $("#detalhe").hidden = false;
}
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-fechar-det],[data-salvar],[data-sinc],[data-copiar],[data-estq],[data-imprimir]"); if (!t) return;
  if (t.dataset.fecharDet !== undefined) { $("#detalhe").hidden = true; return; }
  if (t.dataset.imprimir !== undefined) { print(); return; }
  if (t.dataset.copiar) { navigator.clipboard.writeText(t.dataset.copiar); aviso("Link copiado"); return; }
  try {
    let r;
    if (t.dataset.salvar) r = await api("POST", { acao: "pedido", id: t.dataset.salvar, status: $("#detStatus").value, rastreio: $("#detRastreio").value, notas: $("#detNotas").value });
    if (t.dataset.sinc) r = await api("POST", { acao: "sincronizar", id: t.dataset.sinc });
    if (t.dataset.estq) {
      const inp = $(`input[data-estq-in="${t.dataset.estq}"]`);
      await api("POST", { acao: "estoque", id: t.dataset.estq, quantidade: +inp.value });
      D.estoques[t.dataset.estq] = +inp.value; aviso("Estoque salvo"); return estoque();
    }
    if (r?.pedido) { D.pedidos = D.pedidos.map(p => p.id === r.pedido.id ? r.pedido : p); abrirPedido(r.pedido.id); desenhar(); }
    aviso(r?.aviso || "Salvo ✓");
  } catch (ex) { aviso(ex.message); }
});

/* ---------- clientes ---------- */
function listaClientes() {
  const m = {};
  // clientes cadastrados no site (mesmo os que ainda não compraram)
  (D.contas || []).forEach(c => {
    m[c.email] = { nome: `${c.nome} ${c.sobrenome}`, email: c.email, telefone: c.telefone, cpf: "", cidade: "", uf: "",
      pedidos: 0, pagos: 0, gasto: 0, ultimo: c.criado, cadastro: c.criado, ofertas: c.ofertas };
  });
  D.pedidos.forEach(p => {
    const k = p.conta || p.cliente.email;
    const c = m[k] = m[k] || { ...p.cliente, pedidos: 0, pagos: 0, gasto: 0, ultimo: p.criado };
    c.cpf = c.cpf || p.cliente.cpf; c.cidade = c.cidade || p.entrega.cidade; c.uf = c.uf || p.entrega.uf;
    c.pedidos++;
    if (VENDA.includes(p.status)) { c.pagos++; c.gasto += p.total; }
    if (p.criado > c.ultimo) c.ultimo = p.criado;
  });
  return Object.values(m).sort((a, b) => b.gasto - a.gasto);
}
function clientes() {
  const t = $("#buscaCli").value.trim().toLowerCase();
  const l = listaClientes().filter(c => !t || [c.nome, c.email, c.cpf, c.telefone, c.cidade].join(" ").toLowerCase().includes(t));
  $("#tabClientes").innerHTML = `<thead><tr><th>Cliente</th><th>Contato</th><th>Cidade</th><th>Cadastro no site</th><th>Pedidos</th><th>Total comprado</th><th>Última atividade</th></tr></thead><tbody>` +
    (l.map(c => `<tr><td><b>${esc(c.nome)}</b>${c.cpf ? `<br><small class="muted">CPF ${cpfFmt(c.cpf)}</small>` : ""}</td><td>${esc(c.email)}<br><a href="https://wa.me/55${esc(c.telefone)}" target="_blank" rel="noopener">${telFmt(c.telefone)}</a></td>
      <td>${c.cidade ? esc(c.cidade) + "/" + esc(c.uf) : "—"}</td><td>${c.cadastro ? `✅ ${dataBR(c.cadastro)}${c.ofertas ? " · aceita ofertas" : ""}` : "—"}</td>
      <td>${c.pagos} pagos / ${c.pedidos}</td><td><b>${fmt(c.gasto)}</b></td><td>${dataBR(c.ultimo)}</td></tr>`).join("")
      || `<tr><td colspan="7" class="muted">Nenhum cliente ainda.</td></tr>`) + "</tbody>";
}
$("#buscaCli").addEventListener("input", clientes);

/* ---------- estoque ---------- */
function estoque() {
  $("#tabEstoque").innerHTML = `<thead><tr><th>Produto</th><th>Marca</th><th>Preço</th><th>Estoque</th><th></th></tr></thead><tbody>` +
    D.produtos.map(p => `<tr><td>${esc(p.nome)}</td><td>${esc(p.marca)}</td><td>${fmt(p.preco)}</td>
      <td class="${D.estoques[p.id] <= 2 ? "baixo" : ""}"><input type="number" min="0" value="${D.estoques[p.id]}" data-estq-in="${esc(p.id)}"></td>
      <td><button class="btn btn-sec" style="padding:6px 10px;font-size:13px" data-estq="${esc(p.id)}">Salvar</button></td></tr>`).join("") + "</tbody>";
}

/* ---------- CSV ---------- */
function baixarCSV(nome, linhas) {
  const csv = "﻿" + linhas.map(l => l.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = nome; a.click();
}
$("#csvPedidos").addEventListener("click", () => baixarCSV("pedidos.csv", [["Pedido", "Data", "Status", "Cliente", "CPF", "E-mail", "Telefone", "Cidade", "UF", "CEP", "Itens", "Pagamento", "Subtotal", "Desconto", "Frete", "Total", "Rastreio"],
  ...filtrarPedidos().map(p => [p.id, p.criado, NOMES[p.status], p.cliente.nome, p.cliente.cpf, p.cliente.email, p.cliente.telefone, p.entrega.cidade, p.entrega.uf, p.entrega.cep,
    p.itens.map(i => `${i.quantidade}x ${i.nome}${i.voltagem ? " " + i.voltagem : ""}`).join(" | "), PAG[p.pagamento], p.subtotal, p.desconto, p.frete, p.total, p.rastreio || ""])]));
$("#csvClientes").addEventListener("click", () => baixarCSV("clientes.csv", [["Nome", "CPF", "E-mail", "Telefone", "Cidade", "UF", "Cadastrado em", "Aceita ofertas", "Pedidos", "Pagos", "Total comprado", "Última atividade"],
  ...listaClientes().map(c => [c.nome, c.cpf, c.email, c.telefone, c.cidade, c.uf, c.cadastro || "", c.ofertas ? "Sim" : "", c.pedidos, c.pagos, c.gasto.toFixed(2).replace(".", ","), c.ultimo])]));

if (token) entrar().then(() => { if ($("#app").hidden) sair(); }); else sair();
