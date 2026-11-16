/**
 * Mega Casa SP — ponte entre o site e as planilhas do Google.
 *
 * COMO INSTALAR (uma vez só):
 * 1. Acesse script.google.com com a conta Google da empresa → "Novo projeto".
 * 2. Apague o conteúdo e cole TODO este arquivo. Salve (nome: "Mega Casa SP - Planilhas").
 * 3. Escolha a função "configurar" no menu de cima e clique em "Executar". Autorize o acesso.
 *    Ela cria as 2 planilhas no seu Google Drive ("Mega Casa SP - Clientes" e "Mega Casa SP - Pedidos")
 *    e mostra no registro de execução o SEGREDO que vai na Vercel (PLANILHA_SEGREDO).
 * 4. "Implantar" → "Nova implantação" → tipo "App da Web":
 *      Executar como: Eu  ·  Quem pode acessar: Qualquer pessoa
 *    Copie a URL do app da Web (termina em /exec) → variável PLANILHA_URL na Vercel.
 *
 * Segurança: o script só grava se receber o SEGREDO certo. As planilhas ficam só no seu Drive (privadas).
 */

const ABAS = {
  clientes: {
    titulo: 'Mega Casa SP - Clientes', aba: 'Clientes', chave: 'E-mail',
    colunas: ['Data do cadastro', 'Nome', 'Sobrenome', 'E-mail', 'Telefone', 'Aceita ofertas', 'Último acesso', 'Pedidos', 'Total comprado (R$)']
  },
  pedidos: {
    titulo: 'Mega Casa SP - Pedidos', aba: 'Pedidos', chave: 'Pedido',
    colunas: ['Pedido', 'Data', 'Status', 'Cliente cadastrado', 'Nome', 'E-mail', 'Telefone', 'CPF',
      'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Cidade', 'UF', 'Itens', 'Pagamento',
      'Subtotal (R$)', 'Desconto cadastro (R$)', 'Desconto Pix (R$)', 'Frete (R$)', 'Total (R$)', 'Rastreio', 'Atualizado em']
  }
};

function configurar() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(ABAS).forEach(function (k) {
    const cfg = ABAS[k];
    let id = props.getProperty('ID_' + k);
    let ss = null;
    try { if (id) ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
    if (!ss) {
      ss = SpreadsheetApp.create(cfg.titulo);
      props.setProperty('ID_' + k, ss.getId());
    }
    let sh = ss.getSheetByName(cfg.aba) || ss.getSheets()[0];
    sh.setName(cfg.aba);
    sh.getRange(1, 1, 1, cfg.colunas.length).setValues([cfg.colunas]).setFontWeight('bold').setBackground('#0b2d6b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    Logger.log(cfg.titulo + ': ' + ss.getUrl());
  });
  let segredo = props.getProperty('SEGREDO');
  if (!segredo) {
    segredo = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SEGREDO', segredo.replace(/-/g, ''));
  }
  Logger.log('PLANILHA_SEGREDO (cole na Vercel): ' + props.getProperty('SEGREDO'));
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    if (!d.segredo || d.segredo !== props.getProperty('SEGREDO')) return resposta({ ok: false, erro: 'segredo' });
    const cfg = ABAS[d.tipo];
    if (!cfg) return resposta({ ok: false, erro: 'tipo' });
    const sh = SpreadsheetApp.openById(props.getProperty('ID_' + d.tipo)).getSheetByName(cfg.aba);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      // atualiza a linha se a chave (e-mail ou nº do pedido) já existir; senão, adiciona no fim
      const col = cfg.colunas.indexOf(cfg.chave) + 1;
      const valor = String(d.dados[cfg.chave] || '');
      let linha = 0;
      const ult = sh.getLastRow();
      if (valor && ult > 1) {
        const achado = sh.getRange(2, col, ult - 1, 1).createTextFinder(valor).matchEntireCell(true).findNext();
        if (achado) linha = achado.getRow();
      }
      const atual = linha ? sh.getRange(linha, 1, 1, cfg.colunas.length).getValues()[0] : [];
      const nova = cfg.colunas.map(function (c, i) {
        const v = d.dados[c];
        return v === undefined || v === null ? (atual[i] !== undefined ? atual[i] : '') : limpar(v);
      });
      if (linha) sh.getRange(linha, 1, 1, nova.length).setValues([nova]);
      else sh.appendRow(nova);
    } finally { lock.releaseLock(); }
    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  }
}

// evita que um texto vire fórmula na planilha (proteção contra "injeção de fórmula")
function limpar(v) {
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  v = String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function resposta(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
