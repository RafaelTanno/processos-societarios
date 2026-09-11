/* =====================================================================
   Trilha de auditoria (pendência C2).

   A ferramenta manipula CPF, RG, CNH, endereço e comprovantes. A partir
   do momento em que isso passa a ser guardado de forma durável, precisa
   existir registro de quem fez o quê.

   O que é registrado:
     • toda ESCRITA (criar, alterar, apagar) em qualquer contêiner;
     • toda LEITURA da base de pessoas, porque ali é só dado pessoal;
     • entradas na ferramenta.

   O que NÃO é registrado: leitura comum de processo, senão o log cresce
   mais que o dado e ninguém consegue achar nada nele.

   O log guarda o QUE mudou (contêiner, id, ação), nunca o conteúdo —
   não faz sentido duplicar CPF dentro do log de acesso ao CPF.
   ===================================================================== */

const { db } = require('./db');

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

async function registrar(usuario, acao, alvo, detalhe) {
  try {
    const banco = await db();
    const dia = hoje();
    await banco.salvar('auditoria', {
      id: `${dia}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dia,
      em: new Date().toISOString(),
      quem: (usuario && usuario.email) || 'anonimo',
      papel: (usuario && usuario.papel) || '',
      acao,                                   /* criar | alterar | apagar | ler-pessoais | entrar */
      alvo: alvo || '',                       /* ex.: processos/1725... */
      detalhe: detalhe || ''
    });
  } catch (e) {
    /* auditoria nunca pode derrubar a operação principal */
    console.error('[auditoria] falha ao registrar:', e.message);
  }
}

async function doDia(dia) {
  const banco = await db();
  const linhas = await banco.listar('auditoria', { dia: dia || hoje() });
  return linhas.sort((a, b) => String(b.em).localeCompare(String(a.em)));
}

/* Carimbo de retenção em registros que contêm dado pessoal.
   A API só MARCA a data; a exclusão é decisão e ato humano. */
function carimbarRetencao(doc) {
  const cfg = require('./config');
  const agora = new Date();
  doc._retencao = doc._retencao || {};
  doc._retencao.criadoEm = doc._retencao.criadoEm || agora.toISOString();
  doc._retencao.atualizadoEm = agora.toISOString();
  if (cfg.retencaoDias > 0) {
    const venc = new Date(agora.getTime() + cfg.retencaoDias * 86400000);
    doc._retencao.venceEm = venc.toISOString();
  }
  return doc;
}

module.exports = { registrar, doDia, carimbarRetencao, hoje };
