/* =====================================================================
   Adaptador para o Azure Functions (modelo v4 de Node).

   Este arquivo não tem regra de negócio nenhuma: ele só liga as rotas
   puras de src/rotas ao runtime do Azure. O servidor local
   (servidor-local.js) faz a mesma ligação para o http do Node. As duas
   pontas chamam exatamente o mesmo código — não existem duas versões da
   API para manter em sincronia.
   ===================================================================== */

const { app } = require('@azure/functions');
const { despachar } = require('./src/rotas');
const { executarSincronizacao } = require('./src/rotas/replica');
const { db } = require('./src/db');
const cfg = require('./src/config');

async function ponte(pedido) {
  let corpo = null;
  try {
    const texto = await pedido.text();
    if (texto) corpo = JSON.parse(texto);
  } catch (e) { /* corpo vazio ou não-JSON */ }

  const cabecalhos = {};
  pedido.headers.forEach((v, k) => { cabecalhos[k.toLowerCase()] = v; });

  const url = new URL(pedido.url);
  const query = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  const r = await despachar({
    metodo: pedido.method,
    caminho: url.pathname,
    query,
    corpo,
    cabecalhos
  });

  if (r.texto) {
    return { status: r.status, body: String(r.corpo || ''), headers: { 'Content-Type': 'text/plain' } };
  }
  return {
    status: r.status,
    jsonBody: r.corpo,
    headers: { 'Cache-Control': 'no-store' }
  };
}

app.http('api', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',   /* a autorização é nossa, por token do Entra */
  route: '{*rota}',
  handler: ponte
});

/* Varredura de segurança da réplica (etapa 2).
   Roda de hora em hora; se a réplica estiver desligada, não faz nada.
   É a rede contra notificação de webhook perdida, que o Graph não
   reenvia depois de esgotar as tentativas. */
app.timer('replicaVarredura', {
  schedule: '0 0 * * * *',
  handler: async (_timer, contexto) => {
    if (!cfg.replicaLigada) return;
    try {
      const banco = await db();
      const r = await executarSincronizacao(banco);
      contexto.log('[replica] varredura:', JSON.stringify(r.corpo && r.corpo.resumo));
    } catch (e) {
      contexto.error('[replica] varredura falhou:', e.message);
    }
  }
});

/* Renovação da assinatura do webhook.
   A do driveItem vale no máximo ~30 dias; renovamos toda segunda-feira
   às 6h, com folga para uma falha isolada não deixar a assinatura vencer. */
app.timer('replicaRenovarAssinatura', {
  schedule: '0 0 6 * * 1',
  handler: async (_timer, contexto) => {
    if (!cfg.replicaLigada) return;
    try {
      const banco = await db();
      const { assinatura } = require('./src/rotas/replica');
      const r = await assinatura({
        banco,
        usuario: { papel: 'Administrador', email: 'agendador@interno' },
        query: {}, params: {}, corpo: null,
        auditoria: require('./src/auditoria')
      });
      contexto.log('[replica] renovação:', JSON.stringify(r.corpo));
    } catch (e) {
      contexto.error('[replica] renovação falhou:', e.message);
    }
  }
});
