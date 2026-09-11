/* =====================================================================
   Cadastros de apoio, todos no mesmo contêiner, separados pelo campo
   `tipo` (que também é a chave de partição):

     usuarios        equipe da GS2 e seu papel
     requerentes     CPF/e-mail/telefone de quem abre a Viabilidade
     usuariosCliente acesso externo, e de quais empresas
     pessoas         base de sócios/representantes/administradores por CPF
     modelos         modelos de contrato (texto com {{placeholders}})

   Três deles guardam dado pessoal — `requerentes`, `usuariosCliente` e
   `pessoas`. Esses ganham carimbo de retenção e sua LEITURA entra na
   trilha de auditoria; os outros não, para o log não virar ruído.
   ===================================================================== */

const { pode } = require('../auth');

const TIPOS = ['usuarios', 'requerentes', 'usuariosCliente', 'pessoas', 'modelos'];
const COM_DADO_PESSOAL = ['requerentes', 'usuariosCliente', 'pessoas'];

/* `pessoas` cresce sozinha conforme os processos são enviados, então
   colaborador também escreve nela. O resto é só administrador. */
function acaoDeEscrita(tipo) {
  return tipo === 'pessoas' ? 'pessoas:escrever' : 'cadastros:escrever';
}

function tipoValido(tipo) {
  return TIPOS.includes(tipo);
}

async function listar(ctx) {
  const { tipo } = ctx.params;
  if (!tipoValido(tipo)) return { status: 404, corpo: { erro: 'Cadastro desconhecido: ' + tipo } };
  if (!pode(ctx.usuario, 'cadastros:ler')) {
    return { status: 403, corpo: { erro: 'Seu perfil não tem permissão para ver este cadastro.' } };
  }
  const itens = await ctx.banco.listar('cadastros', { tipo });
  if (COM_DADO_PESSOAL.includes(tipo)) {
    await ctx.auditoria.registrar(ctx.usuario, 'ler-pessoais', 'cadastros/' + tipo, itens.length + ' registro(s)');
  }
  return { status: 200, corpo: itens };
}

async function salvar(ctx) {
  const { tipo, id } = ctx.params;
  if (!tipoValido(tipo)) return { status: 404, corpo: { erro: 'Cadastro desconhecido: ' + tipo } };
  if (!pode(ctx.usuario, acaoDeEscrita(tipo))) {
    return { status: 403, corpo: { erro: 'Só o administrador altera este cadastro.' } };
  }

  const atual = await ctx.banco.obter('cadastros', id, tipo);
  /* Os ids são curtos e adivinháveis (u1, r1, uc1) e o contêiner é um só,
     separado pelo campo `tipo`. Sem conferir o tipo, um Colaborador —
     que pode escrever em `pessoas` — alcançava um registro de
     `usuariosCliente`, que é de Administrador, e apagava o acesso de um
     cliente externo às empresas dele. */
  if (atual && atual.tipo !== tipo) {
    return { status: 409, corpo: { erro: `O identificador "${id}" já pertence ao cadastro "${atual.tipo}".` } };
  }
  let doc = Object.assign({}, atual || {}, ctx.corpo || {}, {
    id,
    tipo,
    alteradoEm: new Date().toISOString(),
    alteradoPor: ctx.usuario.email
  });
  if (!atual) { doc.criadoEm = doc.alteradoEm; doc.criadoPor = ctx.usuario.email; }
  if (COM_DADO_PESSOAL.includes(tipo)) doc = ctx.auditoria.carimbarRetencao(doc);

  await ctx.banco.salvar('cadastros', doc);
  await ctx.auditoria.registrar(ctx.usuario, atual ? 'alterar' : 'criar', `cadastros/${tipo}/${id}`, doc.nome || '');
  return { status: 200, corpo: doc };
}

async function apagar(ctx) {
  const { tipo, id } = ctx.params;
  if (!tipoValido(tipo)) return { status: 404, corpo: { erro: 'Cadastro desconhecido: ' + tipo } };
  if (!pode(ctx.usuario, 'cadastros:escrever')) {
    return { status: 403, corpo: { erro: 'Só o administrador apaga deste cadastro.' } };
  }
  const atual = await ctx.banco.obter('cadastros', id, tipo);
  if (!atual || atual.tipo !== tipo) {
    return { status: 404, corpo: { erro: 'Registro não encontrado neste cadastro.' } };
  }
  const ok = await ctx.banco.remover('cadastros', id, tipo);
  if (!ok) return { status: 404, corpo: { erro: 'Registro não encontrado.' } };
  await ctx.auditoria.registrar(ctx.usuario, 'apagar', `cadastros/${tipo}/${id}`, '');
  return { status: 200, corpo: { removido: id } };
}

module.exports = { listar, salvar, apagar, TIPOS, COM_DADO_PESSOAL };
