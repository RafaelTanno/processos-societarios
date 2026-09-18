#!/usr/bin/env node
/* =====================================================================
   Regressão de configuração estática e de handlers inline.

       node testes/regressao-csp.js

   Cobre três defeitos reais, encontrados depurando o login em produção
   pelo navegador em 18/09/2026, e que os outros testes não pegam por
   serem client-side/de configuração, não de API:

     1. 'unsafe-inline' no script-src da CSP — só existia porque o
        index.html e os web/js/app-*.js tinham ~200 onclick/onchange/
        oninput/onfocus/onblur/onmousedown inline. Se algum voltar, a
        tentação de reabrir 'unsafe-inline' volta junto.
     2. responseOverrides de 404 → /index.html no staticwebapp.config.json,
        que mascarava qualquer 404 real (inclusive de /api/*) como se
        fosse a ferramenta funcionando.
     3. /auth.html: a página em branco do fluxo de popup do MSAL, que não
        é mais usada (o login é por redirect, ver web/js/integracao.js) —
        não pode ser referenciada nem existir de novo.

   Só lê arquivos do repositório — não sobe servidor, não precisa de rede.
   ===================================================================== */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const WEB = path.join(RAIZ, 'web');

let falhas = 0, feitos = 0;
function confere(titulo, condicao, detalhe) {
  feitos++;
  if (condicao) { console.log('  ✓ ' + titulo); }
  else { falhas++; console.log('  ✗ ' + titulo + (detalhe !== undefined ? '\n      ' + detalhe : '')); }
}

function listarArquivos(dir, ext, achados) {
  for (const nome of fs.readdirSync(dir)) {
    const p = path.join(dir, nome);
    if (fs.statSync(p).isDirectory()) listarArquivos(p, ext, achados);
    else if (nome.endsWith(ext)) achados.push(p);
  }
  return achados;
}

/* Handlers inline de verdade — não conta se "onclick=" aparece só dentro
   de comentário (/* ... */ ou //), que é como este próprio arquivo e
   alguns comentários de código citam o padrão antigo como referência
   histórica.

   Remove os comentários em duas passadas simples: primeiro os blocos
   /* ... */ (multilinha, preservando as quebras de linha internas para a
   numeração de linha do resultado continuar batendo com o arquivo
   original), depois o // até o fim de cada linha. Não é um parser de JS
   de verdade — não entende comentário dentro de string —, mas é
   suficiente para este arquivo: o código real não tem "//" nem "/*" no
   meio de um atributo onclick/onchange/etc.

   A aspa logo depois do "=" é o que distingue o ATRIBUTO HTML
   onclick="..." (proibido) de uma atribuição de propriedade em JS como
   elemento.onclick = ()=>{...} (comum e inofensiva — não é lida pela CSP,
   só onclick="..." escrito no marcado é). Sem essa exigência, o teste
   acusava falso positivo em todo `el.onclick = ` legítimo do código. */
const ATRIBUTOS_INLINE = /\bon(click|change|input|focus|blur|mousedown|keydown|submit)\s*=\s*["']/;
function removerComentarios(conteudo) {
  const semBlocos = conteudo.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''));
  return semBlocos.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
}
function acharHandlersInline(conteudo) {
  const linhasOriginais = conteudo.split('\n');
  const linhasLimpas = removerComentarios(conteudo).split('\n');
  const achados = [];
  linhasLimpas.forEach((linha, i) => {
    if (ATRIBUTOS_INLINE.test(linha)) achados.push({ linha: i + 1, texto: linhasOriginais[i].trim().slice(0, 120) });
  });
  return achados;
}

console.log('\n  Regressão de CSP e handlers inline\n');

/* ---------- 1. CSP sem 'unsafe-inline' no script-src ---------- */
const configPath = path.join(WEB, 'staticwebapp.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const csp = (config.globalHeaders || {})['Content-Security-Policy'] || '';
const scriptSrc = (csp.match(/script-src[^;]*/) || [''])[0];
confere("script-src não tem 'unsafe-inline'",
  scriptSrc.length > 0 && !/'unsafe-inline'/.test(scriptSrc), scriptSrc);
confere("script-src continua restrito a 'self' + cdnjs (nenhum domínio novo solto)",
  /^script-src 'self' https:\/\/cdnjs\.cloudflare\.com$/.test(scriptSrc.trim()), scriptSrc);

/* ---------- 2. responseOverrides não mascara 404 ---------- */
confere('staticwebapp.config.json não tem responseOverrides mascarando 404',
  !config.responseOverrides, JSON.stringify(config.responseOverrides));
confere("navigationFallback não referencia mais /auth.html",
  !(config.navigationFallback && (config.navigationFallback.exclude || []).includes('/auth.html')));

/* ---------- 3. /auth.html não existe mais e não é referenciado ---------- */
confere('web/auth.html foi removido (fluxo de popup não é mais usado)',
  !fs.existsSync(path.join(WEB, 'auth.html')));
const configJs = fs.readFileSync(path.join(WEB, 'config.js'), 'utf8');
confere('web/config.js não referencia mais auth.html no comentário do redirectUri',
  !/auth\.html/.test(configJs), configJs.match(/.*auth\.html.*/) && configJs.match(/.*auth\.html.*/)[0]);

/* ---------- 4. Nenhum handler inline sobrou em index.html ou web/js/*.js ---------- */
const indexHtml = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
const handlersIndex = acharHandlersInline(indexHtml);
confere('web/index.html não tem onclick/onchange/oninput/onfocus/onblur/onmousedown/onkeydown inline',
  handlersIndex.length === 0,
  handlersIndex.slice(0, 5).map(h => `linha ${h.linha}: ${h.texto}`).join('\n      '));

/* Bloco <script> sem src=: só é aceitável se for puramente carregamento
   (nenhum bloco assim deveria sobrar — a config do pdf.worker virou
   js/inicializacao.js). Um <script>...</script> com conteúdo executável
   embutido volta a exigir 'unsafe-inline'. */
const blocosScript = [...indexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1].trim()).filter(Boolean);
confere('index.html não tem bloco <script> inline com código (só <script src="...">)',
  blocosScript.length === 0, blocosScript.join(' | ').slice(0, 200));

const arquivosJs = listarArquivos(path.join(WEB, 'js'), '.js', []);
let totalHandlersJs = 0;
const detalheHandlersJs = [];
for (const arq of arquivosJs) {
  const achados = acharHandlersInline(fs.readFileSync(arq, 'utf8'));
  totalHandlersJs += achados.length;
  achados.forEach(h => detalheHandlersJs.push(`${path.relative(RAIZ, arq)}:${h.linha}: ${h.texto}`));
}
confere(`nenhum dos ${arquivosJs.length} arquivos em web/js/ gera onclick/onchange/oninput/onfocus/onblur/onmousedown/onkeydown por template string`,
  totalHandlersJs === 0, detalheHandlersJs.slice(0, 8).join('\n      '));

/* ---------- 5. js/eventos.js existe e está referenciado no index.html ---------- */
confere('web/js/eventos.js existe (delegação de evento que substitui os onclick inline)',
  fs.existsSync(path.join(WEB, 'js', 'eventos.js')));
confere('index.html carrega js/eventos.js antes de js/inicializacao.js',
  (() => {
    const iEventos = indexHtml.indexOf('js/eventos.js');
    const iInit = indexHtml.indexOf('js/inicializacao.js');
    return iEventos > -1 && iInit > -1 && iEventos < iInit;
  })());

console.log(`\n  ${feitos - falhas} de ${feitos} passaram.` + (falhas ? `  ${falhas} FALHA(S).\n` : '  Nenhuma falha.\n'));
process.exit(falhas ? 1 : 0);
