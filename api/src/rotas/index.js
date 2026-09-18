/* =====================================================================
   Roteador.

   Os handlers são funções puras — recebem um contexto e devolvem
   {status, corpo}. Não conhecem Azure Functions nem Node http. É isso
   que permite rodar exatamente o mesmo código no servidor local de teste
   e, depois, publicado como Azure Function, sem duas versões para manter
   em sincronia.
   ===================================================================== */

const { identificar, motivoDaRecusa } = require('../auth');
const { db } = require('../db');
const auditoria = require('../auditoria');

const sistema = require('./sistema');
const processos = require('./processos');
const cadastros = require('./cadastros');
const acervo = require('./acervo');
const replica = require('./replica');

/* método, padrão de caminho (com :parametro) e handler.
   `publica: true` = não exige identidade. */
const ROTAS = [
  ['GET',    '/api/saude',                    sistema.saude,        { publica: true }],
  ['GET',    '/api/estado',                   sistema.estado],
  ['GET',    '/api/auditoria',                sistema.auditoria],

  ['GET',    '/api/processos',                processos.listar],
  ['POST',   '/api/processos',                processos.criar],
  ['GET',    '/api/processos/:id',            processos.obter],
  ['PUT',    '/api/processos/:id',            processos.atualizar],
  ['DELETE', '/api/processos/:id',            processos.apagar],

  ['GET',    '/api/cadastros/:tipo',          cadastros.listar],
  ['PUT',    '/api/cadastros/:tipo/:id',      cadastros.salvar],
  ['DELETE', '/api/cadastros/:tipo/:id',      cadastros.apagar],

  ['GET',    '/api/acervo',                   acervo.listar],
  ['GET',    '/api/acervo/:cliente',          acervo.obter],
  ['PUT',    '/api/acervo/:cliente',          acervo.salvar],
  ['DELETE', '/api/acervo/:cliente',          acervo.apagar],

  /* Etapa 2 — réplica do SharePoint. Respondem sempre, mas informam que
     estão desligadas enquanto GS2_REPLICA != 1. */
  ['GET',    '/api/replica/estado',           replica.estado],
  ['POST',   '/api/replica/sincronizar',      replica.sincronizar],
  ['POST',   '/api/replica/assinatura',       replica.assinatura],
  ['POST',   '/api/webhook/sharepoint',       replica.webhook,      { publica: true }]
];

function casar(padrao, caminho) {
  const p = padrao.split('/').filter(Boolean);
  const c = caminho.split('/').filter(Boolean);
  if (p.length !== c.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i][0] === ':') {
      /* percentagem malformada (%E0%A4%A) lança URIError; isso é rota
         que não casa, não falha de servidor */
      try { params[p[i].slice(1)] = decodeURIComponent(c[i]); }
      catch (e) { return null; }
    }
    else if (p[i].toLowerCase() !== c[i].toLowerCase()) return null;
  }
  return params;
}

/* pedido = {metodo, caminho, query, corpo, cabecalhos} */
async function despachar(pedido) {
  const caminho = (pedido.caminho || '').replace(/\/+$/, '') || '/';

  for (const [metodo, padrao, handler, opcoes] of ROTAS) {
    if (metodo !== pedido.metodo) continue;
    const params = casar(padrao, caminho);
    if (!params) continue;

    const publica = !!(opcoes && opcoes.publica);
    const usuario = await identificar(pedido.cabecalhos || {});
    if (!publica && !usuario) {
      /* `motivo` é um código curto (ver classificar() em auth.js), nunca a
         mensagem crua — sem ele, 401 vira adivinhação, com ele o
         diagnóstico da tela diz o que conferir. */
      return {
        status: 401,
        corpo: { erro: 'Não autenticado. Entre de novo na ferramenta.', motivo: motivoDaRecusa() }
      };
    }

    /* O banco abre aqui, antes do handler. Se ele estiver mal
       configurado, a rota pública de saúde ainda precisa responder — é
       ela que diz ao administrador O QUE está errado. As demais rotas
       recebem 503, sem detalhe. */
    let banco = null;
    try {
      banco = await db();
    } catch (e) {
      if (!(opcoes && opcoes.publica)) {
        console.error('[api] banco indisponível:', e.message);
        return { status: 503, corpo: { erro: 'A API não está pronta: banco não configurado ou fora do ar.' } };
      }
      banco = { indisponivel: true, motivo: e.message };
    }

    try {
      return await handler({
        params,
        query: pedido.query || {},
        corpo: pedido.corpo,
        cabecalhos: pedido.cabecalhos || {},
        usuario,
        banco,
        auditoria
      });
    } catch (e) {
      /* A mensagem original identificava a infraestrutura para qualquer
         usuário autenticado — "getaddrinfo ENOTFOUND gs2xxx.documents.
         azure.com" entrega o nome da conta do Cosmos. Vai um código de
         correlação para a tela e o detalhe fica só no log. */
      const ref = Math.random().toString(36).slice(2, 10);
      console.error('[api] erro', ref, metodo, caminho, '-', e.stack || e.message);
      return { status: 500, corpo: { erro: 'Falha na API. Código para o suporte: ' + ref, ref } };
    }
  }

  return { status: 404, corpo: { erro: 'Rota não encontrada: ' + pedido.metodo + ' ' + caminho } };
}

module.exports = { despachar, ROTAS };
