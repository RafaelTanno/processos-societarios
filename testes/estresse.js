#!/usr/bin/env node
/* =====================================================================
   Teste de estresse.

       node testes/estresse.js

   Três perguntas:
     1. o interpretador de nomes aguenta lixo? (nome de arquivo vem de
        pessoa, e pessoa digita qualquer coisa)
     2. o banco em arquivo mente quando a gravação falha, ou quando o
        arquivo está corrompido?
     3. a API aguenta volume e escrita concorrente sem perder registro?

   Nada aqui toca o SharePoint nem a internet.
   ===================================================================== */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RAIZ = path.join(__dirname, '..');
const PORTA = 5198;
const BASE = `http://127.0.0.1:${PORTA}`;
const PASTA = path.join(RAIZ, '.dados-teste-estresse');
const ADMIN = { 'x-gs2-demo-email': 'vinicius@gs2negocios.com.br', 'Content-Type': 'application/json' };

/* A limpeza nunca pode derrubar o teste: em ambiente com restrição de
   remoção, o resultado da bateria vale mais que a faxina. */
function limpar(alvo) {
  try { fs.rmSync(alvo, { recursive: true, force: true }); }
  catch (e) { console.log('  (não consegui apagar ' + path.basename(alvo) + ' — apague à mão)'); }
}

let falhas = 0, feitos = 0;
function confere(titulo, condicao, detalhe) {
  feitos++;
  if (condicao) console.log('  ✓ ' + titulo + (detalhe ? '  ' + detalhe : ''));
  else { falhas++; console.log('  ✗ ' + titulo + (detalhe ? '\n      ' + detalhe : '')); }
}

const fonte = fs.readFileSync(path.join(RAIZ, 'web', 'js', 'acervo.js'), 'utf8');
const GS2Acervo = new Function(fonte + '; return GS2Acervo;')();

/* ================= 1. INTERPRETADOR SOB LIXO ================= */
function fuzzInterpretador() {
  console.log('\n  1. Interpretador de nomes — 20.000 nomes hostis\n');

  const pedacos = [
    '', ' ', '_', '__', '-', '.', '..', '...', '/', '\\', '%', '&', '&#39;', '<script>',
    '"', "'", '`', '${x}', '\n', '\t', ' ', '​', '°', 'º', 'ª', '×',
    'ALTERAÇÃO', 'ALTERACAO', 'CNPJ', 'QSA', 'CONTRATO SOCIAL', 'nº', 'N°',
    '0', '00', '99', '999', '32.13.9999', '00.00.0000', '31/02/2026', '1.1.1',
    'A'.repeat(300), '😀', 'ÇÃÕÜÑ', 'LTDA', '(1)', '.pdf', '.PDF', '.pdf.pdf'
  ];
  const sorteia = () => pedacos[Math.floor(Math.random() * pedacos.length)];

  let quebrou = 0, semForma = 0, comTipo = 0;
  const exemplosQuebrados = [];
  for (let i = 0; i < 20000; i++) {
    let nome = '';
    const n = 1 + Math.floor(Math.random() * 8);
    for (let k = 0; k < n; k++) nome += sorteia();
    try {
      const r = GS2Acervo.interpretar(nome);
      if (typeof r !== 'object' || !('confianca' in r) || !('arquivo' in r) ||
          !['alta', 'media', 'baixa', 'nenhuma'].includes(r.confianca)) semForma++;
      if (r.tipo) comTipo++;
      if (r.ordem !== null && (typeof r.ordem !== 'number' || !isFinite(r.ordem))) semForma++;
      if (r.data !== null && !/^\d{2}\/\d{2}\/\d{4}$/.test(r.data)) semForma++;
    } catch (e) {
      quebrou++;
      if (exemplosQuebrados.length < 3) exemplosQuebrados.push(JSON.stringify(nome) + ' -> ' + e.message);
    }
  }
  confere('nenhum nome fez o interpretador lançar exceção', quebrou === 0,
    quebrou ? quebrou + ' quebra(s): ' + exemplosQuebrados.join(' | ') : '');
  confere('toda resposta saiu na forma esperada', semForma === 0, semForma ? semForma + ' fora de forma' : '');
  console.log(`      (${comTipo} dos 20.000 tinham tipo reconhecível — o resto voltou "não identificado", que é o certo)`);

  const t0 = Date.now();
  GS2Acervo.interpretar('1° ALTERAÇÃO_27.02.2026_' + 'X'.repeat(200000) + '.pdf');
  const ms = Date.now() - t0;
  confere('nome de 200 mil caracteres é interpretado em menos de 1s', ms < 1000, ms + 'ms');

  const muitos = [];
  for (let i = 1; i <= 3000; i++) muitos.push(GS2Acervo.interpretar(`${i}° ALTERAÇÃO_01.01.2020_EMPRESA X LTDA.pdf`));
  const t1 = Date.now();
  const linha = GS2Acervo.montarLinhaDoTempo(muitos);
  const lacunas = GS2Acervo.acharLacunas(muitos);
  const ms2 = Date.now() - t1;
  confere('linha do tempo de 3.000 atos é montada em menos de 2s', ms2 < 2000, ms2 + 'ms');
  confere('3.000 alterações sequenciais não produzem lacuna falsa', lacunas.length === 0,
    lacunas.slice(0, 5).join(','));
  confere('a linha do tempo saiu ordenada', linha.every((a, i) => i === 0 || a.ordem >= linha[i - 1].ordem));

  const vazia = GS2Acervo.completar('X LTDA', { socios: 'isto não é lista', alteracoes: 42, dadosCnpj: 'nem isto' });
  confere('ficha com tipos errados vindos do banco não derruba a montagem',
    Array.isArray(vazia.socios) && Array.isArray(vazia.alteracoes) && typeof vazia.dadosCnpj === 'object' &&
    vazia.alteracoes.length >= 1);
}

/* ================= 2. BANCO EM ARQUIVO ================= */
async function bancoEmArquivo() {
  console.log('\n  2. Banco em arquivo — corrupção e falha de escrita\n');
  const pasta = path.join(RAIZ, '.dados-teste-banco');
  limpar(pasta);
  fs.mkdirSync(pasta, { recursive: true });

  fs.writeFileSync(path.join(pasta, 'processos.json'), '[{"id":"1","cliente":"A"},{"id":"2"', 'utf8');
  process.env.GS2_PASTA_DADOS = pasta;
  delete require.cache[require.resolve(path.join(RAIZ, 'api/src/db/arquivo'))];
  const adaptador = require(path.join(RAIZ, 'api/src/db/arquivo'));

  let recusou = false, mensagem = '';
  try {
    await adaptador.abrir([{ nome: 'processos', chave: '/cliente' }]);
  } catch (e) { recusou = true; mensagem = e.message; }
  confere('JSON corrompido faz a API falhar alto, em vez de zerar a coleção', recusou, mensagem.slice(0, 110));
  confere('o arquivo corrompido foi preservado, não sobrescrito',
    fs.readdirSync(pasta).some(f => /corrompido/.test(f)), fs.readdirSync(pasta).join(', '));

  const pasta2 = path.join(RAIZ, '.dados-teste-banco2');
  limpar(pasta2);
  process.env.GS2_PASTA_DADOS = pasta2;
  /* config.js lê o ambiente uma vez só; sem limpar o cache dele, o
     adaptador continuaria gravando na pasta anterior e o teste passaria
     por engano */
  delete require.cache[require.resolve(path.join(RAIZ, 'api/src/config'))];
  delete require.cache[require.resolve(path.join(RAIZ, 'api/src/db/arquivo'))];
  const a2 = require(path.join(RAIZ, 'api/src/db/arquivo'));
  const banco = await a2.abrir([{ nome: 'processos', chave: '/cliente' }]);
  await banco.salvar('processos', { id: 'x1', cliente: 'A' });

  /* troca a pasta por um arquivo: gravar passa a ser impossível */
  limpar(pasta2);
  fs.writeFileSync(pasta2, 'agora sou um arquivo', 'utf8');
  let propagou = false;
  try { await banco.salvar('processos', { id: 'x2', cliente: 'B' }); }
  catch (e) { propagou = true; }
  confere('falha de gravação chega em quem chamou (não devolve "salvo" mentindo)', propagou);

  limpar(pasta);
  limpar(pasta2);
  delete process.env.GS2_PASTA_DADOS;
  delete require.cache[require.resolve(path.join(RAIZ, 'api/src/db/arquivo'))];
}

/* ================= 3. API SOB CARGA ================= */
async function apiSobCarga() {
  console.log('\n  3. API — volume e concorrência\n');
  limpar(PASTA);

  const servidor = spawn(process.execPath, ['servidor-local.js', String(PORTA)], {
    cwd: RAIZ,
    env: Object.assign({}, process.env, { GS2_PASTA_DADOS: PASTA }),
    stdio: ['ignore', 'ignore', 'pipe']
  });
  const errosServidor = [];
  servidor.stderr.on('data', d => errosServidor.push(String(d)));

  const chamar = async (caminho, opcoes = {}) => {
    const r = await fetch(BASE + caminho, {
      method: opcoes.metodo || 'GET',
      headers: ADMIN,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined
    });
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch (e) { /* texto puro */ }
    return { status: r.status, json: j, texto: t };
  };

  for (let i = 0; i < 80; i++) {
    try { const s = await chamar('/api/saude'); if (s.status === 200) break; }
    catch (e) { await new Promise(r => setTimeout(r, 100)); }
  }

  const QUANTOS = 400;
  const t0 = Date.now();
  const respostas = await Promise.all(
    Array.from({ length: QUANTOS }, (_, i) =>
      chamar('/api/processos', { metodo: 'POST', corpo: { cliente: 'CLIENTE ' + (i % 40), tipo: 'abertura', n: i } })
        .catch(e => ({ status: 0, erro: e.message })))
  );
  const msCriar = Date.now() - t0;
  const criados = respostas.filter(r => r.status === 201);
  confere(`${QUANTOS} criações simultâneas: todas responderam 201`,
    criados.length === QUANTOS, criados.length + '/' + QUANTOS + ' em ' + msCriar + 'ms');

  const ids = new Set(criados.map(r => r.json.id));
  confere('nenhum id repetido entre as ' + QUANTOS, ids.size === criados.length,
    (criados.length - ids.size) + ' repetido(s)');

  const lista = await chamar('/api/processos');
  confere('todos os ' + QUANTOS + ' estão gravados — nenhuma escrita perdida',
    Array.isArray(lista.json) && lista.json.length === QUANTOS,
    (lista.json ? lista.json.length : '?') + ' no banco');

  let disco = null, discoOk = true;
  try { disco = JSON.parse(fs.readFileSync(path.join(PASTA, 'processos.json'), 'utf8')); }
  catch (e) { discoOk = false; }
  confere('o arquivo do banco continua íntegro depois da rajada',
    discoOk && Array.isArray(disco) && disco.length === QUANTOS,
    discoOk && disco ? disco.length + ' registro(s)' : 'JSON inválido');

  const t1 = Date.now();
  await chamar('/api/estado');
  const msEstado = Date.now() - t1;
  confere('carga inicial com ' + QUANTOS + ' processos responde em menos de 3s', msEstado < 3000, msEstado + 'ms');

  const grande = { cliente: 'CLIENTE GRANDE', tipo: 'outros', lixo: 'x'.repeat(1024 * 1024) };
  const rGrande = await chamar('/api/processos', { metodo: 'POST', corpo: grande })
    .catch(e => ({ status: 0, erro: e.message }));
  confere('payload de 1 MB é aceito ou recusado com status claro (sem derrubar a API)',
    rGrande.status === 201 || (rGrande.status >= 400 && rGrande.status < 500), 'status ' + rGrande.status);
  const vivo = await chamar('/api/saude');
  confere('a API continua de pé depois do payload grande', vivo.status === 200);

  const alvo = criados[0].json.id;
  const conc = await Promise.all(Array.from({ length: 60 }, (_, i) =>
    chamar('/api/processos/' + encodeURIComponent(alvo), { metodo: 'PUT', corpo: { status: 'v' + i } })));
  confere('60 atualizações simultâneas no mesmo processo: todas responderam 200',
    conc.every(r => r.status === 200), conc.filter(r => r.status !== 200).length + ' fora de 200');
  const final = await chamar('/api/processos/' + encodeURIComponent(alvo));
  confere('o registro continua consistente depois da disputa',
    final.status === 200 && /^v\d+$/.test(final.json.status), JSON.stringify(final.json && final.json.status));

  confere('nenhum erro não tratado apareceu no log do servidor',
    !errosServidor.join('').match(/UnhandledPromiseRejection|TypeError|ReferenceError/),
    errosServidor.join('').slice(0, 200));

  servidor.kill();
  limpar(PASTA);
}

(async () => {
  fuzzInterpretador();
  await bancoEmArquivo();
  await apiSobCarga();
  console.log(`\n  ${feitos - falhas} de ${feitos} passaram.` + (falhas ? `  ${falhas} FALHA(S).\n` : '  Nenhuma falha.\n'));
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('\n  O teste em si quebrou:', e); process.exit(1); });
