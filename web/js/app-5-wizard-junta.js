/* O objeto App — parte 5 de 6: etapas do wizard, revisão, Junta Comercial e RFB. */

Object.assign(App, {
  pessoaPorOrigem(origem){
    if(!origem) return null;
    const s = wizard.socios[origem.i];
    if(!s) return null;
    if(origem.tipo === 'rep') return (s.representantes||[])[origem.j] || null;
    return s;
  },
  mesmaOrigem(a, b){
    return !!a && !!b && a.tipo === b.tipo && a.i === b.i && (a.tipo !== 'rep' || a.j === b.j);
  },
  setAdminPessoa(origem, marcado){
    const pessoa = this.pessoaPorOrigem(origem);
    if(!pessoa) return;
    pessoa.admin = !!marcado;
    if(marcado && origem.tipo === 'socio' && !pessoa.cargo) pessoa.cargo = 'Sócio-Administrador';
    this.sincronizarAdministradores();
    this.renderSocios();
    this.renderAdministradores();
  },
  toggleAdminSocio(i, marcado){ this.setAdminPessoa({tipo:'socio', i:i}, marcado); },
  toggleAdminRep(i, j, marcado){ this.setAdminPessoa({tipo:'rep', i:i, j:j}, marcado); },

  /* Reconstrói as entradas espelhadas: cria as que faltam, atualiza os dados das
     que existem e descarta as de gente que deixou de ser administrador ou saiu
     do quadro societário. As entradas digitadas à mão (sem origem) não são
     tocadas. */
  sincronizarAdministradores(){
    if(!wizard.administradores) wizard.administradores = [];

    const marcados = [];
    (wizard.socios||[]).forEach((s,i)=>{
      if(s.tipo === 'PJ'){
        (s.representantes||[]).forEach((r,j)=>{ if(r.admin) marcados.push({tipo:'rep', i:i, j:j}); });
      } else if(s.admin){
        marcados.push({tipo:'socio', i:i});
      }
    });

    /* fora quem não está mais marcado */
    wizard.administradores = wizard.administradores.filter(a =>
      !a.origem || marcados.some(o => this.mesmaOrigem(o, a.origem)));

    marcados.forEach(origem=>{
      const pessoa = this.pessoaPorOrigem(origem);
      if(!pessoa) return;
      const nome = pessoa.nome || '';
      const cpf  = origem.tipo === 'rep' ? (pessoa.cpf || '') : (pessoa.documento || '');
      let entrada = wizard.administradores.find(a => this.mesmaOrigem(a.origem, origem));
      if(!entrada){
        entrada = {origem: origem, cargo: origem.tipo === 'rep' ? 'Administrador' : 'Sócio-Administrador'};
        wizard.administradores.push(entrada);
      }
      entrada.nome         = nome;
      entrada.cpf          = cpf;
      entrada.rg           = pessoa.rg           || '';
      entrada.estadoCivil  = pessoa.estadoCivil  || '';
      entrada.regimeBens   = pessoa.regimeBens   || '';
      entrada.naturalidade = pessoa.naturalidade || '';
      entrada.nascimento   = pessoa.nascimento   || '';
      entrada.endereco = pessoa.endereco || {};
      entrada.contato  = pessoa.contato  || {};
    });
  },

  /* ---------- Step 4: docs + simulated OCR ---------- */
  getEffectiveDocs(){
    const base = DOCS_REQUIRED[wizard.tipo] || [];
    const extra = [];
    if(wizard.tipo==='abertura'){
      wizard.socios.forEach((s,i)=>{
        if(s.tipo==='PJ'){
          const label = s.nome ? s.nome : `sócio pessoa jurídica #${i+1}`;
          extra.push({id:`cnpj_pj_${i}`, label:`Cartão CNPJ — ${label}`, pj:true});
          extra.push({id:`contrato_pj_${i}`, label:`Contrato Social ou última alteração — ${label}`, pj:true});
        }
      });
    }
    return base.concat(extra);
  },
  renderDocsList(){
    const el = document.getElementById('docsList');
    const list = this.getEffectiveDocs();
    const cli = this.nomeClienteAtual();
    el.innerHTML = list.map(d=>{
      const f = wizard.docs[d.id];
      const dest = this.destinoDocumento(d.id, cli, f ? f.name : null);
      return `<div class="doc-item">
        <div class="doc-row">
          <div class="doc-info"><div class="name">${d.label}${d.pj?'<span class="ocr-tag" style="background:var(--dark);">PJ</span>':''}</div><div class="req">${d.pj ? 'Obrigatório por ter sócio pessoa jurídica' : 'Obrigatório para '+TIPOS[wizard.tipo].label.toLowerCase()}</div></div>
          <div>
            <div class="dropzone ${f?'filled':''}" id="dz-${d.id}" data-action="click-target" data-target="fi-${d.id}">${f ? '✓ '+f.name : 'Arrastar arquivo ou clicar para selecionar'}</div>
            <input type="file" id="fi-${d.id}" style="display:none" data-action="handleDocFile" data-args='${this.attrJson([d.id])}' data-event="change" data-value-from="files">
          </div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:5px;font-family:ui-monospace,monospace;line-height:1.5;">
          ↳ será salvo em <b style="color:var(--status-info);">${this.escapeHtml(dest.pasta)}</b>${f ? ' · como <b style="color:var(--status-good);">'+this.escapeHtml(dest.arquivo)+'</b>' : ''}
        </div>
        <div id="ocr-${d.id}"></div>
      </div>`;
    }).join('');

    list.forEach(d=>{
      const dz = document.getElementById('dz-'+d.id);
      dz.addEventListener('dragover', e=>{e.preventDefault(); dz.classList.add('drag');});
      dz.addEventListener('dragleave', ()=>dz.classList.remove('drag'));
      dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); this.handleDocFile(d.id, e.dataTransfer.files); });
    });

    const extra = document.getElementById('extraDrop'); const extraInput = document.getElementById('extraFileInput');
    extra.onclick = ()=>extraInput.click();
    extraInput.onchange = ()=>{ this.addExtraFiles(extraInput.files); };
    extra.addEventListener('dragover', e=>{e.preventDefault(); extra.classList.add('drag');});
    extra.addEventListener('dragleave', ()=>extra.classList.remove('drag'));
    extra.addEventListener('drop', e=>{ e.preventDefault(); extra.classList.remove('drag'); this.addExtraFiles(e.dataTransfer.files); });
    this.renderExtraFiles();
  },
  handleDocFile(id, files){
    if(!files || !files.length) return;
    const f = files[0];
    /* Guarda o File EM SI. Guardando só {name,size}, `coletarAnexos`
       não achava um Blob e o envio anunciava "o arquivo não está mais em
       memória (a página foi recarregada)" — sem que página nenhuma
       tivesse sido recarregada. Nenhum documento da etapa 4 chegava ao
       SharePoint. O rascunho continua guardando só nome e tamanho, que é
       o que cabe nele (ver App.estadoDoRascunho). */
    wizard.docs[id] = f;
    this.renderDocsList();
    this.agendarSalvarRascunho();
    /* Aqui havia uma "extração automática" que mostrava nome, CPF e razão
       social INVENTADOS (de um exemplo) e um botão que os aplicava ao
       processo. Quem anexasse um documento real ganharia dado falso na
       ficha. Saiu. O que a ferramenta lê de verdade fica onde é real: a
       CNH na etapa de dados (OCR no navegador) e o Cartão CNPJ/QSA pelo
       acervo. */
    const docDef = (DOCS_REQUIRED[wizard.tipo]||[]).find(d=>d.id===id);
    const box = document.getElementById('ocr-'+id);
    if(box && docDef && docDef.leitura){
      box.innerHTML = `<div class="ocr-card"><div class="ocr-head">${this.escapeHtml(docDef.leitura)}</div></div>`;
    } else if(box){
      box.innerHTML = '';
    }
  },
  addExtraFiles(files){ Array.from(files).forEach(f=> wizard.extraFiles.push(f)); this.renderExtraFiles(); },
  renderExtraFiles(){ const el=document.getElementById('extraFiles'); if(!el) return; el.innerHTML = wizard.extraFiles.map((f,i)=>`<span class="file-chip">${this.escapeHtml(f.name)} <span class="x" data-action="removeExtraFile" data-args='${this.attrJson([i])}'>✕</span></span>`).join(''); },
  removeExtraFile(i){ wizard.extraFiles.splice(i,1); this.renderExtraFiles(); },

  /* ---------- Step 5: review + contract ---------- */
  renderReview(){
    const el = document.getElementById('reviewContent');
    const clienteLabel = wizard.clienteNovo ? '(Nova empresa — sem pasta ainda)' : (wizard.cliente || '—');
    const docs = this.getEffectiveDocs();
    const enviados = docs.filter(d=>wizard.docs[d.id]).length;
    let camposHtml = '';
    Object.keys(wizard.campos).forEach(k=>{
      let v = wizard.campos[k];
      if(k==='endereco'){ const txt = this.enderecoTexto(v); if(txt) camposHtml += `<div><span>Endereço da sede</span>${this.escapeHtml(txt)}</div>`; return; }
      if(Array.isArray(v)) v = v.join(', ');
      if(v && typeof v==='object') return;
      if(!v) return;
      camposHtml += `<div><span>${this.escapeHtml(this.ROTULOS_CAMPOS[k] || k)}</span>${this.escapeHtml(v)}</div>`;
    });

    let sociosHtml = '';
    /* vale para qualquer tipo: entrada/saída de sócio numa alteração também
       precisa dos integrantes na revisão */
    if(wizard.socios.length){
      sociosHtml = `<div class="review-box"><h4>Sócios</h4><div class="review-grid">
        ${wizard.socios.map(s=>{
          let linhas = `<div><span>${s.tipo==='PJ'?'Pessoa Jurídica':'Pessoa Física'}</span>${this.escapeHtml(s.nome||'—')} ${s.documento?'('+this.escapeHtml(s.documento)+')':''}</div>`;
          if(s.tipo==='PF'){
            const qual = this.qualificacaoTexto(s);
            if(qual) linhas += `<div><span>Qualificação</span>${this.escapeHtml(qual)}</div>`;
            const end = this.enderecoTexto(s.endereco);
            if(end) linhas += `<div><span>Endereço</span>${this.escapeHtml(end)}</div>`;
            const contatoTxt = [s.contato?.email, s.contato?.telefone].filter(Boolean).join(' · ');
            if(contatoTxt) linhas += `<div><span>Contato</span>${this.escapeHtml(contatoTxt)}</div>`;
          } else {
            (s.representantes||[]).forEach(r=>{
              linhas += `<div><span>Representante legal</span>${this.escapeHtml(r.nome||'—')} ${r.cpf?'('+this.escapeHtml(r.cpf)+')':''}</div>`;
              const qualR = this.qualificacaoTexto(r);
              if(qualR) linhas += `<div><span>Qualificação do representante</span>${this.escapeHtml(qualR)}</div>`;
              const end = this.enderecoTexto(r.endereco);
              if(end) linhas += `<div><span>Endereço do representante</span>${this.escapeHtml(end)}</div>`;
              const contatoTxt = [r.contato?.email, r.contato?.telefone].filter(Boolean).join(' · ');
              if(contatoTxt) linhas += `<div><span>Contato do representante</span>${this.escapeHtml(contatoTxt)}</div>`;
            });
          }
          return linhas;
        }).join('')}
      </div></div>`;
    }

    let administradoresHtml = '';
    /* vale para qualquer tipo de processo: alteração de administração também
       precisa mostrar quem administra na revisão */
    if((wizard.administradores||[]).length){
      administradoresHtml = `<div class="review-box"><h4>Administradores</h4><div class="review-grid">
        ${wizard.administradores.map(a=>{
          const daOrigem = a.origem ? (a.origem.tipo==='rep' ? ' · também representante legal de sócio PJ' : ' · também sócio') : '';
          let linhas = `<div><span>Administrador</span>${this.escapeHtml(a.nome||'—')} ${a.cpf?'('+this.escapeHtml(a.cpf)+')':''}${a.cargo?' — '+this.escapeHtml(a.cargo):''}${daOrigem}</div>`;
          const qual = this.qualificacaoTexto(a);
          if(qual) linhas += `<div><span>Qualificação</span>${this.escapeHtml(qual)}</div>`;
          const end = this.enderecoTexto(a.endereco);
          if(end) linhas += `<div><span>Endereço</span>${this.escapeHtml(end)}</div>`;
          const contatoTxt = [a.contato?.email, a.contato?.telefone].filter(Boolean).join(' · ');
          if(contatoTxt) linhas += `<div><span>Contato</span>${this.escapeHtml(contatoTxt)}</div>`;
          return linhas;
        }).join('')}
      </div></div>`;
    }

    el.innerHTML = `
      <div class="review-box"><h4>Cliente e tipo</h4><div class="review-grid">
        <div><span>Cliente</span>${this.escapeHtml(clienteLabel)}</div><div><span>Tipo de processo</span>${TIPOS[wizard.tipo]?.label || '—'}</div>
      </div></div>
      <div class="review-box"><h4>Dados preenchidos</h4><div class="review-grid">${camposHtml || '<div style="color:#9aa8a5">Nenhum campo preenchido.</div>'}</div></div>
      ${wizard.minutaPropria ? `<div class="review-box"><h4>Minuta própria do cliente</h4><div class="review-grid"><div><span>Arquivo</span>${wizard.minutaArquivo ? '✓ '+this.escapeHtml(wizard.minutaArquivo.name) : '— ainda não enviada'}</div></div></div>` : ''}
      ${sociosHtml}
      ${administradoresHtml}
      <div class="review-box"><h4>Documentos (${enviados}/${docs.length} anexados)</h4><div class="review-grid">
        ${docs.map(d=>`<div><span>${this.escapeHtml(d.label)}</span>${wizard.docs[d.id] ? '✓ '+this.escapeHtml(wizard.docs[d.id].name) : '— pendente'}</div>`).join('')}
      </div></div>
      <div class="review-box">
        <h4>Resumo para compartilhar com o cliente</h4>
        <p class="view-sub" style="margin:-4px 0 10px;">Envie este texto por e-mail ou WhatsApp para o cliente confirmar os dados antes de seguirmos com o processo.</p>
        <textarea id="clienteResumoText" readonly style="width:100%;min-height:180px;border:1px solid var(--line);border-radius:9px;padding:12px;font-size:12.5px;font-family:inherit;color:var(--ink);background:var(--surface);resize:vertical;">${this.escapeHtml(this.buildClientSummaryText())}</textarea>
        <div class="btn-row" style="margin-top:10px;">
          <span></span>
          <div style="display:flex;gap:10px;">
            <button class="btn ghost" data-action="copiarResumoCliente">📋 Copiar resumo (texto)</button>
            <button class="btn dark" data-action="gerarPdfResumo">📄 Gerar PDF do resumo</button>
          </div>
        </div>
        <label class="check-item" style="cursor:pointer;margin-top:16px;">
          <input type="checkbox" id="aguardaConfirmacaoCliente" ${wizard.aguardaConfirmacaoCliente?'checked':''} data-action="toggleAguardaConfirmacao" data-event="change" data-value-from="checked">
          Aguardando confirmação dos dados pelo cliente antes de enviar à Junta Comercial
        </label>
      </div>`;

    const sel = document.getElementById('tplSelect');
    const opts = TEMPLATES.filter(t=>t.tipo===wizard.tipo);
    let optsHtml = '';
    if(wizard.minutaPropria && wizard.minutaArquivo){
      optsHtml += `<option value="CLIENTE_MINUTA">📄 Usar minuta própria do cliente (${this.escapeHtml(wizard.minutaArquivo.name)})</option>`;
    }
    optsHtml += opts.length ? opts.map(t=>`<option value="${this.escapeHtml(t.id)}">${this.escapeHtml(t.nome)}</option>`).join('') : (optsHtml ? '' : '<option value="">Nenhum modelo cadastrado para este tipo</option>');
    sel.innerHTML = optsHtml;
    this.renderContractPreview();
  },
  /* Escapa para HTML. Precisa cobrir aspas também: metade das telas
     interpola dentro de value="..." e title="...", e sem escapar aspa
     um valor como   " onfocus=alert(1) autofocus x="   sai do atributo.
     String() na entrada porque número e null chegam aqui. */
  escapeHtml(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  buildClientSummaryText(){
    const c = wizard.campos;
    const clienteLabel = wizard.clienteNovo ? (c.razaoSocial || 'Nova empresa') : (wizard.cliente || '');
    const linhas = [];
    linhas.push(`Resumo do processo — ${TIPOS[wizard.tipo]?.label || ''}`);
    linhas.push(`Cliente: ${clienteLabel}`);
    linhas.push('');
    if(wizard.tipo==='abertura'){
      if(c.razaoSocial) linhas.push(`Razão social pretendida: ${c.razaoSocial}`);
      if(c.nomeFantasia) linhas.push(`Nome fantasia: ${c.nomeFantasia}`);
      if(c.tipoSocietario) linhas.push(`Tipo societário: ${c.tipoSocietario}`);
      if(c.capital) linhas.push(`Capital social: ${c.capital}`);
      if(c.cnaePrincipal) linhas.push(`Atividade principal (CNAE): ${c.cnaePrincipal}`);
      if(c.cnaeSecundarios && c.cnaeSecundarios.length) linhas.push(`Atividades secundárias: ${c.cnaeSecundarios.join('; ')}`);
      if(this.enderecoCompleto()) linhas.push(`Endereço da sede: ${this.enderecoCompleto()}`);
      if(c.inscricaoImobiliaria) linhas.push(`Inscrição imobiliária (IPTU): ${c.inscricaoImobiliaria}`);
      if(c.inscricaoMunicipal) linhas.push(`Inscrição municipal: ${c.inscricaoMunicipal}`);
      if(c.alvaraBombeiros) linhas.push(`Alvará do Corpo de Bombeiros: ${c.alvaraBombeiros}${c.alvaraBombeirosValidade?' (validade '+c.alvaraBombeirosValidade+')':''}`);
      if(c.regime) linhas.push(`Regime tributário pretendido: ${c.regime}`);
      if(wizard.socios.length){
        linhas.push('');
        linhas.push('Sócios:');
        wizard.socios.forEach(s=>{
          linhas.push(`- ${s.nome||'(nome pendente)'} (${s.tipo==='PJ'?'Pessoa Jurídica':'Pessoa Física'}${s.documento?', '+s.documento:''}) — ${s.perc||'?'}% — ${s.cargo||''}`);
          if(s.tipo==='PF'){
            const qual = this.qualificacaoTexto(s);
            if(qual) linhas.push(`  Qualificação: ${qual}`);
            const end = this.enderecoTexto(s.endereco);
            if(end) linhas.push(`  Endereço: ${end}`);
            const contatoTxt = [s.contato?.email, s.contato?.telefone].filter(Boolean).join(' · ');
            if(contatoTxt) linhas.push(`  Contato: ${contatoTxt}`);
          } else {
            (s.representantes||[]).forEach(r=>{
              linhas.push(`  Representante legal: ${r.nome||'(nome pendente)'}${r.cpf?', '+r.cpf:''}`);
              const qualR = this.qualificacaoTexto(r);
              if(qualR) linhas.push(`    Qualificação: ${qualR}`);
              const end = this.enderecoTexto(r.endereco);
              if(end) linhas.push(`    Endereço: ${end}`);
              const contatoTxt = [r.contato?.email, r.contato?.telefone].filter(Boolean).join(' · ');
              if(contatoTxt) linhas.push(`    Contato: ${contatoTxt}`);
            });
          }
        });
      }
      if((wizard.administradores||[]).length){
        linhas.push('');
        linhas.push('Administradores:');
        wizard.administradores.forEach(a=>{
          linhas.push(`- ${a.nome||'(nome pendente)'}${a.cpf?', '+a.cpf:''}${a.cargo?' — '+a.cargo:''}${a.origem?(a.origem.tipo==='rep'?' (representante legal de sócio PJ)':' (sócio)'):''}`);
          const qualA = this.qualificacaoTexto(a);
          if(qualA) linhas.push(`  Qualificação: ${qualA}`);
          const end = this.enderecoTexto(a.endereco);
          if(end) linhas.push(`  Endereço: ${end}`);
          const contatoTxt = [a.contato?.email, a.contato?.telefone].filter(Boolean).join(' · ');
          if(contatoTxt) linhas.push(`  Contato: ${contatoTxt}`);
        });
      }
    } else if(wizard.tipo==='alteracao'){
      if(c.razaoSocial) linhas.push(`Razão social: ${c.razaoSocial}`);
      if(c.altTipo && c.altTipo.length) linhas.push(`Tipo(s) de alteração: ${c.altTipo.join(', ')}`);
      if(c.descricao) linhas.push(`Descrição: ${c.descricao}`);
      if(c.dataDeliberacao) linhas.push(`Data da deliberação: ${c.dataDeliberacao}`);
    } else if(wizard.tipo==='baixa'){
      if(c.razaoSocial) linhas.push(`Razão social: ${c.razaoSocial}`);
      if(c.motivo) linhas.push(`Motivo do encerramento: ${c.motivo}`);
      if(c.dataEncerramento) linhas.push(`Data de encerramento: ${c.dataEncerramento}`);
    } else if(wizard.tipo==='outros'){
      if(c.tipoEvento) linhas.push(`Tipo de evento: ${c.tipoEvento}`);
      if(c.descricaoEvento) linhas.push(`Descrição: ${c.descricaoEvento}`);
    }
    if(c.grupoEconomico==='Sim'){
      linhas.push('');
      linhas.push(`Grupo econômico: ${c.grupoEconomicoNome || '(nome não informado)'}`);
    }
    linhas.push('');
    linhas.push('Documentos:');
    this.getEffectiveDocs().forEach(d=>linhas.push(`- ${d.label}: ${wizard.docs[d.id] ? 'recebido' : 'pendente'}`));
    linhas.push('');
    linhas.push('Por favor, confirme se os dados acima estão corretos para seguirmos com o processo.');
    return linhas.join('\n');
  },
  pdfField(label, value, opts){
    opts = opts || {};
    if(!value) return '';
    const span2 = opts.span2 ? ' span2' : '';
    return `<div class="pdf-field${span2}"><div class="pdf-label">${this.escapeHtml(label)}</div><div class="pdf-value">${value}</div></div>`;
  },
  buildClientSummaryHtml(){
    const c = wizard.campos;
    const clienteLabel = wizard.clienteNovo ? (c.razaoSocial || 'Nova empresa') : (wizard.cliente || '');
    const logo = document.querySelector('.login-card img.logo');
    const logoSrc = logo ? logo.src : '';
    let sections = '';

    if(wizard.tipo==='abertura'){
      sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Dados da empresa</legend><div class="pdf-grid">
        ${this.pdfField('Razão social pretendida', this.escapeHtml(c.razaoSocial))}
        ${this.pdfField('Nome fantasia', this.escapeHtml(c.nomeFantasia))}
        ${this.pdfField('Natureza jurídica', this.escapeHtml(c.tipoSocietario))}
        ${this.pdfField('Capital social', this.escapeHtml(c.capital))}
        ${this.pdfField('Regime tributário pretendido', this.escapeHtml(c.regime))}
        ${this.pdfField('Data prevista de início', this.escapeHtml(c.dataPrevista))}
      </div></fieldset>`;

      if(c.cnaePrincipal || (c.cnaeSecundarios && c.cnaeSecundarios.length)){
        sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Atividade econômica</legend><div class="pdf-grid full">
          ${this.pdfField('Atividade principal (CNAE)', this.escapeHtml(c.cnaePrincipal), {span2:true})}
          ${c.cnaeSecundarios && c.cnaeSecundarios.length ? this.pdfField('Outras atividades (CNAE secundários)', '<ul>'+c.cnaeSecundarios.map(a=>`<li>${this.escapeHtml(a)}</li>`).join('')+'</ul>', {span2:true}) : ''}
        </div></fieldset>`;
      }

      const sede = c.endereco || {};
      if(sede.logradouro || sede.cep || sede.municipio){
        sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Endereço da sede</legend><div class="pdf-grid">
          ${this.pdfField('Logradouro', this.escapeHtml([sede.logradouro, sede.numero].filter(Boolean).join(', ')), {span2:true})}
          ${this.pdfField('Bairro', this.escapeHtml(sede.bairro))}
          ${this.pdfField('Complemento', this.escapeHtml(sede.complemento))}
          ${this.pdfField('Município', this.escapeHtml(sede.municipio))}
          ${this.pdfField('UF', this.escapeHtml(sede.uf))}
          ${this.pdfField('CEP', this.escapeHtml(sede.cep))}
          ${this.pdfField('Ponto de referência', this.escapeHtml(sede.pontoReferencia), {span2:true})}
          ${this.pdfField('Inscrição imobiliária (IPTU)', this.escapeHtml(c.inscricaoImobiliaria))}
          ${this.pdfField('Inscrição municipal', this.escapeHtml(c.inscricaoMunicipal))}
          ${this.pdfField('Alvará do Corpo de Bombeiros', this.escapeHtml(c.alvaraBombeiros))}
          ${this.pdfField('Validade do alvará de bombeiros', this.escapeHtml(c.alvaraBombeirosValidade))}
        </div></fieldset>`;
      }

      const vi = ['viabEvento','viabEnquadramento','viabSomenteRfb','viabNaturezaImovel','viabTipoUnidade',
                  'viabAreaTotal','viabAreaUtilizada','viabFormaAtuacao','viabAtividadeNoLocal',
                  'viabHorarioInicio','viabHorarioFim'];
      const qm = this.questionarioDoMunicipio();
      if(vi.some(k=>c[k]) || (c.viabDias||[]).length){
        sections += `<fieldset class="pdf-section longa"><legend class="pdf-section-title">Dados da Consulta de Viabilidade</legend><div class="pdf-grid">
          ${vi.map(k=>this.pdfField(this.ROTULOS_CAMPOS[k]||k, this.escapeHtml(c[k]))).join('')}
          ${(c.viabDias||[]).length ? this.pdfField('Dias de funcionamento', this.escapeHtml(c.viabDias.join(', '))) : ''}
        </div></fieldset>`;
      }

      if(qm && qm.perguntas.some(p=>c[p.chave])){
        sections += `<fieldset class="pdf-section longa"><legend class="pdf-section-title">Questionário de regulação urbana — ${this.escapeHtml(qm.orgao)}</legend><div class="pdf-grid">
          ${qm.perguntas.map(p=>this.pdfField(p.n+'. '+p.rotulo, this.escapeHtml(c[p.chave]))).join('')}
        </div></fieldset>`;
      }

      if(wizard.socios.length){
        sections += `<fieldset class="pdf-section longa"><legend class="pdf-section-title">Integrantes</legend>`;
        sections += wizard.socios.map(s=>{
          let bloco = `
          <div class="pdf-integrante">
            <div class="pdf-integrante-nome">${this.escapeHtml(s.nome) || '(nome pendente)'}</div>
            <div class="pdf-grid">
              ${this.pdfField('Qualificação', s.tipo==='PJ' ? 'Pessoa Jurídica' : 'Pessoa Física')}
              ${this.pdfField(s.tipo==='PJ' ? 'CNPJ' : 'CPF', this.escapeHtml(s.documento))}
              ${this.pdfField('% Participação', this.escapeHtml(s.perc))}
              ${this.pdfField('Cargo', this.escapeHtml(s.cargo))}
              ${s.tipo==='PF' ? this.pdfField('RG', this.escapeHtml(s.rg)) : ''}
              ${s.tipo==='PF' ? this.pdfField('Estado civil', this.escapeHtml(s.estadoCivil)) : ''}
              ${s.tipo==='PF' && this.exigeRegimeBens(s.estadoCivil) ? this.pdfField('Regime de bens', this.escapeHtml(s.regimeBens)) : ''}
              ${s.tipo==='PF' ? this.pdfField('Local de nascimento', this.escapeHtml(s.naturalidade)) : ''}
              ${s.tipo==='PF' ? this.pdfField('Endereço', this.escapeHtml(this.enderecoTexto(s.endereco)), {span2:true}) : ''}
              ${s.tipo==='PF' ? this.pdfField('Contato', this.escapeHtml([s.contato?.email, s.contato?.telefone].filter(Boolean).join(' · ')), {span2:true}) : ''}
            </div>
          </div>`;
          if(s.tipo==='PJ'){
            bloco += (s.representantes||[]).map(r=>`
          <div class="pdf-integrante" style="margin-left:16px;">
            <div class="pdf-integrante-nome">Representante legal: ${this.escapeHtml(r.nome) || '(nome pendente)'}</div>
            <div class="pdf-grid">
              ${this.pdfField('CPF', this.escapeHtml(r.cpf))}
              ${this.pdfField('RG', this.escapeHtml(r.rg))}
              ${this.pdfField('Estado civil', this.escapeHtml(r.estadoCivil))}
              ${this.exigeRegimeBens(r.estadoCivil) ? this.pdfField('Regime de bens', this.escapeHtml(r.regimeBens)) : ''}
              ${this.pdfField('Local de nascimento', this.escapeHtml(r.naturalidade))}
              ${this.pdfField('Endereço', this.escapeHtml(this.enderecoTexto(r.endereco)), {span2:true})}
              ${this.pdfField('Contato', this.escapeHtml([r.contato?.email, r.contato?.telefone].filter(Boolean).join(' · ')), {span2:true})}
            </div>
          </div>`).join('');
          }
          return bloco;
        }).join('');
        sections += `</fieldset>`;
      }

      if((wizard.administradores||[]).length){
        sections += `<fieldset class="pdf-section longa"><legend class="pdf-section-title">Administradores</legend>`;
        sections += wizard.administradores.map(a=>`
          <div class="pdf-integrante">
            <div class="pdf-integrante-nome">${this.escapeHtml(a.nome) || '(nome pendente)'}</div>
            <div class="pdf-grid">
              ${this.pdfField('CPF', this.escapeHtml(a.cpf))}
              ${this.pdfField('Cargo / função', this.escapeHtml(a.cargo))}
              ${this.pdfField('Estado civil', this.escapeHtml(a.estadoCivil))}
              ${this.exigeRegimeBens(a.estadoCivil) ? this.pdfField('Regime de bens', this.escapeHtml(a.regimeBens)) : ''}
              ${this.pdfField('Endereço', this.escapeHtml(this.enderecoTexto(a.endereco)), {span2:true})}
              ${this.pdfField('Contato', this.escapeHtml([a.contato?.email, a.contato?.telefone].filter(Boolean).join(' · ')), {span2:true})}
            </div>
          </div>`).join('');
        sections += `</fieldset>`;
      }
    } else if(wizard.tipo==='filial'){
      sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Matriz</legend><div class="pdf-grid">
        ${this.pdfField('Razão social da matriz', this.escapeHtml(c.razaoSocial))}
        ${this.pdfField('CNPJ da matriz', this.escapeHtml(c.cnpjMatriz))}
        ${this.pdfField('NIRE da matriz', this.escapeHtml(c.nireMatriz))}
        ${this.pdfField('Nº da alteração contratual', this.escapeHtml(c.numeroAlteracao))}
        ${this.pdfField('Data da deliberação', this.escapeHtml(c.dataDeliberacao))}
      </div></fieldset>`;
      sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Filial a constituir</legend><div class="pdf-grid full">
        ${this.pdfField('Nome da filial', this.escapeHtml(c.nomeFilial), {span2:true})}
        ${this.pdfField('Nome fantasia', this.escapeHtml(c.nomeFantasiaFilial), {span2:true})}
        ${this.pdfField('Capital destacado', this.escapeHtml(c.capitalFilial), {span2:true})}
        ${this.pdfField('Objeto social da filial', this.escapeHtml(c.objetoFilial), {span2:true})}
        ${this.pdfField('Atividade principal (CNAE)', this.escapeHtml(c.cnaePrincipal), {span2:true})}
        ${c.cnaeSecundarios && c.cnaeSecundarios.length ? this.pdfField('Atividades secundárias', '<ul>'+c.cnaeSecundarios.map(a=>`<li>${this.escapeHtml(a)}</li>`).join('')+'</ul>', {span2:true}) : ''}
      </div></fieldset>`;
    } else if(wizard.tipo==='alteracao'){
      sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Dados da empresa</legend><div class="pdf-grid">
        ${this.pdfField('Razão social', this.escapeHtml(c.razaoSocial))}
        ${this.pdfField('Data da deliberação', this.escapeHtml(c.dataDeliberacao))}
      </div></fieldset>`;
      sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Alteração societária</legend><div class="pdf-grid full">
        ${c.altTipo && c.altTipo.length ? this.pdfField('Tipo(s) de alteração', '<ul>'+c.altTipo.map(a=>`<li>${this.escapeHtml(a)}</li>`).join('')+'</ul>', {span2:true}) : ''}
        ${this.pdfField('Descrição', this.escapeHtml(c.descricao), {span2:true})}
        ${this.pdfField('Sócios afetados', this.escapeHtml(c.sociosAfetados), {span2:true})}
      </div></fieldset>`;
    } else if(wizard.tipo==='baixa'){
      sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Dados da empresa</legend><div class="pdf-grid">
        ${this.pdfField('Razão social', this.escapeHtml(c.razaoSocial))}
        ${this.pdfField('Data de encerramento', this.escapeHtml(c.dataEncerramento))}
        ${this.pdfField('Possui débitos pendentes', this.escapeHtml(c.debitos))}
        ${this.pdfField('Responsável pela guarda de documentos', this.escapeHtml(c.responsavelGuarda))}
      </div></fieldset>`;
      sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Encerramento</legend><div class="pdf-grid full">
        ${this.pdfField('Motivo do encerramento', this.escapeHtml(c.motivo), {span2:true})}
        ${this.pdfField('Destino do acervo documental', this.escapeHtml(c.destinoAcervo), {span2:true})}
      </div></fieldset>`;
    } else if(wizard.tipo==='outros'){
      sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Dados da empresa</legend><div class="pdf-grid full">
        ${this.pdfField('Cliente', this.escapeHtml(clienteLabel), {span2:true})}
        ${this.pdfField('Tipo de evento', this.escapeHtml(c.tipoEvento), {span2:true})}
        ${this.pdfField('Descrição', this.escapeHtml(c.descricaoEvento), {span2:true})}
      </div></fieldset>`;
    }

    if(c.grupoEconomico==='Sim'){
      sections += `<fieldset class="pdf-section"><legend class="pdf-section-title">Grupo econômico</legend><div class="pdf-grid">
        ${this.pdfField('Nome do grupo', this.escapeHtml(c.grupoEconomicoNome) || '<span class="muted">não informado</span>')}
        ${this.pdfField('Outras empresas do grupo', this.escapeHtml(c.grupoEconomicoEmpresas))}
      </div></fieldset>`;
    }

    const docs = this.getEffectiveDocs();
    sections += `<fieldset class="pdf-section longa"><legend class="pdf-section-title">Documentos</legend><div class="pdf-grid">
      ${docs.map(d=>this.pdfField(d.label, wizard.docs[d.id] ? '✓ Recebido' : '<span class="pdf-value muted">Pendente</span>')).join('')}
    </div></fieldset>`;

    /* Um quadro sem nenhum campo preenchido vira uma caixa vazia no papel —
       melhor não imprimir. */
    const limpeza = document.createElement('div');
    limpeza.innerHTML = sections;
    limpeza.querySelectorAll('fieldset.pdf-section').forEach(fs=>{
      if(!fs.querySelector('.pdf-field, .pdf-integrante')) fs.remove();
    });
    sections = limpeza.innerHTML;

    const emitidoEm = new Date().toLocaleDateString('pt-BR');
    return `<div class="pdf-doc">
      <table class="pdf-page-table">
        <thead><tr><td>
          <div class="pdf-runhead">
            ${logoSrc?`<img src="${logoSrc}" alt="GS2">`:''}
            <span class="rh-titulo">Resumo Societário</span>
            <span class="rh-empresa">${this.escapeHtml(clienteLabel)}</span>
          </div>
        </td></tr></thead>
        <tfoot><tr><td>
          <div class="pdf-runfoot">
            <span>GS2 Negócios · Processos Societários</span>
            <span>Emitido em ${emitidoEm}</span>
          </div>
        </td></tr></tfoot>
        <tbody><tr><td>
          <div class="pdf-header">${logoSrc?`<img src="${logoSrc}" alt="GS2">`:''}<h1>Resumo do Processo Societário</h1></div>
          <div class="pdf-meta">Cliente: <b>${this.escapeHtml(clienteLabel)}</b> &nbsp;·&nbsp; Tipo de processo: <b>${TIPOS[wizard.tipo]?.label || ''}</b> &nbsp;·&nbsp; Documento gerado em ${emitidoEm}</div>
          ${sections}
          <p class="pdf-footer">Documento gerado pela ferramenta de Processos Societários da GS2 para conferência do cliente. Por favor, confirme se os dados acima estão corretos para seguirmos com o processo.</p>
        </td></tr></tbody>
      </table>
    </div>`;
  },

  /* O nome sugerido no "Salvar como PDF" do navegador vem do título da página,
     então ele é trocado só durante a impressão e devolvido em seguida. */
  nomeArquivoResumo(){
    const empresa = (wizard.clienteNovo ? (wizard.campos.razaoSocial || 'Nova empresa') : (wizard.cliente || 'Empresa')).trim();
    return 'RESUMO SOCIETÁRIO (' + empresa.replace(/[\\/:*?"<>|]/g,'-') + ')';
  },
  gerarPdfResumo(){
    /* O contêiner precisa existir e ser filho direto do body — o CSS de
       impressão esconde tudo que está no body e mostra só ele. Se a
       marcação um dia perder o elemento de novo, cria-se aqui em vez de
       falhar em silêncio, como aconteceu na divisão do arquivo único. */
    let container = document.getElementById('clientePdfDoc');
    if(!container){
      container = document.createElement('div');
      container.id = 'clientePdfDoc';
      document.body.appendChild(container);
    }
    container.innerHTML = this.buildClientSummaryHtml();
    /* recolhe o conteúdo depois da impressão: é dado pessoal dos sócios e
       não precisa ficar no DOM da sessão inteira */

    const tituloOriginal = document.title;
    document.title = this.nomeArquivoResumo();
    const restaurar = () => {
      document.title = tituloOriginal;
      window.removeEventListener('afterprint', restaurar);
      container.innerHTML = '';
    };
    window.addEventListener('afterprint', restaurar);
    setTimeout(restaurar, 60000);   /* rede de segurança se o afterprint não vier */

    window.print();
  },
  copiarResumoCliente(){
    const txt = document.getElementById('clienteResumoText').value;
    const done = ()=>alert('Resumo copiado! Cole no e-mail ou WhatsApp para o cliente.');
    const fail = ()=>alert('Não foi possível copiar automaticamente. Selecione o texto do resumo e copie manualmente (Ctrl+C).');
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(done).catch(fail);
    } else { fail(); }
  },
  toggleAguardaConfirmacao(checked){ wizard.aguardaConfirmacaoCliente = checked; },

  /* ---------- Etapa 6: Junta Comercial — protocolo e documentos ---------- */
  setJuntaProtocolo(v){ wizard.juntaProtocolo = v; },
  setJuntaRequerente(id){ wizard.juntaRequerenteId = id || null; },
  renderJuntaRequerenteSelect(){
    const sel = document.getElementById('juntaRequerente');
    const ativos = REQUERENTES.filter(r=>r.status==='Ativo');
    if(!ativos.length){
      sel.innerHTML = `<option value="">Nenhum requerente cadastrado — peça a um administrador para cadastrar em "Requerentes"</option>`;
      wizard.juntaRequerenteId = null;
      return;
    }
    if(!wizard.juntaRequerenteId || !ativos.find(r=>r.id===wizard.juntaRequerenteId)){
      wizard.juntaRequerenteId = ativos[0].id;
    }
    sel.innerHTML = ativos.map(r=>`<option value="${r.id}" ${r.id===wizard.juntaRequerenteId?'selected':''}>${this.escapeHtml(r.nome)} — CPF ${this.escapeHtml(r.cpf)}</option>`).join('');
  },
  renderJuntaStep(){
    this.renderJuntaRequerenteSelect();
    document.getElementById('juntaProtocolo').value = wizard.juntaProtocolo || '';
    const list = document.getElementById('juntaDocsList');
    list.innerHTML = JUNTA_DOCS.map(d=>{
      const f = wizard.juntaDocs[d.id];
      return `<div class="doc-item">
        <div class="doc-row">
          <div class="doc-info"><div class="name">${d.label}</div></div>
          <div>
            <div class="dropzone ${f?'filled':''}" id="dz-junta-${d.id}" data-action="click-target" data-target="fi-junta-${d.id}">${f ? '✓ '+f.name : 'Arrastar arquivo ou clicar para selecionar'}</div>
            <input type="file" id="fi-junta-${d.id}" style="display:none" data-action="handleJuntaDocFile" data-args='${this.attrJson([d.id])}' data-event="change" data-value-from="files">
          </div>
        </div>
      </div>`;
    }).join('');
    JUNTA_DOCS.forEach(d=>{
      const dz = document.getElementById('dz-junta-'+d.id);
      dz.addEventListener('dragover', e=>{e.preventDefault(); dz.classList.add('drag');});
      dz.addEventListener('dragleave', ()=>dz.classList.remove('drag'));
      dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); this.handleJuntaDocFile(d.id, e.dataTransfer.files); });
    });
    const extra = document.getElementById('juntaExtraDrop'); const extraInput = document.getElementById('juntaExtraFileInput');
    extra.onclick = ()=>extraInput.click();
    extraInput.onchange = ()=>{ this.addJuntaExtraFiles(extraInput.files); };
    extra.addEventListener('dragover', e=>{e.preventDefault(); extra.classList.add('drag');});
    extra.addEventListener('dragleave', ()=>extra.classList.remove('drag'));
    extra.addEventListener('drop', e=>{ e.preventDefault(); extra.classList.remove('drag'); this.addJuntaExtraFiles(e.dataTransfer.files); });
    this.renderJuntaExtraFiles();
    this.renderPrepJunta();
  },

  /* ---------- Preparação para a Junta Comercial ----------
     Mostra, ANTES de abrir o protocolo, se os dados da Viabilidade estão
     completos — foi a lição do primeiro protocolo real: descobrir campo
     faltando no meio do wizard do portal trava o preenchimento. Também é a
     porta por onde a automação da Fase 2 vai entrar: os mesmos dados que hoje
     saem por "Copiar" ou "Baixar JSON" serão os que o robô vai consumir. */
  renderPrepJunta(){
    const box = document.getElementById('prepJuntaBox');
    if(!box) return;
    if(wizard.tipo === 'baixa' || wizard.tipo === 'outros'){ box.innerHTML = ''; return; }

    const p = GS2Redesim.prontidaoViabilidade();
    const a = GS2Redesim.adaptadorDoProcesso();
    const feitos = p.total - p.faltando.length;
    const pct = p.total ? Math.round(feitos * 100 / p.total) : 0;
    const orgao = a ? a.orgao : 'a Junta Comercial';

    const listaFaltas = p.faltando.map(f => `
      <div class="prep-falta">
        <span class="tela">Tela ${f.tela}</span>
        <span><b>${this.escapeHtml(f.campo)}</b>${f._detalhe ? `<span class="n">${this.escapeHtml(f._detalhe)}</span>` : (f.nota ? `<span class="n">${this.escapeHtml(f.nota)}</span>` : '')}</span>
      </div>`).join('');

    box.innerHTML = `
      <div class="panel" style="margin-bottom:18px;">
        <div class="panel-head" style="padding:13px 16px;">
          <h3 class="sec-title">Preparação para ${this.escapeHtml(orgao)}</h3>
          <span class="badge ${p.pronto?'good':'warn'}"><span class="dot"></span>${feitos}/${p.total} campos</span>
        </div>
        <div class="panel-body" style="padding:14px 16px;">
          <div class="prep-cab">
            <div class="prep-barra"><i style="width:${pct}%"></i></div>
            <span style="font-size:12px;color:var(--muted);">${pct}%</span>
          </div>
          ${p.pronto
            ? `<div class="ocr-strip" style="margin:0 0 12px;background:var(--status-good-bg);color:var(--status-good);"><span>✓</span><span class="grow"><b>Dados completos.</b> Dá para abrir a Consulta de Viabilidade sem parar no meio do wizard do portal.</span></div>`
            : `<div class="ocr-strip" style="margin:0 0 12px;background:var(--status-warn-bg);color:var(--status-warn);align-items:flex-start;"><span>⚠️</span><span class="grow"><b>Faltam ${p.faltando.length} campo(s).</b> Levante isto <b>antes</b> de abrir o protocolo — no meio do wizard do portal não dá para voltar sem perder o preenchimento.</span></div>
               <div style="margin-bottom:12px;">${listaFaltas}</div>`}
          <div class="btn-row" style="gap:8px;flex-wrap:wrap;justify-content:flex-start;">
            <button class="btn" data-action="copiarPayloadViabilidade">📋 Copiar dados para o portal</button>
            <button class="btn" data-action="baixarPayloadViabilidade">⬇ Baixar dados (JSON)</button>
            <button class="btn" data-action="verMapaViabilidade">🗺 Ver mapa dos campos</button>
            ${GS2Redesim.automacaoDisponivel()
              ? `<button class="btn dark" data-action="dispararAutomacaoViabilidade">Preencher no portal (automático)</button>`
              : `<span style="font-size:11.5px;color:var(--muted);align-self:center;">Preenchimento automático: Fase 2, ainda não disponível para ${this.escapeHtml(a ? a.orgao : 'este estado')}.</span>`}
          </div>
        </div>
      </div>`;
  },
  textoPayloadViabilidade(){
    return JSON.stringify(GS2Redesim.payloadViabilidade(), null, 2);
  },
  copiarPayloadViabilidade(){
    const t = this.textoPayloadViabilidade();
    const copiar = () => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
      try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(a); };
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(copiar); else copiar();
    alert('Dados da Viabilidade copiados.\n\nÉ o mesmo conteúdo que a automação da Fase 2 vai consumir — por enquanto serve de cola para o preenchimento manual no portal.');
  },
  baixarPayloadViabilidade(){
    const nome = `viabilidade_${(this.nomeClienteAtual()||'processo').replace(/[^a-zA-Z0-9]+/g,'_')}.json`;
    const b = new Blob([this.textoPayloadViabilidade()], {type:'application/json'});
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = nome; a.click();
    setTimeout(()=>URL.revokeObjectURL(u), 1500);
  },
  verMapaViabilidade(){
    const linhas = MAPA_VIABILIDADE.map(m => `
      <div class="prep-falta">
        <span class="tela">Tela ${m.tela}</span>
        <span><b>${this.escapeHtml(m.campo)}${m.obrigatorio?'':' <span style="font-weight:400;color:#9aa8a5;">(opcional)</span>'}</b>
        <span class="n">origem: <code>${this.escapeHtml(m.origem)}</code>${m.nota ? ' · ' + this.escapeHtml(m.nota) : ''}</span></span>
      </div>`).join('');
    document.getElementById('mapaViabConteudo').innerHTML = linhas;
    document.getElementById('mapaViabModal').classList.add('open');
  },
  fecharMapaViabilidade(){ document.getElementById('mapaViabModal').classList.remove('open'); },
  async dispararAutomacaoViabilidade(){
    try{
      const r = await GS2Redesim.protocolarViabilidade(wizard.rascunhoId || 'processo-atual');
      alert('Automação executada.\n\n' + JSON.stringify(r, null, 2));
    }catch(e){
      alert(String(e && e.message || e));
    }
  },

  handleJuntaDocFile(id, files){
    if(!files || !files.length) return;
    /* guarda o File em si — é ele que sobe para o SharePoint ao enviar o processo */
    wizard.juntaDocs[id] = files[0];
    this.renderJuntaStep();
  },
  addJuntaExtraFiles(files){
    Array.from(files||[]).forEach(f=>wizard.juntaExtraFiles.push(f));
    this.renderJuntaExtraFiles();
  },
  renderJuntaExtraFiles(){
    const label = document.getElementById('juntaExtraFilesLabel');
    if(!label) return;
    label.innerHTML = wizard.juntaExtraFiles.map((f,i)=>`<span class="file-chip">${f.name}<span class="x" data-action="removeJuntaExtraFile" data-args='${this.attrJson([i])}'>✕</span></span>`).join('');
  },
  removeJuntaExtraFile(i){ wizard.juntaExtraFiles.splice(i,1); this.renderJuntaExtraFiles(); },

  /* ---------- Etapa 7: RFB — DBE ---------- */
  renderRfbStep(){
    document.getElementById('rfbDbeStatus').value = wizard.rfb.dbeStatus || 'pendente';
    const f = wizard.rfb.dbeDeferidaArquivo;
    const dz = document.getElementById('dz-dbeDeferida');
    dz.className = 'dropzone' + (f ? ' filled' : '');
    dz.textContent = f ? '✓ '+f.name : 'Arrastar arquivo ou clicar para selecionar';
  },
  setRfbDbeStatus(v){ wizard.rfb.dbeStatus = v; },
  handleDbeDeferidaFile(files){
    if(!files || !files.length) return;
    wizard.rfb.dbeDeferidaArquivo = files[0];
    this.renderRfbStep();
  },

  /* ---------- Etapa 8: Licenciamentos ---------- */
  renderLicenciamentosStep(){
    const list = document.getElementById('licenciamentosList');
    list.innerHTML = LICENCIAMENTOS_ITEMS.map(item=>{
      const st = wizard.licenciamentos[item.id] || {na:false, arquivo:null};
      const f = st.arquivo;
      return `<div class="doc-item">
        <div class="doc-row">
          <div class="doc-info"><div class="name">${item.label}</div></div>
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <label class="check-item" style="cursor:pointer;">
              <input type="checkbox" ${st.na?'checked':''} data-action="toggleLicenciamentoNA" data-args='${this.attrJson([item.id])}' data-event="change" data-value-from="checked"> Não se aplica a este processo
            </label>
            ${st.na ? '' : `<div>
              <div class="dropzone ${f?'filled':''}" id="dz-lic-${item.id}" data-action="click-target" data-target="fi-lic-${item.id}">${f ? '✓ '+f.name : 'Arrastar arquivo ou clicar para selecionar'}</div>
              <input type="file" id="fi-lic-${item.id}" style="display:none" data-action="handleLicenciamentoFile" data-args='${this.attrJson([item.id])}' data-event="change" data-value-from="files">
            </div>`}
          </div>
        </div>
      </div>`;
    }).join('');
    LICENCIAMENTOS_ITEMS.forEach(item=>{
      const st = wizard.licenciamentos[item.id] || {na:false, arquivo:null};
      if(st.na) return;
      const dz = document.getElementById('dz-lic-'+item.id);
      if(!dz) return;
      dz.addEventListener('dragover', e=>{e.preventDefault(); dz.classList.add('drag');});
      dz.addEventListener('dragleave', ()=>dz.classList.remove('drag'));
      dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); this.handleLicenciamentoFile(item.id, e.dataTransfer.files); });
    });
  },
  toggleLicenciamentoNA(id, checked){
    if(!wizard.licenciamentos[id]) wizard.licenciamentos[id] = {na:false, arquivo:null};
    wizard.licenciamentos[id].na = checked;
    if(checked) wizard.licenciamentos[id].arquivo = null;
    this.renderLicenciamentosStep();
  },
  handleLicenciamentoFile(id, files){
    if(!files || !files.length) return;
    if(!wizard.licenciamentos[id]) wizard.licenciamentos[id] = {na:false, arquivo:null};
    wizard.licenciamentos[id].arquivo = files[0];
    this.renderLicenciamentosStep();
  },
  /* ======================================================================
     DADOS QUE ALIMENTAM O CONTRATO
     Os modelos construídos a partir das alterações reais usam campos
     compostos — a qualificação completa de cada sócio, o quadro de quotas, a
     lista de CNAEs. Eles são MONTADOS aqui a partir do que o wizard coletou,
     na mesma redação que os documentos registrados usam. Sem isso o modelo
     abriria cheio de {{placeholder}} pendente, que é o que acontecia antes.
     ====================================================================== */
  dataBr(iso){
    if(!iso) return '';
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso;
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
  },
  dataPorExtenso(iso){
    const br = this.dataBr(iso);
    const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(!m) return br;
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return `${+m[1]} de ${meses[+m[2]-1]} de ${m[3]}`;
  },
  /* Qualificação no padrão dos contratos registrados: nome, nacionalidade,
     estado civil (com regime, quando casado), nascimento, naturalidade, RG,
     CPF e endereço completo. O que faltar simplesmente não entra na frase. */
  qualificacaoPessoa(pessoa, ehRep){
    if(!pessoa) return '';
    const doc = ehRep ? pessoa.cpf : (pessoa.documento !== undefined ? pessoa.documento : pessoa.cpf);
    if(pessoa.tipo === 'PJ'){
      return `${(pessoa.nome||'(razão social pendente)').toUpperCase()}, sociedade empresária limitada, inscrita no CNPJ sob o nº ${doc||'(CNPJ pendente)'}, com sede em ${this.enderecoTexto(pessoa.endereco) || '(endereço pendente)'}` +
        ((pessoa.representantes||[]).length
          ? `, neste ato representada por ${pessoa.representantes.map(r=>this.qualificacaoPessoa(r, true)).join('; e ')}`
          : '');
    }
    const civil = pessoa.estadoCivil
      ? (this.exigeRegimeBens(pessoa.estadoCivil) && pessoa.regimeBens
          ? `${pessoa.estadoCivil.toLowerCase()} sob o regime de ${pessoa.regimeBens.toLowerCase()}`
          : pessoa.estadoCivil.toLowerCase())
      : '';
    const partes = [
      'brasileiro(a)',
      civil,
      pessoa.nascimento ? `nascido(a) em ${this.dataBr(pessoa.nascimento)}` : '',
      pessoa.naturalidade ? `natural de ${pessoa.naturalidade}` : '',
      pessoa.rg ? `portador(a) do RG nº ${pessoa.rg}` : '',
      doc ? `inscrito(a) no CPF sob o nº ${doc}` : '',
      this.enderecoTexto(pessoa.endereco) ? `residente e domiciliado(a) em ${this.enderecoTexto(pessoa.endereco)}` : ''
    ].filter(Boolean);
    return `${(pessoa.nome||'(nome pendente)').toUpperCase()}, ${partes.join(', ')}`;
  },
  montarQualificacaoSocios(){
    const lista = (wizard.socios||[]).map(s=>this.qualificacaoPessoa(s, false)).filter(Boolean);
    return lista.length ? lista.join(';\n\n') + '.' : '';
  },
  /* Capital → quotas. O padrão do acervo é quota de R$ 1,00, então a
     quantidade de quotas é o próprio capital em reais. */
  numeroDeTexto(v){
    const n = parseFloat(String(v||'').replace(/\./g,'').replace(',','.'));
    return isNaN(n) ? 0 : n;
  },
});
