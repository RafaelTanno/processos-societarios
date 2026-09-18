/* =====================================================================
   Acervo do SharePoint — tela e ligação com o Painel de Clientes.

   Parte da ferramenta Processos Societários — GS2 Negócios.
   Carregado por web/index.html na ordem definida lá.

   Aqui mora o que tem DOM. A leitura em si — interpretar nome de
   arquivo, andar nas pastas, abrir Cartão CNPJ e QSA — está em
   web/js/acervo.js, que não conhece tela nenhuma.

   Três momentos:
     1. ao entrar    → busca no banco o acervo já varrido e enche o
                       Painel de Clientes com ele;
     2. varredura    → o administrador roda uma vez, VÊ o resultado e só
                       então grava (regra da casa: nada é gravado sem o
                       usuário ver);
     3. ao abrir um  → relê aquele cliente no SharePoint, em segundo
        cliente        plano, para pegar o que mudou desde a varredura.
   ===================================================================== */

Object.assign(App, {

  acervo: {
    resultados: [],      /* varredura em memória, ainda não gravada */
    rodando: false,
    parar: false,
    progresso: {feito:0, total:0, atual:''},
    resumo: []           /* o que o banco já tem */
  },

  /* ==================================================================
     1. CARGA — o que o banco já sabe
     ================================================================== */

  /* Garante que TODO cliente da lista tenha uma ficha, nem que seja a
     vazia. Sem isso o Painel quebra no primeiro cliente sem acervo — e
     "ainda não lido" é uma resposta honesta, zero não é. */
  garantirFichas(){
    if(typeof CLIENTES === 'undefined') return;
    CLIENTES.forEach(c => {
      if(!CLIENTES_DETALHE[c.nome]) CLIENTES_DETALHE[c.nome] = GS2Acervo.formaVazia(c.nome);
    });
  },

  async carregarAcervo(){
    this.garantirFichas();
    if(!GS2Api.disponivel) return;
    try{
      const todos = await GS2Api.chamar('/acervo');
      todos.forEach(a => { if(a.ficha) CLIENTES_DETALHE[a.cliente] = GS2Acervo.completar(a.cliente, a.ficha); });
      this.acervo.resumo = todos.map(a => ({cliente:a.cliente, varridoEm:a.varridoEm}));
      this.recalcularSemDocumentos();
      if(todos.length) console.log(`[GS2] acervo de ${todos.length} cliente(s) carregado do banco.`);
      const painel = document.getElementById('view-clientes');
      if(painel && painel.classList.contains('active') && this.renderClientesGrid) this.renderClientesGrid();
    }catch(e){
      console.warn('[GS2] não consegui carregar o acervo do banco:', e.message);
    }
  },

  /* A fila de regularização deixa de ser lista escrita à mão: passa a
     ser quem, no acervo lido, não tem Cartão CNPJ nem QSA. Clientes
     ainda não varridos ficam de fora — não sabemos nada sobre eles, e
     chutar que estão pendentes seria inventar trabalho. */
  recalcularSemDocumentos(){
    if(typeof CLIENTES_SEM_DOCUMENTOS === 'undefined') return;
    const lidos = Object.keys(CLIENTES_DETALHE).filter(n => {
      const d = CLIENTES_DETALHE[n];
      return d && (d.origem === 'sharepoint' || d.origem === 'sem-acervo');
    });
    if(!lidos.length) return;   /* nada varrido ainda: mantém a lista embutida */
    CLIENTES_SEM_DOCUMENTOS = lidos.filter(n => {
      const d = CLIENTES_DETALHE[n];
      if(d.origem === 'sem-acervo') return true;
      const docs = d.documentos || [];
      return !docs.some(x => x.tipo === 'cnpj') && !docs.some(x => x.tipo === 'qsa');
    }).sort((a,b) => a.localeCompare(b,'pt-BR'));
  },

  /* ==================================================================
     2. VARREDURA
     ================================================================== */

  renderAcervo(){
    const alvo = document.getElementById('acervoConteudo');
    if(!alvo) return;

    if(!GS2SP.disponivel()){
      alvo.innerHTML = `
        <div class="callout warn">
          <b>A ferramenta não está conectada ao SharePoint.</b><br>
          Em modo demonstração não há acervo para varrer — o que aparece no Painel de
          Clientes é exemplo. Configure <code>tenantId</code> e <code>clientId</code> em
          <code>web/config.js</code> e entre com o e-mail corporativo para ler o acervo de verdade.
        </div>`;
      return;
    }

    const a = this.acervo;
    /* Só conta quem ainda é pasta de cliente: com uma pasta renomeada no
       SharePoint, o antigo continuava no banco e o selo chegava a mostrar
       "62 de 60", em verde. */
    const nomesAtuais = new Set((typeof CLIENTES !== 'undefined' ? CLIENTES : []).map(c => c.nome));
    const varridos = a.resumo.filter(r => nomesAtuais.has(r.cliente)).length;
    const total = nomesAtuais.size;
    const ultima = a.resumo
      .map(r => r.varridoEm).filter(Boolean).sort().pop();

    alvo.innerHTML = `
      <div class="callout">
        <b>O que a varredura faz.</b> Percorre, cliente por cliente,
        <code>03 - Societario / 03.01 - Contratos Sociais, CNPJ e QSA</code> no SharePoint e lê
        <b>os nomes dos arquivos</b> — tipo do ato, número da alteração, data e razão social.
        Depois abre <b>apenas dois documentos</b> por cliente, o Cartão CNPJ e o QSA mais recentes,
        para tirar deles CNPJ, endereço, natureza jurídica, CNAE e quadro societário.
        Contrato social não é aberto: é texto corrido, e leitura automática ali erra mais do que acerta.<br><br>
        <b>Ela não grava nada no SharePoint.</b> Só lê, com a sua permissão de acesso — pasta que
        você não enxerga lá, a ferramenta também não enxerga. E nada vai para o banco antes de
        você ver o resultado nesta tela.
      </div>

      <div class="panel" style="margin-top:14px;">
        <div class="panel-head">
          <b>Situação</b>
          <span class="badge ${varridos ? (varridos >= total ? 'good' : 'warn') : 'crit'}">
            <span class="dot"></span>${varridos} de ${total} clientes com acervo lido
          </span>
        </div>
        <div class="panel-body">
          ${ultima ? `<p class="view-sub" style="margin:0 0 12px;">Última varredura gravada: <b>${this.escapeHtml(new Date(ultima).toLocaleString('pt-BR'))}</b>.</p>` : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn primary" data-action="varrerAcervo" data-args='["todos"]' ${a.rodando?'disabled':''}>Varrer todos os clientes</button>
            <button class="btn" data-action="varrerAcervo" data-args='["faltantes"]' ${a.rodando?'disabled':''}>Varrer só os que faltam</button>
            ${a.rodando ? `<button class="btn danger" data-action="pararVarredura">Parar</button>` : ''}
          </div>
          <div id="acervoProgresso" style="margin-top:14px;"></div>
        </div>
      </div>

      <div id="acervoResultado"></div>`;

    this.renderAcervoProgresso();
    this.renderAcervoResultado();
  },

  renderAcervoProgresso(){
    const el = document.getElementById('acervoProgresso');
    if(!el) return;
    const p = this.acervo.progresso;
    if(!p.total){ el.innerHTML = ''; return; }
    const pct = Math.round((p.feito / p.total) * 100);
    el.innerHTML = `
      <div style="height:8px;background:var(--linha,#e6e6e6);border-radius:99px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:var(--verde-claro,#82C81E);transition:width .2s;"></div>
      </div>
      <p class="view-sub" style="margin:8px 0 0;font-variant-numeric:tabular-nums;">
        ${p.feito} de ${p.total}${p.atual ? ' — ' + this.escapeHtml(p.atual) : ''}
      </p>`;
  },

  pararVarredura(){
    this.acervo.parar = true;
    this.acervo.progresso.atual = 'parando…';
    this.renderAcervoProgresso();
  },

  /* Uma fila com três leituras ao mesmo tempo. Mais que isso e o Graph
     começa a devolver 429; uma de cada vez leva a varredura a demorar
     demais para 60 clientes. */
  async varrerAcervo(modo){
    if(this.acervo.rodando) return;
    const jaVarridos = new Set(this.acervo.resumo.map(r => r.cliente));
    const alvos = CLIENTES.map(c => c.nome)
      .filter(n => modo === 'todos' || !jaVarridos.has(n));

    if(!alvos.length){
      this.toast ? this.toast('Todos os clientes já foram varridos.') : alert('Todos os clientes já foram varridos.');
      return;
    }

    this.acervo.rodando = true;
    this.acervo.parar = false;
    this.acervo.resultados = [];
    this.acervo.progresso = {feito:0, total:alvos.length, atual:''};
    this.renderAcervo();

    const fila = alvos.slice();
    const trabalhar = async () => {
      while(fila.length && !this.acervo.parar){
        const nome = fila.shift();
        this.acervo.progresso.atual = nome;
        this.renderAcervoProgresso();
        try{
          const r = await this.comRepeticao(() => GS2Acervo.processarCliente(nome, m => {
            this.acervo.progresso.atual = nome + ' — ' + m;
            this.renderAcervoProgresso();
          }));
          this.acervo.resultados.push({nome, ok:true, ...r});
        }catch(e){
          this.acervo.resultados.push({nome, ok:false, erro:e.message});
        }
        this.acervo.progresso.feito++;
        this.renderAcervoProgresso();
      }
    };

    /* finally: se qualquer coisa escapar do catch de dentro do worker
       (uma lib que lança string, por exemplo), sem isto a tela ficava
       travada em "rodando" para sempre, com os botões desabilitados e os
       resultados já obtidos inacessíveis. */
    try{
      await Promise.all([trabalhar(), trabalhar(), trabalhar()]);
    }catch(e){
      console.error('[GS2] a varredura parou por um erro inesperado:', e);
      this.acervo.progresso.atual = 'interrompida por um erro: ' + (e && e.message ? e.message : e);
    }finally{
      this.acervo.rodando = false;
      if(!/interrompida por um erro/.test(this.acervo.progresso.atual)){
        this.acervo.progresso.atual = this.acervo.parar ? 'interrompida por você' : 'concluída';
      }
      this.renderAcervo();
    }
  },

  /* O Graph responde 429 quando se pede demais. Espera e tenta de novo
     uma vez — desistir na primeira negativa jogaria fora meia varredura. */
  async comRepeticao(fn){
    try{
      return await fn();
    }catch(e){
      if(e.status !== 429 && e.status !== 503) throw e;
      await new Promise(r => setTimeout(r, 4000));
      return fn();
    }
  },

  renderAcervoResultado(){
    const el = document.getElementById('acervoResultado');
    if(!el) return;
    const rs = this.acervo.resultados;
    if(!rs.length){ el.innerHTML = ''; return; }

    const comAcervo = rs.filter(r => r.ok && r.ficha && r.ficha.lido);
    const semAcervo = rs.filter(r => r.ok && r.ficha && !r.ficha.lido && !r.ficha.falha);
    const falhas    = rs.filter(r => !r.ok || (r.ficha && r.ficha.falha));
    const comCnpj   = comAcervo.filter(r => r.ficha.dadosCnpj.cnpj !== '—');
    const comSocios = comAcervo.filter(r => r.ficha.socios.length);

    const linha = r => {
      const f = r.ficha;
      const docs = (f && f.documentos) ? f.documentos.length : 0;
      const ult = (f && f.alteracoes && f.alteracoes.length) ? f.alteracoes[f.alteracoes.length-1] : null;
      const avisos = (f && f.avisos) ? f.avisos : [];
      const crit = avisos.filter(a => a.nivel === 'crit').length;
      const selo = !r.ok ? '<span class="badge crit"><span class="dot"></span>falhou</span>'
        : (!f.lido ? '<span class="badge warn"><span class="dot"></span>sem acervo</span>'
        : (crit ? `<span class="badge warn"><span class="dot"></span>${crit} pendência(s)</span>`
        : '<span class="badge good"><span class="dot"></span>lido</span>'));
      return `<tr>
        <td><div style="font-weight:650;font-size:12.5px;">${this.escapeHtml(r.nome)}</div>
            <div style="font-size:11px;color:var(--muted);">${this.escapeHtml(r.ok ? (f.dadosCnpj.cnpj !== '—' ? f.dadosCnpj.cnpj : (f.origem === 'sem-acervo' ? (avisos[0]?avisos[0].texto:'—') : 'CNPJ não lido')) : r.erro)}</div></td>
        <td style="text-align:center;font-variant-numeric:tabular-nums;">${docs || '—'}</td>
        <td style="font-size:12px;">${ult && ult.data !== '—' ? this.escapeHtml(ult.data + ' — ' + ult.evento) : '—'}</td>
        <td style="text-align:center;">${r.ok && f.socios.length ? f.socios.length : '—'}</td>
        <td>${selo}</td>
      </tr>`;
    };

    el.innerHTML = `
      <div class="panel" style="margin-top:14px;">
        <div class="panel-head">
          <b>Resultado da varredura</b>
          <span class="view-sub" style="margin:0;">${comAcervo.length} com acervo · ${semAcervo.length} sem acervo · ${falhas.length} falha(s)</span>
        </div>
        <div class="panel-body">
          <div class="callout ${falhas.length ? 'warn' : ''}">
            De <b>${rs.length}</b> clientes varridos, <b>${comAcervo.length}</b> têm acervo societário.
            O CNPJ foi lido do Cartão em <b>${comCnpj.length}</b> e o quadro societário saiu do QSA em <b>${comSocios.length}</b>.
            ${semAcervo.length ? `<b>${semAcervo.length}</b> não têm a pasta 03.01 ou ela está vazia — isso é informação, não erro.` : ''}
            ${falhas.length ? `<br><br><b>${falhas.length}</b> falharam na leitura e continuam como estavam. Dá para rodar de novo só neles.` : ''}
            <br><br><b>Nada foi gravado ainda.</b> Confira a tabela e use o botão abaixo.
          </div>
          <div style="overflow-x:auto;">
            <table class="tbl">
              <thead><tr>
                <th>Cliente</th><th style="text-align:center;">Docs</th><th>Último ato no acervo</th>
                <th style="text-align:center;">Sócios</th><th>Situação</th>
              </tr></thead>
              <tbody>${rs.map(linha).join('')}</tbody>
            </table>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
            <button class="btn primary" data-action="gravarAcervo" ${this.acervo.rodando?'disabled':''}>Gravar no banco (${rs.filter(r=>r.ok && r.ficha && !r.ficha.falha).length})</button>
            <button class="btn" data-action="descartarResultadosAcervo">Descartar</button>
          </div>
        </div>
      </div>`;
  },

  /* Vivia como onclick="App.acervo.resultados=[];App.renderAcervo();" no
     template — a CSP sem 'unsafe-inline' não deixa mais compor mais de uma
     instrução dentro do atributo. */
  descartarResultadosAcervo(){
    this.acervo.resultados = [];
    this.renderAcervo();
  },
  async gravarAcervo(){
    /* Só grava o que foi realmente lido. Cliente cuja leitura falhou não
       entra no banco — gravar "sem acervo" ali seria registrar como fato
       uma coisa que a ferramenta não sabe. */
    const rs = this.acervo.resultados.filter(r => r.ok && r.ficha && !r.ficha.falha);
    if(!rs.length){
      alert('Não há nada para gravar: as leituras desta varredura falharam. Tente de novo.');
      return;
    }
    if(!GS2Api.disponivel){
      alert('A API não está respondendo. O resultado ficaria só nesta aba e se perderia ao recarregar — tente de novo quando o selo do topo voltar ao normal.');
      return;
    }
    let gravados = 0;
    const erros = [], sobraram = [];
    for(const r of rs){
      try{
        await GS2Api.chamar('/acervo/' + encodeURIComponent(r.nome), {
          metodo: 'PUT',
          corpo: {
            caminho: r.varredura.caminho,
            grupo: r.varredura.grupo,
            ficha: r.ficha,
            unidades: r.ficha.unidades,
            totalDocumentos: r.varredura.unidades.reduce((n,u)=>n + (u.documentos||[]).length, 0)
          }
        });
        CLIENTES_DETALHE[r.nome] = GS2Acervo.completar(r.nome, r.ficha);
        gravados++;
      }catch(e){
        erros.push(r.nome + ': ' + e.message);
        sobraram.push(r);   /* a varredura custou caro: não jogar fora */
      }
    }
    await this.carregarAcervo();
    /* Quem não gravou continua na tela, para "Gravar no banco" tentar de
       novo sem revarrer os 60 clientes. */
    this.acervo.resultados = sobraram;
    this.renderAcervo();
    alert(`${gravados} cliente(s) gravado(s).` + (erros.length
      ? `\n\nNão gravaram (continuam na tela, dá para tentar de novo):\n- ${erros.join('\n- ')}`
      : ''));
  },

  /* ==================================================================
     3. RELEITURA AO ABRIR UM CLIENTE
     ================================================================== */

  /* Roda em segundo plano quando alguém abre a ficha de um cliente. Se o
     SharePoint mudou desde a varredura, a tela se atualiza sozinha; se
     falhar, fica o que já estava e ninguém é interrompido. */
  async atualizarAcervoDoCliente(nome){
    if(!GS2SP.disponivel() || this.acervo.rodando) return;
    if(this._acervoEmCurso === nome) return;
    this._acervoEmCurso = nome;
    try{
      const r = await GS2Acervo.processarCliente(nome);
      const anterior = CLIENTES_DETALHE[nome];

      /* Duas travas, aprendidas na auditoria:

         1. Se a leitura FALHOU (permissão, 429, Graph fora), a ficha que
            volta é vazia. Ela não pode substituir o que já se sabia do
            cliente — não saber não é o mesmo que saber que não há nada.
         2. Esta releitura roda sozinha, sem clique. Por isso ela atualiza
            a TELA, mas não grava no banco: "nada é gravado sem o usuário
            ver" vale aqui igual. Quem grava é a varredura, que mostra o
            resultado antes. */
      if(r.varredura && r.varredura.falha){
        console.warn('[GS2] releitura de', nome, 'falhou:', r.varredura.motivo, '— mantendo o que já havia.');
        return;
      }
      if(anterior && anterior.lido && !r.ficha.lido){
        console.warn('[GS2] releitura de', nome, 'voltou vazia; mantendo a ficha anterior.');
        return;
      }

      CLIENTES_DETALHE[nome] = GS2Acervo.completar(nome, r.ficha);
      if(this.cliSel && this.cliSel.nome === nome && this.renderClienteDetalhe) this.renderClienteDetalhe();
    }catch(e){
      console.warn('[GS2] não consegui reler o acervo de', nome, '-', e.message);
    }finally{
      this._acervoEmCurso = null;
    }
  },

  /* Selo de procedência para a ficha do cliente: de onde veio o que está
     na tela e quando. Aparece no detalhe do cliente. */
  seloProcedencia(nome){
    const d = CLIENTES_DETALHE[nome];
    if(!d) return '';
    if(d.origem === 'sharepoint'){
      const quando = d.varridoEm ? new Date(d.varridoEm).toLocaleString('pt-BR') : '';
      return `<span class="badge good" title="${this.escapeAttr(d.caminho||'')}"><span class="dot"></span>Lido do SharePoint${quando ? ' em ' + this.escapeHtml(quando) : ''}</span>`;
    }
    if(d.origem === 'sem-acervo'){
      return '<span class="badge warn"><span class="dot"></span>Sem acervo no SharePoint</span>';
    }
    return '<span class="badge"><span class="dot"></span>Acervo ainda não varrido</span>';
  }
});
