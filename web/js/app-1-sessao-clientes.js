/* O objeto App — parte 1 de 6: sessão, login, navegação, painel e painel de clientes.
   As demais partes estendem este mesmo objeto com Object.assign,
   para que cada arquivo caiba num diff legível. */

const App = {
  /* ================= LOGIN =================
     Dois perfis: "Usuário GS2" (e-mail corporativo, autenticado no Microsoft
     Entra ID da GS2) e "Cliente" (acesso externo aos próprios documentos).
     O papel de Administrador não é escolhido na tela: sai do e-mail, pela
     lista GS2_CONFIG.administradores. */
  abaLogin(qual){
    const gs2 = qual !== 'cliente';
    document.getElementById('abaGS2').classList.toggle('ativa', gs2);
    document.getElementById('abaCliente').classList.toggle('ativa', !gs2);
    document.getElementById('paneGS2').hidden = !gs2;
    document.getElementById('paneCliente').hidden = gs2;
    this.erroLogin('');
    const alvo = document.getElementById(gs2 ? 'loginEmailGS2' : 'loginEmailCliente');
    if(alvo) alvo.focus();
  },
  erroLogin(msg){
    const box = document.getElementById('loginErro');
    if(!box) return;
    box.innerHTML = msg || '';
    box.hidden = !msg;
  },
  ocupadoLogin(id, ocupado, rotulo){
    const b = document.getElementById(id);
    if(!b) return;
    b.disabled = !!ocupado;
    b.textContent = ocupado ? (rotulo || 'Entrando…') : 'Entrar';
  },
  /* Nota de ambiente na tela de login: diz se está falando com o SharePoint de
     verdade ou rodando em demonstração, e por quê. */
  renderModoLogin(){
    const box = document.getElementById('loginModo');
    if(!box) return;
    if(GS2Auth.real()){
      box.className = 'login-modo real';
      box.innerHTML = `<b>Conectado ao Microsoft 365 da GS2.</b> Os documentos são lidos e gravados no SharePoint
        (<code>${GS2_CONFIG.sharepoint.sitePath}</code>) em nome de quem entrar.
        <button onclick="App.abrirDiagnostico()">Testar a integração</button>`;
    } else {
      box.className = 'login-modo demo';
      box.innerHTML = `<b>Modo demonstração — nada é gravado no SharePoint.</b> ${this.escapeHtml(GS2Auth.motivoDemo())}
        <button onclick="App.abrirDiagnostico()">Ver diagnóstico</button>`;
    }
  },
  async entrarGS2(){
    const email = (document.getElementById('loginEmailGS2').value || '').trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
      this.erroLogin('Informe um e-mail válido.'); return;
    }
    if(!GS2Auth.ehDominioGS2(email)){
      this.erroLogin(`Este acesso é só para a equipe da GS2, com e-mail <b>@${GS2_CONFIG.dominioGS2}</b>.<br>Se você é cliente, use a aba <b>Cliente</b>.`);
      return;
    }
    this.erroLogin('');

    if(!GS2Auth.real()){
      /* demonstração: entra sem autenticar, com o papel derivado do e-mail */
      const nome = email.split('@')[0].split(/[._-]/).map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(' ');
      this.login(GS2Auth.papelDe(email), null, {nome, email});
      return;
    }

    this.ocupadoLogin('btnEntrarGS2', true);
    try{
      const conta = await GS2Auth.entrar(email);
      const emailReal = GS2Auth.emailDaConta(conta);
      if(!GS2Auth.ehDominioGS2(emailReal)){
        await GS2Auth.sair();
        this.erroLogin(`A conta usada (<b>${this.escapeHtml(emailReal)}</b>) não é do domínio @${GS2_CONFIG.dominioGS2}.`);
        return;
      }
      this.login(GS2Auth.papelDe(emailReal), null, {nome: conta.name || emailReal, email: emailReal});
      this.sincronizarClientes();
    }catch(e){
      const m = String(e && e.message || e);
      this.erroLogin(/user_cancelled|popup_window_error|BrowserAuthError/i.test(m)
        ? 'A janela de login foi fechada antes de concluir. Tente de novo — e libere pop-ups para este endereço, se o navegador tiver bloqueado.'
        : 'Não consegui autenticar: ' + this.escapeHtml(m));
    }finally{
      this.ocupadoLogin('btnEntrarGS2', false);
    }
  },
  async entrarCliente(){
    const email = (document.getElementById('loginEmailCliente').value || '').trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ this.erroLogin('Informe um e-mail válido.'); return; }
    this.erroLogin('');

    const achar = (e) => USUARIOS_CLIENTE.find(u => String(u.email||'').toLowerCase() === e);
    const validar = (u, e) => {
      if(!u){ this.erroLogin(`O e-mail <b>${this.escapeHtml(e)}</b> não está cadastrado como usuário de cliente. Fale com a GS2 para liberar seu acesso.`); return false; }
      if(u.status !== 'Ativo'){ this.erroLogin(`O acesso de <b>${this.escapeHtml(u.nome)}</b> está inativo. Fale com a GS2.`); return false; }
      return true;
    };

    if(GS2Auth.real() && GS2_CONFIG.clientesViaEntra){
      this.ocupadoLogin('btnEntrarCliente', true);
      try{
        const conta = await GS2Auth.entrar(email);
        const emailReal = GS2Auth.emailDaConta(conta);
        const u = achar(emailReal);
        if(!validar(u, emailReal)){ await GS2Auth.sair(); return; }
        this.login('Cliente', u.id, {nome: u.nome, email: emailReal});
      }catch(e){
        this.erroLogin('Não consegui autenticar: ' + this.escapeHtml(String(e && e.message || e)));
      }finally{
        this.ocupadoLogin('btnEntrarCliente', false);
      }
      return;
    }

    /* Sem Entra, entrar com o e-mail é só declarar quem se é. Isso vale
       na demonstração, e SÓ nela: publicada, com a autenticação de
       verdade ligada, bastava CONHECER o e-mail de um usuário de cliente
       cadastrado para entrar e ver as empresas dele. */
    if(GS2Auth.real()){
      this.erroLogin('O acesso de cliente ainda não foi habilitado neste ambiente. ' +
        'Peça à GS2 para ligar o login de clientes pelo Entra ID (clientesViaEntra) — ' +
        'sem ele, entrar só com o e-mail não autentica ninguém.');
      return;
    }

    const u = achar(email);
    if(!validar(u, email)) return;
    this.login('Cliente', u.id, {nome: u.nome, email: email});
  },

  login(papel, usuarioClienteId, identidade){
    currentUser.papel = papel || 'Colaborador';
    if(papel === 'Cliente'){
      const uc = USUARIOS_CLIENTE.find(u=>u.id===usuarioClienteId) || USUARIOS_CLIENTE[0];
      currentUser.nome = (identidade && identidade.nome) || uc.nome;
      currentUser.email = (identidade && identidade.email) || uc.email;
      currentUser.empresas = uc.empresas.slice();
      currentUser.clienteUsuarioId = uc.id;
    } else {
      currentUser.nome = (identidade && identidade.nome) || 'Usuário GS2';
      currentUser.email = (identidade && identidade.email) || '';
      currentUser.empresas = null;
      currentUser.clienteUsuarioId = null;
    }
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('app').style.display='block';
    this.renderUserChip();
    this.renderSeloAmbiente();
    this.renderAdminNav();
    /* o banco é a verdade sobre os processos: carrega antes de desenhar */
    this.carregarDoBanco();
    const busca = document.getElementById('cliBusca'); if(busca) busca.value = '';
    const filtro = document.getElementById('cliFiltroSit'); if(filtro) filtro.value = '';
    this.cliSel = {nome:null, altIdx:0};
    if(this.ehUsuarioCliente()){ this.navigate('clientes'); }
    else { this.renderDashboard(); }
  },

  /* Selo permanente na barra do topo — o usuário nunca fica na dúvida se o que
     ele está fazendo grava de verdade. Mostra os dois lados: onde o processo
     é guardado (banco) e onde o documento é arquivado (SharePoint). */
  renderSeloAmbiente(){
    const box = document.getElementById('seloAmbiente');
    if(!box) return;
    const sp = GS2SP.disponivel();
    const api = GS2Api.disponivel;
    const tudo = sp && api;
    box.className = 'selo-ambiente ' + (tudo ? 'real' : (api || sp ? 'parcial' : 'demo'));
    box.title = [
      api ? 'Processos gravados no banco' : 'Processos só na memória desta aba — ' + (GS2Api.ultimoErro || 'sem backend'),
      sp ? 'Documentos gravados no SharePoint' : 'SharePoint: ' + GS2Auth.motivoDemo(),
      'Clique para abrir o diagnóstico.'
    ].join('\n');
    const rotulo = tudo ? 'Conectado'
      : (api && !sp ? 'Banco ok · SharePoint em demonstração'
      : (!api && sp ? 'SharePoint ok · sem banco' : 'Modo demonstração'));
    box.innerHTML = `<span class="dot"></span>${rotulo}`;
  },

  /* Falha de gravação no backend não pode fazer a pessoa perder o que digitou:
     o dado continua na tela, e o aviso aparece discreto em vez de um alerta
     no meio do caminho. */
  avisarFalhaApi(oQue, erro){
    console.warn('[GS2Api] falha ao ' + oQue + ':', erro && erro.message);
    const msg = `Não consegui ${oQue}: ${(erro && erro.message) || erro}. O dado continua nesta tela — tente de novo quando a conexão voltar.`;
    let box = document.getElementById('avisoApi');
    if(!box){
      box = document.createElement('div');
      box.id = 'avisoApi';
      box.className = 'aviso-api';
      document.body.appendChild(box);
    }
    box.innerHTML = `<b>⚠️ ${this.escapeHtml(msg)}</b> <button onclick="this.parentNode.remove()">fechar</button>`;
    box.style.display = 'block';
    clearTimeout(this._avisoApiTimer);
    this._avisoApiTimer = setTimeout(()=>{ if(box) box.style.display = 'none'; }, 9000);
  },

  /* Conectado: a lista de clientes passa a ser as pastas reais da biblioteca. */
  async sincronizarClientes(){
    if(!GS2SP.disponivel()) return;
    try{
      const nomes = await GS2SP.pastasClientes();
      if(!nomes.length) return;
      const antigos = {};
      CLIENTES.forEach(c => { antigos[c.nome] = c; });
      CLIENTES = nomes.map(n => antigos[n] || {nome:n, minutaPropria:false});
      /* Conectado, quem manda é a lista de pastas do SharePoint. As
         fichas de EXEMPLO embutidas na ferramenta precisam sair daqui:
         elas continuavam aparecendo no Painel misturadas às reais, com
         CNPJ, sócios e histórico, como se fossem cadastro de verdade. */
      const reais = new Set(nomes);
      Object.keys(CLIENTES_DETALHE).forEach(n => {
        const d = CLIENTES_DETALHE[n];
        const veioDoAcervo = d && (d.origem === 'sharepoint' || d.origem === 'sem-acervo');
        if(!reais.has(n) && !veioDoAcervo) delete CLIENTES_DETALHE[n];
      });
      /* Cliente novo precisa nascer com ficha, nem que seja a vazia — o
         Painel lê CLIENTES_DETALHE direto e quebraria sem ela. */
      this.garantirFichas();
      this.renderClientList('');
      const painel = document.getElementById('view-clientes');
      if(painel && painel.classList.contains('active') && this.renderClientesGrid) this.renderClientesGrid();
      console.log(`[GS2] ${CLIENTES.length} pastas de cliente carregadas do SharePoint.`);
    }catch(e){
      console.warn('[GS2] Não consegui listar as pastas de clientes no SharePoint:', e.message);
    }
  },

  /* ================= DIAGNÓSTICO DA INTEGRAÇÃO =================
     É como testar antes de publicar: roda as mesmas chamadas reais que a
     ferramenta usa no dia a dia e mostra uma a uma o que respondeu. Os testes
     de leitura não mudam nada; o de gravação só roda com clique explícito. */
  abrirDiagnostico(){
    document.getElementById('diagModal').classList.add('open');
    this.rodarDiagnostico(false);
  },
  fecharDiagnostico(){ document.getElementById('diagModal').classList.remove('open'); },
  /* titulo também é escapado: hoje todos os chamadores passam literal,
     mas o próximo pode passar dado. */
  _diagLinha(estado, titulo, detalhe){
    const ic = estado === 'ok' ? '✅' : (estado === 'erro' ? '❌' : (estado === 'aviso' ? '⚠️' : '⏳'));
    return `<div class="diag-linha"><span class="diag-ic">${ic}</span><span><b>${this.escapeHtml(titulo)}</b>${detalhe ? `<span class="det">${this.escapeHtml(String(detalhe))}</span>` : ''}</span></div>`;
  },
  async rodarDiagnostico(comGravacao){
    const box = document.getElementById('diagResultado');
    const linhas = [];
    const pinta = () => { box.innerHTML = linhas.join(''); };
    const add = (e,t,d) => { linhas.push(this._diagLinha(e,t,d)); pinta(); };

    box.innerHTML = this._diagLinha('...', 'Executando…', '');

    /* 1 — o que dá para conferir sem nenhuma chamada */
    linhas.length = 0;
    add(GS2Auth.servidoPorHttp() ? 'ok' : 'erro', 'Página servida por http/https',
        location.origin || 'file:// — o login Microsoft não funciona assim; use o servidor local (ver README)');
    add(GS2Auth.bibliotecaOk() ? 'ok' : 'erro', 'Biblioteca de autenticação carregada',
        GS2Auth.bibliotecaOk() ? 'vendor/msal-browser.min.js' : 'arquivo vendor/msal-browser.min.js ausente');
    add(GS2_CONFIG.tenantId ? 'ok' : 'erro', 'tenantId configurado', GS2_CONFIG.tenantId || 'vazio — defina no config.js');
    add(GS2_CONFIG.clientId ? 'ok' : 'erro', 'clientId configurado', GS2_CONFIG.clientId || 'vazio — defina no config.js');
    add('ok', 'URI de redirecionamento que precisa estar registrada no Entra ID',
        GS2_CONFIG.redirectUri || ((location.origin || '') + '/auth.html'));
    add(GS2Auth.real() ? 'ok' : 'aviso', 'Modo de operação',
        GS2Auth.real() ? 'entra — login e SharePoint reais' : 'demo — ' + GS2Auth.motivoDemo());

    /* 2 — backend (etapa 1): banco, autenticação da API e permissões */
    await GS2Api.verificar();
    if(!GS2Api.disponivel){
      add('aviso', 'Backend (API de dados)',
          'não respondeu — ' + (GS2Api.ultimoErro || 'sem /api') + '. Os processos ficam só na memória desta aba.');
    } else {
      const i = GS2Api.info || {};
      add('ok', 'Backend (API de dados)', `versão ${i.versao} · autenticação: ${i.autenticacao}`);
      const b = i.banco || {};
      add(b.ok ? 'ok' : 'erro', 'Banco de dados',
          b.ok ? `${b.tipo} em ${b.local} · ` + Object.keys(b.registros||{}).map(k=>`${k}: ${b.registros[k]}`).join(' · ')
               : (b.erro || 'sem resposta'));
      add(i.replica && i.replica.ligada ? 'ok' : 'aviso', 'Réplica do SharePoint (etapa 2)',
          i.replica && i.replica.ligada ? 'ligada' : 'desligada — conferência automática ainda não ativada');
      add(i.retencaoDias ? 'ok' : 'aviso', 'Retenção de dados pessoais',
          i.retencaoDias ? i.retencaoDias + ' dias' : 'sem prazo definido (GS2_RETENCAO_DIAS) — pendência C1');
      try{
        const est = await GS2Api.chamar('/estado');
        add('ok', 'Leitura autenticada da API', `${est.processos.length} processo(s) visíveis para ${est.usuario.papel}`);
      }catch(e){
        add(e.status === 401 ? 'erro' : 'aviso', 'Leitura autenticada da API',
            e.status === 401
              ? 'token recusado (401). Confira se o escopo api://{clientId}/access_as_user existe no registro do Entra e foi consentido.'
              : e.message);
      }
    }

    if(!GS2Auth.real()){
      add('aviso', 'Testes de SharePoint não executados', 'O SharePoint depende do login Microsoft — corrija os itens acima e rode de novo.');
      return;
    }
    if(!(GS2Auth.conta || GS2Auth.contaEmCache())){
      add('aviso', 'Testes de SharePoint não executados', 'Ninguém autenticado no Microsoft 365 nesta aba.');
      return;
    }

    /* 3 — SharePoint: leitura */
    try{
      const eu = await GS2SP.eu();
      add('ok', 'Identidade confirmada no Microsoft 365', `${eu.displayName} · ${eu.mail || eu.userPrincipalName}`);
    }catch(e){ add('erro', 'Identidade confirmada no Microsoft 365', e.message); return; }

    let site;
    try{
      site = await GS2SP.site();
      add('ok', 'Site do SharePoint localizado', `${site.displayName || site.name} — ${site.webUrl}`);
    }catch(e){ add('erro', 'Site do SharePoint localizado', e.message + ' (confira hostname e sitePath em GS2_CONFIG.sharepoint)'); return; }

    let drive;
    try{
      drive = await GS2SP.drive();
      add('ok', 'Biblioteca de documentos localizada', `${drive.name} (id ${drive.id.slice(0,18)}…)`);
    }catch(e){ add('erro', 'Biblioteca de documentos localizada', e.message); return; }

    try{
      const pastas = await GS2SP.pastasClientes();
      add(pastas.length ? 'ok' : 'aviso', 'Pastas de cliente lidas',
          `${pastas.length} pasta(s). Primeiras: ${pastas.slice(0,3).join(' · ') || '—'}`);
    }catch(e){ add('erro', 'Pastas de cliente lidas', e.message); }

    if(!comGravacao){
      add('aviso', 'Teste de gravação no SharePoint não executado',
          'Use o botão abaixo para criar de verdade uma pasta e um arquivo de teste no SharePoint.');
      return;
    }

    /* 4 — gravação no SharePoint (só com clique explícito) */
    const pastaTeste = GS2_CONFIG.sharepoint.pastaTestes;
    const carimbo = new Date().toISOString().replace(/[:.]/g,'-');
    const nomeArq = `teste-ferramenta-${carimbo}.txt`;
    try{
      await GS2SP.garantirCaminho(pastaTeste);
      add('ok', 'Pasta de teste criada/confirmada', pastaTeste + '/');
    }catch(e){ add('erro', 'Pasta de teste criada/confirmada', e.message); return; }

    try{
      const conteudo = new Blob([
        `Teste de gravação da ferramenta Processos Societários.\n` +
        `Data: ${new Date().toLocaleString('pt-BR')}\n` +
        `Usuário: ${currentUser.nome} <${currentUser.email||''}>\n` +
        `Origem: ${location.origin}${location.pathname}\n` +
        `Este arquivo pode ser apagado.\n`
      ], {type:'text/plain'});
      conteudo.name = nomeArq;
      const item = await GS2SP.enviarArquivo(pastaTeste, nomeArq, conteudo);
      add('ok', 'Arquivo de teste enviado', `${item.name} · ${item.size} bytes`);
      const lido = await GS2SP.item(pastaTeste + '/' + nomeArq);
      add('ok', 'Arquivo lido de volta do SharePoint', lido.webUrl);
      add('aviso', 'Limpeza', `Apague a pasta "${pastaTeste}" no SharePoint quando terminar os testes — a ferramenta não apaga nada sozinha.`);
    }catch(e){ add('erro', 'Arquivo de teste enviado', e.message); }
  },

  /* Carga a partir do backend. Se ele não estiver no ar, a ferramenta segue
     em memória — o que já funcionava antes — e o selo do topo avisa. */
  async carregarDoBanco(){
    await GS2Api.verificar();
    this.renderSeloAmbiente();
    if(!GS2Api.disponivel) return;
    try{
      /* duas cargas independentes: em paralelo, não uma atrás da outra */
      await Promise.all([ GS2Api.carregarEstado(), this.carregarAcervo() ]);
      if(!GS2Api.exemplosPendentes) PROCESSOS.forEach(p=>{ p._persistido = true; });
      if(this.ehUsuarioCliente()) this.navigate('clientes'); else this.renderDashboard();
      this.renderBannerSemente();
    }catch(e){
      /* 401 aqui quase sempre é escopo da API faltando no registro do Entra */
      this.avisarFalhaApi('carregar os dados do banco', e);
      GS2Api.disponivel = false;
      this.renderSeloAmbiente();
    }
  },

  /* Banco vazio na primeira execução. Os processos e cadastros de exemplo que
     estão embutidos na ferramenta incluem CPF e CNPJ reais — por isso eles NÃO
     sobem sozinhos: quem decide é o administrador, clicando. */
  renderBannerSemente(){
    const alvo = document.getElementById('bannerSemente');
    if(!alvo) return;
    const pendentes = GS2Api.exemplosPendentes;
    /* com a base embutida vazia não há o que semear — o aviso só faz
       sentido se algum exemplo existir */
    const precisa = GS2Api.disponivel && currentUser.papel === 'Administrador' && Array.isArray(pendentes) && pendentes.length > 0;
    if(!precisa){ alvo.innerHTML = ''; return; }
    alvo.innerHTML = `
      <div class="banner-semente">
        <span style="flex:1;min-width:260px;">
          <b>O banco está vazio.</b> Os ${pendentes.length} processo(s) e os cadastros que você está vendo são os
          <b>exemplos embutidos na ferramenta</b> — estão só nesta tela, não foram gravados.
          Entre eles há <b>CPF e CNPJ reais</b> de clientes, então nada sobe sozinho: quem decide é você.
        </span>
        <button class="btn" onclick="App.semearBanco()">Enviar os dados de exemplo</button>
        <button class="btn ghost" onclick="document.getElementById('bannerSemente').innerHTML=''">Começar vazio</button>
      </div>`;
  },
  async semearBanco(){
    if(!confirm('Isto grava no banco os processos e cadastros de exemplo que estão nesta tela, incluindo os dados reais de cliente usados como exemplo.\n\nContinuar?')) return;
    try{
      const c = await GS2Api.semear();
      alert('Enviado para o banco:\n\n' +
        Object.keys(c).map(k=>`  ${c[k]} ${k}`).join('\n'));
      await GS2Api.carregarEstado();
      this.renderBannerSemente();
      this.renderDashboard();
    }catch(e){ this.avisarFalhaApi('semear o banco', e); }
  },

  ehUsuarioCliente(){ return currentUser.papel === 'Cliente'; },

  /* Empresas que o usuário logado pode ver no Painel de Clientes. */
  empresasPermitidas(){
    if(!this.ehUsuarioCliente()) return Object.keys(CLIENTES_DETALHE);
    return (currentUser.empresas || []).filter(n=>CLIENTES_DETALHE[n]);
  },
  async logout(){
    document.getElementById('loginScreen').style.display='flex';
    document.getElementById('app').style.display='none';
    this.erroLogin('');
    this.renderModoLogin();
    /* encerra também a sessão Microsoft, senão o próximo login entra sozinho na mesma conta */
    try{ await GS2Auth.sair(); }catch(e){}
  },
  renderUserChip(){
    const chip = document.querySelector('.user-chip');
    if(!chip) return;
    const av = chip.querySelector('.avatar2'); if(av) av.textContent = currentUser.nome.charAt(0).toUpperCase();
    const nm = chip.querySelector('.name'); if(nm) nm.textContent = currentUser.nome;
    const crumb = document.getElementById('crumbTopo');
    if(crumb) crumb.innerHTML = currentUser.papel==='Cliente'
      ? 'Área do Cliente &nbsp;/&nbsp; <b>Documentos Societários</b>'
      : 'Área do Colaborador &nbsp;/&nbsp; <b>Processos Societários</b>';
    const rl = chip.querySelector('.role');
    if(rl) rl.textContent = currentUser.papel==='Administrador' ? 'Administrador GS2'
                          : (currentUser.papel==='Cliente' ? 'Usuário de cliente' : 'Colaborador GS2');
  },
  renderAdminNav(){
    const group = document.getElementById('adminNavGroup');
    if(group) group.style.display = currentUser.papel==='Administrador' ? '' : 'none';

    /* Usuário de cliente enxerga SOMENTE o Painel de Clientes. */
    const externo = this.ehUsuarioCliente();
    document.querySelectorAll('.sidebar .nav-item').forEach(n=>{
      const v = n.getAttribute('data-view');
      n.style.display = (externo && v !== 'clientes' && v !== 'socios') ? 'none' : '';
    });
    document.querySelectorAll('.sidebar .group-label').forEach((g,i)=>{ g.style.display = externo && i>0 ? 'none' : ''; });
    const nota = document.querySelector('.sidebar-note');
    if(nota){
      if(this._notaOriginal === undefined) this._notaOriginal = nota.innerHTML;
      nota.innerHTML = externo
        ? '<b>Acesso de cliente.</b> Você está vendo apenas as empresas liberadas para o seu usuário pela equipe GS2, com os documentos societários disponíveis para consulta, download e compartilhamento.<br><br>Precisa de acesso a outra empresa? Fale com a GS2.'
        : this._notaOriginal;
    }
  },

  navigate(view, presetTipo){
    if(view.indexOf('admin-')===0 && currentUser.papel!=='Administrador'){ view='painel'; }
    if(this.ehUsuarioCliente() && view !== 'clientes' && view !== 'socios'){ view = 'clientes'; }
    /* trocar de tela fecha qualquer modal aberto — senão ele fica flutuando
       sobre a tela nova */
    document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-'+view).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    const match = document.querySelector('.nav-item[data-view="'+view+'"]');
    if(match) match.classList.add('active');

    if(view==='painel'){ this.renderDashboard(); }
    if(view==='clientes'){ this.closeClienteDetalhe(); }
    if(view==='socios'){ this.fecharSocioDetalhe(); }
    if(view==='processos'){ this.renderProcessosTable(); }
    if(view==='templates'){ this.renderTemplates(); }
    if(view==='admin-tabelas'){ this.renderAdminTabelas(); }
    if(view==='admin-usuarios'){ this.renderAdminUsuarios(); }
    if(view==='admin-requerentes'){ this.renderAdminRequerentes(); }
    if(view==='admin-usuarios-cliente'){ this.renderAdminUsuariosCliente(); }
    if(view==='admin-importar'){ this.renderImportacao(); }
    if(view==='admin-acervo'){ this.renderAcervo(); }
    if(view==='novo'){
      this.resetWizard();
      if(presetTipo){ wizard.tipo = presetTipo; }
      this.renderTipoGrid();
      this.renderClientList();
      this.renderStepper();
      /* Atalhos do menu lateral já trazem o tipo escolhido — nesse caso o wizard
         abre direto na seleção do cliente, que é o que falta decidir. */
      this.showStep(presetTipo ? 2 : 1);
      this.renderAvisoRascunho();
      this.renderRascunhoStatus();
    }
  },

  resetWizard(){
    wizard.step=1; wizard.cliente=null; wizard.clienteNovo=false; wizard.tipo=null;
    wizard.campos={}; wizard.socios=[]; wizard.administradores=[]; wizard.docs={}; wizard.extraFiles=[];
    wizard.minutaPropria=false; wizard.minutaArquivo=null;
    wizard._cnaePrincipalId=null; wizard._cnaeSecIds=[];
    wizard.aguardaConfirmacaoCliente=false; wizard.juntaProtocolo=''; wizard.juntaDocs={}; wizard.juntaExtraFiles=[]; wizard.licenciamentos={};
    wizard.juntaRequerenteId = (REQUERENTES.find(r=>r.status==='Ativo')||{}).id || null;
    wizard.rfb={dbeStatus:'pendente', dbeDeferidaArquivo:null};
    wizard.origemCliente=null;
    wizard.pastaSharePoint=null; wizard.pastaPerguntadaPara=null;
    document.getElementById('clientSearch').value='';
    wizard.caixas = {};
    wizard._caixasAltSincronizadas = false;
    wizard.rascunhoId = null;
    wizard.rascunhoSalvoEm = null;
    this.renderRascunhoStatus();
  },

  /* ======================================================================
     RASCUNHO DO PROCESSO EM ANDAMENTO
     Um processo societário leva um bom tempo para ser preenchido: empresa,
     sócios, representantes, administradores, documentos. Perder isso por causa
     de uma queda de internet, uma aba fechada por engano ou um notebook que
     desligou é o tipo de retrabalho que faz a ferramenta perder credibilidade.

     Por isso o preenchimento é gravado no próprio navegador (não sai do
     computador) a cada mudança, com um respiro de 1,5s para não gravar a cada
     tecla, e também no botão "Salvar rascunho". Ao voltar para Novo Processo,
     a ferramenta oferece retomar de onde parou.

     Fase integrada: além do navegador, o rascunho vai para o SharePoint/banco
     com o usuário logado, ficando disponível em qualquer máquina e visível para
     quem for assumir o processo.

     Limitação honesta: os ARQUIVOS anexados não cabem no rascunho — o navegador
     guarda o nome e o tamanho, mas não o conteúdo. Ao retomar, os anexos
     precisam ser escolhidos de novo, e a ferramenta avisa quais eram.
     ====================================================================== */
  RASCUNHO_CHAVE: 'gs2.processos.rascunho.v1',
  _rascunhoTimer: null,
  _rascunhoIndisponivel: false,

  /* localStorage pode estar bloqueado (janela anônima, política do navegador,
     pré-visualização embutida). Nesse caso a gravação automática é desligada e
     o usuário é orientado a usar "Baixar cópia". */
  armazenamentoDisponivel(){
    if(this._rascunhoIndisponivel) return false;
    try{
      const t = '__gs2_teste__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return true;
    }catch(e){
      this._rascunhoIndisponivel = true;
      return false;
    }
  },
  estadoDoRascunho(){
    /* O wizard agora guarda objetos File de verdade (é deles que sai o
       envio para o SharePoint), e File vira "{}" no JSON. Converte para
       {name,size} ANTES de serializar, para o rascunho continuar sabendo
       dizer quais arquivos estavam anexados. */
    const marca = f => (f && f.name) ? {name:f.name, size:f.size} : null;
    const copia = JSON.parse(JSON.stringify(wizard, (chave, valor) =>
      (typeof Blob !== 'undefined' && valor instanceof Blob) ? marca(valor) : valor));
    /* O File da CNH vira "{}" no JSON e voltaria como um objeto vazio que parece
       um arquivo mas não é — limpa antes de gravar o rascunho. */
    const limpar = p => { if(p && p.cnh) delete p.cnh.file; };
    (copia.socios||[]).forEach(s=>{ limpar(s); (s.representantes||[]).forEach(limpar); });
    return {
      versao: 1,
      salvoEm: new Date().toISOString(),
      usuario: currentUser.nome,
      id: wizard.rascunhoId || ('rasc-' + Date.now()),
      wizard: copia
    };
  },
  /* Vale a pena salvar? Só depois que existe algo de fato preenchido. */
  rascunhoTemConteudo(){
    if(!wizard.tipo) return false;
    if(wizard.step > 2) return true;
    return !!(wizard.cliente || wizard.clienteNovo);
  },
  agendarSalvarRascunho(){
    if(!this.rascunhoTemConteudo() || !this.armazenamentoDisponivel()) return;
    clearTimeout(this._rascunhoTimer);
    this._rascunhoTimer = setTimeout(()=>this.salvarRascunho(false), 1500);
  },
  salvarRascunho(manual){
    if(!this.rascunhoTemConteudo()){
      if(manual) alert('Ainda não há o que salvar.\n\nEscolha o tipo de processo e o cliente — a partir daí a ferramenta passa a guardar o preenchimento sozinha, a cada mudança.');
      return false;
    }
    if(!this.armazenamentoDisponivel()){
      if(manual){
        alert('Este navegador não está deixando a ferramenta gravar dados localmente (costuma acontecer em janela anônima ou com cookies bloqueados).\n\nUse "Baixar cópia" para guardar um arquivo .json com o preenchimento — ele pode ser aberto depois em "Novo Processo".');
      }
      this.renderRascunhoStatus();
      return false;
    }
    try{
      const estado = this.estadoDoRascunho();
      wizard.rascunhoId = estado.id;
      wizard.rascunhoSalvoEm = estado.salvoEm;
      window.localStorage.setItem(this.RASCUNHO_CHAVE, JSON.stringify(estado));
      this.renderRascunhoStatus();
      if(manual) this.flashRascunho('Rascunho salvo neste navegador.');
      return true;
    }catch(e){
      /* cota estourada (o texto bruto do OCR das CNHs é o suspeito usual) */
      console.error('Falha ao salvar o rascunho:', e);
      if(manual) alert('Não consegui salvar o rascunho neste navegador: ' + (e && e.message || e) + '\n\nUse "Baixar cópia" para não perder o preenchimento.');
      return false;
    }
  },
  lerRascunho(){
    if(!this.armazenamentoDisponivel()) return null;
    try{
      const cru = window.localStorage.getItem(this.RASCUNHO_CHAVE);
      if(!cru) return null;
      const estado = JSON.parse(cru);
      return (estado && estado.wizard) ? estado : null;
    }catch(e){ return null; }
  },
  descartarRascunho(){
    try{ window.localStorage.removeItem(this.RASCUNHO_CHAVE); }catch(e){}
    wizard.caixas = {};
    wizard._caixasAltSincronizadas = false;
    wizard.rascunhoId = null;
    wizard.rascunhoSalvoEm = null;
    this.renderRascunhoStatus();
  },
  dataHoraBr(iso){
    if(!iso) return '';
    const d = new Date(iso);
    if(isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2,'0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}`;
  },
  renderRascunhoStatus(){
    const el = document.getElementById('rascunhoStatus');
    if(!el) return;
    if(!this.armazenamentoDisponivel()){
      el.className = 'rascunho-status alerta';
      el.textContent = '⚠ Este navegador não guarda rascunho — use "Baixar cópia"';
      return;
    }
    if(wizard.rascunhoSalvoEm){
      el.className = 'rascunho-status ok';
      el.textContent = '✓ Rascunho salvo ' + this.dataHoraBr(wizard.rascunhoSalvoEm);
      return;
    }
    el.className = 'rascunho-status';
    el.textContent = this.rascunhoTemConteudo() ? 'Salvando automaticamente...' : '';
  },
  flashRascunho(msg){
    const el = document.getElementById('rascunhoStatus');
    if(!el) return;
    el.className = 'rascunho-status ok flash';
    el.textContent = '✓ ' + msg;
    setTimeout(()=>this.renderRascunhoStatus(), 2200);
  },

  /* Lista dos anexos que estavam no rascunho — o conteúdo dos arquivos não é
     guardado, então ao retomar é preciso escolhê-los outra vez. */
  anexosDoRascunho(w){
    const nomes = [];
    Object.keys(w.docs||{}).forEach(id=>{ if(w.docs[id]) nomes.push(w.docs[id].name); });
    if(w.minutaArquivo) nomes.push(w.minutaArquivo.name);
    Object.keys(w.juntaDocs||{}).forEach(id=>{ if(w.juntaDocs[id]) nomes.push(w.juntaDocs[id].name); });
    (w.socios||[]).forEach(s=>{
      if(s.cnh && s.cnh.arquivo) nomes.push(s.cnh.arquivo);
      (s.representantes||[]).forEach(r=>{ if(r.cnh && r.cnh.arquivo) nomes.push(r.cnh.arquivo); });
    });
    return nomes;
  },
  resumoDoRascunho(estado){
    const w = estado.wizard || {};
    const tipo = (TIPOS[w.tipo]||{}).label || 'Processo';
    const cli = w.clienteNovo ? ((w.campos||{}).razaoSocial || 'Nova empresa') : (w.cliente || 'sem cliente');
    const partes = [];
    if((w.socios||[]).length) partes.push((w.socios||[]).length + ' sócio(s)');
    if((w.administradores||[]).length) partes.push((w.administradores||[]).length + ' administrador(es)');
    const anexos = this.anexosDoRascunho(w);
    if(anexos.length) partes.push(anexos.length + ' anexo(s)');
    return {tipo, cli, etapa: w.step || 1, detalhe: partes.join(' · '), anexos};
  },

  /* Retoma o rascunho: repõe o estado inteiro e volta para a etapa onde parou. */
  retomarRascunho(){
    const estado = this.lerRascunho();
    if(!estado){ alert('Não há rascunho guardado neste navegador.'); return; }
    const r = this.resumoDoRascunho(estado);
    Object.keys(estado.wizard).forEach(k=>{ wizard[k] = estado.wizard[k]; });
    wizard.rascunhoId = estado.id;
    wizard.rascunhoSalvoEm = estado.salvoEm;

    /* os arquivos não voltam: limpa as referências para não prometer anexo que
       a ferramenta não tem mais */
    Object.keys(wizard.docs||{}).forEach(id=>{ delete wizard.docs[id]; });
    Object.keys(wizard.juntaDocs||{}).forEach(id=>{ delete wizard.juntaDocs[id]; });
    wizard.minutaArquivo = null;

    this.renderTipoGrid();
    this.renderClientList();
    this.renderStepper();
    this.showStep(Math.min(Math.max(wizard.step||1, 1), 8));
    this.renderRascunhoStatus();
    this.esconderAvisoRascunho();
    if(r.anexos.length){
      alert('Rascunho retomado.\n\nOs dados preenchidos voltaram, mas os arquivos anexados precisam ser escolhidos de novo — o navegador guarda o preenchimento, não o conteúdo dos documentos.\n\nEstavam anexados:\n' + r.anexos.map(n=>'  • '+n).join('\n'));
    }
  },
  esconderAvisoRascunho(){
    const box = document.getElementById('avisoRascunho');
    if(box) box.style.display = 'none';
  },
  descartarRascunhoEConfirmar(){
    if(!confirm('Descartar o rascunho guardado? O preenchimento que estava salvo neste navegador será perdido.')) return;
    this.descartarRascunho();
    this.esconderAvisoRascunho();
  },
  /* Faixa no topo do Novo Processo oferecendo retomar o que ficou pela metade. */
  renderAvisoRascunho(){
    const box = document.getElementById('avisoRascunho');
    if(!box) return;
    const estado = this.lerRascunho();
    if(!estado){ box.style.display = 'none'; box.innerHTML = ''; return; }
    const r = this.resumoDoRascunho(estado);
    const labels = ['Tipo','Cliente','Dados','Documentos','Revisão','Junta Comercial','RFB','Licenciamentos'];
    box.style.display = '';
    box.innerHTML = `
      <div>
        <b>Há um processo pela metade.</b>
        <div style="font-size:12px;margin-top:3px;">
          ${this.escapeHtml(r.tipo)} — ${this.escapeHtml(r.cli)} · parou na etapa ${r.etapa} (${labels[r.etapa-1]||''})${r.detalhe ? ' · ' + this.escapeHtml(r.detalhe) : ''}<br>
          Salvo ${this.dataHoraBr(estado.salvoEm)} por ${this.escapeHtml(estado.usuario||'—')}.
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;flex:none;">
        <button class="btn primary" style="padding:6px 14px;font-size:12px;" onclick="App.retomarRascunho()">Retomar de onde parei</button>
        <button class="btn ghost" style="padding:6px 14px;font-size:12px;" onclick="App.descartarRascunhoEConfirmar()">Descartar</button>
      </div>`;
  },

  /* Cópia em arquivo: serve quando o navegador não guarda nada, quando o
     processo vai continuar em outra máquina, ou como segurança extra. */
  baixarRascunho(){
    if(!this.rascunhoTemConteudo()){ alert('Ainda não há o que salvar. Escolha o tipo de processo e o cliente primeiro.'); return; }
    const estado = this.estadoDoRascunho();
    const nome = 'RASCUNHO_' + (wizard.clienteNovo ? ((wizard.campos.razaoSocial||'NOVA EMPRESA')) : (wizard.cliente||'PROCESSO'))
      + '_' + new Date().toLocaleDateString('pt-BR').replace(/\//g,'.') + '.json';
    const blob = new Blob([JSON.stringify(estado, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome.replace(/[\\/:*?"<>|]/g,'-');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
    this.flashRascunho('Cópia baixada: ' + nome);
  },
  abrirRascunhoArquivo(files){
    if(!files || !files.length) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try{
        const estado = JSON.parse(leitor.result);
        if(!estado || !estado.wizard) throw new Error('este arquivo não é um rascunho da ferramenta');
        try{ window.localStorage.setItem(this.RASCUNHO_CHAVE, JSON.stringify(estado)); }catch(e){}
        Object.keys(estado.wizard).forEach(k=>{ wizard[k] = estado.wizard[k]; });
        wizard.rascunhoId = estado.id;
        wizard.rascunhoSalvoEm = estado.salvoEm;
        Object.keys(wizard.docs||{}).forEach(id=>{ delete wizard.docs[id]; });
        Object.keys(wizard.juntaDocs||{}).forEach(id=>{ delete wizard.juntaDocs[id]; });
        wizard.minutaArquivo = null;
        this.renderTipoGrid(); this.renderClientList(); this.renderStepper();
        this.showStep(Math.min(Math.max(wizard.step||1, 1), 8));
        this.renderRascunhoStatus();
        this.esconderAvisoRascunho();
        this.flashRascunho('Rascunho aberto do arquivo.');
      }catch(e){
        alert('Não consegui abrir este arquivo como rascunho.\n\n' + (e && e.message || e));
      }
    };
    leitor.readAsText(files[0]);
  },

  /* ======================================================================
     PAINEL DE CLIENTES
     Fase 1: lê o objeto CLIENTES_DETALHE (espelho simulado do SharePoint).
     Fase integrada: trocar as leituras por chamadas à Microsoft Graph API.
     ====================================================================== */
  cliSel:{nome:null, altIdx:0},
  cliModo:'cards',
  socioModo:'cards',   /* 'cards' | 'lista' — como o Painel de Clientes exibe as empresas */

  renderClientesGrid(){
    const grid = document.getElementById('clientesGrid');
    if(!grid) return;
    const termo = (document.getElementById('cliBusca')?.value||'').toLowerCase();
    const sit = document.getElementById('cliFiltroSit')?.value || '';

    const externo = this.ehUsuarioCliente();
    const nomes = this.empresasPermitidas().filter(nome=>{
      const d = CLIENTES_DETALHE[nome];
      const alvo = (nome + ' ' + d.dadosCnpj.cnpj + ' ' + d.dadosCnpj.razaoSocial).toLowerCase();
      if(termo && !alvo.includes(termo)) return false;
      if(sit && d.dadosCnpj.situacao !== sit) return false;
      return true;
    });

    /* Fila de pendências é informação interna da GS2 — escondida do usuário de cliente.
       O texto de topo e o bloco do SharePoint também mudam para o público externo. */
    const painelPend = document.getElementById('painelPendencias');
    if(painelPend) painelPend.style.display = externo ? 'none' : '';
    const tituloPainel = document.getElementById('cliViewTitle');
    const subPainel = document.getElementById('cliViewSub');
    if(tituloPainel) tituloPainel.textContent = externo ? 'Minhas Empresas' : 'Painel de Clientes';
    if(subPainel) subPainel.textContent = externo
      ? 'Empresas liberadas para o seu acesso pela GS2. Consulte os dados cadastrais, o histórico societário e baixe ou compartilhe os documentos.'
      : 'Cadastro consolidado de cada cliente: dados atuais do CNPJ, atividades vigentes, quadro societário com documentos pessoais e o histórico ordenado de alterações societárias.';

    const semDocBadge = document.getElementById('semDocBadge');
    const semDocLista = document.getElementById('semDocLista');
    if(semDocBadge) semDocBadge.innerHTML = `<span class="dot"></span>${CLIENTES_SEM_DOCUMENTOS.length} pendentes`;
    if(semDocLista) semDocLista.innerHTML = CLIENTES_SEM_DOCUMENTOS
      .filter(n=>!termo || n.toLowerCase().includes(termo))
      .map(n=>`<span class="badge warn" style="font-weight:600;"><span class="dot"></span>${this.escapeHtml(n)}</span>`).join('')
      || '<p class="view-sub" style="margin:0;">Nenhum cliente pendente com esse filtro.</p>';

    /* Sincroniza o estado visual do seletor Cartões / Lista */
    document.querySelectorAll('#cliViewToggle button').forEach(b=>{
      b.classList.toggle('active', b.getAttribute('data-modo') === this.cliModo);
    });

    if(!nomes.length){
      grid.className = '';
      const semNenhum = !this.empresasPermitidas().length && !termo && !sit;
      grid.innerHTML = semNenhum
        ? (externo
            ? `<div class="empty-state"><div class="ic">🏢</div>Nenhuma empresa liberada para o seu acesso ainda. Fale com a GS2.</div>`
            : `<div class="empty-state"><div class="ic">🏢</div><b>Nenhum cliente ainda.</b><br>Conectada ao SharePoint, esta lista passa a ser as pastas de cliente da biblioteca. Depois, em <b>Administração › Acervo do SharePoint</b>, a varredura preenche as fichas com CNPJ, sócios e histórico.</div>`)
        : `<p class="view-sub">Nenhum cliente encontrado com esse filtro.</p>`;
      return;
    }

    /* resumo por cliente, usado nos dois modos de exibição */
    const resumo = nome=>{
      const d = CLIENTES_DETALHE[nome];
      const ult = d.alteracoes[d.alteracoes.length-1];
      return {
        d: d, ult: ult,
        meta: ALTERACAO_STATUS_META[ult.status] || {label:ult.status, cls:'info'},
        nDocsPend: d.socios.reduce((acc,s)=>acc + s.documentos.filter(x=>x.status!=='ok').length, 0),
        nAtv: 1 + d.atividades.secundarias.length
      };
    };

    if(this.cliModo === 'lista'){
      grid.className = 'panel';
      grid.innerHTML = `
        <div class="panel-body" style="padding:0;">
          <table class="tbl">
            <thead><tr>
              <th>Empresa</th><th>CNPJ</th><th>Situação</th><th>Último ato</th>
              <th style="text-align:center;">Alterações</th><th style="text-align:center;">Atividades</th><th style="text-align:center;">Sócios</th>
            </tr></thead>
            <tbody>
              ${nomes.map(nome=>{
                const r = resumo(nome);
                return `<tr class="cli-linha" onclick="App.openClienteDetalhe('${this.escapeAttr(nome)}')">
                  <td>
                    <div style="font-weight:650;font-size:12.5px;">${this.escapeHtml(r.d.dadosCnpj.razaoSocial)}</div>
                    <div style="font-size:11px;color:var(--muted);">Última movimentação: ${this.escapeHtml(r.ult.data)} — ${this.escapeHtml(r.ult.evento)}</div>
                  </td>
                  <td style="font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;">${this.escapeHtml(r.d.dadosCnpj.cnpj)}</td>
                  <td><span class="badge ${r.d.dadosCnpj.situacao==='ATIVA'?'good':'crit'}"><span class="dot"></span>${this.escapeHtml(r.d.dadosCnpj.situacao)}</span></td>
                  <td>
                    <span class="badge ${r.meta.cls}"><span class="dot"></span>${this.escapeHtml(r.meta.label)}</span>
                    ${r.nDocsPend ? `<span class="badge warn" style="margin-left:4px;"><span class="dot"></span>${r.nDocsPend} doc.</span>` : ''}
                  </td>
                  <td style="text-align:center;font-size:12.5px;">${r.d.alteracoes.length}</td>
                  <td style="text-align:center;font-size:12.5px;">${r.nAtv}</td>
                  <td style="text-align:center;font-size:12.5px;">${r.d.socios.length}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
      return;
    }

    grid.className = 'cli-grid';
    grid.innerHTML = nomes.map(nome=>{
      const r = resumo(nome);
      return `
        <div class="cli-card" onclick="App.openClienteDetalhe('${this.escapeAttr(nome)}')">
          <div class="cli-nome">${this.escapeHtml(r.d.dadosCnpj.razaoSocial)}</div>
          <div class="cli-cnpj">CNPJ ${this.escapeHtml(r.d.dadosCnpj.cnpj)}</div>
          <div class="cli-meta">
            <span class="badge ${r.d.dadosCnpj.situacao==='ATIVA'?'good':'crit'}"><span class="dot"></span>${this.escapeHtml(r.d.dadosCnpj.situacao)}</span>
            <span class="badge ${r.meta.cls}"><span class="dot"></span>${this.escapeHtml(r.meta.label)}</span>
            ${r.nDocsPend ? `<span class="badge warn"><span class="dot"></span>${r.nDocsPend} doc. pendente${r.nDocsPend>1?'s':''}</span>` : ''}
          </div>
          <div class="cli-foot">
            ${r.d.alteracoes.length} alteraç${r.d.alteracoes.length>1?'ões':'ão'} no histórico · ${r.nAtv} atividade${r.nAtv>1?'s':''} no CNPJ · ${r.d.socios.length} sócio${r.d.socios.length>1?'s':''}<br>
            Última movimentação: ${this.escapeHtml(r.ult.data)} — ${this.escapeHtml(r.ult.evento)}
          </div>
        </div>`;
    }).join('');
  },

  /* Alterna entre exibição em cartões e em lista no Painel de Clientes. */
  setModoVisualizacao(modo){
    this.cliModo = (modo === 'lista') ? 'lista' : 'cards';
    this.renderClientesGrid();
  },

  /* Valor que vai virar STRING JAVASCRIPT dentro de um atributo HTML,
     como em  onclick="App.abrir('AQUI')".

     A ORDEM IMPORTA e a versão anterior estava errada: o navegador
     decodifica as entidades HTML ANTES de compilar o JavaScript do
     manipulador. Como o `&` não era escapado, um nome de arquivo do
     SharePoint contendo   &#39;   virava aspa simples na hora da
     compilação, fechava a string e executava o que viesse depois — e
     `& # ; ) /` são todos caracteres legais em nome de arquivo, então
     não era hipótese remota.

     Agora escapa-se primeiro para JavaScript (barra e aspas) e só
     depois para HTML. Assim `\'` chega ao motor JS como aspa escapada,
     e um `&` do dado vira `&amp;`, que decodifica de volta para `&`
     literal — sem nunca virar delimitador. */
  /* Só deixa passar http(s). Um href com `javascript:` executa ao
     clique, e essas URLs vêm de dado, não do código. */
  /* Redesenhar uma lista de centenas de itens a cada tecla é
     desperdício: espera a pessoa parar de digitar por um instante.
     A chave separa os campos, para uma busca não cancelar a outra. */
  _debounces: {},
  aoParar(chave, fn, ms){
    clearTimeout(this._debounces[chave]);
    this._debounces[chave] = setTimeout(fn, ms || 150);
  },

  urlSegura(u){
    const s = String(u == null ? '' : u).trim();
    return /^https?:\/\//i.test(s) ? s : '#';
  },

  escapeAttr(s){
    return this.escapeHtml(
      String(s == null ? '' : s)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/[\r\n\u2028\u2029]/g, ' ')
    );
  },

  openClienteDetalhe(nome){
    this.cliSel.nome = nome;
    if(!CLIENTES_DETALHE[nome]) CLIENTES_DETALHE[nome] = GS2Acervo.formaVazia(nome);
    /* seleciona por padrão a alteração mais recente — a versão vigente */
    this.cliSel.altIdx = (CLIENTES_DETALHE[nome].alteracoes.length - 1);
    /* Relê o acervo deste cliente em segundo plano: se alguém mexeu na
       pasta depois da varredura, a tela se corrige sozinha. */
    this.atualizarAcervoDoCliente(nome);
    document.getElementById('clientesLista').style.display='none';
    document.getElementById('clienteDetalhe').style.display='';
    this.renderClienteDetalhe(true);
  },

  closeClienteDetalhe(){
    this.cliSel.nome = null;
    const det = document.getElementById('clienteDetalhe');
    const lst = document.getElementById('clientesLista');
    if(det) det.style.display='none';
    if(lst) lst.style.display='';
    this.renderClientesGrid();
  },

  renderClienteDetalhe(irParaTopo){
    const nome = this.cliSel.nome;
    const d = CLIENTES_DETALHE[nome];
    if(!d) return;
    const el = document.getElementById('clienteDetalhe');
    const c = d.dadosCnpj;
    const alts = d.alteracoes.slice().sort((a,b)=>a.ordem-b.ordem);
    const vigente = alts[alts.length-1];
    const sel = alts[this.cliSel.altIdx] || vigente;
    const selMeta = ALTERACAO_STATUS_META[sel.status] || {label:sel.status, cls:'info'};

    const endTxt = `${c.endereco.logradouro}, ${c.endereco.numero}${c.endereco.complemento?', '+c.endereco.complemento:''} — ${c.endereco.bairro} — ${c.endereco.municipio}/${c.endereco.uf} — CEP ${c.endereco.cep}`;

    el.innerHTML = `
      <div class="btn-row" style="margin:0 0 14px;justify-content:flex-start;">
        <button class="btn" onclick="App.closeClienteDetalhe()">← Voltar para lista de empresas</button>
      </div>

      <div class="cli-hero">
        <h3>${this.escapeHtml(c.razaoSocial)}</h3>
        <div class="sub">CNPJ ${this.escapeHtml(c.cnpj)} · NIRE ${this.escapeHtml(c.nire)}${c.nomeFantasia && c.nomeFantasia!=='—' ? ' · Nome fantasia: '+this.escapeHtml(c.nomeFantasia) : ''}</div>
        <div class="hero-badges">
          <span class="badge ${c.situacao==='ATIVA'?'good':'crit'}"><span class="dot"></span>${this.escapeHtml(c.situacao)}</span>
          <span class="badge info"><span class="dot"></span>${this.escapeHtml(c.naturezaJuridica)}</span>
          ${c.porte && c.porte!=='—' ? `<span class="badge info"><span class="dot"></span>${this.escapeHtml(c.porte)}</span>` : ''}
          ${c.regime && c.regime!=='—' ? `<span class="badge good"><span class="dot"></span>${this.escapeHtml(c.regime)}</span>` : ''}
          ${this.seloProcedencia ? this.seloProcedencia(nome) : ''}
        </div>
        <div class="btn-row" style="margin:16px 0 0;justify-content:flex-start;">
          ${this.ehUsuarioCliente() ? `
            <button class="btn primary" onclick="App.baixarTodos('${this.escapeAttr(nome)}')">⬇ Baixar todos os documentos</button>
            <button class="btn" onclick="App.abrirCompartilhar('${this.escapeAttr(nome)}', null)">🔗 Compartilhar pasta societária</button>
          ` : `
            <button class="btn primary" onclick="App.novaAlteracaoDoCliente('${this.escapeAttr(nome)}')">🔄 Nova alteração a partir da versão vigente</button>
            <button class="btn" onclick="App.relerCartaoCnpj('${this.escapeAttr(nome)}')" id="btnReOcr">🔍 Reler Cartão CNPJ (OCR)</button>
            <button class="btn" onclick="App.abrirCompartilhar('${this.escapeAttr(nome)}', null)">🔗 Compartilhar pasta societária</button>
          `}
        </div>
      </div>

      ${d.alerta ? `
      <div class="ocr-strip" style="margin-top:14px;background:var(--status-warn-bg);color:var(--status-warn);align-items:flex-start;">
        <span>⚠️</span><span class="grow"><b>Pendência no cadastro:</b> ${this.escapeHtml(d.alerta)}</span>
      </div>` : ''}

      <!-- DADOS ATUAIS DO CNPJ -->
      <div class="panel" style="margin-top:16px;">
        <div class="panel-head"><h3 class="sec-title">Dados atuais do CNPJ</h3><span class="badge info"><span class="dot"></span>via OCR do Cartão CNPJ</span></div>
        <div class="panel-body">
          <div class="ocr-strip" id="ocrStrip">
            <span>🔍</span>
            <span class="grow">Lido de <b>${this.escapeHtml(d.ocr.arquivo)}</b> em <b>${this.escapeHtml(d.ocr.lidoEm)}</b> · ${this.escapeHtml(d.ocr.origem)}</span>
          </div>
          <div class="kv-grid">
            <div class="kv"><div class="k">Abertura</div><div class="v">${this.escapeHtml(c.aberturaData)}</div></div>
            <div class="kv"><div class="k">Situação cadastral</div><div class="v">${this.escapeHtml(c.situacao)}${c.situacaoData&&c.situacaoData!=='—'?' desde '+this.escapeHtml(c.situacaoData):''}</div></div>
            <div class="kv"><div class="k">Capital social</div><div class="v">${this.escapeHtml(c.capitalSocial)}</div></div>
            <div class="kv"><div class="k">Porte</div><div class="v">${this.escapeHtml(c.porte)}</div></div>
            <div class="kv" style="grid-column:1/-1;"><div class="k">Endereço</div><div class="v">${this.escapeHtml(endTxt)}</div></div>
          </div>
        </div>
      </div>

      <!-- ATIVIDADES ATUAIS -->
      <div class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <h3 class="sec-title">Atividades atuais no CNPJ</h3>
          <span class="badge good"><span class="dot"></span>${1 + d.atividades.secundarias.length} atividade${d.atividades.secundarias.length?'s':''}</span>
        </div>
        <div class="panel-body">
          <p class="view-sub" style="margin:0 0 4px;">Este é o quadro vigente na Receita Federal. Ao abrir uma nova Alteração Societária para este cliente, a ferramenta parte exatamente desta lista — o colaborador só inclui ou remove o que muda.</p>
          <div class="atv-list">
            <div class="atv-row principal"><span class="tag">Principal</span><span>${this.escapeHtml(d.atividades.principal)}</span></div>
            ${d.atividades.secundarias.map(a=>`<div class="atv-row"><span class="tag" style="color:#9aa8a5;">Secundária</span><span>${this.escapeHtml(a)}</span></div>`).join('')
              || '<p class="view-sub" style="margin:0;">Nenhuma atividade secundária registrada.</p>'}
          </div>
        </div>
      </div>

      <!-- HISTÓRICO -->
      <div class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <h3 class="sec-title">Histórico de alterações societárias</h3>
          <span class="badge info"><span class="dot"></span>versão vigente: ${vigente.ordem}ª</span>
        </div>
        <div class="panel-body">
          <p class="view-sub" style="margin:0 0 12px;">Em ordem cronológica. Clique em uma alteração para ver o resumo do que mudou naquele ato.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;align-items:start;">
            <div class="tl">
              ${alts.map((a,i)=>{
                const m = ALTERACAO_STATUS_META[a.status] || {label:a.status, cls:'info'};
                const temDoc = a.documento && a.documento !== '—';
                return `
                <div class="tl-item ${i===this.cliSel.altIdx?'sel':''}" onclick="App.selecionarAlteracao(${i})">
                  <div class="tl-ord">${a.ordem}ª alteração${i===alts.length-1?' · vigente':''}</div>
                  <div class="tl-ev">${this.escapeHtml(a.evento)}</div>
                  <div class="tl-meta">
                    <span>${this.escapeHtml(a.data)}</span>
                    <span class="badge ${m.cls}"><span class="dot"></span>${this.escapeHtml(m.label)}</span>
                    ${a.protocolo && a.protocolo!=='—' ? `<span>Protocolo ${this.escapeHtml(a.protocolo)}</span>` : ''}
                  </div>
                  ${temDoc ? `
                  <div class="tl-doc">
                    <div class="tl-doc-nome" title="${this.escapeAttr(a.documento)}">📄 ${this.escapeHtml(a.documento)}</div>
                    <div class="tl-doc-acoes">
                      <button class="btn" onclick="event.stopPropagation();App.baixarArquivo('${this.escapeAttr(nome)}','${this.escapeAttr(a.documento)}')">⬇ Baixar</button>
                      <button class="btn" onclick="event.stopPropagation();App.compartilharArquivo('${this.escapeAttr(nome)}','${this.escapeAttr(a.documento)}')">🔗 Compartilhar</button>
                    </div>
                  </div>` : `
                  <div class="tl-doc">
                    <div class="tl-doc-nome" style="color:var(--muted);font-style:italic;">Documento ainda não gerado para este ato</div>
                  </div>`}
                </div>`;
              }).join('')}
            </div>

            <div class="panel" style="box-shadow:none;">
              <div class="panel-head" style="padding:13px 16px;">
                <h3 class="sec-title">Resumo do que foi alterado</h3>
                <span class="badge ${selMeta.cls}"><span class="dot"></span>${this.escapeHtml(selMeta.label)}</span>
              </div>
              <div class="panel-body" style="padding:14px 16px;">
                <div class="kv-grid" style="margin-bottom:12px;">
                  <div class="kv"><div class="k">Ato</div><div class="v">${sel.ordem}ª — ${this.escapeHtml(sel.evento)}</div></div>
                  <div class="kv"><div class="k">Data</div><div class="v">${this.escapeHtml(sel.data)}</div></div>
                  <div class="kv"><div class="k">Responsável</div><div class="v">${this.escapeHtml(sel.responsavel)}</div></div>
                  <div class="kv"><div class="k">Protocolo</div><div class="v">${this.escapeHtml(sel.protocolo)}</div></div>
                </div>
                <table class="diff">
                  <thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
                  <tbody>
                    ${sel.resumo.map(r=>`<tr>
                      <td class="campo">${this.escapeHtml(r.campo)}</td>
                      <td class="de">${this.escapeHtml(r.de)}</td>
                      <td class="para">${this.escapeHtml(r.para)}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>
                <div style="margin-top:12px;display:flex;gap:9px;flex-wrap:wrap;align-items:center;">
                  ${sel.documento && sel.documento!=='—'
                    ? `<a style="font-size:12.5px;color:var(--status-info);cursor:pointer;" onclick="App.abrirDocumentoSharePoint('${this.escapeAttr(c.cnpj)}','${this.escapeAttr(sel.documento)}')">📄 ${this.escapeHtml(sel.documento)}</a>`
                    : `<span class="view-sub" style="font-size:12px;">Documento ainda não gerado para este ato.</span>`}
                  ${sel.processoId && !this.ehUsuarioCliente() ? `<button class="btn" style="padding:5px 12px;font-size:12px;" onclick="App.navigate('processos')">Ver processo #${sel.processoId}</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DOCUMENTOS SOCIETÁRIOS: DOWNLOAD E COMPARTILHAMENTO -->
      <div class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <h3 class="sec-title">Documentos societários</h3>
          <span class="badge info"><span class="dot"></span>${this.documentosDoCliente(nome).length} arquivo(s)</span>
        </div>
        <div class="panel-body">
          <p class="view-sub" style="margin:0 0 12px;">Arquivos guardados em <code>03 - Societario</code> na pasta do cliente. Use <b>Baixar</b> para salvar o arquivo ou <b>Compartilhar</b> para gerar um link com prazo de validade — o link pode ser enviado ao cliente por WhatsApp ou e-mail, sem precisar dar acesso ao SharePoint.</p>
          <table class="tbl">
            <thead><tr><th>Documento</th><th>Pasta</th><th style="width:190px;text-align:right;">Ações</th></tr></thead>
            <tbody>
              ${this.documentosDoCliente(nome).map((doc,i)=>`
                <tr>
                  <td>
                    <div style="font-weight:600;font-size:12.5px;">${this.escapeHtml(doc.arquivo)}</div>
                    <div style="font-size:11px;color:var(--muted);">${this.escapeHtml(doc.tipo)}</div>
                  </td>
                  <td style="font-size:11.5px;color:var(--muted);font-family:ui-monospace,monospace;">${this.escapeHtml(doc.pasta)}</td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button class="btn" style="padding:5px 11px;font-size:11.5px;" onclick="App.baixarDocumento('${this.escapeAttr(nome)}',${i})">⬇ Baixar</button>
                    <button class="btn" style="padding:5px 11px;font-size:11.5px;" onclick="App.abrirCompartilhar('${this.escapeAttr(nome)}',${i})">🔗 Compartilhar</button>
                  </td>
                </tr>`).join('') || '<tr><td colspan="3" style="color:var(--muted);font-size:12.5px;">Nenhum documento societário arquivado para este cliente.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SÓCIOS E DOCUMENTOS -->
      <div class="panel" style="margin-top:16px;margin-bottom:24px;">
        <div class="panel-head">
          <h3 class="sec-title">Sócios e documentos pessoais</h3>
          <span class="badge info"><span class="dot"></span>${d.socios.length} pessoa${d.socios.length>1?'s':''}</span>
        </div>
        <div class="panel-body">
          <p class="view-sub" style="margin:0 0 12px;">Documentos guardados na pasta do cliente no SharePoint. Um documento vencido ou faltando bloqueia o protocolo na Junta — por isso ele aparece sinalizado aqui, antes de o processo começar.</p>
          ${d.socios.map(s=>`
            <div class="socio-card">
              <div class="socio-head">
                <span class="nm">${this.escapeHtml(s.nome)}</span>
                <span class="cp">CPF ${this.escapeHtml(s.cpf)}</span>
                ${s.participacao && s.participacao!=='—' ? `<span class="badge good"><span class="dot"></span>${this.escapeHtml(s.participacao)}</span>` : ''}
                <span class="badge info"><span class="dot"></span>${this.escapeHtml(s.cargo)}</span>
              </div>
              ${s.documentos.map(doc=>{
                const dm = DOC_STATUS_META[doc.status] || {label:doc.status, cls:'info'};
                return `<div class="doc-row">
                  <span class="dt">${this.escapeHtml(doc.tipo)}</span>
                  <span class="df">${doc.arquivo && doc.arquivo!=='—'
                    ? `<a onclick="App.abrirDocumentoSharePoint('${this.escapeAttr(c.cnpj)}','${this.escapeAttr(doc.arquivo)}')">${this.escapeHtml(doc.arquivo)}</a>`
                    : '<span style="color:var(--muted);">não anexado</span>'}</span>
                  <span style="flex:none;font-size:11.5px;color:var(--muted);">${doc.validade!=='—'?'val. '+this.escapeHtml(doc.validade):''}</span>
                  <span class="badge ${dm.cls}" style="flex:none;"><span class="dot"></span>${this.escapeHtml(dm.label)}</span>
                </div>`;
              }).join('')}
            </div>`).join('')}
        </div>
      </div>
    `;
    if(irParaTopo) window.scrollTo({top:0, behavior:'smooth'});
  },

};
