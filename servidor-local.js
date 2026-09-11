#!/usr/bin/env node
/* =====================================================================
   Servidor local — a ferramenta inteira rodando na sua máquina, sem
   nada do Azure.

       cd deploy
       node servidor-local.js

   Depois abra http://localhost:5173/login

   O que ele faz:
     • serve os arquivos estáticos (a ferramenta) na raiz;
     • serve a API em /api, chamando exatamente os mesmos handlers que
       vão para o Azure Functions — não é um simulador, é o mesmo código;
     • imita as rotas do staticwebapp.config.json (/login → index.html).

   Banco: arquivo JSON em deploy/.dados. Some quando você apagar a pasta.

   Segurança: escuta SÓ em 127.0.0.1. Sem tenantId/clientId configurados,
   a API roda em modo local e aceita identidade de demonstração — o que
   seria um buraco se a porta estivesse aberta para a rede. Por isso ela
   não está.
   ===================================================================== */

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const RAIZ = __dirname;                 /* raiz do repositório */
const WEB  = path.join(RAIZ, 'web');    /* o que o Azure publica como app_location */
const PORTA = parseInt(process.argv[2] || process.env.PORT || '5173', 10);

process.env.GS2_PASTA_DADOS = process.env.GS2_PASTA_DADOS || path.join(RAIZ, '.dados');
/* A API só aceita identidade de demonstração quando isto está ligado de
   propósito. Aqui, sim: o servidor escuta só em 127.0.0.1. No Azure a
   variável não existe, e é assim que tem de ser. */
process.env.GS2_PERMITIR_DEMO = process.env.GS2_PERMITIR_DEMO || '1';
process.env.GS2_BANCO = process.env.GS2_BANCO || 'arquivo';

let despachar;
try {
  ({ despachar } = require('./api/src/rotas'));
} catch (e) {
  console.error('\n  Não consegui carregar a API.');
  console.error('  Rode primeiro:  cd api && npm install\n');
  console.error('  (detalhe: ' + e.message + ')\n');
  process.exit(1);
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv; charset=utf-8'
};

function lerCorpo(req) {
  return new Promise((resolve) => {
    const partes = [];
    req.on('data', p => partes.push(p));
    req.on('end', () => {
      const texto = Buffer.concat(partes).toString('utf8');
      if (!texto) return resolve(null);
      try { resolve(JSON.parse(texto)); } catch (e) { resolve(texto); }
    });
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  /* Decodifica SEGMENTO A SEGMENTO e recusa "." e "..". Decodificar o
     caminho inteiro depois que o URL já normalizou deixava passar
     `/..%2fapi/local.settings.json`, que serve a chave do Cosmos e o
     segredo do webhook para quem quer que alcance a porta. */
  let caminho;
  try {
    caminho = '/' + url.pathname.split('/').filter(Boolean)
      .map(seg => {
        const s = decodeURIComponent(seg);
        if (s === '.' || s === '..' || s.indexOf('/') > -1 || s.indexOf('\\') > -1) {
          throw new Error('segmento inválido');
        }
        return s;
      }).join('/');
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Caminho inválido.');
  }

  /* ---------------- API ---------------- */
  if (caminho === '/api' || caminho.startsWith('/api/')) {
    const query = {};
    url.searchParams.forEach((v, k) => { query[k] = v; });
    const cabecalhos = {};
    Object.keys(req.headers).forEach(k => { cabecalhos[k.toLowerCase()] = req.headers[k]; });

    let r;
    try {
      r = await despachar({
        metodo: req.method,
        caminho,
        query,
        corpo: await lerCorpo(req),
        cabecalhos
      });
    } catch (e) {
      r = { status: 500, corpo: { erro: e.message } };
    }

    const inicio = Date.now();
    if (r.texto) {
      res.writeHead(r.status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(String(r.corpo || ''));
    } else {
      const json = JSON.stringify(r.corpo);
      res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(json);
    }
    console.log(`  ${req.method} ${caminho} → ${r.status} (${Date.now() - inicio}ms)`);
    return;
  }

  /* ---------------- estáticos ---------------- */
  let arquivo = caminho;
  const ext = path.extname(arquivo);
  /* a ferramenta mora em web/; /modelos serve a planilha de importação, que fica
     fora dela por ser documento do repositório e não parte da aplicação */
  const base = caminho.startsWith('/modelos/') ? RAIZ : WEB;
  const absoluto = path.join(base, arquivo.replace(/^\/+/, ''));

  /* /login e qualquer rota sem extensão caem no index.html, como o
     staticwebapp.config.json faz no Azure */
  if (arquivo === '/' || arquivo === '/login' || (!ext && !fs.existsSync(absoluto))) {
    arquivo = '/index.html';
  }

  const alvo = path.resolve(base, arquivo.replace(/^\/+/, ''));
  /* Comparação por caminho relativo, não por prefixo de texto: com
     startsWith, "<repo>-backup" passava por ser prefixo de "<repo>". */
  const dentro = p => {
    const rel = path.relative(p, alvo);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  };
  if (!dentro(WEB) && !dentro(path.join(RAIZ, 'modelos'))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Fora da pasta.');
  }

  try {
    const conteudo = await fsp.readFile(alvo);
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(alvo)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(conteudo);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado: ' + arquivo);
  }
});

servidor.listen(PORTA, '127.0.0.1', () => {
  const cfg = require('./api/src/config');
  console.log('');
  console.log('  Processos Societários — servidor local');
  console.log('  ────────────────────────────────────────────');
  console.log(`  Ferramenta   http://localhost:${PORTA}/login`);
  console.log(`  API          http://localhost:${PORTA}/api/saude`);
  console.log(`  Banco        ${cfg.banco} (${cfg.banco === 'arquivo' ? process.env.GS2_PASTA_DADOS : cfg.cosmos.endpoint})`);
  console.log(`  Autenticação ${cfg.modoLocal ? 'modo local (demonstração)' : 'Microsoft Entra ID'}`);
  console.log('  ────────────────────────────────────────────');
  console.log('  Ctrl+C para parar.');
  console.log('');
});
