/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */

/* ===================================================================
   CAMADA DE AMBIENTE, AUTENTICAÇÃO E SHAREPOINT
   ===================================================================
   Esta ferramenta roda como página estática (Azure Static Web Apps).
   Não existe servidor próprio: o login é feito pelo Microsoft Entra ID
   da GS2 e o SharePoint é acessado pelo Microsoft Graph EM NOME DA
   PESSOA LOGADA (permissão delegada). Ou seja: quem não enxerga uma
   pasta no SharePoint também não a enxerga aqui.

   Dois modos de funcionamento, decididos sozinhos:
     • entra — tenantId/clientId preenchidos + biblioteca MSAL carregada
               + página servida por http/https. Login e SharePoint REAIS.
     • demo  — qualquer outra situação (ex.: abrir o arquivo .html direto
               do disco). Tudo simulado, como no protótipo. Serve para
               testar a interface sem tocar no SharePoint da GS2.

   Para publicar, NÃO edite este arquivo: coloque um `config.js` ao lado
   dele definindo window.GS2_CONFIG_OVERRIDE (ver README-implantacao.md).
   =================================================================== */

const GS2_CONFIG = {
  /* Entra ID (Azure AD) — preencher no config.js do ambiente */
  tenantId: '',
  clientId: '',

  /* Só e-mails deste domínio entram como "Usuário GS2" */
  dominioGS2: 'gs2negocios.com.br',

  /* Quem entra como Administrador (o resto da equipe entra como Colaborador) */
  administradores: ['vinicius@gs2negocios.com.br'],

  /* Site e biblioteca reais do SharePoint da GS2 */
  sharepoint: {
    hostname: 'gs2negociosmt.sharepoint.com',
    sitePath: '/sites/clientes',
    biblioteca: 'Documentos Compartilhados',
    /* pasta usada só pelo teste de gravação do diagnóstico */
    pastaTestes: 'Z - Testes da Ferramenta'
  },

  /* Permissões delegadas pedidas no login */
  escopos: ['User.Read', 'Sites.ReadWrite.All'],

  /* Página de retorno do login. Precisa estar registrada no Entra ID como
     "URI de Redirecionamento" (plataforma SPA). Vazio = <origem>/auth.html,
     que é uma página em branco publicada junto com a ferramenta. */
  redirectUri: '',

  /* Clientes externos também entram pelo Entra ID (convidados B2B)?
     false = valida só contra o cadastro de Usuários de Clientes. */
  clientesViaEntra: false,

  /* 'auto' | 'demo' | 'entra' */
  modo: 'auto'
};

/* config.js do ambiente (opcional) sobrescreve o que estiver acima */
if (typeof window !== 'undefined' && window.GS2_CONFIG_OVERRIDE) {
  const o = window.GS2_CONFIG_OVERRIDE;
  Object.keys(o).forEach(k => {
    if (k === 'sharepoint' && o.sharepoint) Object.assign(GS2_CONFIG.sharepoint, o.sharepoint);
    else GS2_CONFIG[k] = o[k];
  });
}
/* atalho de teste local: gs2.config.local no localStorage (ver README) */
try {
  const local = JSON.parse(localStorage.getItem('gs2.config.local') || 'null');
  if (local) {
    Object.keys(local).forEach(k => {
      if (k === 'sharepoint' && local.sharepoint) Object.assign(GS2_CONFIG.sharepoint, local.sharepoint);
      else GS2_CONFIG[k] = local[k];
    });
  }
} catch (e) { /* localStorage bloqueado — segue com a configuração embutida */ }

/* ---------------------- Autenticação ---------------------- */
const GS2Auth = {
  app: null,
  conta: null,
  _iniciado: false,

  configurado(){ return !!(GS2_CONFIG.tenantId && GS2_CONFIG.clientId); },
  bibliotecaOk(){ return typeof msal !== 'undefined' && !!(msal && msal.PublicClientApplication); },
  servidoPorHttp(){ return location.protocol === 'http:' || location.protocol === 'https:'; },

  modo(){
    if(GS2_CONFIG.modo === 'demo') return 'demo';
    if(GS2_CONFIG.modo === 'entra') return 'entra';
    return (this.configurado() && this.bibliotecaOk() && this.servidoPorHttp()) ? 'entra' : 'demo';
  },
  real(){ return this.modo() === 'entra'; },

  /* Por que caiu em demonstração — mostrado na tela de login e no diagnóstico */
  motivoDemo(){
    if(GS2_CONFIG.modo === 'demo') return 'A configuração está fixada em modo demonstração (GS2_CONFIG.modo = "demo").';
    if(!this.servidoPorHttp()) return 'O arquivo foi aberto direto do disco (file://). O login Microsoft exige que a página seja servida por um endereço http/https.';
    if(!this.configurado()) return 'Faltam o tenantId e o clientId do registro no Entra ID (defina-os no config.js do ambiente).';
    if(!this.bibliotecaOk()) return 'A biblioteca de autenticação (vendor/msal-browser.min.js) não foi carregada junto com a página.';
    return 'Modo demonstração.';
  },

  async iniciar(){
    if(this._iniciado || !this.real()) return;
    this.app = new msal.PublicClientApplication({
      auth: {
        clientId: GS2_CONFIG.clientId,
        authority: 'https://login.microsoftonline.com/' + GS2_CONFIG.tenantId,
        redirectUri: GS2_CONFIG.redirectUri || (location.origin + '/auth.html')
      },
      cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false }
    });
    await this.app.initialize();
    const r = await this.app.handleRedirectPromise();
    if(r && r.account) this.conta = r.account;
    this._iniciado = true;
  },

  /* Sessão que já existia (o usuário recarregou a página) */
  contaEmCache(){
    if(!this.app) return null;
    const c = this.app.getAllAccounts();
    return c && c.length ? c[0] : null;
  },

  async entrar(emailSugerido){
    await this.iniciar();
    const req = { scopes: GS2_CONFIG.escopos, prompt: 'select_account' };
    if(emailSugerido) req.loginHint = emailSugerido;
    const r = await this.app.loginPopup(req);
    this.conta = r.account;
    this.app.setActiveAccount(r.account);
    return r.account;
  },

  async token(escopos){
    if(!this.real()) throw new Error('Sem sessão Microsoft: a ferramenta está em modo demonstração.');
    await this.iniciar();
    const conta = this.conta || this.contaEmCache();
    if(!conta) throw new Error('Ninguém autenticado nesta sessão.');
    const req = { scopes: escopos || GS2_CONFIG.escopos, account: conta };
    try{
      const r = await this.app.acquireTokenSilent(req);
      return r.accessToken;
    }catch(e){
      const r = await this.app.acquireTokenPopup(req);
      return r.accessToken;
    }
  },

  async sair(){
    if(!this.real() || !this.app) return;
    const conta = this.conta || this.contaEmCache();
    this.conta = null;
    if(conta){ try{ await this.app.logoutPopup({ account: conta }); }catch(e){} }
  },

  emailDaConta(conta){
    return String((conta && (conta.username || conta.idTokenClaims && conta.idTokenClaims.preferred_username)) || '').toLowerCase();
  },
  papelDe(email){
    const e = String(email||'').toLowerCase();
    return (GS2_CONFIG.administradores||[]).map(x=>String(x).toLowerCase()).indexOf(e) > -1
      ? 'Administrador' : 'Colaborador';
  },
  ehDominioGS2(email){
    return String(email||'').toLowerCase().endsWith('@' + String(GS2_CONFIG.dominioGS2).toLowerCase());
  }
};

/* ---------------------- API da ferramenta (backend) ----------------------
   Até aqui, tudo que a ferramenta guardava vivia na memória do navegador:
   recarregou a página, acabou. Com o backend no ar, o banco passa a ser a
   verdade sobre o ESTADO dos processos — enquanto o SharePoint continua
   sendo a verdade sobre os DOCUMENTOS. Autoridade não se duplica.

   A regra de convivência é simples:
     • API respondendo  → ela manda. O que está no banco é o que aparece.
     • API fora do ar   → a ferramenta continua funcionando em memória,
                          avisa na tela, e nada do que a pessoa está
                          fazendo se perde por causa disso.

   O token daqui NÃO é o mesmo que fala com o SharePoint: aquele tem
   audiência do Graph. Para a nossa API o MSAL pede um segundo token, com
   o escopo api://{clientId}/access_as_user, e é esse que a API valida por
   assinatura antes de aceitar qualquer coisa. */
const GS2Api = {
  base: '/api',
  disponivel: false,
  info: null,
  ultimoErro: '',

  escoposApi(){
    const id = GS2_CONFIG.clientId;
    return id ? ['api://' + id + '/access_as_user'] : [];
  },

  async cabecalhos(){
    const h = {'Content-Type': 'application/json'};
    if(GS2Auth.real()){
      try{ h['Authorization'] = 'Bearer ' + await GS2Auth.token(this.escoposApi()); }
      catch(e){ /* sem token: a API responde 401 e a ferramenta cai para memória */ }
    } else if(currentUser && currentUser.email){
      /* modo demonstração/local: a API não tem como validar token nenhum,
         então aceita identidade declarada — e por isso o servidor local
         escuta só em 127.0.0.1 */
      h['x-gs2-demo-email'] = currentUser.email;
      h['x-gs2-demo-nome'] = currentUser.nome || '';
    }
    return h;
  },

  async chamar(caminho, opcoes){
    opcoes = opcoes || {};
    const r = await fetch(this.base + caminho, {
      method: opcoes.metodo || 'GET',
      headers: await this.cabecalhos(),
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined
    });
    const tipo = r.headers.get('content-type') || '';
    const dados = tipo.indexOf('json') > -1 ? await r.json() : await r.text();
    if(!r.ok){
      const err = new Error((dados && dados.erro) || ('API ' + r.status));
      err.status = r.status;
      throw err;
    }
    return dados;
  },

  /* Existe backend? Chamada sem autenticação, de propósito. */
  async verificar(){
    try{
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 4000);
      const r = await fetch(this.base + '/saude', {signal: ctrl.signal});
      clearTimeout(t);
      if(!r.ok) throw new Error('HTTP ' + r.status);
      this.info = await r.json();
      this.disponivel = true;
      this.ultimoErro = '';
    }catch(e){
      this.disponivel = false;
      this.info = null;
      this.ultimoErro = e.name === 'AbortError' ? 'a API não respondeu a tempo' : e.message;
    }
    return this.disponivel;
  },

  /* Carga inicial: uma chamada só, no login. */
  async carregarEstado(){
    if(!this.disponivel) return null;
    const e = await this.chamar('/estado');
    if(Array.isArray(e.processos)){
      if(e.processos.length){
        /* o banco tem dado: ele manda, e os exemplos embutidos somem */
        PROCESSOS = e.processos;
        this.exemplosPendentes = null;
      } else {
        /* banco vazio (primeira execução): os exemplos continuam na tela,
           marcados como não gravados, para o administrador decidir se sobem */
        this.exemplosPendentes = PROCESSOS.slice();
        PROCESSOS.forEach(p=>{ p._persistido = false; });
      }
    }
    const c = e.cadastros || {};
    if(Array.isArray(c.usuarios) && c.usuarios.length)        USERS = c.usuarios;
    if(Array.isArray(c.requerentes) && c.requerentes.length)  REQUERENTES = c.requerentes;
    if(Array.isArray(c.usuariosCliente) && c.usuariosCliente.length) USUARIOS_CLIENTE = c.usuariosCliente;
    /* O contêiner de cadastros usa `tipo` como chave de partição, e o
       modelo de contrato também chama de `tipo` o tipo de PROCESSO
       (abertura, alteração…). Na gravação o campo é renomeado para
       `tipoProcesso`; aqui volta ao nome que a tela conhece. Sem isso,
       depois de semear o banco, a tela "Modelos de Contrato" quebrava. */
    if(Array.isArray(c.modelos) && c.modelos.length){
      TEMPLATES = c.modelos.map(m => Object.assign({}, m, { tipo: m.tipoProcesso || m.tipo }));
    }
    if(Array.isArray(c.pessoas)){
      const base = {};
      c.pessoas.forEach(p=>{ if(p.cpfChave) base[p.cpfChave] = p; });
      if(c.pessoas.length) PESSOAS_CADASTRO = base;
    }
    return e;
  },

  /* ---- gravações (não travam a tela: falha vira aviso, não perda) ---- */
  async salvarProcesso(p){
    if(!this.disponivel || !p) return;
    const existe = !!(p._persistido);
    try{
      const salvo = existe
        ? await this.chamar('/processos/' + encodeURIComponent(p.id), {metodo:'PUT', corpo:p})
        : await this.chamar('/processos', {metodo:'POST', corpo:p});
      p._persistido = true;
      p.alteradoEm = salvo.alteradoEm;
      /* O servidor gera o id na criação (o do navegador não é confiável e
         colidia entre dois cliques no mesmo milissegundo). Adotar o id
         devolvido, senão a tela guarda um id que o banco não conhece e o
         botão "Acompanhar" para de achar o processo. */
      if(salvo && salvo.id) p.id = salvo.id;
      return salvo;
    }catch(e){ App.avisarFalhaApi('gravar o processo', e); }
  },

  async salvarCadastro(tipo, id, doc){
    if(!this.disponivel || !id) return;
    /* ver o comentário em carregarEstado: `tipo` do modelo vira `tipoProcesso` */
    let corpo = doc;
    if(tipo === 'modelos' && doc && doc.tipo){
      corpo = Object.assign({}, doc, { tipoProcesso: doc.tipo });
      delete corpo.tipo;
    }
    try{ return await this.chamar(`/cadastros/${tipo}/${encodeURIComponent(id)}`, {metodo:'PUT', corpo}); }
    catch(e){ App.avisarFalhaApi('gravar o cadastro', e); }
  },

  async apagarCadastro(tipo, id){
    if(!this.disponivel || !id) return;
    try{ return await this.chamar(`/cadastros/${tipo}/${encodeURIComponent(id)}`, {metodo:'DELETE'}); }
    catch(e){ App.avisarFalhaApi('apagar o cadastro', e); }
  },

  async auditoria(dia){
    return this.chamar('/auditoria' + (dia ? '?dia=' + encodeURIComponent(dia) : ''));
  },

  /* Semeadura explícita: leva para o banco o que hoje só existe nesta tela.
     É um ato consciente do administrador porque entre os dados de exemplo
     há CPF e CNPJ reais — não pode acontecer sozinho. */
  async semear(){
    const conta = {processos:0, usuarios:0, requerentes:0, usuariosCliente:0, modelos:0, pessoas:0};
    /* Com o id gerado no servidor, semear duas vezes duplica os exemplos.
       Um clique duplo no botão, ou um segundo administrador clicando ao
       mesmo tempo, não pode fazer isso. */
    if(this._semeando) return conta;
    const ja = await this.chamar('/processos').catch(() => []);
    if(Array.isArray(ja) && ja.length){
      this.exemplosPendentes = null;
      throw new Error('O banco já tem ' + ja.length + ' processo(s) — os exemplos não foram enviados de novo.');
    }
    this._semeando = true;
    try{
    for(const p of (this.exemplosPendentes || PROCESSOS)){
      await this.chamar('/processos', {metodo:'POST', corpo:p}); conta.processos++;
    }
    for(const u of USERS){ await this.salvarCadastro('usuarios', u.id, u); conta.usuarios++; }
    for(const r of REQUERENTES){ await this.salvarCadastro('requerentes', r.id, r); conta.requerentes++; }
    for(const u of USUARIOS_CLIENTE){ await this.salvarCadastro('usuariosCliente', u.id, u); conta.usuariosCliente++; }
    for(const t of TEMPLATES){ await this.salvarCadastro('modelos', t.id, t); conta.modelos++; }
    for(const cpf of Object.keys(PESSOAS_CADASTRO||{})){
      const p = Object.assign({cpfChave: cpf}, PESSOAS_CADASTRO[cpf]);
      await this.salvarCadastro('pessoas', 'pessoa-' + cpf, p); conta.pessoas++;
    }
    PROCESSOS.forEach(p=>{ p._persistido = true; });
    this.exemplosPendentes = null;
    return conta;
    }finally{
      this._semeando = false;
    }
  }
};

/* ---------------------- SharePoint (Microsoft Graph) ---------------------- */
const GS2SP = {
  RAIZ: 'https://graph.microsoft.com/v1.0',
  _site: null,
  _drive: null,

  disponivel(){ return GS2Auth.real() && !!(GS2Auth.conta || GS2Auth.contaEmCache()); },

  async chamar(caminho, opts){
    opts = opts || {};
    const token = await GS2Auth.token(opts.escopos);
    const url = caminho.indexOf('http') === 0 ? caminho : this.RAIZ + caminho;
    const cabecalhos = Object.assign({ Authorization: 'Bearer ' + token }, opts.headers || {});
    if(opts.json !== undefined){
      cabecalhos['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.json);
    }
    const r = await fetch(url, { method: opts.method || 'GET', headers: cabecalhos, body: opts.body });
    if(!r.ok){
      let detalhe = '';
      try{ const j = await r.json(); detalhe = (j.error && (j.error.message || j.error.code)) || ''; }catch(e){}
      const err = new Error(`Graph ${r.status} ${r.statusText}${detalhe ? ' — ' + detalhe : ''}`);
      err.status = r.status;
      throw err;
    }
    if(r.status === 204) return null;
    const tipo = r.headers.get('content-type') || '';
    return tipo.indexOf('application/json') > -1 ? r.json() : r.text();
  },

  async eu(){ return this.chamar('/me'); },

  async site(){
    if(this._site) return this._site;
    const sp = GS2_CONFIG.sharepoint;
    this._site = await this.chamar(`/sites/${sp.hostname}:${sp.sitePath}`);
    return this._site;
  },

  async drive(){
    if(this._drive) return this._drive;
    const site = await this.site();
    const lista = await this.chamar(`/sites/${site.id}/drives`);
    const alvo = (lista.value || []).find(d => d.name === GS2_CONFIG.sharepoint.biblioteca);
    this._drive = alvo || await this.chamar(`/sites/${site.id}/drive`);
    return this._drive;
  },

  /* caminho relativo à raiz da biblioteca → segmento de URL do Graph */
  _cam(caminho){
    const limpo = String(caminho || '').replace(/^\/+|\/+$/g, '');
    return limpo ? ':/' + limpo.split('/').map(encodeURIComponent).join('/') + ':' : '';
  },

  async item(caminho){
    const d = await this.drive();
    return this.chamar(`/drives/${d.id}/root${this._cam(caminho)}`);
  },

  async listar(caminho){
    const d = await this.drive();
    const seg = this._cam(caminho);
    let url = `/drives/${d.id}/root${seg}${seg ? '/children' : '/children'}?$top=200&$select=id,name,folder,file,size,lastModifiedDateTime,webUrl`;
    const itens = [];
    while(url){
      const p = await this.chamar(url);
      (p.value || []).forEach(i => itens.push(i));
      url = p['@odata.nextLink'] || null;
    }
    return itens;
  },

  /* Pastas de clientes = pastas na raiz da biblioteca, tirando as pastas de
     letra (A, B, C…) e as auxiliares da GS2 que começam com "Z ". */
  async pastasClientes(){
    const itens = await this.listar('');
    return itens
      .filter(i => i.folder)
      .map(i => i.name)
      .filter(n => n.trim().length > 2 && !/^Z\s*[-–]/i.test(n.trim()))
      .sort((a,b) => a.localeCompare(b, 'pt-BR'));
  },

  async criarPasta(caminhoPai, nome){
    const d = await this.drive();
    const seg = this._cam(caminhoPai);
    try{
      return await this.chamar(`/drives/${d.id}/root${seg}/children`, {
        method: 'POST',
        json: { name: nome, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }
      });
    }catch(e){
      if(e.status === 409) return this.item((caminhoPai ? caminhoPai + '/' : '') + nome); /* já existia */
      throw e;
    }
  },

  /* Cria todos os níveis de um caminho, ignorando o que já existe */
  async garantirCaminho(caminho){
    const partes = String(caminho||'').split('/').filter(Boolean);
    let atual = '';
    let ultimo = null;
    for(const parte of partes){
      ultimo = await this.criarPasta(atual, parte);
      atual = atual ? atual + '/' + parte : parte;
    }
    return ultimo;
  },

  /* Replica a estrutura padrão de pastas da GS2 dentro da pasta de um cliente */
  async criarEstruturaCliente(nomeCliente, arvore){
    await this.criarPasta('', nomeCliente);
    const criadas = [];
    const desce = async (base, nos) => {
      for(const no of nos){
        const caminho = base + '/' + no.nome;
        await this.criarPasta(base, no.nome);
        criadas.push(caminho);
        if(no.filhos && no.filhos.length) await desce(caminho, no.filhos);
      }
    };
    await desce(nomeCliente, arvore);
    return criadas;
  },

  /* Envio de arquivo. Até 4 MB vai direto; acima disso usa sessão de upload. */
  async enviarArquivo(caminhoPasta, nomeArquivo, arquivo){
    const d = await this.drive();
    const destino = (caminhoPasta ? caminhoPasta.replace(/\/+$/,'') + '/' : '') + nomeArquivo;
    if(arquivo.size <= 4 * 1024 * 1024){
      return this.chamar(`/drives/${d.id}/root${this._cam(destino)}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': arquivo.type || 'application/octet-stream' },
        body: arquivo
      });
    }
    const sessao = await this.chamar(`/drives/${d.id}/root${this._cam(destino)}/createUploadSession`, {
      method: 'POST',
      json: { item: { '@microsoft.graph.conflictBehavior': 'replace' } }
    });
    const PEDACO = 5 * 1024 * 1024;
    let inicio = 0, resposta = null;
    while(inicio < arquivo.size){
      const fim = Math.min(inicio + PEDACO, arquivo.size);
      const trecho = arquivo.slice(inicio, fim);
      const r = await fetch(sessao.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': String(fim - inicio),
          'Content-Range': `bytes ${inicio}-${fim-1}/${arquivo.size}`
        },
        body: trecho
      });
      if(!r.ok) throw new Error(`Falha ao enviar o trecho ${inicio}-${fim} de ${nomeArquivo} (HTTP ${r.status}).`);
      if(r.status === 200 || r.status === 201) resposta = await r.json();
      inicio = fim;
    }
    return resposta;
  },

  async linkCompartilhamento(itemId, tipo, escopo, expiraEmIso){
    const d = await this.drive();
    const corpo = { type: tipo || 'view', scope: escopo || 'organization' };
    if(expiraEmIso) corpo.expirationDateTime = expiraEmIso;
    const r = await this.chamar(`/drives/${d.id}/items/${itemId}/createLink`, { method:'POST', json: corpo });
    return r.link ? r.link.webUrl : null;
  },

  async urlDeDownload(caminho){
    const it = await this.item(caminho);
    return it['@microsoft.graph.downloadUrl'] || it.webUrl;
  }
};
