#!/usr/bin/env node
/* =====================================================================
   Regressão de segurança da API.

       node testes/seguranca-da-api.js

   Cada teste aqui corresponde a um defeito REAL encontrado na auditoria
   de 08/09/2026 e corrigido no mesmo dia. Não são hipóteses: são as
   portas que estavam abertas. Se um destes voltar a passar, a porta
   reabriu.

   Sobe o servidor local em porta própria e fala com ele por HTTP.
   ===================================================================== */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RAIZ = path.join(__dirname, '..');
const PORTA = 5199;
const BASE = `http://127.0.0.1:${PORTA}`;
const PASTA = path.join(RAIZ, '.dados-teste-seguranca');

const ADMIN = { 'x-gs2-demo-email': 'vinicius@gs2negocios.com.br' };
const COLAB = { 'x-gs2-demo-email': 'colaborador@gs2negocios.com.br' };
const CLIENTE = { 'x-gs2-demo-email': 'externo@abthex.com.br' };

/* A limpeza nunca pode derrubar o teste: em ambiente com restrição de
   remoção, o resultado da bateria vale mais que a faxina. */
function limpar(alvo) {
  try { fs.rmSync(alvo, { recursive: true, force: true }); }
  catch (e) { console.log('  (não consegui apagar ' + path.basename(alvo) + ' — apague à mão)'); }
}

let falhas = 0, feitos = 0;
function confere(titulo, condicao, detalhe) {
  feitos++;
  if (condicao) { console.log('  ✓ ' + titulo); }
  else { falhas++; console.log('  ✗ ' + titulo + (detalhe !== undefined ? '\n      ' + detalhe : '')); }
}

async function chamar(caminho, opcoes = {}) {
  const r = await fetch(BASE + caminho, {
    method: opcoes.metodo || 'GET',
    headers: Object.assign({ 'Content-Type': 'application/json' }, opcoes.cabecalhos || {}),
    body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined
  });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch (e) { /* resposta em texto puro */ }
  return { status: r.status, texto, json };
}

/* Roda um trecho de código com o ambiente que a PRODUÇÃO teria, num
   processo separado — é a única forma de testar a configuração sem
   contaminar este. */
function comAmbiente(env, codigo) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', codigo], {
    cwd: RAIZ,
    env: Object.assign({}, process.env, env, { GS2_PERMITIR_DEMO: env.GS2_PERMITIR_DEMO || '' }),
    encoding: 'utf8'
  });
  return (r.stdout || '') + (r.stderr || '');
}

(async () => {
  limpar(PASTA);

  const servidor = spawn(process.execPath, ['servidor-local.js', String(PORTA)], {
    cwd: RAIZ,
    env: Object.assign({}, process.env, { GS2_PASTA_DADOS: PASTA }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const logServidor = [];
  servidor.stdout.on('data', d => logServidor.push(String(d)));
  servidor.stderr.on('data', d => logServidor.push(String(d)));

  for (let i = 0; i < 60; i++) {
    try { await chamar('/api/saude'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); }
  }

  console.log('\n  Regressão de segurança da API\n');

  /* ---------- 1. Modo demonstração precisa ser ligado de propósito ---------- */
  const semDemo = comAmbiente({ GS2_TENANT_ID: '', GS2_CLIENT_ID: '', GS2_PERMITIR_DEMO: '' },
    `const {identificar}=require('./api/src/auth');
     identificar({'x-gs2-demo-email':'vinicius@gs2negocios.com.br'})
       .then(u=>console.log(u ? 'IDENTIFICOU:'+u.papel : 'RECUSOU'));`);
  confere('sem Entra e sem GS2_PERMITIR_DEMO, a API não autentica ninguém',
    /RECUSOU/.test(semDemo), semDemo.trim());

  const comDemo = comAmbiente({ GS2_TENANT_ID: '', GS2_CLIENT_ID: '', GS2_PERMITIR_DEMO: '1' },
    `const {identificar}=require('./api/src/auth');
     identificar({'x-gs2-demo-email':'vinicius@gs2negocios.com.br'})
       .then(u=>console.log(u ? 'IDENTIFICOU:'+u.papel : 'RECUSOU'));`);
  confere('com GS2_PERMITIR_DEMO=1 a demonstração continua funcionando',
    /IDENTIFICOU:Administrador/.test(comDemo), comDemo.trim());

  const comEntra = comAmbiente({ GS2_TENANT_ID: 'abc', GS2_CLIENT_ID: 'def', GS2_PERMITIR_DEMO: '1' },
    `const {identificar}=require('./api/src/auth');
     identificar({'x-gs2-demo-email':'vinicius@gs2negocios.com.br'})
       .then(u=>console.log(u ? 'IDENTIFICOU' : 'RECUSOU'));`);
  confere('com Entra configurado, cabeçalho de demonstração não vale nada',
    /RECUSOU/.test(comEntra), comEntra.trim());

  /* ---------- 2. Banco precisa de escolha explícita ---------- */
  const bancoSolto = comAmbiente({ GS2_TENANT_ID: 'abc', GS2_CLIENT_ID: 'def', GS2_BANCO: '', COSMOS_ENDPOINT: '' },
    `require('./api/src/db').db().then(()=>console.log('ABRIU')).catch(e=>console.log('RECUSOU: '+e.message));`);
  confere('em produção, banco não configurado impede a API de subir',
    /RECUSOU/.test(bancoSolto), bancoSolto.trim());

  const bancoArquivoEmProd = comAmbiente({ GS2_TENANT_ID: 'abc', GS2_CLIENT_ID: 'def', GS2_BANCO: 'arquivo' },
    `require('./api/src/db').db().then(()=>console.log('ABRIU')).catch(e=>console.log('RECUSOU: '+e.message));`);
  confere('em produção, GS2_BANCO=arquivo é recusado (disco da Function é efêmero)',
    /RECUSOU/.test(bancoArquivoEmProd), bancoArquivoEmProd.trim());

  /* ---------- 3. Travessia de diretório no servidor local ---------- */
  for (const alvo of ['/..%2fapi/local.settings.json', '/..%2f.dados/processos.json',
                      '/../api/package.json', '/..%2F..%2Fetc%2Fpasswd']) {
    const r = await chamar(alvo);
    confere(`travessia de diretório barrada: ${alvo}`,
      r.status === 400 || r.status === 403 || r.status === 404,
      'status ' + r.status + ' — ' + r.texto.slice(0, 80));
  }

  /* ---------- 4. Sem identidade, nada ---------- */
  for (const rota of ['/api/estado', '/api/processos', '/api/acervo', '/api/auditoria']) {
    const r = await chamar(rota);
    confere(`sem identidade, ${rota} responde 401`, r.status === 401, 'status ' + r.status);
  }

  /* ---------- 5. /api/saude não anuncia infraestrutura ---------- */
  const saudePublica = await chamar('/api/saude');
  confere('saúde pública não devolve o endereço do banco',
    !!saudePublica.json && saudePublica.json.banco === undefined,
    JSON.stringify(saudePublica.json));
  confere('saúde pública não devolve contagem de registros',
    !/registros/.test(saudePublica.texto));
  const saudeAdmin = await chamar('/api/saude', { cabecalhos: ADMIN });
  confere('para o administrador, a saúde continua trazendo o detalhe',
    !!(saudeAdmin.json && saudeAdmin.json.banco), JSON.stringify(saudeAdmin.json).slice(0, 120));

  /* ---------- 6. POST de processo não aceita id do corpo ---------- */
  const p1 = await chamar('/api/processos', { metodo: 'POST', cabecalhos: ADMIN,
    corpo: { cliente: 'CLIENTE A LTDA', tipo: 'abertura', segredo: 'original' } });
  confere('criar processo devolve 201', p1.status === 201, p1.texto.slice(0, 120));
  const idReal = p1.json.id;

  const p2 = await chamar('/api/processos', { metodo: 'POST', cabecalhos: COLAB,
    corpo: { id: idReal, cliente: 'CLIENTE B LTDA', segredo: 'destruido' } });
  const original = await chamar('/api/processos/' + encodeURIComponent(idReal), { cabecalhos: ADMIN });
  confere('POST com id de outro processo NÃO o sobrescreve',
    original.status === 200 && original.json.segredo === 'original' && original.json.cliente === 'CLIENTE A LTDA',
    JSON.stringify(original.json).slice(0, 160));
  confere('o processo criado por cima ganhou id próprio',
    p2.status === 201 && p2.json.id !== idReal, p2.json && p2.json.id);

  /* ---------- 7. cliente é imutável (chave de partição) ---------- */
  await chamar('/api/processos/' + encodeURIComponent(idReal), { metodo: 'PUT', cabecalhos: ADMIN,
    corpo: { cliente: 'OUTRO CLIENTE LTDA', status: 'andamento' } });
  const depois = await chamar('/api/processos/' + encodeURIComponent(idReal), { cabecalhos: ADMIN });
  confere('PUT não muda o cliente do processo',
    depois.json.cliente === 'CLIENTE A LTDA', depois.json.cliente);
  confere('PUT continua alterando os outros campos', depois.json.status === 'andamento');

  /* ---------- 8. cadastros: o id não atravessa tipos ---------- */
  await chamar('/api/cadastros/usuariosCliente/uc1', { metodo: 'PUT', cabecalhos: ADMIN,
    corpo: { nome: 'André', email: 'andre@abthex.com.br', empresas: ['ABTHEX SOLUCOES EM TECNOLOGIA LTDA'] } });
  const invasao = await chamar('/api/cadastros/pessoas/uc1', { metodo: 'PUT', cabecalhos: COLAB,
    corpo: { nome: 'invasor' } });
  confere('gravar em "pessoas" não alcança o registro de "usuariosCliente"',
    invasao.status === 409, 'status ' + invasao.status);
  const intacto = await chamar('/api/cadastros/usuariosCliente', { cabecalhos: ADMIN });
  const uc1 = (intacto.json || []).find(x => x.id === 'uc1');
  confere('o usuário de cliente continua com as empresas dele',
    !!uc1 && Array.isArray(uc1.empresas) && uc1.empresas.length === 1, JSON.stringify(uc1));
  const apagaErrado = await chamar('/api/cadastros/modelos/uc1', { metodo: 'DELETE', cabecalhos: ADMIN });
  confere('apagar em "modelos" não apaga o registro de "usuariosCliente"',
    apagaErrado.status === 404, 'status ' + apagaErrado.status);

  /* ---------- 9. cliente externo só vê o que é dele ---------- */
  await chamar('/api/processos', { metodo: 'POST', cabecalhos: ADMIN,
    corpo: { cliente: 'ABTHEX SOLUCOES EM TECNOLOGIA LTDA', tipo: 'alteracao' } });
  await chamar('/api/cadastros/usuariosCliente/uc2', { metodo: 'PUT', cabecalhos: ADMIN,
    corpo: { nome: 'Externo', email: 'externo@abthex.com.br', empresas: ['ABTHEX SOLUCOES EM TECNOLOGIA LTDA'] } });

  const listaCliente = await chamar('/api/processos', { cabecalhos: CLIENTE });
  confere('cliente externo vê só os processos das empresas dele',
    listaCliente.status === 200 && listaCliente.json.every(p => p.cliente === 'ABTHEX SOLUCOES EM TECNOLOGIA LTDA'),
    JSON.stringify((listaCliente.json || []).map(p => p.cliente)));
  const idOutro = idReal;
  const espiar = await chamar('/api/processos/' + encodeURIComponent(idOutro), { cabecalhos: CLIENTE });
  confere('cliente externo não abre processo de outra empresa pelo id',
    espiar.status === 403, 'status ' + espiar.status);
  const escrever = await chamar('/api/processos', { metodo: 'POST', cabecalhos: CLIENTE, corpo: { cliente: 'X' } });
  confere('cliente externo não cria processo', escrever.status === 403, 'status ' + escrever.status);
  const lerCadastro = await chamar('/api/cadastros/pessoas', { cabecalhos: CLIENTE });
  confere('cliente externo não lê a base de pessoas', lerCadastro.status === 403, 'status ' + lerCadastro.status);
  const lerAuditoria = await chamar('/api/auditoria', { cabecalhos: CLIENTE });
  confere('cliente externo não lê a auditoria', lerAuditoria.status === 403, 'status ' + lerAuditoria.status);

  /* ---------- 10. acervo: nomes que achatam para o mesmo id ---------- */
  await chamar('/api/acervo/' + encodeURIComponent('E. BETONI SERVICOS'), { metodo: 'PUT', cabecalhos: ADMIN,
    corpo: { ficha: { lido: true, origem: 'sharepoint' }, totalDocumentos: 9 } });
  const colidiu = await chamar('/api/acervo/' + encodeURIComponent('E BETONI SERVICOS'), { metodo: 'PUT', cabecalhos: ADMIN,
    corpo: { ficha: { lido: true, origem: 'sharepoint' }, totalDocumentos: 1 } });
  confere('acervo de nome parecido não sobrescreve o do outro cliente',
    colidiu.status === 409, 'status ' + colidiu.status);
  const lido = await chamar('/api/acervo/' + encodeURIComponent('E. BETONI SERVICOS'), { cabecalhos: ADMIN });
  confere('o acervo original continua intacto',
    lido.status === 200 && lido.json.totalDocumentos === 9, JSON.stringify(lido.json).slice(0, 120));
  const outroNome = await chamar('/api/acervo/' + encodeURIComponent('E BETONI SERVICOS'), { cabecalhos: ADMIN });
  confere('ler pelo nome quase igual não entrega o acervo do outro',
    outroNome.status === 404, 'status ' + outroNome.status);

  /* ---------- 11. erro interno não vaza infraestrutura ---------- */
  /* 400 aqui vem do próprio servidor local, que agora recusa segmento de
     caminho malformado antes de chegar na API. No Azure quem responde é o
     roteador — por isso ele também é testado direto, logo abaixo. */
  const urlRuim = await chamar('/api/processos/%E0%A4%A');
  confere('URL malformada não vira erro de servidor',
    urlRuim.status === 400 || urlRuim.status === 404 || urlRuim.status === 401,
    'status ' + urlRuim.status);

  const { despachar } = require(path.join(RAIZ, 'api/src/rotas'));
  const direto = await despachar({ metodo: 'GET', caminho: '/api/processos/%E0%A4%A', query: {},
    cabecalhos: ADMIN });
  confere('o roteador devolve 404 para percentagem malformada, não 500',
    direto.status === 404, 'status ' + direto.status + ' — ' + JSON.stringify(direto.corpo).slice(0,90));

  /* ---------- 12. webhook com a réplica desligada ---------- */
  const eco = await chamar('/api/webhook/sharepoint?validationToken=' + 'A'.repeat(4000), { metodo: 'POST' });
  confere('webhook não vira refletor com a réplica desligada',
    eco.status === 404 || eco.texto.length <= 512, 'status ' + eco.status + ', ' + eco.texto.length + ' bytes');

  /* ---------- 13. a auditoria registrou o que aconteceu ---------- */
  const trilha = await chamar('/api/auditoria', { cabecalhos: ADMIN });
  confere('a trilha de auditoria registrou as criações',
    Array.isArray(trilha.json) && trilha.json.some(l => l.acao === 'criar'),
    Array.isArray(trilha.json) ? trilha.json.length + ' linha(s)' : trilha.texto.slice(0, 80));

  servidor.kill();
  limpar(PASTA);

  console.log(`\n  ${feitos - falhas} de ${feitos} passaram.` + (falhas ? `  ${falhas} FALHA(S).\n` : '  Nenhuma falha.\n'));
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('\n  O teste em si quebrou:', e); process.exit(1); });
