/* =====================================================================
   IMPORTAÇÃO DA BASE INICIAL DE PROCESSOS

   A ferramenta nasce vazia, mas o escritório já tem processos em
   andamento. Esta tela traz todos de uma vez, a partir da planilha
   modelo (modelos/importacao-processos.xlsx).

   A regra que evita estrago: **nada é gravado antes de você ver.**
   O arquivo é lido no próprio navegador, cada linha é conferida, a
   tela mostra o que está certo e o que tem problema, e só depois de
   você confirmar é que os processos vão para o banco.

   Aceita .xlsx e .csv. Visível apenas para administradores.
   ===================================================================== */

Object.assign(App, {

  IMPORT_COLUNAS: ['cliente','tipo','data_inicio','status','responsavel','protocolo_junta',
                   'viabilidade','dbe','fcn','pagamento','registro','licenciamentos',
                   'requerente','observacoes'],

  IMPORT_TIPOS:  ['abertura','alteracao','filial','baixa','outros'],
  IMPORT_STATUS: ['documentos','analise','andamento','concluido'],
  IMPORT_ETAPAS: ['pendente','andamento','concluido','indeferido','na'],
  IMPORT_ETAPA_COLUNAS: ['viabilidade','dbe','fcn','pagamento','registro','licenciamentos'],

  _importLinhas: null,
  _importArquivo: '',

  renderImportacao(){
    const el = document.getElementById('importConteudo');
    if(!el) return;
    const semXlsx = (typeof XLSX === 'undefined');

    el.innerHTML = `
      <div class="callout" style="margin-bottom:16px;">
        <b>Como funciona.</b> O arquivo é lido aqui no navegador e conferido linha por linha.
        Você vê o resultado antes de qualquer gravação — nenhum processo entra no banco sem a sua confirmação.
        Sócios, administradores e documentos não vêm por aqui: eles são preenchidos no cadastro de cada processo.
      </div>

      <div class="panel" style="margin-bottom:18px;">
        <div class="panel-head" style="padding:13px 16px;"><h3 class="sec-title">1. Planilha modelo</h3></div>
        <div class="panel-body" style="padding:14px 16px;">
          <p class="view-sub" style="margin:0 0 12px;">
            Baixe, preencha uma linha por processo em andamento e volte aqui. Só <b>cliente</b> e <b>tipo</b> são obrigatórios;
            o resto pode ser completado depois, dentro da ferramenta.
          </p>
          <div class="btn-row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;">
            <a class="btn" href="../modelos/importacao-processos.xlsx" download>⬇ Baixar a planilha modelo (.xlsx)</a>
            <button class="btn ghost" data-action="baixarModeloCsv">ou baixar como .csv</button>
          </div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:18px;">
        <div class="panel-head" style="padding:13px 16px;"><h3 class="sec-title">2. Enviar o arquivo preenchido</h3></div>
        <div class="panel-body" style="padding:14px 16px;">
          ${semXlsx ? `<div class="ocr-strip" style="margin:0 0 12px;background:var(--status-warn-bg);color:var(--status-warn);">
              <span>⚠️</span><span class="grow">A biblioteca de planilha (<code>vendor/xlsx.min.js</code>) não carregou —
              por enquanto só dá para importar <b>.csv</b>.</span></div>` : ''}
          <div class="extra-drop" id="importDrop">
            Arraste a planilha aqui ou clique para escolher<br>
            <span style="font-size:11.5px;color:var(--muted);">${semXlsx ? '.csv' : '.xlsx ou .csv'}</span>
          </div>
          <input type="file" id="importInput" accept=".xlsx,.csv" style="display:none">
        </div>
      </div>

      <div id="importResultado"></div>`;

    const drop = document.getElementById('importDrop');
    const input = document.getElementById('importInput');
    drop.onclick = () => input.click();
    input.onchange = () => this.lerPlanilha(input.files);
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('drag');
      this.lerPlanilha(e.dataTransfer.files);
    });
  },

  /* Modelo em CSV, para quem preferir editar em qualquer editor. */
  baixarModeloCsv(){
    const exemplo = ['ALFA COMERCIO DE TESTES LTDA','abertura','12/08/2026','andamento','Equipe Societário',
                     'MTB2600227890','concluido','andamento','pendente','pendente','pendente','pendente',
                     'REQUERENTE DE EXEMPLO','Apague esta linha de exemplo antes de importar'];
    const csv = this.IMPORT_COLUNAS.join(';') + '\n' + exemplo.join(';') + '\n';
    const b = new Blob(['﻿' + csv], {type:'text/csv;charset=utf-8'});
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = 'importacao-processos.csv'; a.click();
    setTimeout(()=>URL.revokeObjectURL(u), 1500);
  },

  async lerPlanilha(files){
    if(!files || !files.length) return;
    const f = files[0];
    this._importArquivo = f.name;
    try{
      const linhas = /\.csv$/i.test(f.name)
        ? this.lerCsv(await f.text())
        : this.lerXlsx(await f.arrayBuffer());
      this._importLinhas = this.conferirLinhas(linhas);
      this.renderConferencia();
    }catch(e){
      document.getElementById('importResultado').innerHTML =
        `<div class="ocr-strip" style="background:var(--status-bad-bg);color:var(--status-bad);">
           <span>✕</span><span class="grow"><b>Não consegui ler o arquivo.</b> ${this.escapeHtml(e.message)}</span></div>`;
    }
  },

  lerXlsx(buffer){
    if(typeof XLSX === 'undefined') throw new Error('A biblioteca de planilha não está carregada. Salve o arquivo como .csv e tente de novo.');
    const wb = XLSX.read(buffer, {type:'array', cellDates:true});
    const aba = wb.SheetNames.indexOf('Processos') > -1 ? 'Processos' : wb.SheetNames[0];
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[aba], {header:1, raw:false, defval:''});
    return this.montarObjetos(linhas);
  },

  /* CSV simples com ; ou , respeitando aspas */
  lerCsv(texto){
    const sep = (texto.split('\n')[0].split(';').length > texto.split('\n')[0].split(',').length) ? ';' : ',';
    const linhas = [];
    texto.replace(/^﻿/, '').split(/\r?\n/).forEach(l=>{
      if(!l.trim()) return;
      const campos = []; let atual = ''; let aspas = false;
      for(let i=0;i<l.length;i++){
        const ch = l[i];
        if(ch === '"'){ if(aspas && l[i+1] === '"'){ atual += '"'; i++; } else aspas = !aspas; }
        else if(ch === sep && !aspas){ campos.push(atual); atual = ''; }
        else atual += ch;
      }
      campos.push(atual);
      linhas.push(campos);
    });
    return this.montarObjetos(linhas);
  },

  /* Casa o cabeçalho da planilha com as colunas esperadas e devolve objetos.
     Aceita o cabeçalho em qualquer ordem e ignora colunas desconhecidas. */
  montarObjetos(matriz){
    if(!matriz || !matriz.length) throw new Error('A planilha está vazia.');
    const norm = s => String(s||'').trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'_');

    let iCab = matriz.findIndex(l => (l||[]).some(c => norm(c) === 'cliente'));
    if(iCab === -1) throw new Error('Não encontrei a coluna "cliente" no cabeçalho. Use a planilha modelo.');

    const cab = (matriz[iCab] || []).map(norm);
    const objs = [];
    for(let i = iCab + 1; i < matriz.length; i++){
      const l = matriz[i] || [];
      const o = {_linha: i + 1};
      cab.forEach((nome, j) => {
        if(this.IMPORT_COLUNAS.indexOf(nome) > -1) o[nome] = String(l[j] === undefined ? '' : l[j]).trim();
      });
      /* pula a linha de legenda da planilha modelo e as linhas vazias */
      const vazia = this.IMPORT_COLUNAS.every(c => !o[c]);
      const legenda = /^OBRIGAT[ÓO]RIO|^Raz[ãa]o social exatamente/i.test(o.cliente || '');
      if(!vazia && !legenda) objs.push(o);
    }
    if(!objs.length) throw new Error('Não há nenhuma linha preenchida abaixo do cabeçalho.');
    return objs;
  },

  /* Confere cada linha e devolve o mesmo objeto com _erros e _avisos. */
  conferirLinhas(linhas){
    const nomesClientes = (CLIENTES || []).map(c => c.nome);
    const jaExiste = (cliente, tipo) =>
      (PROCESSOS || []).some(p => p.cliente === cliente && p.tipo === tipo);

    /* `jaExiste` só olhava os processos que já estão na ferramenta. Duas
       linhas iguais DENTRO da planilha passavam as duas com ✅. */
    const vistas = new Set();

    return linhas.map(o => {
      const erros = [], avisos = [];

      if(!o.cliente) erros.push('cliente em branco');
      if(!o.tipo) erros.push('tipo em branco');
      if(o.cliente && o.tipo){
        const chave = String(o.cliente).toUpperCase() + '|' + String(o.tipo).toLowerCase();
        if(vistas.has(chave)) avisos.push('esta linha repete outra linha da própria planilha (mesmo cliente e mesmo tipo)');
        vistas.add(chave);
      }
      else if(this.IMPORT_TIPOS.indexOf(o.tipo.toLowerCase()) === -1)
        erros.push(`tipo "${o.tipo}" inválido (use ${this.IMPORT_TIPOS.join(', ')})`);
      else o.tipo = o.tipo.toLowerCase();

      if(o.status){
        if(this.IMPORT_STATUS.indexOf(o.status.toLowerCase()) === -1)
          erros.push(`status "${o.status}" inválido`);
        else o.status = o.status.toLowerCase();
      } else o.status = 'analise';

      this.IMPORT_ETAPA_COLUNAS.forEach(col => {
        if(!o[col]){ o[col] = 'pendente'; return; }
        const v = o[col].toLowerCase();
        if(this.IMPORT_ETAPAS.indexOf(v) === -1) erros.push(`${col} "${o[col]}" inválido`);
        else o[col] = v;
      });

      if(o.cliente && nomesClientes.length && nomesClientes.indexOf(o.cliente) === -1)
        avisos.push('não existe pasta com esse nome exato no SharePoint');
      if(o.cliente && o.tipo && jaExiste(o.cliente, o.tipo))
        avisos.push('já existe um processo deste cliente e tipo — importar cria um duplicado');
      if(o.data_inicio && !this.dataDaPlanilha(o.data_inicio))
        avisos.push(`data "${o.data_inicio}" não reconhecida — vai entrar em branco`);
      if(o.protocolo_junta && !/^[A-Z]{3}\d{6,}$/i.test(o.protocolo_junta.replace(/\s/g,'')))
        avisos.push('protocolo fora do formato esperado (ex.: MTB2600227890)');

      o._erros = erros;
      o._avisos = avisos;
      o._importar = erros.length === 0;
      return o;
    });
  },

  /* Aceita dd/mm/aaaa, aaaa-mm-dd e a data serial do Excel. */
  dataDaPlanilha(v){
    const s = String(v || '').trim();
    if(!s) return '';
    /* Confere o calendário: a expressão sozinha aceitava 31/02/2026 e a
       data impossível entrava no processo sem uma observação sequer. */
    const valida = (d, mes, a) => {
      const dt = new Date(Date.UTC(+a, +mes - 1, +d));
      return dt.getUTCFullYear() === +a && dt.getUTCMonth() === +mes - 1 && dt.getUTCDate() === +d;
    };
    let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m) return valida(m[1], m[2], m[3]) ? `${m[1]}/${m[2]}/${m[3]}` : '';
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return valida(m[3], m[2], m[1]) ? `${m[3]}/${m[2]}/${m[1]}` : '';
    if(/^\d{5}$/.test(s)){                       /* serial do Excel */
      const d = new Date(Date.UTC(1899, 11, 30) + parseInt(s,10) * 86400000);
      const p = n => String(n).padStart(2,'0');
      return `${p(d.getUTCDate())}/${p(d.getUTCMonth()+1)}/${d.getUTCFullYear()}`;
    }
    const d = new Date(s);
    if(!isNaN(d.getTime())){
      const p = n => String(n).padStart(2,'0');
      return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;
    }
    return '';
  },

  renderConferencia(){
    const linhas = this._importLinhas || [];
    const ok = linhas.filter(l => l._importar);
    const comErro = linhas.filter(l => !l._importar);
    const comAviso = ok.filter(l => l._avisos.length);
    const box = document.getElementById('importResultado');

    const linhaHtml = l => {
      const estado = !l._importar ? 'erro' : (l._avisos.length ? 'aviso' : 'ok');
      const ic = estado === 'ok' ? '✅' : (estado === 'aviso' ? '⚠️' : '❌');
      const notas = l._erros.concat(l._avisos);
      return `<tr>
        <td style="width:34px;text-align:center;">${ic}</td>
        <td style="color:var(--muted);font-size:11.5px;">L${l._linha}</td>
        <td><b style="color:var(--dark);">${this.escapeHtml(l.cliente || '(sem cliente)')}</b></td>
        <td>${this.escapeHtml((TIPOS[l.tipo] && TIPOS[l.tipo].label) || l.tipo || '—')}</td>
        <td>${this.escapeHtml(l.status || '')}</td>
        <td>${this.escapeHtml(l.protocolo_junta || '—')}</td>
        <td style="font-size:11.5px;color:${l._erros.length ? 'var(--status-bad)' : 'var(--status-warn)'};">
          ${notas.length ? this.escapeHtml(notas.join(' · ')) : ''}</td>
      </tr>`;
    };

    box.innerHTML = `
      <div class="panel">
        <div class="panel-head" style="padding:13px 16px;">
          <h3 class="sec-title">3. Conferência — ${this.escapeHtml(this._importArquivo)}</h3>
          <span class="badge ${comErro.length ? 'warn' : 'good'}"><span class="dot"></span>${ok.length} de ${linhas.length} prontos</span>
        </div>
        <div class="panel-body" style="padding:14px 16px;">
          ${comErro.length
            ? `<div class="ocr-strip" style="margin:0 0 12px;background:var(--status-bad-bg);color:var(--status-bad);align-items:flex-start;">
                 <span>❌</span><span class="grow"><b>${comErro.length} linha(s) não serão importadas</b> — corrija na planilha e envie de novo, ou importe só as válidas.</span></div>`
            : `<div class="ocr-strip" style="margin:0 0 12px;background:var(--status-good-bg);color:var(--status-good);">
                 <span>✓</span><span class="grow"><b>Todas as ${linhas.length} linhas estão válidas.</b></span></div>`}
          ${comAviso.length
            ? `<div class="ocr-strip" style="margin:0 0 12px;background:var(--status-warn-bg);color:var(--status-warn);align-items:flex-start;">
                 <span>⚠️</span><span class="grow"><b>${comAviso.length} linha(s) com aviso.</b> Elas serão importadas assim mesmo — o aviso é só para você conferir antes.</span></div>`
            : ''}
          <div style="overflow-x:auto;">
            <table class="tbl">
              <thead><tr><th></th><th>Linha</th><th>Cliente</th><th>Tipo</th><th>Status</th><th>Protocolo</th><th>Observações da conferência</th></tr></thead>
              <tbody>${linhas.map(linhaHtml).join('')}</tbody>
            </table>
          </div>
          <div class="btn-row" style="margin-top:16px;">
            <button class="btn ghost" data-action="renderImportacao">Cancelar</button>
            <button class="btn dark" ${ok.length ? '' : 'disabled'} data-action="confirmarImportacao">
              Importar ${ok.length} processo(s) →
            </button>
          </div>
        </div>
      </div>`;
  },

  async confirmarImportacao(){
    const linhas = (this._importLinhas || []).filter(l => l._importar);
    if(!linhas.length) return;
    if(!confirm(`Importar ${linhas.length} processo(s)?\n\nEles passam a aparecer em "Meus Processos" para toda a equipe.`)) return;

    const box = document.getElementById('importResultado');
    box.innerHTML = `<div class="ocr-strip"><span>⏳</span><span class="grow">Importando ${linhas.length} processo(s)…</span></div>`;

    const gravados = [], falhas = [];
    for(const l of linhas){
      const requerente = (REQUERENTES || []).find(r =>
        String(r.nome||'').toUpperCase() === String(l.requerente||'').toUpperCase());
      const p = {
        /* SOMA colidia: o instante T com sorteio 500 dá o mesmo id de
           T+500 com sorteio 0, e numa planilha de 60 linhas — todas em
           poucos milissegundos — a colisão era provável. Como `salvar` é
           upsert, o processo anterior era substituído e o contador ainda
           dizia que os 60 entraram. */
        id: 'imp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        cliente: l.cliente,
        tipo: l.tipo,
        data: this.dataDaPlanilha(l.data_inicio) || new Date().toLocaleDateString('pt-BR'),
        status: l.status,
        resp: l.responsavel || '—',
        socios: [], administradores: [],
        jucemat: {
          viabilidade: l.viabilidade, dbe: l.dbe, fcn: l.fcn,
          pagamento: l.pagamento, registro: l.registro, licenciamentos: l.licenciamentos,
          protocolo: l.protocolo_junta || '',
          requerenteId: requerente ? requerente.id : null,
          requerenteNome: l.requerente || ''
        },
        juntaExtraFiles: [], licenciamentosDocs: {},
        observacoes: l.observacoes || '',
        aguardaConfirmacaoCliente: false,
        proprietarioNotificado: false,
        origem: 'importacao',
        origemArquivo: this._importArquivo
      };

      if(GS2Api.disponivel){
        try{
          await GS2Api.chamar('/processos', {metodo:'POST', corpo:p});
          p._persistido = true;
          gravados.push(p);
        }catch(e){ falhas.push({cliente:l.cliente, erro:e.message}); continue; }
      } else {
        gravados.push(p);
      }
      PROCESSOS.unshift(p);
    }

    this._importLinhas = null;
    box.innerHTML = `
      <div class="panel">
        <div class="panel-head" style="padding:13px 16px;"><h3 class="sec-title">Importação concluída</h3></div>
        <div class="panel-body" style="padding:14px 16px;">
          <div class="ocr-strip" style="margin:0 0 12px;background:var(--status-good-bg);color:var(--status-good);">
            <span>✓</span><span class="grow"><b>${gravados.length} processo(s) importado(s)</b>${
              GS2Api.disponivel ? ' e gravados no banco.' : ' — <b>apenas nesta aba</b>, porque o banco não está disponível agora.'}</span>
          </div>
          ${falhas.length ? `<div class="ocr-strip" style="margin:0 0 12px;background:var(--status-bad-bg);color:var(--status-bad);align-items:flex-start;">
            <span>✕</span><span class="grow"><b>${falhas.length} falharam:</b><br>${
              falhas.map(f=>`${this.escapeHtml(f.cliente)} — ${this.escapeHtml(f.erro)}`).join('<br>')}</span></div>` : ''}
          <div class="btn-row" style="justify-content:flex-start;gap:8px;">
            <button class="btn dark" data-action="navigate" data-args='["processos"]'>Ver em Meus Processos →</button>
            <button class="btn" data-action="renderImportacao">Importar outra planilha</button>
          </div>
        </div>
      </div>`;
    this.renderBannerSemente();
  }
});
