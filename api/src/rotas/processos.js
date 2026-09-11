/* =====================================================================
   Processos societários — o dado principal da ferramenta.

   Cada processo é um documento: identificação, sócios, administradores,
   acompanhamento da Junta, RFB, licenciamentos e os destinos dos
   documentos no SharePoint. O arquivo em si continua no SharePoint;
   aqui fica o ESTADO do processo. Autoridade não se duplica.
   ===================================================================== */

const crypto = require('crypto');
const { pode } = require('../auth');

/* Date.now() colide entre dois cliques no mesmo milissegundo. */
function novoId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + crypto.randomBytes(4).toString('hex');
}

/* Empresas que um usuário de cliente pode enxergar. */
async function empresasPermitidas(banco, usuario) {
  if (usuario.papel !== 'Cliente') return null;   /* null = todas */
  const cadastro = await banco.listar('cadastros', { tipo: 'usuariosCliente' });
  const eu = cadastro.find(u => String(u.email || '').toLowerCase() === usuario.email);
  return (eu && Array.isArray(eu.empresas)) ? eu.empresas : [];
}

function negado(acao) {
  return { status: 403, corpo: { erro: 'Seu perfil não tem permissão para ' + acao + '.' } };
}

async function listar(ctx) {
  if (!pode(ctx.usuario, 'processos:ler')) return negado('ver processos');
  const permitidas = await empresasPermitidas(ctx.banco, ctx.usuario);
  let todos = await ctx.banco.listar('processos');
  if (permitidas) todos = todos.filter(p => permitidas.includes(p.cliente));
  todos.sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
  return { status: 200, corpo: todos };
}

async function obter(ctx) {
  if (!pode(ctx.usuario, 'processos:ler')) return negado('ver processos');
  const p = await ctx.banco.obter('processos', ctx.params.id);
  if (!p) return { status: 404, corpo: { erro: 'Processo não encontrado.' } };
  const permitidas = await empresasPermitidas(ctx.banco, ctx.usuario);
  if (permitidas && !permitidas.includes(p.cliente)) return negado('ver este processo');
  return { status: 200, corpo: p };
}

async function criar(ctx) {
  if (!pode(ctx.usuario, 'processos:escrever')) return negado('criar processos');
  const corpo = ctx.corpo || {};
  if (!corpo.cliente) return { status: 400, corpo: { erro: 'O processo precisa de um cliente.' } };

  /* O id NUNCA vem do corpo. Como `salvar` é upsert, aceitar o id do
     cliente deixava um Colaborador destruir qualquer processo existente
     enviando um POST com o id dele — contornando `processos:apagar`, que
     é só do Administrador, e ainda registrando "criar" na auditoria. */
  const idNovo = novoId();
  if (await ctx.banco.obter('processos', idNovo)) {
    return { status: 409, corpo: { erro: 'Colisão de identificador. Tente de novo.' } };
  }

  const agora = new Date().toISOString();
  const doc = ctx.auditoria.carimbarRetencao(Object.assign({}, corpo, {
    id: idNovo,
    cliente: corpo.cliente,
    criadoEm: corpo.criadoEm || agora,
    criadoPor: ctx.usuario.email,
    alteradoEm: agora,
    alteradoPor: ctx.usuario.email
  }));

  await ctx.banco.salvar('processos', doc);
  await ctx.auditoria.registrar(ctx.usuario, 'criar', 'processos/' + doc.id, doc.cliente);
  return { status: 201, corpo: doc };
}

async function atualizar(ctx) {
  if (!pode(ctx.usuario, 'processos:escrever')) return negado('alterar processos');
  const atual = await ctx.banco.obter('processos', ctx.params.id);
  if (!atual) return { status: 404, corpo: { erro: 'Processo não encontrado.' } };

  const doc = ctx.auditoria.carimbarRetencao(Object.assign({}, atual, ctx.corpo || {}, {
    id: atual.id,
    /* `cliente` é a chave de partição do contêiner. Trocá-la não move o
       documento no Cosmos: cria um SEGUNDO documento com o mesmo id em
       outra partição, e o antigo fica para trás — visível inclusive para
       o usuário externo do cliente anterior. Para mudar de cliente,
       apague e crie de novo. */
    cliente: atual.cliente,
    criadoEm: atual.criadoEm,
    criadoPor: atual.criadoPor,
    alteradoEm: new Date().toISOString(),
    alteradoPor: ctx.usuario.email
  }));

  await ctx.banco.salvar('processos', doc);
  await ctx.auditoria.registrar(ctx.usuario, 'alterar', 'processos/' + doc.id, doc.cliente);
  return { status: 200, corpo: doc };
}

async function apagar(ctx) {
  if (!pode(ctx.usuario, 'processos:apagar')) return negado('apagar processos');
  const ok = await ctx.banco.remover('processos', ctx.params.id);
  if (!ok) return { status: 404, corpo: { erro: 'Processo não encontrado.' } };
  await ctx.auditoria.registrar(ctx.usuario, 'apagar', 'processos/' + ctx.params.id, '');
  return { status: 200, corpo: { removido: ctx.params.id } };
}

module.exports = { listar, obter, criar, atualizar, apagar, empresasPermitidas };
