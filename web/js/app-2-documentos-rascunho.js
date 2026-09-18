/* O objeto App — parte 2 de 6: alterações, documentos, compartilhamento, rascunho e caixas. */

Object.assign(App, {
  selecionarAlteracao(i){
    const y = window.scrollY;
    this.cliSel.altIdx = i;
    this.renderClienteDetalhe();
    window.scrollTo(0, y);
  },

  /* ======================================================================
     CADASTRO DE SÓCIOS
     Consolida, a partir das fichas do Painel de Clientes, todas as pessoas do
     quadro societário. A chave é o CPF quando ele existe; quando o QSA da Receita
     não traz CPF (é o caso da maioria), cai para o nome normalizado — assim o
     mesmo sócio em duas empresas aparece uma vez só, com as duas participações.
     ====================================================================== */
  cadastroSocios(){
    const mapa = {};
    const chave = s => {
      const cpf = (s.cpf||'').replace(/\D/g,'');
      if(cpf.length === 11) return 'cpf:'+cpf;
      return 'nome:'+String(s.nome||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
    };
    this.empresasPermitidas().forEach(empresa=>{
      const d = CLIENTES_DETALHE[empresa];
      (d.socios||[]).forEach(so=>{
        if(!so.nome || so.nome.indexOf('—')===0) return;   /* linhas de "QSA não arquivado" */
        const k = chave(so);
        if(!mapa[k]){
          mapa[k] = {
            chave: k, nome: so.nome,
            cpf: (so.cpf && /\d/.test(so.cpf)) ? so.cpf : '',
            participacoes: [], documentos: [], pendencias: 0
          };
        }
        const reg = mapa[k];
        if(!reg.cpf && so.cpf && /\d/.test(so.cpf)) reg.cpf = so.cpf;
        reg.participacoes.push({
          empresa: empresa,
          razaoSocial: d.dadosCnpj.razaoSocial,
          cnpj: d.dadosCnpj.cnpj,
          cargo: so.cargo || '—',
          participacao: so.participacao || '—',
          entrada: so.entrada || '—'
        });
        (so.documentos||[]).forEach(doc=>{
          reg.documentos.push(Object.assign({empresa: empresa}, doc));
          if(doc.status !== 'ok') reg.pendencias++;
        });
      });
    });
    return Object.values(mapa).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  },

  setModoSocios(modo){ this.socioModo = (modo==='lista')?'lista':'cards'; this.renderSociosCadastro(); },

  renderSociosCadastro(){
    const grid = document.getElementById('sociosGrid');
    if(!grid) return;
    const termo = (document.getElementById('socioBusca')?.value||'').toLowerCase();
    const filtro = document.getElementById('socioFiltroDoc')?.value || '';

    document.querySelectorAll('#socioViewToggle button').forEach(b=>{
      b.classList.toggle('active', b.getAttribute('data-modo') === this.socioModo);
    });

    const lista = this.cadastroSocios().filter(so=>{
      const alvo = (so.nome + ' ' + so.cpf + ' ' + so.participacoes.map(p=>p.razaoSocial).join(' ')).toLowerCase();
      if(termo && !alvo.includes(termo)) return false;
      if(filtro === 'pendente' && !so.pendencias) return false;
      if(filtro === 'multi' && so.participacoes.length < 2) return false;
      return true;
    });

    if(!lista.length){ grid.className=''; grid.innerHTML = '<p class="view-sub">Nenhum sócio encontrado com esse filtro.</p>'; return; }

    if(this.socioModo === 'lista'){
      grid.className = 'panel';
      grid.innerHTML = `
        <div class="panel-body" style="padding:0;">
          <table class="tbl">
            <thead><tr><th>Sócio</th><th>CPF</th><th>Empresas</th><th style="text-align:center;">Docs</th></tr></thead>
            <tbody>
              ${lista.map(so=>`
                <tr class="cli-linha" data-action="abrirSocio" data-args='${this.attrJson([so.chave])}'>
                  <td><div style="font-weight:650;font-size:12.5px;">${this.escapeHtml(so.nome)}</div>
                      <div style="font-size:11px;color:var(--muted);">${this.escapeHtml(so.participacoes[0].cargo)}${so.participacoes.length>1?' · e mais '+(so.participacoes.length-1):''}</div></td>
                  <td style="font-size:12px;font-variant-numeric:tabular-nums;">${this.escapeHtml(so.cpf||'—')}</td>
                  <td style="font-size:12px;">${so.participacoes.map(p=>this.escapeHtml(p.razaoSocial)).join('<br>')}</td>
                  <td style="text-align:center;">${so.pendencias
                      ? `<span class="badge warn"><span class="dot"></span>${so.pendencias}</span>`
                      : '<span class="badge good"><span class="dot"></span>ok</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      return;
    }

    grid.className = 'cli-grid';
    grid.innerHTML = lista.map(so=>`
      <div class="cli-card" data-action="abrirSocio" data-args='${this.attrJson([so.chave])}'>
        <div class="cli-nome">${this.escapeHtml(so.nome)}</div>
        <div class="cli-cnpj">${so.cpf ? 'CPF '+this.escapeHtml(so.cpf) : 'CPF não informado no QSA'}</div>
        <div class="cli-meta">
          <span class="badge info"><span class="dot"></span>${so.participacoes.length} empresa${so.participacoes.length>1?'s':''}</span>
          ${so.pendencias
            ? `<span class="badge warn"><span class="dot"></span>${so.pendencias} doc. pendente${so.pendencias>1?'s':''}</span>`
            : '<span class="badge good"><span class="dot"></span>documentos em dia</span>'}
        </div>
        <div class="cli-foot">${so.participacoes.map(p=>this.escapeHtml(p.razaoSocial)+' — '+this.escapeHtml(p.cargo)).join('<br>')}</div>
      </div>`).join('');
  },

  abrirSocio(chave){
    const so = this.cadastroSocios().find(x=>x.chave===chave);
    if(!so) return;
    document.getElementById('sociosLista').style.display='none';
    const el = document.getElementById('socioDetalhe');
    el.style.display='';
    el.innerHTML = `
      <div class="btn-row" style="margin:0 0 14px;justify-content:flex-start;">
        <button class="btn" data-action="fecharSocioDetalhe">← Voltar para o cadastro de sócios</button>
      </div>

      <div class="cli-hero">
        <h3>${this.escapeHtml(so.nome)}</h3>
        <div class="sub">${so.cpf ? 'CPF '+this.escapeHtml(so.cpf) : 'CPF não consta no QSA da Receita Federal'}</div>
        <div class="hero-badges">
          <span class="badge info"><span class="dot"></span>${so.participacoes.length} empresa${so.participacoes.length>1?'s':''}</span>
          ${so.pendencias
            ? `<span class="badge warn"><span class="dot"></span>${so.pendencias} documento${so.pendencias>1?'s':''} pendente${so.pendencias>1?'s':''}</span>`
            : '<span class="badge good"><span class="dot"></span>documentos em dia</span>'}
        </div>
      </div>

      <div class="panel" style="margin-top:16px;">
        <div class="panel-head"><h3 class="sec-title">Participações societárias</h3></div>
        <div class="panel-body">
          <table class="tbl">
            <thead><tr><th>Empresa</th><th>CNPJ</th><th>Cargo</th><th>Participação</th><th>Desde</th><th></th></tr></thead>
            <tbody>
              ${so.participacoes.map(pp=>`
                <tr>
                  <td style="font-weight:600;font-size:12.5px;">${this.escapeHtml(pp.razaoSocial)}</td>
                  <td style="font-size:12px;font-variant-numeric:tabular-nums;">${this.escapeHtml(pp.cnpj)}</td>
                  <td style="font-size:12px;">${this.escapeHtml(pp.cargo)}</td>
                  <td style="font-size:12px;">${this.escapeHtml(pp.participacao)}</td>
                  <td style="font-size:12px;">${this.escapeHtml(pp.entrada)}</td>
                  <td style="text-align:right;"><button class="btn" style="padding:5px 11px;font-size:11.5px;" data-action="irParaCliente" data-args='${this.attrJson([pp.empresa])}'>Abrir ficha</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel" style="margin-top:16px;margin-bottom:24px;">
        <div class="panel-head">
          <h3 class="sec-title">Documentos pessoais</h3>
          <span class="badge info"><span class="dot"></span>${so.documentos.length} registro(s)</span>
        </div>
        <div class="panel-body">
          <p class="view-sub" style="margin:0 0 10px;">Documentos guardados na pasta de cada empresa em que o sócio participa. Um documento vencido ou faltando bloqueia o protocolo na Junta.</p>
          <table class="tbl">
            <thead><tr><th>Documento</th><th>Empresa</th><th>Validade</th><th>Situação</th><th style="text-align:right;">Ações</th></tr></thead>
            <tbody>
              ${so.documentos.map(doc=>{
                const dm = DOC_STATUS_META[doc.status] || {label:doc.status, cls:'info'};
                const temArquivo = doc.arquivo && doc.arquivo !== '—';
                return `<tr>
                  <td style="font-size:12.5px;"><b>${this.escapeHtml(doc.tipo)}</b>
                    <div style="font-size:11px;color:var(--muted);font-family:ui-monospace,monospace;">${temArquivo?this.escapeHtml(doc.arquivo):'não anexado'}</div></td>
                  <td style="font-size:12px;">${this.escapeHtml(CLIENTES_DETALHE[doc.empresa].dadosCnpj.razaoSocial)}</td>
                  <td style="font-size:12px;">${this.escapeHtml(doc.validade||'—')}</td>
                  <td><span class="badge ${dm.cls}"><span class="dot"></span>${this.escapeHtml(dm.label)}</span></td>
                  <td style="text-align:right;white-space:nowrap;">
                    ${temArquivo ? `
                      <button class="btn" style="padding:5px 11px;font-size:11.5px;" data-action="baixarArquivo" data-args='${this.attrJson([doc.empresa, doc.arquivo])}'>⬇ Baixar</button>
                      <button class="btn" style="padding:5px 11px;font-size:11.5px;" data-action="compartilharArquivo" data-args='${this.attrJson([doc.empresa, doc.arquivo])}'>🔗 Compartilhar</button>`
                    : '<span style="font-size:11.5px;color:var(--muted);">—</span>'}
                  </td>
                </tr>`;
              }).join('') || '<tr><td colspan="5" style="color:var(--muted);font-size:12.5px;">Nenhum documento registrado.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    window.scrollTo({top:0, behavior:'smooth'});
  },
  fecharSocioDetalhe(){
    const det = document.getElementById('socioDetalhe');
    const lst = document.getElementById('sociosLista');
    if(det) det.style.display='none';
    if(lst) lst.style.display='';
    this.renderSociosCadastro();
  },
  irParaCliente(empresa){
    this.navigate('clientes');
    this.openClienteDetalhe(empresa);
  },

  /* ---------- Documentos societários: download e compartilhamento ---------- */

  /* Reúne todos os arquivos societários do cliente (cartão CNPJ, documentos de
     cada alteração e documentos dos sócios), com a pasta de origem. */
  documentosDoCliente(nome){
    const d = CLIENTES_DETALHE[nome];
    if(!d) return [];
    const out = []; const vistos = {};
    const add = (arquivo, tipo, pasta)=>{
      if(!arquivo || arquivo==='—' || arquivo.indexOf('— ')===0) return;
      if(vistos[arquivo]) return;
      vistos[arquivo] = true;
      out.push({arquivo:arquivo, tipo:tipo, pasta:pasta});
    };
    /* Primeiro o acervo lido do SharePoint: cada item traz o `id` do
       arquivo lá, que é o que permite baixar e compartilhar de verdade. */
    /* a pasta real vem do caminho lido na varredura (grupos ficam em subpasta) */
    const pastaAcervo = (d.caminho && d.caminho.indexOf(nome + '/') === 0) ? d.caminho.slice(nome.length + 1) : PASTA_SOCIETARIO;
    (d.documentos||[]).forEach(x=>{
      if(!x || !x.arquivo) return;
      add(x.arquivo, x.rotulo || x.tipo || 'Documento', pastaAcervo);
      const ult = out[out.length-1];
      if(ult && ult.arquivo === x.arquivo){ ult.id = x.id; ult.webUrl = x.webUrl; }
    });
    if(d.ocr && d.ocr.arquivo) add(d.ocr.arquivo, 'Cartão CNPJ (base do cadastro)', PASTA_SOCIETARIO);
    (d.alteracoes||[]).forEach(a=>{
      const pasta = a.ordem === 1 ? PASTA_SOCIETARIO : PASTA_ALTERACOES;
      add(a.documento, `${a.ordem}ª alteração — ${a.evento}`, pasta);
    });
    (d.socios||[]).forEach(s=>{
      (s.documentos||[]).forEach(doc=>{
        const pasta = doc.tipo.indexOf('QSA')===0 ? PASTA_SOCIETARIO : PASTA_AUXILIARES;
        add(doc.arquivo, `${doc.tipo} — ${s.nome}`, pasta);
      });
    });
    return out;
  },

  /* Localiza o item no SharePoint: pelo id que veio do acervo, ou, na
     falta dele, pelo caminho cliente/pasta/arquivo. Devolve o driveItem. */
  async itemDoDocumento(nome, doc){
    const d = await GS2SP.drive();
    if(doc.id){
      try{ return await GS2SP.chamar(`/drives/${d.id}/items/${doc.id}`); }
      catch(e){ if(e.status !== 404) throw e; /* movido/renomeado: tenta pelo caminho */ }
    }
    return GS2SP.item(`${nome}/${doc.pasta}/${doc.arquivo}`);
  },

  async baixarDocumento(nome, i){
    const doc = this.documentosDoCliente(nome)[i];
    if(!doc) return;
    const c = CLIENTES_DETALHE[nome].dadosCnpj;

    if(!GS2SP.disponivel()){
      alert(`MODO DEMONSTRAÇÃO — nada foi baixado.\n\nArquivo: ${doc.arquivo}\nEmpresa: ${c.razaoSocial}\nOrigem: /sites/clientes/Documentos Compartilhados/${nome}/${doc.pasta}/\n\nConectada ao SharePoint, a ferramenta baixa o arquivo com a conta de quem está logado — quem não tem permissão na pasta não consegue baixar.`);
      return;
    }
    try{
      const item = await this.itemDoDocumento(nome, doc);
      const url = item['@microsoft.graph.downloadUrl'] || item['@content.downloadUrl'];
      if(!url){ window.open(item.webUrl, '_blank', 'noopener'); return; }
      /* a URL de download já vem autenticada e vale por alguns minutos */
      const a = document.createElement('a');
      a.href = url; a.download = doc.arquivo; a.rel = 'noopener'; a.target = '_blank';
      document.body.appendChild(a); a.click(); a.remove();
    }catch(e){
      alert('Não consegui baixar "' + doc.arquivo + '".\n\n' + (e && e.message || e) +
            '\n\nSe o arquivo foi movido ou renomeado no SharePoint, varra o acervo de novo (Administração › Acervo do SharePoint).');
    }
  },

  /* Baixar / compartilhar um documento pelo nome do arquivo — usado pelos cards
     do histórico de alterações, que conhecem o arquivo mas não o índice da lista. */
  indiceDoArquivo(nome, arquivo){
    return this.documentosDoCliente(nome).findIndex(d=>d.arquivo === arquivo);
  },
  baixarArquivo(nome, arquivo){
    const i = this.indiceDoArquivo(nome, arquivo);
    if(i > -1){ this.baixarDocumento(nome, i); return; }
    alert(`Download (simulado)\n\nArquivo: ${arquivo}\nEmpresa: ${nome}\n\nEste documento está vinculado à alteração mas ainda não aparece na lista de documentos societários da pasta — confira se ele já foi arquivado em 03 - Societario.`);
  },
  compartilharArquivo(nome, arquivo){
    const i = this.indiceDoArquivo(nome, arquivo);
    if(i > -1){ this.abrirCompartilhar(nome, i); return; }
    alert(`Este documento ainda não está arquivado na pasta 03 - Societario, então não há o que compartilhar.\n\nArquivo: ${arquivo}`);
  },

  async baixarTodos(nome){
    const docs = this.documentosDoCliente(nome);
    const c = CLIENTES_DETALHE[nome].dadosCnpj;
    if(!docs.length){ alert('Não há documentos societários arquivados para esta empresa.'); return; }

    if(!GS2SP.disponivel()){
      alert(`MODO DEMONSTRAÇÃO — nada foi baixado.\n\nEmpresa: ${c.razaoSocial}\n${docs.length} arquivo(s):\n\n${docs.map(d=>'• '+d.arquivo).join('\n')}\n\nConectada ao SharePoint, a ferramenta abre a pasta societária da empresa, de onde o SharePoint entrega tudo num .zip.`);
      return;
    }
    /* Montar .zip no navegador exigiria mais uma biblioteca; o SharePoint
       já faz isso na própria pasta ("Baixar" seleciona tudo). Abrir a
       pasta certa é honesto e resolve. */
    try{
      const d = CLIENTES_DETALHE[nome];
      const pasta = await GS2SP.item(d.caminho || (nome + '/' + PASTA_SOCIETARIO));
      window.open(pasta.webUrl, '_blank', 'noopener');
    }catch(e){
      alert('Não consegui abrir a pasta societária no SharePoint.\n\n' + (e && e.message || e));
    }
  },

  /* Gera um link de compartilhamento com prazo de validade.
     `idx` null = pasta societária inteira; número = um documento específico. */
  abrirCompartilhar(nome, idx){
    const d = CLIENTES_DETALHE[nome];
    const docs = this.documentosDoCliente(nome);
    const doc = (idx===null || idx===undefined) ? null : docs[idx];
    this.compartilharCtx = {nome:nome, idx:(idx===null||idx===undefined)?null:idx};

    const alvo = doc ? doc.arquivo : `Pasta 03 - Societario (${docs.length} arquivo(s))`;
    const pasta = doc ? doc.pasta : '03 - Societario';

    document.getElementById('compartilharAlvo').innerHTML = `
      <div style="font-weight:700;font-size:13.5px;margin-bottom:3px;">${this.escapeHtml(alvo)}</div>
      <div style="font-size:11.5px;color:var(--muted);font-family:ui-monospace,monospace;">
        /sites/clientes/Documentos Compartilhados/${this.escapeHtml(nome)}/${this.escapeHtml(pasta)}/
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px;">Empresa: <b>${this.escapeHtml(d.dadosCnpj.razaoSocial)}</b> · CNPJ ${this.escapeHtml(d.dadosCnpj.cnpj)}</div>`;
    document.getElementById('compartilharLinkBox').style.display = 'none';
    document.getElementById('compartilharModal').classList.add('open');
  },
  fecharCompartilhar(){ document.getElementById('compartilharModal').classList.remove('open'); },

  gerarLinkCompartilhamento(){
    const ctx = this.compartilharCtx; if(!ctx) return;
    const dias = parseInt(document.getElementById('linkValidade').value, 10);
    const escopo = document.getElementById('linkEscopo').value;
    const docs = this.documentosDoCliente(ctx.nome);
    const doc = ctx.idx===null ? null : docs[ctx.idx];

    const exp = new Date(Date.now() + dias*86400000).toLocaleDateString('pt-BR');
    const btn = document.querySelector('#compartilharModal .btn.primary');

    /* Conectado: o link é criado pelo próprio SharePoint, com validade e
       escopo de verdade. Antes disto o botão gerava um endereço inventado
       (app.gs2negocios.com.br/d/…) que não existia em lugar nenhum. */
    if(GS2SP.disponivel()){
      if(btn){ btn.disabled = true; btn.textContent = 'Criando link no SharePoint…'; }
      this.criarLinkReal(ctx, doc, dias, escopo, exp)
        .catch(e => alert('O SharePoint não criou o link.\n\n' + (e && e.message || e) +
          (escopo === 'qualquer' ? '\n\nLink para "qualquer pessoa" pode estar bloqueado pela política do Microsoft 365 da GS2. Tente "somente pessoas autenticadas".' : '')))
        .finally(()=>{ if(btn){ btn.disabled = false; btn.textContent = 'Gerar link'; } });
      return;
    }

    /* Demonstração: endereço propositalmente inválido, para ninguém
       mandar por engano a um cliente. */
    const token = Math.random().toString(36).slice(2,10) + Math.random().toString(36).slice(2,6);
    const url = `https://demonstracao.invalido/d/${token}`;

    LINKS_COMPARTILHADOS.push({
      id:token, cliente:ctx.nome, arquivo: doc ? doc.arquivo : '(pasta 03 - Societario)',
      pasta: doc ? doc.pasta : '03 - Societario', escopo:escopo,
      criadoPor: currentUser.nome, criadoEm: new Date().toLocaleString('pt-BR'),
      expiraEm: exp, downloads: 0, url: url
    });

    const razao = CLIENTES_DETALHE[ctx.nome].dadosCnpj.razaoSocial;
    const msg = `Olá! Segue o link para acessar ${doc ? 'o documento *'+doc.arquivo+'*' : 'os documentos societários'} da empresa *${razao}*:\n\n${url}\n\nO link expira em ${exp}.\n\nGS2 Negócios`;

    document.getElementById('linkGerado').value = url;
    document.getElementById('linkResumo').textContent = `MODO DEMONSTRAÇÃO — este link não funciona. Válido até ${exp} · ${escopo === 'qualquer' ? 'qualquer pessoa com o link' : 'somente pessoas autenticadas'} · somente leitura`;
    document.getElementById('btnWhats').onclick = ()=>{
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    };
    document.getElementById('compartilharLinkBox').style.display = '';
  },

  async criarLinkReal(ctx, doc, dias, escopo, exp){
    const d = CLIENTES_DETALHE[ctx.nome];
    const item = doc
      ? await this.itemDoDocumento(ctx.nome, doc)
      : await GS2SP.item(d.caminho || (ctx.nome + '/' + PASTA_SOCIETARIO));
    const expiraISO = new Date(Date.now() + dias*86400000).toISOString();
    const url = await GS2SP.linkCompartilhamento(item.id, 'view',
      escopo === 'qualquer' ? 'anonymous' : 'organization', expiraISO);
    if(!url) throw new Error('resposta sem link');

    LINKS_COMPARTILHADOS.push({
      id: item.id, cliente: ctx.nome, arquivo: doc ? doc.arquivo : '(pasta 03 - Societario)',
      pasta: doc ? doc.pasta : '03 - Societario', escopo: escopo,
      criadoPor: currentUser.nome, criadoEm: new Date().toLocaleString('pt-BR'),
      expiraEm: exp, downloads: 0, url: url, real: true
    });

    const razao = d.dadosCnpj.razaoSocial;
    const msg = `Olá! Segue o link para acessar ${doc ? 'o documento *'+doc.arquivo+'*' : 'os documentos societários'} da empresa *${razao}*:\n\n${url}\n\nO link expira em ${exp}.\n\nGS2 Negócios`;
    document.getElementById('linkGerado').value = url;
    document.getElementById('linkResumo').textContent = `Criado no SharePoint · válido até ${exp} · ${escopo === 'qualquer' ? 'qualquer pessoa com o link' : 'somente pessoas autenticadas da GS2'} · somente leitura`;
    document.getElementById('btnWhats').onclick = ()=>{ window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener'); };
    document.getElementById('compartilharLinkBox').style.display = '';
    if(this.renderLinksTable) this.renderLinksTable();
  },

  /* ---------- Admin: usuários de cliente ---------- */
  renderAdminUsuariosCliente(){
    const t = document.getElementById('usuariosClienteTable');
    if(t) t.innerHTML = `
      <thead><tr><th>Nome</th><th>E-mail</th><th>Empresas liberadas</th><th>Situação</th><th>Último acesso</th><th style="width:150px;text-align:right;">Ações</th></tr></thead>
      <tbody>${USUARIOS_CLIENTE.map(u=>`
        <tr>
          <td><div style="font-weight:650;">${this.escapeHtml(u.nome)}</div><div style="font-size:11px;color:var(--muted);">${this.escapeHtml(u.telefone||'')} · cadastrado por ${this.escapeHtml(u.criadoPor||'—')}</div></td>
          <td style="font-size:12px;">${this.escapeHtml(u.email)}</td>
          <td>${u.empresas.map(e=>`<span class="badge info" style="margin:1px 2px;font-weight:600;"><span class="dot"></span>${this.escapeHtml(e.length>38?e.slice(0,36)+'…':e)}</span>`).join('') || '<span style="color:var(--status-crit);font-size:12px;">nenhuma</span>'}</td>
          <td><span class="badge ${u.status==='Ativo'?'good':'crit'}"><span class="dot"></span>${u.status}</span></td>
          <td style="font-size:12px;color:var(--muted);">${this.escapeHtml(u.ultimoAcesso||'—')}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button class="btn" style="padding:5px 11px;font-size:11.5px;" data-action="openUsuarioClienteModal" data-args='${this.attrJson([u.id])}'>Editar</button>
            <button class="btn" style="padding:5px 11px;font-size:11.5px;" data-action="entrarComoUsuarioCliente" data-args='${this.attrJson([u.id])}'>Ver como</button>
          </td>
        </tr>`).join('')}</tbody>`;
    this.renderLinksTable();
  },

  renderLinksTable(){
    const t = document.getElementById('linksTable');
    const b = document.getElementById('linksBadge');
    if(b) b.innerHTML = `<span class="dot"></span>${LINKS_COMPARTILHADOS.length} link(s)`;
    if(!t) return;
    t.innerHTML = `
      <thead><tr><th>Documento</th><th>Empresa</th><th>Gerado por</th><th>Validade</th><th>Escopo</th></tr></thead>
      <tbody>${LINKS_COMPARTILHADOS.map(l=>`
        <tr>
          <td style="font-size:12px;"><div style="font-weight:600;">${this.escapeHtml(l.arquivo)}</div>
            <div style="font-size:11px;color:var(--muted);font-family:ui-monospace,monospace;">${this.escapeHtml(l.url)}</div></td>
          <td style="font-size:12px;">${this.escapeHtml(l.cliente.length>34?l.cliente.slice(0,32)+'…':l.cliente)}</td>
          <td style="font-size:12px;">${this.escapeHtml(l.criadoPor)}<div style="font-size:11px;color:var(--muted);">${this.escapeHtml(l.criadoEm)}</div></td>
          <td style="font-size:12px;">até ${this.escapeHtml(l.expiraEm)}</td>
          <td><span class="badge ${l.escopo==='qualquer'?'warn':'good'}"><span class="dot"></span>${l.escopo==='qualquer'?'Qualquer pessoa com o link':'Somente autenticados'}</span></td>
        </tr>`).join('') || '<tr><td colspan="5" style="color:var(--muted);font-size:12.5px;">Nenhum link gerado ainda. Eles aparecem aqui assim que alguém compartilhar um documento no Painel de Clientes.</td></tr>'}</tbody>`;
  },

  openUsuarioClienteModal(id){
    this.ucEditId = id || null;
    const u = id ? USUARIOS_CLIENTE.find(x=>x.id===id) : null;
    document.getElementById('usuarioClienteModalTitle').textContent = u ? 'Editar usuário de cliente' : 'Cadastrar usuário de cliente';
    document.getElementById('ucNome').value = u ? u.nome : '';
    document.getElementById('ucEmail').value = u ? u.email : '';
    document.getElementById('ucTelefone').value = u ? (u.telefone||'') : '';
    document.getElementById('ucStatus').value = u ? u.status : 'Ativo';
    const marcadas = u ? u.empresas : [];
    document.getElementById('ucEmpresas').innerHTML = Object.keys(CLIENTES_DETALHE).map(nome=>`
      <label class="check-item" style="display:flex;cursor:pointer;padding:4px 0;font-size:12.5px;">
        <input type="checkbox" class="ucEmpresaChk" value="${this.escapeAttr(nome)}" ${marcadas.indexOf(nome)>-1?'checked':''} data-action="contarEmpresasUc" data-event="change">
        <span style="margin-left:7px;">${this.escapeHtml(nome)}</span>
      </label>`).join('');
    this.contarEmpresasUc();
    document.getElementById('usuarioClienteModal').classList.add('open');
  },
  closeUsuarioClienteModal(){ document.getElementById('usuarioClienteModal').classList.remove('open'); },
  contarEmpresasUc(){
    const n = document.querySelectorAll('.ucEmpresaChk:checked').length;
    const el = document.getElementById('ucContador');
    if(el) el.textContent = `— ${n} selecionada(s)`;
  },
  saveUsuarioCliente(){
    const nome = document.getElementById('ucNome').value.trim();
    const email = document.getElementById('ucEmail').value.trim();
    const telefone = document.getElementById('ucTelefone').value.trim();
    const status = document.getElementById('ucStatus').value;
    const empresas = Array.from(document.querySelectorAll('.ucEmpresaChk:checked')).map(c=>c.value);
    if(!nome || !email){ alert('Informe pelo menos o nome e o e-mail do usuário.'); return; }
    if(!empresas.length){ alert('Selecione ao menos uma empresa. Um usuário de cliente sem empresa liberada não conseguiria ver nada ao entrar.'); return; }
    if(this.ucEditId){
      const u = USUARIOS_CLIENTE.find(x=>x.id===this.ucEditId);
      if(u){ u.nome=nome; u.email=email; u.telefone=telefone; u.status=status; u.empresas=empresas;
             GS2Api.salvarCadastro('usuariosCliente', u.id, u); }
    } else {
      const novo = {id:'uc'+Date.now(), nome, email, telefone, empresas, status,
        criadoPor: currentUser.nome, ultimoAcesso:'Nunca acessou'};
      USUARIOS_CLIENTE.push(novo);
      GS2Api.salvarCadastro('usuariosCliente', novo.id, novo);
    }
    this.closeUsuarioClienteModal();
    this.renderAdminUsuariosCliente();
  },
  entrarComoUsuarioCliente(id){
    const u = USUARIOS_CLIENTE.find(x=>x.id===id);
    if(!u) return;
    if(u.status !== 'Ativo'){ alert(`${u.nome} está com o acesso INATIVO — não conseguiria entrar na ferramenta.`); return; }
    this.login('Cliente', id);
  },

  copiarLink(){
    const el = document.getElementById('linkGerado');
    el.select(); el.setSelectionRange(0, 99999);
    try{ document.execCommand('copy'); }catch(e){}
    const b = document.getElementById('btnCopiar');
    const antigo = b.textContent; b.textContent = '✓ Copiado';
    setTimeout(()=>{ b.textContent = antigo; }, 1600);
  },

  /* OCR simulado do Cartão CNPJ — na versão integrada, o backend baixa o PDF do
     SharePoint, roda o OCR e grava as atividades de volta na lista "Clientes". */
  relerCartaoCnpj(nome){
    const d = CLIENTES_DETALHE[nome];
    const strip = document.getElementById('ocrStrip');
    const btn = document.getElementById('btnReOcr');
    if(!strip) return;
    /* Antes: esperava 1,4 s e escrevia "nenhuma divergência encontrada"
       sem ler coisa nenhuma. Agora a releitura é a mesma da varredura do
       acervo — abre o Cartão CNPJ e o QSA mais recentes no SharePoint. */
    if(!GS2SP.disponivel()){
      strip.innerHTML = `<span>ℹ️</span><span class="grow"><b>Modo demonstração</b> — não há SharePoint para reler. Conectada, esta ação abre o Cartão CNPJ e o QSA mais recentes da pasta e atualiza a ficha com o que estiver lá.</span>`;
      if(btn){ btn.disabled = false; btn.textContent = '🔍 Reler Cartão CNPJ (OCR)'; }
      return;
    }
    if(btn){ btn.disabled = true; btn.textContent = 'Lendo o acervo…'; }
    strip.innerHTML = `<span>⏳</span><span class="grow">Lendo a pasta <b>03.01</b> de <b>${this.escapeHtml(nome)}</b> no SharePoint…</span>`;
    const yOcr = window.scrollY;
    const antes = JSON.stringify(d.dadosCnpj) + JSON.stringify(d.socios.map(s=>s.nome));
    GS2Acervo.processarCliente(nome, m => { const s = document.getElementById('ocrStrip'); if(s) s.innerHTML = `<span>⏳</span><span class="grow">${this.escapeHtml(m)}</span>`; })
      .then(r => {
        if(r.varredura && r.varredura.falha) throw new Error(r.varredura.motivo);
        CLIENTES_DETALHE[nome] = GS2Acervo.completar(nome, r.ficha);
        this.renderClienteDetalhe();
        window.scrollTo(0, yOcr);
        const s2 = document.getElementById('ocrStrip');
        if(!s2) return;
        const dn = CLIENTES_DETALHE[nome];
        const mudou = (JSON.stringify(dn.dadosCnpj) + JSON.stringify(dn.socios.map(s=>s.nome))) !== antes;
        const leuCnpj = dn.dadosCnpj.cnpj && dn.dadosCnpj.cnpj !== '—';
        s2.style.background = leuCnpj ? 'var(--status-good-bg)' : 'var(--status-warn-bg)';
        s2.style.color = leuCnpj ? 'var(--status-good)' : 'var(--status-warn)';
        s2.innerHTML = leuCnpj
          ? `<span>✓</span><span class="grow">Acervo relido agora: ${dn.documentos.length} documento(s), CNPJ <b>${this.escapeHtml(dn.dadosCnpj.cnpj)}</b>, ${dn.socios.length} sócio(s) no QSA — ${mudou ? '<b>a ficha mudou</b> em relação ao que estava na tela.' : 'nada mudou em relação ao que estava na tela.'}</span>`
          : `<span>⚠️</span><span class="grow">Acervo relido, mas <b>não encontrei Cartão CNPJ legível</b> na pasta 03.01 — a ficha ficou com o histórico pelos nomes dos arquivos.</span>`;
      })
      .catch(e => {
        const s2 = document.getElementById('ocrStrip');
        if(s2){ s2.style.background = 'var(--status-crit-bg)'; s2.style.color = 'var(--status-crit)';
          s2.innerHTML = `<span>✗</span><span class="grow">Não consegui reler: ${this.escapeHtml(e && e.message || String(e))}</span>`; }
      })
      .finally(() => { const b2 = document.getElementById('btnReOcr'); if(b2){ b2.disabled = false; b2.textContent = '🔍 Reler Cartão CNPJ (OCR)'; } });
  },

  /* O link no nome do arquivo abre o arquivo no SharePoint. Recebe o
     CNPJ por compatibilidade com as chamadas antigas; quem identifica a
     empresa é o cliente aberto na tela. */
  abrirDocumentoSharePoint(cnpj, arquivo){
    const nome = (this.cliSel && this.cliSel.nome) ||
      Object.keys(CLIENTES_DETALHE).find(n => CLIENTES_DETALHE[n].dadosCnpj && CLIENTES_DETALHE[n].dadosCnpj.cnpj === cnpj);
    if(!nome){ alert('Não identifiquei a empresa deste documento.'); return; }
    const i = this.indiceDoArquivo(nome, arquivo);
    if(i > -1){ this.baixarDocumento(nome, i); return; }
    if(!GS2SP.disponivel()){
      alert(`MODO DEMONSTRAÇÃO — nada foi aberto.\n\nArquivo: ${arquivo}\nEmpresa: ${nome}`);
      return;
    }
    GS2SP.item(`${nome}/${PASTA_SOCIETARIO}/${arquivo}`)
      .then(it => window.open(it.webUrl, '_blank', 'noopener'))
      .catch(e => alert('Não encontrei "' + arquivo + '" na pasta 03.01 de ' + nome + '.\n\n' + (e && e.message || e)));
  },

  /* Abre o wizard de Alteração Societária já partindo da versão VIGENTE do cliente. */
  novaAlteracaoDoCliente(nome){
    const d = CLIENTES_DETALHE[nome];
    if(!d) return;
    const c = d.dadosCnpj;
    const vigente = d.alteracoes[d.alteracoes.length-1];

    this.navigate('novo','alteracao');
    this.pickClient(nome);

    wizard.campos.razaoSocial = c.razaoSocial;
    wizard.campos.nomeFantasia = (c.nomeFantasia && c.nomeFantasia!=='—') ? c.nomeFantasia : '';
    wizard.campos.capitalAtual = this.formatarMoeda(c.capitalSocial);
    wizard.campos.capital = this.formatarMoeda(c.capitalSocial);
    wizard.campos.endereco = Object.assign({}, c.endereco);
    wizard.campos.cnaePrincipal = d.atividades.principal;
    wizard.campos.cnaeSecundarios = d.atividades.secundarias.slice();
    wizard.campos.sociosAfetados = d.socios.map(s=>s.nome).join(', ');
    wizard.campos.descricao =
      `Partindo da ${vigente.ordem}ª alteração (${vigente.data} — ${vigente.evento}). `+
      `Quadro de atividades vigente: ${1+d.atividades.secundarias.length} CNAE(s). Descreva abaixo o que muda nesta alteração.`;

    wizard.socios = d.socios.map(s=>({
      tipo:'PF', nome:s.nome, documento:s.cpf, perc:(s.participacao||'').replace('%',''),
      cargo:s.cargo, endereco:{}, contato:{}, representantes:[]
    }));

    wizard.origemCliente = {nome:nome, ordemBase:vigente.ordem, data:vigente.data};

    this.showStep(3);
    this.renderSocios();
    alert(`Alteração iniciada a partir da versão vigente de ${c.razaoSocial}.\n\nJá foram carregados:\n• Razão social, capital e endereço atuais\n• ${1+d.atividades.secundarias.length} atividade(s) do CNPJ\n• ${d.socios.length} sócio(s) do quadro atual\n\nBase: ${vigente.ordem}ª alteração, de ${vigente.data}.`);
  },

  /* ---------- Step 1 ---------- */
  renderClientList(filter){
    const list = document.getElementById('clientList');
    const term = (filter||'').toLowerCase();
    /* Abertura de Empresa é sempre empresa NOVA: a lista de clientes já existentes
       fica bloqueada, porque uma empresa que já tem CNPJ não pode ser "aberta". */
    const somenteNova = wizard.tipo === 'abertura';
    /* Filial é sempre de empresa JÁ EXISTENTE: não existe filial sem matriz
       registrada, então "cadastrar nova empresa" fica de fora aqui. */
    const somenteExistente = wizard.tipo === 'filial';
    let html = '';

    if(somenteNova){
      html += `<div class="callout" style="margin:0 0 10px;border-radius:10px;">
        <b>Abertura de Empresa:</b> este tipo de processo é sempre para uma <b>empresa nova</b>, ainda sem CNPJ. Por isso os clientes já existentes ficam bloqueados aqui — para alterar dados de uma empresa que já existe, volte ao passo 1 e escolha <b>Alteração Societária</b>.
      </div>`;
    }
    if(somenteExistente){
      html += `<div class="callout" style="margin:0 0 10px;border-radius:10px;">
        <b>Abertura de Filial:</b> a filial nasce por <b>alteração contratual da matriz</b>, então é preciso escolher a empresa já existente. Se a matriz ainda não tem CNPJ, faça primeiro a <b>Abertura de Empresa</b>.
      </div>`;
    }

    CLIENTES.filter(c=>c.nome.toLowerCase().includes(term)).forEach(c=>{
      const sel = wizard.cliente===c.nome ? 'selected' : '';
      const semDoc = (typeof CLIENTES_SEM_DOCUMENTOS!=='undefined') && CLIENTES_SEM_DOCUMENTOS.indexOf(c.nome)>-1;
      if(somenteNova){
        html += `<div class="client-opt bloqueado" title="Indisponível em Abertura de Empresa — esta empresa já existe">${this.escapeHtml(c.nome)}<small>já possui CNPJ e pasta no SharePoint — indisponível para abertura</small></div>`;
      } else {
        html += `<div class="client-opt ${sel}" data-action="pickClient" data-args='${this.attrJson([c.nome])}'>${this.escapeHtml(c.nome)}<small>Documentos Compartilhados / ${this.escapeHtml(c.nome)} / 03 - Societario${c.minutaPropria ? ' · 📄 minuta própria cadastrada' : ''}${semDoc ? ' · ⚠️ sem Cartão CNPJ/QSA arquivados' : ''}</small></div>`;
      }
    });
    if(!somenteExistente){
      html += `<div class="client-opt client-new ${wizard.clienteNovo?'selected':''}" data-action="pickClient" data-args='${this.attrJson([null, true])}'>+ Cadastrar nova empresa (a ferramenta cria a pasta e a estrutura padrão no SharePoint)</div>`;
    }
    list.innerHTML = html;
    this.renderClientePick();
    this.renderMinutaBox();
  },
  /* ---------- Etapa 2: cartão do cliente escolhido ----------
     A lista de clientes saiu da tela e passou a viver só dentro da caixa de
     diálogo. Na etapa 2 fica apenas este cartão, mostrando quem já foi
     escolhido (ou que ainda falta escolher) e o botão que abre o diálogo. */
  renderClientePick(){
    const box = document.getElementById('clientePick');
    if(!box) return;
    const novo = !!wizard.clienteNovo;
    const nome = novo ? 'Nova empresa (ainda sem CNPJ)' : wizard.cliente;
    const escolhido = !!(novo || wizard.cliente);
    let detalhe = '';
    if(novo){
      detalhe = 'A ferramenta cria a pasta e a estrutura padrão no SharePoint ao informar a razão social.';
    } else if(wizard.cliente){
      const c = CLIENTES.find(x=>x.nome===wizard.cliente) || {};
      const semDoc = (typeof CLIENTES_SEM_DOCUMENTOS!=='undefined') && CLIENTES_SEM_DOCUMENTOS.indexOf(wizard.cliente)>-1;
      detalhe = `Documentos Compartilhados / ${wizard.cliente} / 03 - Societario`
        + (c.minutaPropria ? ' · 📄 minuta própria cadastrada' : '')
        + (semDoc ? ' · ⚠️ sem Cartão CNPJ/QSA arquivados' : '');
    } else {
      detalhe = wizard.tipo === 'filial'
        ? 'A filial nasce por alteração contratual da matriz — escolha a empresa já existente.'
        : 'Abra a caixa de seleção para escolher a empresa deste processo.';
    }
    box.innerHTML = `<div class="client-pick ${escolhido?'escolhido':'vazio'}">
      <div style="min-width:220px;flex:1;">
        <span class="cp-rotulo">Cliente do processo</span>
        <div class="cp-nome ${escolhido?'':'pendente'}">${escolhido ? this.escapeHtml(nome) : 'Nenhum cliente selecionado ainda'}</div>
        <small>${this.escapeHtml(detalhe)}</small>
      </div>
      <button class="btn ${escolhido?'':'primary'}" data-action="abrirClienteModal">${escolhido ? 'Trocar cliente' : 'Selecionar cliente →'}</button>
    </div>`;
  },
  abrirClienteModal(){
    const busca = document.getElementById('clientSearch');
    if(busca) busca.value = '';
    this.renderClientList('');
    document.getElementById('clienteModal').classList.add('open');
    if(busca) setTimeout(()=>busca.focus(), 60);
  },
  fecharClienteModal(){
    document.getElementById('clienteModal').classList.remove('open');
    this.renderClientePick();
  },
  filterClients(){ this.renderClientList(document.getElementById('clientSearch').value); },
  pickClient(name, isNew){
    if(!isNew && wizard.tipo === 'abertura'){
      alert('Abertura de Empresa é sempre para uma empresa nova.\n\nEsta empresa já existe (tem CNPJ e pasta no SharePoint). Para mexer nos dados dela, volte ao passo 1 e escolha "Alteração Societária".');
      return;
    }
    wizard.cliente = isNew?null:name; wizard.clienteNovo=!!isNew;
    const client = !isNew ? CLIENTES.find(c=>c.nome===name) : null;
    wizard.minutaPropria = client ? !!client.minutaPropria : false;
    wizard.minutaArquivo = null;
    this.renderClientList(document.getElementById('clientSearch').value);
    /* escolheu — fecha a caixa de diálogo e volta para a etapa com o cartão preenchido */
    this.fecharClienteModal();
  },
  /* ---------- Abertura: criação da pasta do cliente no SharePoint ----------
     Ao informar a razão social numa Abertura de Empresa, a ferramenta pergunta se
     já deve criar a pasta do cliente com a estrutura padrão. Se sim, "cria" na hora
     (Fase 1: simulado) e os documentos anexados adiante já são gravados nela. */
  checarPastaSharePoint(valor){
    if(wizard.tipo !== 'abertura') return;
    const nome = (valor||'').trim();
    if(!nome){ this.renderPastaStatus(); return; }
    /* já perguntamos para este mesmo nome — não repetir a cada blur */
    if(wizard.pastaPerguntadaPara === nome){ this.renderPastaStatus(); return; }
    wizard.pastaPerguntadaPara = nome;
    document.getElementById('pastaConfirmNome').textContent = nome;
    document.getElementById('pastaConfirmCaminho').textContent =
      `/sites/clientes/Documentos Compartilhados/${nome}/`;
    document.getElementById('pastaConfirmArvore').innerHTML = this.renderArvorePastas();
    /* deixa claro, ANTES do clique, se a criação vai valer de verdade */
    const aviso = document.getElementById('pastaConfirmAviso');
    if(aviso){
      aviso.innerHTML = GS2SP.disponivel()
        ? `<div class="ocr-strip" style="margin:0 0 12px;background:var(--status-good-bg);color:var(--status-good);">
             <span>✓</span><span class="grow">Conectada ao SharePoint da GS2 — a pasta é criada de verdade ao confirmar.</span></div>`
        : `<div class="ocr-strip" style="margin:0 0 12px;background:var(--status-warn-bg);color:var(--status-warn);align-items:flex-start;">
             <span>🖥️</span><span class="grow"><b>Modo demonstração:</b> nada será criado no SharePoint.
             A ferramenta só mostra como ficaria. ${this.escapeHtml(GS2Auth.motivoDemo())}</span></div>`;
    }
    document.getElementById('pastaConfirmModal').classList.add('open');
  },
  async responderPastaSharePoint(sim){
    document.getElementById('pastaConfirmModal').classList.remove('open');
    const nome = wizard.pastaPerguntadaPara || '';
    if(!sim){ wizard.pastaSharePoint = {criada:false, nome:nome}; this.renderPastaStatus(); return; }

    const agora = new Date();
    const p = n=>String(n).padStart(2,'0');
    const marcar = (real) => {
      wizard.pastaSharePoint = {
        criada: true, nome: nome, real: !!real,
        caminho: `/sites/clientes/Documentos Compartilhados/${nome}`,
        pastas: this.listarPastasPadrao(),
        criadaEm: `${p(agora.getDate())}/${p(agora.getMonth()+1)}/${agora.getFullYear()} ${p(agora.getHours())}:${p(agora.getMinutes())}`,
        criadaPor: currentUser.nome
      };
      this.renderPastaStatus();
    };

    if(!GS2SP.disponivel()){ marcar(false); return; }

    /* conectado: cria mesmo, agora, no SharePoint */
    const box = document.getElementById('pastaStatusBox');
    if(box) box.innerHTML = '<div class="ocr-strip" style="margin:10px 0 0;"><span>⏳</span><span class="grow">Criando a pasta no SharePoint…</span></div>';
    try{
      await GS2SP.criarEstruturaCliente(nome, ESTRUTURA_PASTAS_PADRAO);
      marcar(true);
      this.sincronizarClientes();
    }catch(e){
      wizard.pastaSharePoint = {criada:false, nome:nome, erro:e.message};
      this.renderPastaStatus();
      alert('Não consegui criar a pasta no SharePoint:\n\n' + e.message +
            '\n\nO processo continua — a pasta pode ser criada de novo ao enviar.');
    }
  },
  renderPastaStatus(){
    const box = document.getElementById('pastaStatusBox');
    if(!box) return;
    const st = wizard.pastaSharePoint;
    if(!st || !st.nome){ box.innerHTML = ''; return; }

    if(st.criada && st.real){
      /* criada de verdade, agora, via Microsoft Graph */
      box.innerHTML = `
        <div class="ocr-strip" style="margin:10px 0 0;background:var(--status-good-bg);color:var(--status-good);align-items:flex-start;">
          <span>✓</span>
          <span class="grow">
            <b>Pasta criada no SharePoint</b> em ${this.escapeHtml(st.criadaEm)} por ${this.escapeHtml(st.criadaPor)} — ${st.pastas.length} subpastas da estrutura padrão.
            <div style="font-family:ui-monospace,monospace;font-size:11px;margin-top:4px;opacity:.85;">${this.escapeHtml(st.caminho)}/</div>
            <div style="margin-top:7px;">
              <button class="btn" style="padding:4px 11px;font-size:11px;" data-action="verPastasCriadas">Ver estrutura criada</button>
            </div>
          </span>
        </div>`;
    } else if(st.criada){
      /* modo demonstração: NADA foi criado. Dizer "criada" aqui seria mentira —
         a pessoa iria procurar a pasta no SharePoint e não acharia. */
      box.innerHTML = `
        <div class="ocr-strip" style="margin:10px 0 0;background:var(--status-warn-bg);color:var(--status-warn);align-items:flex-start;">
          <span>🖥️</span>
          <span class="grow">
            <b>Simulação — nada foi criado no SharePoint.</b> A ferramenta está em modo demonstração
            (${this.escapeHtml(GS2Auth.motivoDemo())})
            Conectada ao Microsoft 365, a pasta abaixo seria criada neste momento, com ${st.pastas.length} subpastas da estrutura padrão.
            <div style="font-family:ui-monospace,monospace;font-size:11px;margin-top:4px;opacity:.85;">${this.escapeHtml(st.caminho)}/</div>
            <div style="margin-top:7px;">
              <button class="btn" style="padding:4px 11px;font-size:11px;" data-action="verPastasCriadas">Ver a estrutura que seria criada</button>
            </div>
          </span>
        </div>`;
    } else {
      box.innerHTML = `
        <div class="ocr-strip" style="margin:10px 0 0;background:var(--status-warn-bg);color:var(--status-warn);align-items:flex-start;">
          <span>⚠️</span>
          <span class="grow">
            <b>Pasta ainda não criada.</b> Ela será criada automaticamente ao enviar o processo — até lá não há onde arquivar os documentos deste cliente.
            <div style="margin-top:7px;">
              <button class="btn" style="padding:4px 11px;font-size:11px;" data-action="responderPastaSharePoint" data-args='[true]'>Criar agora</button>
            </div>
          </span>
        </div>`;
    }
  },
  verPastasCriadas(){
    const st = wizard.pastaSharePoint;
    if(!st || !st.criada) return;
    const cabecalho = st.real
      ? `Estrutura criada em ${st.caminho}/`
      : `SIMULAÇÃO — esta estrutura NÃO existe no SharePoint.\n\nEla seria criada em ${st.caminho}/ quando a ferramenta estiver conectada ao Microsoft 365.`;
    alert(`${cabecalho}\n\n${st.pastas.map(x=>'  • '+x).join('\n')}\n\nOs documentos societários deste processo são gravados nas subpastas de 03 - Societario.`);
  },

  /* ---------- Estrutura de pastas no SharePoint ---------- */

  /* Achata ESTRUTURA_PASTAS_PADRAO numa lista de caminhos relativos. */
  listarPastasPadrao(nos, prefixo){
    nos = nos || ESTRUTURA_PASTAS_PADRAO; prefixo = prefixo || '';
    let out = [];
    nos.forEach(n=>{
      const caminho = prefixo ? prefixo + '/' + n.nome : n.nome;
      out.push(caminho);
      if(n.filhos) out = out.concat(this.listarPastasPadrao(n.filhos, caminho));
    });
    return out;
  },

  /* Árvore visual da estrutura padrão, para mostrar ao colaborador antes de criar. */
  renderArvorePastas(nos, nivel){
    nos = nos || ESTRUTURA_PASTAS_PADRAO; nivel = nivel || 0;
    return nos.map(n=>{
      const destaque = n.nome.indexOf('03') === 0 || (nivel>0 && n.nome.indexOf('03.') === 0);
      return `<div style="padding:2px 0 2px ${nivel*18}px;font-size:12.5px;${destaque?'font-weight:700;color:var(--status-good);':'color:var(--ink);'}">
          ${nivel?'└ ':''}📁 ${this.escapeHtml(n.nome)}
        </div>` + (n.filhos ? this.renderArvorePastas(n.filhos, nivel+1) : '');
    }).join('');
  },

  /* Nome de arquivo na convenção do acervo: TIPO_DD.MM.AAAA_RAZAO SOCIAL.ext */
  nomeArquivoPadrao(prefixo, cliente, nomeOriginal){
    const d = new Date(); const p = n=>String(n).padStart(2,'0');
    const data = `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}`;
    const ext = (nomeOriginal && nomeOriginal.indexOf('.')>-1) ? nomeOriginal.slice(nomeOriginal.lastIndexOf('.')) : '.pdf';
    const cli = (cliente||'NOVA EMPRESA').toUpperCase().replace(/[\\/:*?"<>|]/g,'').slice(0,60);
    return `${prefixo}_${data}_${cli}${ext}`;
  },

  /* Destino da CNH de um sócio: vai para DOCUMENTOS AUXILIARES com o nome do
     próprio sócio no arquivo, já que é documento pessoal e não da empresa. */
  destinoCnhSocio(socio, nomeOriginal){
    const titular = (socio && socio.nome) ? socio.nome : 'SOCIO';
    return {
      pasta: DESTINO_DOCUMENTOS.cnhSocio.pasta,
      arquivo: this.nomeArquivoPadrao(DESTINO_DOCUMENTOS.cnhSocio.prefixo, titular, nomeOriginal)
    };
  },

  /* Caminho completo de destino de um documento do processo. */
  destinoDocumento(docId, cliente, nomeOriginal){
    const regra = DESTINO_DOCUMENTOS[docId];
    if(!regra) return {pasta: PASTA_AUXILIARES, arquivo: nomeOriginal || '(arquivo)'};
    return {pasta: regra.pasta, arquivo: this.nomeArquivoPadrao(regra.prefixo, cliente, nomeOriginal)};
  },

  nomeClienteAtual(){
    return wizard.clienteNovo ? (wizard.campos.razaoSocial || 'Nova empresa') : (wizard.cliente || '');
  },

  renderMinutaBox(){
    const box = document.getElementById('minutaBox');
    if(!box) return;
    if(!wizard.cliente && !wizard.clienteNovo){ box.innerHTML=''; return; }

    /* Empresa nova: mostrar a estrutura de pastas que será criada no SharePoint */
    const estruturaBox = wizard.clienteNovo ? `
      <div class="panel" style="margin-top:14px;">
        <div class="panel-head" style="padding:13px 16px;">
          <h3 class="sec-title">Pasta do cliente no SharePoint</h3>
          <span class="badge info"><span class="dot"></span>${this.listarPastasPadrao().length} pastas</span>
        </div>
        <div class="panel-body" style="padding:14px 16px;">
          <p class="view-sub" style="margin:0 0 10px;">Como é uma <b>empresa nova</b>, a ferramenta cria a pasta do cliente e replica a <b>estrutura padrão da GS2</b> (a mesma da pasta-modelo <code>Z - Estrutura de Pasta - Novos Clientes</code>) antes de salvar qualquer documento. Os documentos societários deste processo são gravados nas subpastas de <b>03 - Societario</b>, com o nome no padrão <code>TIPO_DD.MM.AAAA_RAZÃO SOCIAL</code>.</p>
          <div class="field" style="max-width:100%;margin-bottom:12px;">
            <label>Nome da pasta (razão social)</label>
            <input type="text" id="novaPastaNome" placeholder="Digite a razão social — a pasta terá exatamente este nome"
                   value="${this.escapeHtml(wizard.campos.razaoSocial||'')}" data-action="setNomePastaNova" data-event="input" data-value-from="value">
          </div>
          <div style="padding:11px 13px;border:1px dashed var(--line);border-radius:10px;background:var(--surface);">
            <div style="font-size:12px;color:var(--muted);margin-bottom:6px;font-family:ui-monospace,monospace;">
              /sites/clientes/Documentos Compartilhados/<b id="previewPasta" style="color:var(--ink);">${this.escapeHtml(wizard.campos.razaoSocial||'(razão social)')}</b>/
            </div>
            ${this.renderArvorePastas()}
          </div>
        </div>
      </div>` : '';

    box.innerHTML = estruturaBox + `
      <div class="callout" style="margin-top:14px;margin-bottom:6px;">
        <label class="check-item" style="cursor:pointer;">
          <input type="checkbox" id="minutaToggle" ${wizard.minutaPropria?'checked':''} data-action="toggleMinuta" data-event="change" data-value-from="checked">
          Este cliente possui minuta contratual própria (modelo específico) que deve ser usada neste processo
        </label>
      </div>
      <div id="minutaUploadWrap"></div>`;
    this.renderMinutaUpload();
  },
  setNomePastaNova(v){
    wizard.campos.razaoSocial = v;
    const prev = document.getElementById('previewPasta');
    if(prev) prev.textContent = v || '(razão social)';
  },
  toggleMinuta(checked){ wizard.minutaPropria = checked; if(!checked) wizard.minutaArquivo=null; this.renderMinutaUpload(); },
  renderMinutaUpload(){
    const wrap = document.getElementById('minutaUploadWrap');
    if(!wrap) return;
    if(!wizard.minutaPropria){ wrap.innerHTML=''; return; }
    wrap.innerHTML = `
      <div class="dropzone ${wizard.minutaArquivo?'filled':''}" id="dz-minuta" style="text-align:left;min-width:0;">
        ${wizard.minutaArquivo ? '✓ '+wizard.minutaArquivo.name : 'Clique para enviar a minuta própria do cliente (.docx)'}
      </div>
      <input type="file" id="fi-minuta" accept=".docx,.doc,.pdf" style="display:none" data-action="handleMinutaFile" data-event="change" data-value-from="files">
      <p class="view-sub" style="margin:8px 0 0;font-size:11.5px;">Essa minuta será usada como base do contrato deste cliente no lugar de um modelo padrão — na versão integrada, o backend mescla os dados do processo diretamente nela.</p>`;
    document.getElementById('dz-minuta').onclick = ()=>document.getElementById('fi-minuta').click();
  },
  handleMinutaFile(files){
    if(!files || !files.length) return;
    wizard.minutaArquivo = files[0];
    this.renderMinutaUpload();
  },

  /* ---------- Step 2 ---------- */
  renderTipoGrid(){
    const grid = document.getElementById('tipoGrid');
    grid.innerHTML = Object.keys(TIPOS).map(key=>{
      const t = TIPOS[key]; const sel = wizard.tipo===key ? 'selected' : '';
      return `<div class="tipo-card ${sel}" data-action="pickTipo" data-args='${this.attrJson([key])}'><div class="ic">${t.ic}</div><h4>${t.label}</h4><p>${t.desc}</p></div>`;
    }).join('');
  },
  pickTipo(key){
    /* Trocar para Abertura de Empresa invalida um cliente já existente escolhido antes. */
    if(key === 'abertura' && wizard.cliente && !wizard.clienteNovo){
      const anterior = wizard.cliente;
      wizard.cliente = null; wizard.clienteNovo = false;
      wizard.minutaPropria = false; wizard.minutaArquivo = null;
      alert(`A seleção de "${anterior}" foi desfeita.\n\nAbertura de Empresa é sempre para uma empresa nova, ainda sem CNPJ. No passo seguinte, escolha "Cadastrar nova empresa".`);
    }
    wizard.tipo = key;
    this.renderTipoGrid();
  },

  /* ======================================================================
     CAIXAS RECOLHÍVEIS DA ETAPA DE DADOS
     A etapa 3 virou uma página longa — empresa, endereço, imóvel,
     viabilidade, questionário municipal, sócios, administradores. Dividir em
     caixas com "Salvar" resolve duas coisas de uma vez: o colaborador vê
     onde está e o que já fechou, e a tela encolhe conforme ele avança, em vez
     de crescer. Ao salvar, a caixa recolhe e passa a mostrar um resumo de uma
     linha do que tem dentro — para conferir sem reabrir.

     O estado mora no wizard (não no DOM), porque a etapa é redesenhada
     inteira várias vezes: ao trocar o município, ao ler uma CNH, ao retomar
     um rascunho. Assim as caixas continuam como o colaborador deixou.
     ====================================================================== */
  caixaEstado(id){
    if(!wizard.caixas) wizard.caixas = {};
    if(!wizard.caixas[id]) wizard.caixas[id] = {aberta:false, salva:false};
    return wizard.caixas[id];
  },

  /* Sanfona: uma caixa aberta por vez, dentro do mesmo nível. Caixas aninhadas
     (o sócio dentro de "Sócios", o representante dentro do sócio PJ) formam
     grupos próprios — abrir um sócio não fecha a caixa "Sócios" que o contém. */
  grupoDaCaixa(id){
    let m = String(id).match(/^rep-(\d+)-\d+$/);
    if(m) return 'reps-' + m[1];
    if(/^socio-\d+$/.test(id)) return 'socios';
    if(/^admin-\d+$/.test(id)) return 'admins';
    return 'principal';
  },
  fecharIrmas(id){
    const grupo = this.grupoDaCaixa(id);
    Object.keys(wizard.caixas || {}).forEach(outro=>{
      if(outro !== id && this.grupoDaCaixa(outro) === grupo) wizard.caixas[outro].aberta = false;
    });
  },
  abrirCaixa(id){
    const e = this.caixaEstado(id);
    this.fecharIrmas(id);
    e.aberta = true;
  },
  toggleCaixa(id){
    const e = this.caixaEstado(id);
    if(e.aberta){ e.aberta = false; }
    else { this.fecharIrmas(id); e.aberta = true; }
    this.redesenharCaixas();
  },
  salvarCaixa(id){
    const e = this.caixaEstado(id);
    e.salva = true;
    e.aberta = false;
    e.salvaEm = new Date().toISOString();
    this.salvarRascunho(false);
    this.redesenharCaixas();
  },

  /* Na alteração societária, o que está em jogo são os tipos marcados. As caixas
     correspondentes abrem; as outras ficam recolhidas — visíveis e clicáveis para
     consulta, mas com os campos bloqueados, como já era a regra. */
  sincronizarCaixasAlteracao(){
    if(wizard.tipo !== 'alteracao') return;
    const marcados = wizard.campos.altTipo || [];
    const relevante = flags => (flags||'').split('|').some(f => marcados.indexOf(f) > -1);
    /* Abre TODAS as caixas do escopo do ato — é o mapa do que muda nesta
       alteração. A partir do primeiro clique a sanfona assume e deixa uma só
       aberta por vez; as fora do escopo recolhem e ficam para consulta. */
    (this.CAIXAS_ALTERACAO || []).forEach(cx=>{
      this.caixaEstado(cx.id).aberta = relevante(cx.flag);
    });
  },
  CAIXAS_ALTERACAO: [
    {id:'alt-razao',    flag:'Alteração de razão social'},
    {id:'alt-capital',  flag:'Alteração de capital social'},
    {id:'alt-cnae',     flag:'Alteração de atividade (CNAE)'},
    {id:'alt-endereco', flag:'Alteração de endereço'},
    {id:'alt-socios',   flag:'Entrada de sócio|Saída de sócio'},
    {id:'alt-admin',    flag:'Alteração de administração'},
    {id:'alt-outro',    flag:'Outro'}
  ],
  /* Redesenha o que estiver na tela — a etapa de dados e, quando existirem,
     as listas de sócios e administradores. */
  redesenharCaixas(){
    if(wizard.step === 3) this.renderDynamicFields();
    else { this.renderSocios(); this.renderAdministradores(); }
  },

  /* As caixas de sócio/representante/administrador são identificadas pelo índice
     na lista. Ao remover um item do meio, os de baixo sobem uma posição — e o
     estado das caixas (aberta/salva) precisa subir junto, senão o cartão do
     vizinho aparece recolhido ou marcado como salvo sem ter sido. */
  deslocarCaixas(prefixo, removido, total){
    if(!wizard.caixas) return;
    delete wizard.caixas[prefixo + removido];
    for(let n = removido + 1; n < total; n++){
      const de = prefixo + n, para = prefixo + (n - 1);
      if(wizard.caixas[de]){ wizard.caixas[para] = wizard.caixas[de]; delete wizard.caixas[de]; }
      else delete wizard.caixas[para];
    }
  },
  /* Ao remover um sócio PJ, some também com as caixas dos representantes dele
     e reindexa as dos sócios seguintes. */
  deslocarCaixasRep(socioRemovido, qtdReps){
    if(!wizard.caixas) return;
    Object.keys(wizard.caixas).forEach(id=>{
      const m = id.match(/^rep-(\d+)-(\d+)$/);
      if(!m) return;
      const si = +m[1];
      if(si === socioRemovido){ delete wizard.caixas[id]; return; }
      if(si > socioRemovido){
        wizard.caixas['rep-'+(si-1)+'-'+m[2]] = wizard.caixas[id];
        delete wizard.caixas[id];
      }
    });
  },

  /* Monta uma caixa. `resumo` é a linha que aparece quando ela está recolhida;
     `acoes` são botões extras no rodapé (ex.: "Remover sócio"). */
  caixa(id, titulo, corpo, opts){
    opts = opts || {};
    const e = this.caixaEstado(id);
    const aberta = e.aberta;
    const resumo = opts.resumo || '';
    const selo = e.salva
      ? `<span class="caixa-selo ok">✓ salvo</span>`
      : (opts.selo || '');
    return `
      <section class="caixa ${aberta?'aberta':'fechada'} ${e.salva?'salva':''} ${opts.classe||''}"
               id="caixa-${id}" ${opts.flag?`data-flag="${this.escapeAttr(opts.flag)}"`:''}>
        <header class="caixa-head" data-action="toggleCaixa" data-args='${this.attrJson([id])}'>
          <span class="caixa-seta">${aberta?'▾':'▸'}</span>
          <span class="caixa-titulo">${titulo}</span>
          ${selo}
          ${!aberta && resumo ? `<span class="caixa-resumo">${resumo}</span>` : ''}
          <span class="caixa-acao-abrir">${aberta?'recolher':'abrir'}</span>
        </header>
        ${aberta ? `
        <div class="caixa-body">
          ${opts.ajuda ? `<p class="view-sub" style="margin:0 0 10px;">${opts.ajuda}</p>` : ''}
          ${corpo}
          <div class="caixa-foot">
            <div class="caixa-foot-extra">${opts.acoes || ''}</div>
            <button type="button" class="btn primary caixa-salvar" data-action="salvarCaixa" data-args='${this.attrJson([id])}'>
              ${e.salva ? 'Salvar e recolher' : '✓ Salvar'}
            </button>
          </div>
        </div>` : ''}
      </section>`;
  },
  /* Resumos de uma linha, mostrados na caixa recolhida. */
});
