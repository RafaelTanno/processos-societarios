/* O objeto App — parte 6 de 6: contrato, envio do processo e área de administração. */

Object.assign(App, {
  montarQuadroQuotas(){
    const capital = this.numeroDeTexto(wizard.campos.capital);
    if(!capital) return '';
    const socios = (wizard.socios||[]).filter(s=>s.nome);
    if(!socios.length) return '';
    const linhas = socios.map(s=>{
      const perc = this.numeroDeTexto(s.perc) || (100/socios.length);
      const quotas = Math.round(capital * perc / 100);
      return `${(s.nome||'').toUpperCase()} — ${perc.toLocaleString('pt-BR')}% — ${quotas.toLocaleString('pt-BR')} quotas — R$ ${quotas.toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
    });
    linhas.push(`TOTAL — 100% — ${capital.toLocaleString('pt-BR')} quotas — R$ ${capital.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
    return linhas.join('\n');
  },
  montarAdministradores(){
    const admins = (wizard.administradores||[]).filter(a=>a.nome);
    if(!admins.length) return '';
    return admins.map(a=>{
      const q = this.qualificacaoPessoa(a, true);
      const cargo = a.cargo ? ` (${a.cargo})` : '';
      const vinculo = a.origem ? '' : ', na qualidade de administrador(a) não sócio(a), designado(a) nos termos do art. 1.061 do Código Civil';
      return q + cargo + vinculo;
    /* sem ponto final: nos modelos o valor entra no meio da frase
       ("será exercida por {{administradores}}, que agirão…") */
    }).join(';\n\n');
  },
  montarListaCnaes(){
    const c = wizard.campos;
    const todos = [c.cnaePrincipal].concat(c.cnaeSecundarios||[]).filter(Boolean);
    return todos.map(a=>`CNAE ${a};`).join('\n');
  },
  montarObjetoSocial(){
    const c = wizard.campos;
    if(c.objetoFilial) return c.objetoFilial;
    const todos = [c.cnaePrincipal].concat(c.cnaeSecundarios||[]).filter(Boolean);
    /* o objeto social é a descrição das atividades, sem os códigos — é assim
       que o portal da Junta gera e é assim que vai para o contrato */
    return todos.map(a=>{
      const i = a.indexOf(' - ');
      return (i > -1 ? a.slice(i+3) : a).trim();
    }).join(', ').toLowerCase();
  },
  montarAssinaturas(){
    const nomes = (wizard.socios||[]).filter(s=>s.nome).map(s=>`${s.nome.toUpperCase()}\n${s.tipo==='PJ'?'Sócia cotista':'Sócio(a) cotista'}`);
    (wizard.administradores||[]).filter(a=>a.nome && !a.origem).forEach(a=>{
      nomes.push(`${a.nome.toUpperCase()}\n${a.cargo || 'Administrador(a)'}`);
    });
    return nomes.join('\n\n_________________________________\n\n');
  },
  buildContractData(){
    const c = wizard.campos;
    const socio0 = wizard.socios[0] || {};
    const capital = this.numeroDeTexto(c.capital);
    const endereco = c.endereco || {};
    const cidadeUf = [endereco.municipio, endereco.uf].filter(Boolean).join('/');
    const filiais = (c.nomeFilial && c.endereco)
      ? `FILIAL — ${c.nomeFilial}, com sede em ${this.enderecoCompleto()}.` : '';

    return {
      /* identificação */
      razao_social: c.razaoSocial || wizard.cliente || '',
      nova_razao_social: c.razaoSocial || '',
      nome_fantasia: c.nomeFantasia || c.nomeFantasiaFilial || '',
      cnpj: c.cnpjMatriz || ((CLIENTES_DETALHE[wizard.cliente]||{}).dadosCnpj||{}).cnpj || '',
      nire: c.nireMatriz || ((CLIENTES_DETALHE[wizard.cliente]||{}).dadosCnpj||{}).nire || '',
      uf_junta: endereco.uf || 'Mato Grosso',
      numero_alteracao: c.numeroAlteracao || '',

      /* pessoas */
      qualificacao_socios: this.montarQualificacaoSocios(),
      administradores: this.montarAdministradores(),
      forma_assinatura: c.formaAssinatura || 'isoladamente',
      assinaturas: this.montarAssinaturas(),
      nome_socio: socio0.nome || '',
      cpf_socio: socio0.documento || '',

      /* endereço e atividades */
      endereco_sede: this.enderecoCompleto(),
      endereco_filial: this.enderecoCompleto(),
      lista_filiais: filiais,
      objeto_social: this.montarObjetoSocial(),
      objeto_filial: c.objetoFilial || this.montarObjetoSocial(),
      lista_cnaes: this.montarListaCnaes(),
      cnaes_filial: this.montarListaCnaes(),
      cnae_principal: c.cnaePrincipal || '',
      nome_filial: c.nomeFilial || '',

      /* capital */
      capital_social: c.capital ? 'R$ ' + c.capital : '',
      capital_atual: c.capitalAtual ? 'R$ ' + c.capitalAtual : '',
      quantidade_quotas: capital ? capital.toLocaleString('pt-BR') : '',
      valor_quota: capital ? 'R$ 1,00 (um real)' : '',
      quadro_quotas: this.montarQuadroQuotas(),

      /* prazos, foro e datas */
      data_inicio_atividades: this.dataBr(c.dataPrevista) || 'a data do registro deste ato',
      data_deliberacao: this.dataPorExtenso(c.dataDeliberacao) || this.dataPorExtenso(c.dataPrevista) || '',
      comarca_foro: endereco.municipio || '',
      cidade_uf: cidadeUf,
      enquadramento: c.viabEnquadramento || '',

      /* cessão de quotas */
      socio_retirante: (wizard.socios.find(s=>/retirante|sa[ií]da/i.test(s.cargo||''))||{}).nome || '',
      socio_ingressante: (wizard.socios.find(s=>/ingressante|entrada/i.test(s.cargo||''))||{}).nome || '',
      quotas_cedidas: '',
      valor_cessao: '',

      /* demais tipos */
      alt_tipo: (c.altTipo||[]).join(', '),
      socios_afetados: c.sociosAfetados || '',
      data_encerramento: this.dataBr(c.dataEncerramento) || '',
      motivo: c.motivo || ''
    };
  },
  renderContractPreview(){
    const sel = document.getElementById('tplSelect');
    const box = document.getElementById('contractPreview');
    if(sel.value === 'CLIENTE_MINUTA'){
      box.innerHTML = `<p style="margin:0 0 10px;"><b>📄 Minuta própria do cliente:</b> ${wizard.minutaArquivo ? this.escapeHtml(wizard.minutaArquivo.name) : '(arquivo não enviado)'}</p>
        <p style="margin:0;color:var(--muted);">Na versão integrada, o backend abre este arquivo, localiza as tags <code>{{...}}</code> nele e mescla com os dados do processo abaixo — sem usar um modelo da biblioteca padrão.</p>
        <div class="review-grid" style="margin-top:12px;">${Object.entries(this.buildContractData()).filter(([k,v])=>v).map(([k,v])=>`<div><span>${this.escapeHtml(k)}</span>${this.escapeHtml(v)}</div>`).join('') || '<div style="color:#9aa8a5">Nenhum dado preenchido ainda.</div>'}</div>`;
      return;
    }
    const tpl = TEMPLATES.find(t=>t.id===sel.value);
    if(!tpl){ box.textContent = 'Nenhum modelo selecionado.'; return; }
    const data = this.buildContractData();
    let txt = tpl.texto.replace(/\{\{(\w+)\}\}/g, (m,key)=>{
      const v = data[key];
      return v ? `<span class="filled">${this.escapeHtml(v)}</span>` : `<mark>[[${this.escapeHtml(key)} — pendente]]</mark>`;
    });
    box.innerHTML = txt;
  },
  gerarContrato(){
    const sel = document.getElementById('tplSelect');
    const cliente = wizard.clienteNovo ? (wizard.campos.razaoSocial || 'nova_empresa') : wizard.cliente;
    let nomeModelo;
    if(sel.value === 'CLIENTE_MINUTA'){
      if(!wizard.minutaArquivo){ alert('Envie a minuta própria do cliente no passo 1 antes de gerar o contrato.'); return; }
      nomeModelo = 'Minuta_propria_' + wizard.minutaArquivo.name.replace(/\.[^.]+$/,'');
    } else {
      const tpl = TEMPLATES.find(t=>t.id===sel.value);
      if(!tpl){ alert('Selecione um modelo de contrato.'); return; }
      nomeModelo = tpl.nome;
    }
    const dest = this.destinoDocumento('contratoGerado', cliente, nomeModelo + '.docx');
    alert(`Contrato gerado (simulado).\n\nNa versão integrada este arquivo é salvo via Microsoft Graph em:\n\n/sites/clientes/Documentos Compartilhados/${cliente || '(nova empresa)'}/${dest.pasta}/\n\ncom o nome no padrão do acervo:\n${dest.arquivo}\n\nModelo usado: ${nomeModelo}`);
  },

  /* ---------- Wizard nav ---------- */
  renderStepper(){
    const labels = ['Tipo','Cliente','Dados','Documentos','Revisão','Junta Comercial','RFB','Licenciamentos'];
    const stepper = document.getElementById('stepper');
    const pulaCliente = wizard.tipo==='abertura';
    stepper.innerHTML = labels.map((l,i)=>{
      const n=i+1; let cls = n===wizard.step?'active':(n<wizard.step?'done':'');
      const auto = pulaCliente && n===2;
      const rotulo = auto ? 'Cliente (nova empresa)' : l;
      const sep = n<labels.length ? '<div class="step-sep"></div>' : '';
      const num = auto ? '✓' : (n<wizard.step?'✓':n);
      return `<div class="step-pill ${cls}" ${auto?'title="Abertura de Empresa é sempre empresa nova — este passo é automático"':''}><span class="num">${num}</span>${rotulo}</div>${sep}`;
    }).join('');
  },
  showStep(n){
    document.querySelectorAll('.wizard-step').forEach(s=>s.classList.remove('active'));
    document.getElementById('step-'+n).classList.add('active');
    wizard.step = n; this.renderStepper(); this.salvarRascunho(false);
    document.getElementById('btnBack').style.visibility = n===1 ? 'hidden' : 'visible';
    document.getElementById('btnNext').textContent = n===8 ? 'Enviar processo ✓' : 'Avançar →';
    if(n===1) this.renderTipoGrid();
    if(n!==2){ const cm = document.getElementById('clienteModal'); if(cm) cm.classList.remove('open'); }
    if(n===2){
      this.renderClientList('');
      /* nada escolhido ainda: a caixa de seleção já abre, porque é a única
         coisa que falta decidir nesta etapa */
      if(!wizard.cliente && !wizard.clienteNovo) this.abrirClienteModal();
    }
    if(n===3) this.renderDynamicFields();
    if(n===4) this.renderDocsList();
    if(n===5) this.renderReview();
    if(n===6) this.renderJuntaStep();
    if(n===7) this.renderRfbStep();
    if(n===8) this.renderLicenciamentosStep();
  },
  nextStep(){
    if(wizard.step===1 && !wizard.tipo){ alert('Selecione o tipo de processo para continuar.'); return; }
    /* Abertura de Empresa é sempre empresa nova: não há cliente a escolher, então
       o passo 2 é resolvido automaticamente e o wizard vai direto para os dados. */
    if(wizard.step===1 && wizard.tipo==='abertura'){
      wizard.cliente = null; wizard.clienteNovo = true;
      wizard.minutaPropria = false; wizard.minutaArquivo = null;
      this.showStep(3); return;
    }
    if(wizard.step===2 && !wizard.cliente && !wizard.clienteNovo){ alert('Selecione um cliente (ou "Cadastrar nova empresa") para continuar.'); return; }
    if(wizard.step===2 && wizard.tipo==='abertura' && !wizard.clienteNovo){
      alert('Abertura de Empresa exige uma empresa nova.\n\nEscolha "Cadastrar nova empresa" nesta lista.');
      return;
    }
    if(wizard.step<8){ this.showStep(wizard.step+1); return; }
    this.submitProcesso();   /* assíncrono: espera a gravação antes de descartar o rascunho */
  },
  prevStep(){
    /* Na Abertura o passo 2 é automático — voltar de "Dados" leva direto ao Tipo. */
    if(wizard.step===3 && wizard.tipo==='abertura'){ this.showStep(1); return; }
    if(wizard.step>1) this.showStep(wizard.step-1);
  },
  /* Alimenta a base de pessoas da GS2 com todo mundo que passou por este processo (sócios PF,
     representantes legais de sócios PJ, administradores) — assim, da próxima vez que o mesmo CPF
     aparecer (neste ou em outro processo), o endereço/contato já vem preenchido automaticamente. */
  atualizarBaseDePessoas(){
    (wizard.socios||[]).forEach(s=>{
      if(s.tipo==='PF' && s.documento){ this.salvarPessoaNaBase(s.nome, s.documento, s.endereco, s.contato, s); }
      if(s.tipo==='PJ'){ (s.representantes||[]).forEach(r=>{ if(r.cpf) this.salvarPessoaNaBase(r.nome, r.cpf, r.endereco, r.contato, r); }); }
    });
    (wizard.administradores||[]).forEach(a=>{ if(a.cpf) this.salvarPessoaNaBase(a.nome, a.cpf, a.endereco, a.contato); });
  },
  async submitProcesso(){
    const licStates = LICENCIAMENTOS_ITEMS.map(item => wizard.licenciamentos[item.id] || {na:false, arquivo:null});
    const licDone = licStates.filter(s=>s.na || s.arquivo).length;
    const licStatus = licDone===0 ? "pendente" : (licDone===licStates.length ? "concluido" : "andamento");
    const requerente = wizard.juntaRequerenteId ? REQUERENTES.find(r=>r.id===wizard.juntaRequerenteId) : null;
    this.atualizarBaseDePessoas();
    PROCESSOS.unshift({
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2,8),
      cliente: wizard.clienteNovo ? (wizard.campos.razaoSocial || 'Nova empresa (sem razão social definida)') : wizard.cliente,
      tipo: wizard.tipo, data: new Date().toLocaleDateString('pt-BR'), status:'analise', resp:'Você',
      socios: JSON.parse(JSON.stringify(wizard.socios||[])),
      administradores: JSON.parse(JSON.stringify(wizard.administradores||[])),
      jucemat:{
        viabilidade: wizard.juntaDocs.viabilidade ? "concluido" : "pendente",
        dbe: wizard.rfb.dbeStatus || "pendente",
        fcn: wizard.juntaDocs.fcn ? "concluido" : "pendente",
        pagamento:"pendente",
        registro: wizard.juntaDocs.contratoSocialChancelado ? "concluido" : "pendente",
        licenciamentos: licStatus,
        protocolo: wizard.juntaProtocolo || "",
        requerenteId: wizard.juntaRequerenteId || null,
        requerenteNome: requerente ? requerente.nome : ""
      },
      juntaExtraFiles: wizard.juntaExtraFiles.slice(),
      dbeDeferidaArquivo: wizard.rfb.dbeDeferidaArquivo,
      licenciamentosDocs: JSON.parse(JSON.stringify(wizard.licenciamentos)),
      aguardaConfirmacaoCliente: wizard.aguardaConfirmacaoCliente,
      proprietarioNotificado:false
    });
    /* Grava o processo no banco ANTES de qualquer outra coisa, e espera.
       Sem o await, o rascunho era descartado logo em seguida enquanto a
       gravação ainda estava no ar — e se ela falhasse, ou se não houvesse
       banco, o preenchimento inteiro ia embora com a tela dizendo
       "Processo enviado!". */
    const processoNovo = PROCESSOS[0];
    await GS2Api.salvarProcesso(processoNovo);
    /* gatilho: daqui a automação da Fase 2 acorda para preparar a Viabilidade */
    GS2Redesim.emitir('processo.enviado', {cliente: this.nomeClienteAtual(), tipo: wizard.tipo});
    if(GS2Redesim.prontidaoViabilidade().pronto){
      GS2Redesim.emitir('viabilidade.pronta', {cliente: this.nomeClienteAtual(), payload: GS2Redesim.payloadViabilidade()});
    }

    if(GS2SP.disponivel()){
      const btn = document.getElementById('btnNext');
      const rotulo = btn ? btn.textContent : '';
      if(btn){ btn.disabled = true; btn.textContent = 'Gravando no SharePoint…'; }
      this.gravarProcessoNoSharePoint()
        .then(r => alert('Processo enviado! Ele já aparece em "Meus Processos" com status "Em análise".\n\n' + this.relatoGravacao(r)))
        .catch(e => alert('Processo registrado, mas a gravação no SharePoint falhou:\n\n' + (e && e.message || e)))
        .finally(() => {
          if(btn){ btn.disabled = false; btn.textContent = rotulo; }
          this.encerrarRascunhoDoEnvio(processoNovo);
          this.navigate('processos');
        });
      return;
    }
    alert(this.montarRelatorioSharePoint());
    this.encerrarRascunhoDoEnvio(processoNovo);
    this.navigate('processos');
  },

  /* O rascunho é a ÚNICA cópia do que a pessoa digitou. Só pode ser
     apagado depois que o processo estiver guardado no banco. Se a API
     estiver fora, o certo é dizer isso e manter o rascunho — perder o
     trabalho de quem preencheu é o pior desfecho possível. */
  encerrarRascunhoDoEnvio(p){
    if(p && p._persistido){ this.descartarRascunho(); return; }
    alert('ATENÇÃO: o processo NÃO foi gravado no banco — ele existe apenas nesta aba.\n\n' +
          'O rascunho foi mantido de propósito: se você recarregar a página, use "Retomar de onde parei" ' +
          'e envie de novo quando o selo do topo voltar ao normal.');
  },

  /* Todos os arquivos anexados ao longo do wizard, com o objeto File de verdade
     (quando existe) — é a mesma lista usada pelo relatório e pelo envio real ao
     SharePoint, para que o que é mostrado seja exatamente o que é gravado. */
  coletarAnexos(){
    const anexos = [];
    /* só entra como "arquivo" o que realmente é um arquivo do navegador — um
       rascunho retomado traz cascas de objeto que não dá para enviar */
    const bin = v => (typeof Blob !== 'undefined' && v instanceof Blob) ? v : null;
    Object.keys(wizard.docs||{}).forEach(id=>{ if(wizard.docs[id]) anexos.push({id:id, nome:wizard.docs[id].name, arquivo:bin(wizard.docs[id])}); });
    if(wizard.minutaArquivo) anexos.push({id:'minuta', nome:wizard.minutaArquivo.name, arquivo:bin(wizard.minutaArquivo)});
    /* "Documentos adicionais" ficavam de fora da lista — sumiam sem
       aparecer nem entre as falhas. */
    (wizard.extraFiles||[]).forEach((f,i)=>{ if(f) anexos.push({id:'extra'+i, nome:f.name, arquivo:bin(f)}); });
    Object.keys(wizard.juntaDocs||{}).forEach(id=>{ if(wizard.juntaDocs[id]) anexos.push({id:id, nome:wizard.juntaDocs[id].name, arquivo:bin(wizard.juntaDocs[id])}); });
    if(wizard.rfb && wizard.rfb.dbeDeferidaArquivo) anexos.push({id:'dbe', nome:wizard.rfb.dbeDeferidaArquivo.name, arquivo:bin(wizard.rfb.dbeDeferidaArquivo)});
    /* CNH anexada na etapa de dados, tanto do sócio pessoa física quanto de cada
       representante legal de sócio pessoa jurídica */
    const anexarCnh = pessoa => {
      if(pessoa && pessoa.cnh && pessoa.cnh.arquivo){
        anexos.push({id:'cnhSocio', nome:pessoa.cnh.arquivo, arquivo:bin(pessoa.cnh.file),
                     destino:{pasta:pessoa.cnh.destinoPasta, arquivo:pessoa.cnh.destinoArquivo}});
      }
    };
    (wizard.socios||[]).forEach(so=>{
      anexarCnh(so);
      (so.representantes||[]).forEach(anexarCnh);
    });
    Object.keys(wizard.licenciamentos||{}).forEach(id=>{
      const l = wizard.licenciamentos[id];
      if(l && l.arquivo) anexos.push({id:id, nome:l.arquivo.name, arquivo:bin(l.arquivo)});
    });
    return anexos;
  },

  /* ---------- Gravação real no SharePoint (Microsoft Graph, conta do usuário) ----------
     Só roda quando a ferramenta está conectada. Cria a pasta do cliente com a
     estrutura padrão (quando é empresa nova) e envia cada anexo para a subpasta
     definida em DESTINO_DOCUMENTOS, com o nome no padrão do acervo. Devolve um
     relato do que deu certo e do que falhou — nada é escondido do usuário. */
  async gravarProcessoNoSharePoint(){
    const cli = this.nomeClienteAtual();
    const relato = {cliente: cli, pastasCriadas: [], enviados: [], falhas: []};
    if(!cli){ relato.falhas.push({nome:'(processo)', erro:'Sem razão social/cliente definido — não há pasta de destino.'}); return relato; }

    if(wizard.clienteNovo){
      try{
        relato.pastasCriadas = await GS2SP.criarEstruturaCliente(cli, ESTRUTURA_PASTAS_PADRAO);
      }catch(e){
        relato.falhas.push({nome:'(estrutura de pastas)', erro:e.message});
        return relato;
      }
    }

    for(const a of this.coletarAnexos()){
      const d = a.destino || this.destinoDocumento(a.id, cli, a.nome);
      const caminho = `${cli}/${d.pasta}`;
      if(!a.arquivo){
        relato.falhas.push({nome:a.nome, erro:'o arquivo não está mais em memória (a página foi recarregada) — anexe de novo'});
        continue;
      }
      try{
        await GS2SP.garantirCaminho(caminho);
        await GS2SP.enviarArquivo(caminho, d.arquivo, a.arquivo);
        relato.enviados.push({nome:d.arquivo, pasta:caminho});
      }catch(e){
        relato.falhas.push({nome:a.nome, erro:e.message});
      }
    }
    return relato;
  },

  relatoGravacao(r){
    let t = `━━ SHAREPOINT (gravação real) ━━\n/sites/clientes/Documentos Compartilhados/${r.cliente}/\n`;
    if(r.pastasCriadas.length) t += `\nEstrutura padrão criada: ${r.pastasCriadas.length} subpastas.\n`;
    if(r.enviados.length){
      t += `\n${r.enviados.length} documento(s) gravado(s):\n`;
      r.enviados.forEach(e=>{ t += `  ✓ ${e.pasta}/${e.nome}\n`; });
    }
    if(r.falhas.length){
      t += `\n${r.falhas.length} documento(s) NÃO gravado(s):\n`;
      r.falhas.forEach(f=>{ t += `  ✗ ${f.nome} — ${f.erro}\n`; });
      t += `\nO processo foi registrado assim mesmo. Corrija o que falhou e anexe de novo.\n`;
    }
    if(!r.enviados.length && !r.falhas.length) t += '\nNenhum arquivo anexado neste processo.\n';
    return t;
  },

  /* Relatório do que a ferramenta grava no SharePoint ao enviar o processo:
     criação da pasta do cliente + estrutura padrão (quando empresa nova) e o
     destino de cada documento anexado. Fase 1: simulado; Fase integrada: cada
     linha vira uma chamada à Microsoft Graph API com a conta do colaborador. */
  montarRelatorioSharePoint(){
    const cli = this.nomeClienteAtual();
    const base = `/sites/clientes/Documentos Compartilhados/${cli}`;
    let txt = 'Processo enviado! Ele já aparece em "Meus Processos" com status "Em análise".\n\n';

    if(wizard.clienteNovo){
      const pastas = this.listarPastasPadrao();
      const st = wizard.pastaSharePoint;
      if(st && st.criada){
        txt += `━━ PASTA DO CLIENTE ━━\n${base}/\n`;
        txt += `Já criada em ${st.criadaEm} por ${st.criadaPor}, com as ${pastas.length} subpastas da estrutura padrão.\n\n`;
      } else {
        txt += `━━ PASTA DO CLIENTE CRIADA AGORA ━━\n${base}/\n\n`;
        txt += `Estrutura padrão replicada (${pastas.length} subpastas):\n`;
        txt += pastas.map(p=>'  • '+p).join('\n') + '\n\n';
      }
    } else {
      txt += `━━ PASTA DO CLIENTE (já existente) ━━\n${base}/\n\n`;
    }

    const anexos = this.coletarAnexos();

    if(anexos.length){
      txt += `━━ DOCUMENTOS ARQUIVADOS (${anexos.length}) ━━\n`;
      anexos.forEach(a=>{
        const d = a.destino || this.destinoDocumento(a.id, cli, a.nome);
        txt += `\n${a.nome}\n  → ${d.pasta}/\n  → salvo como: ${d.arquivo}\n`;
      });
    } else {
      txt += '━━ DOCUMENTOS ━━\nNenhum arquivo anexado neste processo.\n';
    }

    txt += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nATENÇÃO: nada acima foi gravado no SharePoint.\n\n' +
           'A ferramenta está em modo demonstração (' + GS2Auth.motivoDemo() + ')\n' +
           'Conectada ao Microsoft 365, cada linha desta lista vira uma gravação real, feita com a conta de quem está logado — então a permissão de cada pasta é respeitada.';
    return txt;
  },

  /* ---------- Dashboard ---------- */
  renderDashboard(){
    const total = PROCESSOS.length;
    const aguardando = PROCESSOS.filter(p=>p.status==='documentos').length;
    const andamento = PROCESSOS.filter(p=>p.status==='andamento'||p.status==='analise').length;
    const concluidos = PROCESSOS.filter(p=>p.status==='concluido').length;
    const bs = document.getElementById('bannerSemente');
    if(bs && GS2Api.disponivel) this.renderBannerSemente();
    document.getElementById('kpiRow').innerHTML = `
      <div class="kpi"><div class="lbl">Processos</div><div class="val">${total}</div><div class="sub">Todos os tipos, inclusive concluídos</div></div>
      <div class="kpi"><div class="lbl">Em andamento</div><div class="val">${andamento}</div><div class="sub">Em análise ou em andamento</div></div>
      <div class="kpi"><div class="lbl">Aguardando documentos</div><div class="val">${aguardando}</div><div class="sub">Pendência do cliente</div></div>
      <div class="kpi"><div class="lbl">Concluídos</div><div class="val">${concluidos}</div><div class="sub">Desde sempre</div></div>`;
    document.getElementById('dashTable').innerHTML = `<thead><tr><th>Cliente</th><th>Tipo</th><th>Data</th><th>Status</th><th>Responsável</th></tr></thead><tbody>${PROCESSOS.slice(0,5).map(p=>this.rowHtml(p)).join('')}</tbody>`;
  },
  rowHtml(p){
    const st = STATUS_META[p.status];
    return `<tr><td>${this.escapeHtml(p.cliente)}</td><td>${this.escapeHtml(TIPOS[p.tipo]?.label||p.tipo)}</td><td>${this.escapeHtml(p.data)}</td><td><span class="badge ${st.cls}"><span class="dot"></span>${st.label}</span></td><td>${this.escapeHtml(p.resp)}</td></tr>`;
  },
  jucematBadge(j){
    if(!j) return '<span class="badge warn"><span class="dot"></span>Não iniciado</span>';
    const vals = JUCEMAT_STEPS.map(s=>j[s.key]);
    if(vals.some(v=>v==='indeferido')) return '<span class="badge crit"><span class="dot"></span>Viabilidade indeferida</span>';
    const relevant = vals.filter(v=>v!=='na');
    const done = relevant.filter(v=>v==='concluido').length;
    if(relevant.length && done===relevant.length) return '<span class="badge good"><span class="dot"></span>Concluído</span>';
    if(done===0 && !relevant.some(v=>v==='andamento')) return '<span class="badge warn"><span class="dot"></span>Não iniciado</span>';
    return `<span class="badge info"><span class="dot"></span>Em andamento (${done}/${relevant.length})</span>`;
  },
  jucematStarted(j){
    if(!j) return false;
    return JUCEMAT_STEPS.some(s=> j[s.key] && j[s.key]!=='na' && j[s.key]!=='pendente');
  },
  rowHtmlFull(p){
    const st = STATUS_META[p.status];
    return `<tr>
      <td>${this.escapeHtml(p.cliente)}</td><td>${this.escapeHtml(TIPOS[p.tipo]?.label||p.tipo)}</td><td>${this.escapeHtml(p.data)}</td>
      <td><span class="badge ${st.cls}"><span class="dot"></span>${st.label}</span></td>
      <td>${this.escapeHtml(p.resp)}</td>
      <td>${this.jucematBadge(p.jucemat)} ${p.proprietarioNotificado ? '<span title="Proprietário notificado">✉️</span>' : ''}</td>
      <td><button class="btn ghost" data-action="openJucematModal" data-args='${this.attrJson([p.id])}'>Acompanhar</button></td>
    </tr>`;
  },
  renderProcessosTable(){
    const tipoF = document.getElementById('filterTipo')?.value||''; const statusF = document.getElementById('filterStatus')?.value||''; const buscaF=(document.getElementById('filterBusca')?.value||'').toLowerCase();
    const filtered = PROCESSOS.filter(p=>(!tipoF||p.tipo===tipoF)&&(!statusF||p.status===statusF)&&(!buscaF||p.cliente.toLowerCase().includes(buscaF)));
    const table = document.getElementById('processosTable');
    if(!filtered.length){ table.innerHTML = `<tbody><tr><td><div class="empty-state"><div class="ic">📭</div>Nenhum processo encontrado com esses filtros.</div></td></tr></tbody>`; return; }
    table.innerHTML = `<thead><tr><th>Cliente</th><th>Tipo</th><th>Data</th><th>Status</th><th>Responsável</th><th>Junta Comercial</th><th></th></tr></thead><tbody>${filtered.map(p=>this.rowHtmlFull(p)).join('')}</tbody>`;
  },

  /* ---------- Templates ---------- */
  renderTemplates(){
    const grid = document.getElementById('tplGrid');
    grid.innerHTML = TEMPLATES.map(t=>{
      /* tipo desconhecido não pode derrubar a tela inteira */
      const tp = TIPOS[t.tipo] || {ic:'📄', label:t.tipo || 'Sem tipo'};
      return `
      <div class="tpl-card">
        <div class="tpl-tipo">${tp.ic} ${this.escapeHtml(tp.label)}</div>
        <h4>${this.escapeHtml(t.nome)}</h4>
        <div class="meta">${this.escapeHtml(t.arquivo)} · adicionado em ${this.escapeHtml(t.data)}</div>
        ${t.origem ? `<div class="tpl-origem">📚 ${this.escapeHtml(t.origem)} · <b>anonimizado</b>: nenhum dado de empresa, sócio, administrador ou endereço foi mantido</div>` : ''}
        <div class="ph-list">${t.placeholders.map(p=>`<span class="ph-tag">{{${p}}}</span>`).join('')}</div>
        <div class="tpl-actions">
          <button class="btn ghost" data-action="navigate" data-args='${this.attrJson(['novo', t.tipo])}'>Usar em novo processo</button>
          <button class="btn ghost" data-action="deleteTemplate" data-args='${this.attrJson([t.id])}' style="color:var(--status-crit);">Remover</button>
        </div>
      </div>`;}).join('') || `<div class="empty-state"><div class="ic">📄</div>Nenhum modelo cadastrado ainda.</div>`;
  },
  deleteTemplate(id){ TEMPLATES = TEMPLATES.filter(t=>t.id!==id); GS2Api.apagarCadastro('modelos', id); this.renderTemplates(); },
  openTplModal(){
    document.getElementById('tplNome').value=''; document.getElementById('tplFileName').textContent=''; document.getElementById('tplDetected').innerHTML='';
    document.getElementById('tplModal').classList.add('open');
    const drop = document.getElementById('tplDrop'); const input = document.getElementById('tplFileInput');
    drop.onclick = ()=>input.click();
    input.onchange = ()=>{
      if(!input.files.length) return;
      document.getElementById('tplFileName').textContent = input.files[0].name;
      document.getElementById('tplDetected').innerHTML = `<div class="callout" style="margin-top:10px;">🔎 Placeholders detectados (simulado): <span class="ph-tag">{{razao_social}}</span> <span class="ph-tag">{{nome_socio}}</span> <span class="ph-tag">{{cpf_socio}}</span> <span class="ph-tag">{{endereco_sede}}</span></div>`;
    };
  },
  closeTplModal(){ document.getElementById('tplModal').classList.remove('open'); },
  saveTemplate(){
    const nome = document.getElementById('tplNome').value.trim();
    const tipo = document.getElementById('tplTipo').value;
    const fileInput = document.getElementById('tplFileInput');
    if(!nome || !fileInput.files.length){ alert('Preencha o nome e selecione o arquivo do modelo.'); return; }
    const modelo = { id:'t'+Date.now(), nome, tipo, arquivo:fileInput.files[0].name, data:new Date().toLocaleDateString('pt-BR'),
      placeholders:['razao_social','nome_socio','cpf_socio','endereco_sede'],
      texto:`${nome.toUpperCase()}\n\n{{razao_social}}, representada por {{nome_socio}} (CPF {{cpf_socio}}), com sede em {{endereco_sede}}.` };
    TEMPLATES.push(modelo);
    GS2Api.salvarCadastro('modelos', modelo.id, modelo);
    this.closeTplModal(); this.renderTemplates();
  },

  /* ---------- Junta Comercial (JUCEMAT) + Domínio ---------- */
  openJucematModal(id){
    /* Compara como texto: o processo criado nesta aba nasce com id
       numérico (Date.now()) e o que volta do banco vem como string.
       Com === estrito o botão "Acompanhar" morria calado depois do
       primeiro recarregamento. */
    const p = PROCESSOS.find(x=>String(x.id) === String(id));
    if(!p) return;
    this._jucematTarget = id;
    document.getElementById('jucematModalTitle').textContent = `Acompanhamento — ${p.cliente}`;
    document.getElementById('jucematProtocolo').value = p.jucemat?.protocolo || '';
    const stepsEl = document.getElementById('jucematSteps');
    stepsEl.innerHTML = JUCEMAT_STEPS.map(s=>{
      const val = (p.jucemat && p.jucemat[s.key]) || 'pendente';
      return `<div class="field" style="margin-bottom:10px;">
        <label>${s.label}</label>
        <select data-jstep="${s.key}">
          ${Object.keys(JUCEMAT_STATUS_LABEL).map(k=>`<option value="${k}" ${val===k?'selected':''}>${JUCEMAT_STATUS_LABEL[k]}</option>`).join('')}
        </select>
      </div>`;
    }).join('');
    const indefBox = document.getElementById('jucematIndeferimentoBox');
    const ind = p.jucemat && p.jucemat.indeferimento;
    indefBox.innerHTML = (p.jucemat && p.jucemat.viabilidade==='indeferido' && ind)
      ? `<div class="callout" style="background:var(--status-crit-bg);color:var(--status-crit);border-color:#e3bfc0;margin-bottom:10px;">
          ⚠️ <b>Viabilidade indeferida</b> pela análise de endereço/atividade — órgão responsável: ${this.escapeHtml(ind.orgao||'—')}${ind.dataProcessamento?` (processado em ${this.escapeHtml(ind.dataProcessamento)})`:''}.<br>
          ${ind.justificativa ? `<span style="display:block;margin-top:6px;">${this.escapeHtml(ind.justificativa)}</span>` : ''}
          ${ind.reconsideracao ? `<span style="display:block;margin-top:6px;">Sistema de reconsideração: <a href="${this.escapeHtml(this.urlSegura(ind.reconsideracao.url))}" target="_blank" rel="noopener">${this.escapeHtml(ind.reconsideracao.nome)}</a>${ind.reconsideracao.manualUrl?` (<a href="${this.escapeHtml(this.urlSegura(ind.reconsideracao.manualUrl))}" target="_blank" rel="noopener">manual</a>)`:''}. Ver skill <code>viabilidade-indeferida</code>.</span>` : ''}
          <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
            <div class="field" style="margin:0;flex:1 1 220px;">
              <label style="color:var(--status-crit);">Status da reconsideração</label>
              <select id="jucematReconStatus">
                ${Object.keys(RECONSIDERACAO_STATUS_LABEL).map(k=>`<option value="${k}" ${(ind.reconsideracaoStatus||'pendente')===k?'selected':''}>${RECONSIDERACAO_STATUS_LABEL[k]}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="margin:0;flex:1 1 220px;">
              <label style="color:var(--status-crit);">Protocolo da reconsideração (quando aberto no sistema do município)</label>
              <input type="text" id="jucematProtocoloReconsideracao" placeholder="ex.: número do protocolo no Integrador Digital" value="${this.escapeHtml(ind.protocoloReconsideracao||'')}">
            </div>
          </div>
        </div>`
      : '';
    const notifyBox = document.getElementById('jucematNotifyBox');
    notifyBox.innerHTML = p.proprietarioNotificado
      ? `<div class="callout" style="background:var(--status-good-bg);color:var(--status-good);border-color:#bfe3cf;">✉️ ${PROPRIETARIO.nome} já foi notificado(a) sobre este processo (via ${PROPRIETARIO.canal}).</div>`
      : `<div class="callout">📨 Ao mudar qualquer etapa acima de "Pendente" pela primeira vez, ${PROPRIETARIO.nome} será notificado(a) automaticamente via ${PROPRIETARIO.canal} de que este processo está sendo iniciado na Junta Comercial.</div>`;
    document.getElementById('jucematModal').classList.add('open');
  },
  closeJucematModal(){ document.getElementById('jucematModal').classList.remove('open'); },
  /* usado por toda tela que altera um processo já existente */
  persistirProcesso(p){ if(p) return GS2Api.salvarProcesso(p); },

  saveJucemat(){
    const p = PROCESSOS.find(x=>x.id===this._jucematTarget);
    if(!p) return;
    const wasStarted = this.jucematStarted(p.jucemat);
    /* Parte de um objeto existente (não recriar do zero) para não perder campos que este modal não edita
       diretamente, como requerenteId/requerenteNome e os detalhes de indeferimento/reconsideração. */
    const jucemat = Object.assign({}, p.jucemat);
    document.querySelectorAll('#jucematSteps [data-jstep]').forEach(sel=>{ jucemat[sel.dataset.jstep] = sel.value; });
    jucemat.protocolo = document.getElementById('jucematProtocolo').value.trim();
    const reconStatusEl = document.getElementById('jucematReconStatus');
    const reconProtocoloEl = document.getElementById('jucematProtocoloReconsideracao');
    if(reconStatusEl && jucemat.indeferimento){
      jucemat.indeferimento = Object.assign({}, jucemat.indeferimento, {
        reconsideracaoStatus: reconStatusEl.value,
        protocoloReconsideracao: (reconProtocoloEl && reconProtocoloEl.value || '').trim()
      });
    }
    const nowStarted = this.jucematStarted(jucemat);
    p.jucemat = jucemat;

    /* A marca precisa ser posta ANTES de persistir, senão ela fica só na
       tela: o ✉️ aparecia, e sumia no primeiro recarregamento porque
       nunca chegou ao banco. */
    let notified = false;
    if(!wasStarted && nowStarted && !p.proprietarioNotificado){
      p.proprietarioNotificado = true;
      notified = true;
    }

    this.persistirProcesso(p);

    this.closeJucematModal();
    this.renderProcessosTable();
    this.renderDashboard();

    if(notified){
      alert(`📨 Notificação enviada (simulada) para ${PROPRIETARIO.nome} via ${PROPRIETARIO.canal}:\n\n"O processo de ${TIPOS[p.tipo]?.label || p.tipo} do cliente ${p.cliente} foi iniciado na Junta Comercial (JUCEMAT).${p.jucemat.protocolo ? ' Protocolo: '+p.jucemat.protocolo+'.' : ''}"\n\nNa versão integrada, isso sairia por WhatsApp/e-mail/Teams assim que a equipe começasse a etapa na Junta, sem precisar de ação manual.`);
    }
  },

  /* ---------- Administração: Atualização de Tabelas (apenas Administrador) ---------- */
  renderAdminTabelas(){
    const table = document.getElementById('tabelasRefTable');
    table.innerHTML = `<thead><tr><th>Tabela</th><th>Fonte</th><th>Versão atual</th><th>Atualizado em</th><th></th></tr></thead><tbody>${
      TABELAS_REFERENCIA.map(t=>`<tr>
        <td><b style="color:var(--dark);">${t.nome}</b></td>
        <td style="color:var(--muted);font-size:12px;">${t.fonte}</td>
        <td>${t.versao}</td>
        <td>${t.atualizadoEm}</td>
        <td><button class="btn ghost" id="btnUpd-${t.id}" data-action="forcarAtualizacaoTabela" data-args='${this.attrJson([t.id])}'>Forçar atualização</button></td>
      </tr>`).join('')
    }</tbody>`;
    this.renderAdminLog();
  },
  renderAdminLog(){
    const box = document.getElementById('adminLogBox');
    if(!box) return;
    box.innerHTML = ADMIN_LOG.length
      ? ADMIN_LOG.slice().reverse().map(l=>`<div style="padding:7px 0;border-bottom:1px solid var(--line);color:var(--ink);">${l}</div>`).join('')
      : '<div style="color:#9aa8a5;">Nenhuma atualização registrada ainda nesta sessão.</div>';
  },
  forcarAtualizacaoTabela(id){
    const t = TABELAS_REFERENCIA.find(x=>x.id===id);
    if(!t) return;
    const btn = document.getElementById('btnUpd-'+id);
    if(btn){ btn.disabled = true; btn.textContent = 'Atualizando...'; }
    setTimeout(()=>{
      t.atualizadoEm = new Date().toLocaleDateString('pt-BR');
      ADMIN_LOG.push(`${new Date().toLocaleString('pt-BR')} — ${currentUser.nome} forçou a atualização de "${t.nome}".`);
      this.renderAdminTabelas();
    }, 700);
  },
  forcarAtualizacaoTodas(){
    TABELAS_REFERENCIA.forEach(t=>{ t.atualizadoEm = new Date().toLocaleDateString('pt-BR'); });
    ADMIN_LOG.push(`${new Date().toLocaleString('pt-BR')} — ${currentUser.nome} forçou a atualização de todas as tabelas.`);
    this.renderAdminTabelas();
  },

  /* ---------- Administração: Usuários (apenas Administrador) ---------- */
  renderAdminUsuarios(){
    const table = document.getElementById('usuariosTable');
    table.innerHTML = `<thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Último acesso</th><th></th></tr></thead><tbody>${
      USERS.map(u=>`<tr>
        <td><b style="color:var(--dark);">${this.escapeHtml(u.nome)}</b></td>
        <td style="color:var(--muted);font-size:12px;">${this.escapeHtml(u.email)}</td>
        <td>${this.escapeHtml(u.papel)}</td>
        <td><span class="badge ${u.status==='Ativo'?'good':'crit'}"><span class="dot"></span>${this.escapeHtml(u.status)}</span></td>
        <td>${this.escapeHtml(u.ultimoAcesso)}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn ghost" data-action="openUsuarioModal" data-args='${this.attrJson([u.id])}'>Editar</button>
          <button class="btn ghost" data-action="toggleUsuarioStatus" data-args='${this.attrJson([u.id])}' style="color:${u.status==='Ativo'?'var(--status-crit)':'var(--status-good)'};">${u.status==='Ativo'?'Desativar':'Ativar'}</button>
        </td>
      </tr>`).join('')
    }</tbody>`;
  },
  openUsuarioModal(id){
    this._usuarioTarget = id || null;
    const u = id ? USERS.find(x=>x.id===id) : null;
    document.getElementById('usuarioModalTitle').textContent = u ? 'Editar usuário' : 'Novo usuário';
    document.getElementById('usuarioNome').value = u ? u.nome : '';
    document.getElementById('usuarioEmail').value = u ? u.email : '';
    document.getElementById('usuarioPapel').value = u ? u.papel : 'Colaborador';
    document.getElementById('usuarioAtivo').checked = u ? u.status==='Ativo' : true;
    document.getElementById('usuarioModal').classList.add('open');
  },
  closeUsuarioModal(){ document.getElementById('usuarioModal').classList.remove('open'); },
  saveUsuario(){
    const nome = document.getElementById('usuarioNome').value.trim();
    const email = document.getElementById('usuarioEmail').value.trim();
    const papel = document.getElementById('usuarioPapel').value;
    const ativo = document.getElementById('usuarioAtivo').checked;
    if(!nome || !email){ alert('Preencha nome e e-mail do usuário.'); return; }
    if(this._usuarioTarget){
      const u = USERS.find(x=>x.id===this._usuarioTarget);
      if(u){ u.nome=nome; u.email=email; u.papel=papel; u.status = ativo?'Ativo':'Inativo'; GS2Api.salvarCadastro('usuarios', u.id, u); }
    } else {
      USERS.push({ id:'u'+Date.now(), nome, email, papel, status: ativo?'Ativo':'Inativo', ultimoAcesso:'Nunca acessou' });
      GS2Api.salvarCadastro('usuarios', USERS[USERS.length-1].id, USERS[USERS.length-1]);
    }
    this.closeUsuarioModal();
    this.renderAdminUsuarios();
  },
  toggleUsuarioStatus(id){
    const u = USERS.find(x=>x.id===id);
    if(!u) return;
    u.status = u.status==='Ativo' ? 'Inativo' : 'Ativo';
    GS2Api.salvarCadastro('usuarios', u.id, u);
    this.renderAdminUsuarios();
  },

  /* ---------- Admin: Requerentes (dados para login gov.br na Viabilidade) ---------- */
  renderAdminRequerentes(){
    const table = document.getElementById('requerentesTable');
    table.innerHTML = `<thead><tr><th>Nome</th><th>CPF</th><th>E-mail</th><th>Telefone</th><th>Status</th><th></th></tr></thead><tbody>${
      REQUERENTES.map(r=>`<tr>
        <td><b style="color:var(--dark);">${this.escapeHtml(r.nome)}</b></td>
        <td style="color:var(--muted);font-size:12px;">${this.escapeHtml(r.cpf)}</td>
        <td style="color:var(--muted);font-size:12px;">${this.escapeHtml(r.email)}</td>
        <td style="color:var(--muted);font-size:12px;">${this.escapeHtml(r.telefone)}</td>
        <td><span class="badge ${r.status==='Ativo'?'good':'crit'}"><span class="dot"></span>${r.status}</span></td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn ghost" data-action="openRequerenteModal" data-args='${this.attrJson([r.id])}'>Editar</button>
          <button class="btn ghost" data-action="toggleRequerenteStatus" data-args='${this.attrJson([r.id])}' style="color:${r.status==='Ativo'?'var(--status-crit)':'var(--status-good)'};">${r.status==='Ativo'?'Desativar':'Ativar'}</button>
        </td>
      </tr>`).join('')
    }</tbody>`;
  },
  openRequerenteModal(id){
    this._requerenteTarget = id || null;
    const r = id ? REQUERENTES.find(x=>x.id===id) : null;
    document.getElementById('requerenteModalTitle').textContent = r ? 'Editar requerente' : 'Novo requerente';
    document.getElementById('requerenteNome').value = r ? r.nome : '';
    document.getElementById('requerenteCpf').value = r ? r.cpf : '';
    document.getElementById('requerenteEmail').value = r ? r.email : '';
    document.getElementById('requerenteTelefone').value = r ? r.telefone : '';
    document.getElementById('requerenteAtivo').checked = r ? r.status==='Ativo' : true;
    document.getElementById('requerenteModal').classList.add('open');
  },
  closeRequerenteModal(){ document.getElementById('requerenteModal').classList.remove('open'); },
  saveRequerente(){
    const nome = document.getElementById('requerenteNome').value.trim();
    const cpf = document.getElementById('requerenteCpf').value.trim();
    const email = document.getElementById('requerenteEmail').value.trim();
    const telefone = document.getElementById('requerenteTelefone').value.trim();
    const ativo = document.getElementById('requerenteAtivo').checked;
    if(!nome || !cpf){ alert('Preencha ao menos nome e CPF do requerente.'); return; }
    if(this._requerenteTarget){
      const r = REQUERENTES.find(x=>x.id===this._requerenteTarget);
      if(r){ r.nome=nome; r.cpf=cpf; r.email=email; r.telefone=telefone; r.status = ativo?'Ativo':'Inativo'; GS2Api.salvarCadastro('requerentes', r.id, r); }
    } else {
      REQUERENTES.push({ id:'r'+Date.now(), nome, cpf, email, telefone, status: ativo?'Ativo':'Inativo' });
      GS2Api.salvarCadastro('requerentes', REQUERENTES[REQUERENTES.length-1].id, REQUERENTES[REQUERENTES.length-1]);
    }
    this.closeRequerenteModal();
    this.renderAdminRequerentes();
  },
  toggleRequerenteStatus(id){
    const r = REQUERENTES.find(x=>x.id===id);
    if(!r) return;
    r.status = r.status==='Ativo' ? 'Inativo' : 'Ativo';
    GS2Api.salvarCadastro('requerentes', r.id, r);
    this.renderAdminRequerentes();
  }
});
