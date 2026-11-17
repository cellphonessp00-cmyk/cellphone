/* Conta do cliente: entrar / cadastrar (ganha LOJA.descontoCadastro % em todas as compras). Usado em todas as páginas. */
(function () {
  const BASE = document.body.dataset.base || "";
  const ler = () => { try { return JSON.parse(localStorage.getItem("mc_conta")) || null; } catch { return null; } };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DESC = LOJA.descontoCadastro || 0;

  const CONTA = window.CONTA = {
    atual: ler(),
    logado() { return !!(this.atual && this.atual.token); },
    desconto() { return this.logado() ? DESC : 0; },
    auth() { return this.logado() ? { Authorization: "Bearer " + this.atual.token } : {}; },
    salvar(d) { this.atual = { token: d.token, ...d.conta }; try { localStorage.setItem("mc_conta", JSON.stringify(this.atual)); } catch {} avisar(); },
    sair() { this.atual = null; try { localStorage.removeItem("mc_conta"); } catch {} avisar(); },
    abrir(aba = "cadastrar") { abrirModal(aba); }
  };
  function avisar() { atualizarCabecalho(); document.dispatchEvent(new CustomEvent("conta-mudou")); }

  if (LOJA.demonstracao) {
    const f = document.createElement("div");
    f.className = "faixa-demo";
    f.setAttribute("role", "note");
    f.textContent = "🧪 Loja em demonstração: pagamentos em modo de teste e dados da empresa fictícios.";
    document.body.prepend(f);
  }

  function atualizarCabecalho() {
    const t = document.getElementById("contaTxt");
    if (t) t.innerHTML = CONTA.logado() ? `Olá, <b>${esc(CONTA.atual.nome)}</b>` : `Entre ou <b>cadastre-se</b>`;
  }

  /* ---------- modal ---------- */
  function abrirModal(aba) {
    let m = document.getElementById("modalConta");
    if (!m) {
      m = document.createElement("div");
      m.id = "modalConta"; m.className = "modal"; m.hidden = true;
      m.innerHTML = `<div class="modal-fundo" data-fechar-conta></div>
      <div class="modal-caixa conta-caixa" role="dialog" aria-modal="true" aria-labelledby="contaTitulo">
        <button class="btn-icone modal-x" data-fechar-conta aria-label="Fechar">✕</button>
        <div id="contaCorpo"></div>
      </div>`;
      document.body.appendChild(m);
      m.addEventListener("click", e => { if (e.target.closest("[data-fechar-conta]")) fechar(); const a = e.target.closest("[data-aba-conta]"); if (a) desenhar(a.dataset.abaConta); });
      m.addEventListener("submit", enviar);
      m.addEventListener("input", e => {
        if (e.target.name === "telefone") { const d = e.target.value.replace(/\D/g, "").slice(0, 11); e.target.value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/[-\s(]+$/, ""); }
      });
    }
    desenhar(CONTA.logado() ? "perfil" : aba);
    m.hidden = false; document.body.style.overflow = "hidden";
    setTimeout(() => m.querySelector("input")?.focus(), 50);
  }
  function fechar() { const m = document.getElementById("modalConta"); if (m) m.hidden = true; document.body.style.overflow = ""; }

  function desenhar(aba) {
    const c = document.getElementById("contaCorpo");
    if (aba === "perfil") {
      const a = CONTA.atual;
      c.innerHTML = `<h2 id="contaTitulo">Minha conta</h2>
        <p class="beneficio">🎁 Você tem <b>${DESC}% de desconto</b> em todas as compras.</p>
        <p>${esc(a.nome)} ${esc(a.sobrenome)}<br><span class="muted">${esc(a.email)}</span></p>
        <div class="acoes-prod"><a class="btn btn-sec" href="${BASE}pedido.html">Meus pedidos</a><button class="btn btn-sec" data-sair-conta>Sair</button></div>`;
      c.querySelector("[data-sair-conta]").onclick = () => { CONTA.sair(); fechar(); };
      return;
    }
    const cad = aba === "cadastrar";
    c.innerHTML = `
      <div class="abas-conta"><button data-aba-conta="cadastrar" class="${cad ? "ativo" : ""}">Cadastrar</button><button data-aba-conta="entrar" class="${cad ? "" : "ativo"}">Entrar</button></div>
      <h2 id="contaTitulo">${cad ? `Cadastre-se e ganhe ${DESC}% OFF` : "Entre na sua conta"}</h2>
      ${cad ? `<p class="beneficio">🎁 Clientes cadastrados têm <b>${DESC}% de desconto em todas as compras</b>${LOJA.descontoPix ? `, e ainda +${LOJA.descontoPix}% no Pix` : ""}.</p>` : ""}
      <form class="campos" data-form-conta="${aba}" novalidate>
        ${cad ? `<label class="campo m3">Nome<input name="nome" autocomplete="given-name" required maxlength="40"></label>
        <label class="campo m3">Sobrenome<input name="sobrenome" autocomplete="family-name" required maxlength="60"></label>` : ""}
        <label class="campo">E-mail<input name="email" type="email" autocomplete="email" required maxlength="120"></label>
        ${cad ? `<label class="campo">Telefone (WhatsApp)<input name="telefone" inputmode="tel" autocomplete="tel-national" required placeholder="(11) 99999-9999"></label>` : ""}
        <label class="campo">Senha<input name="senha" type="password" autocomplete="${cad ? "new-password" : "current-password"}" required minlength="8">${cad ? `<small>Mínimo 8 caracteres, com letras e números.</small>` : ""}</label>
        ${cad ? `<label class="aceite campo"><span><input type="checkbox" name="aceite" required> Li e aceito os <a href="${BASE}termos-de-uso.html" target="_blank">Termos de uso</a> e a <a href="${BASE}politica-de-privacidade.html" target="_blank">Política de privacidade</a>.</span></label>
        <label class="aceite campo"><span><input type="checkbox" name="ofertas" checked> Quero receber ofertas por e-mail e WhatsApp.</span></label>` : ""}
        <div class="erro-box campo" hidden data-erro-conta></div>
        <button class="btn btn-pri largo campo">${cad ? `Criar conta e ganhar ${DESC}% OFF` : "Entrar"}</button>
        ${cad ? "" : `<p class="campo muted" style="font-weight:400">Esqueceu a senha? <a href="https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent("Olá! Esqueci a senha da minha conta no site.")}" target="_blank" rel="noopener">Fale com a gente</a>.</p>`}
      </form>`;
  }

  async function enviar(e) {
    const f = e.target.closest("[data-form-conta]"); if (!f) return;
    e.preventDefault();
    const erro = f.querySelector("[data-erro-conta]"), btn = f.querySelector("button");
    const dados = Object.fromEntries(new FormData(f));
    dados.acao = f.dataset.formConta; dados.aceite = !!dados.aceite; dados.ofertas = !!dados.ofertas;
    btn.disabled = true; erro.hidden = true;
    try {
      const r = await fetch(`${BASE}api/conta`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro || "Não foi possível concluir.");
      CONTA.salvar(d);
      fechar();
      const a = document.getElementById("aviso");
      if (a) { a.textContent = `✓ Bem-vindo(a), ${d.conta.nome}! Seu desconto de ${d.desconto}% já está ativo.`; a.hidden = false; setTimeout(() => a.hidden = true, 3500); }
    } catch (ex) { erro.textContent = ex.message; erro.hidden = false; }
    btn.disabled = false;
  }

  document.addEventListener("click", e => { if (e.target.closest("#contaBtn,[data-abrir-conta]")) { e.preventDefault(); abrirModal(e.target.closest("[data-abrir-conta]")?.dataset.abrirConta || "cadastrar"); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape") fechar(); });

  // confere se o login ainda vale (expira em 30 dias)
  if (CONTA.logado()) fetch(`${BASE}api/conta`, { headers: CONTA.auth(), cache: "no-store" }).then(r => { if (r.status === 401) CONTA.sair(); }).catch(() => {});
  atualizarCabecalho();
})();
