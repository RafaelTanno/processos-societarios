/* =====================================================================
   Acervo societário — o retrato do que está no SharePoint.

   Um documento por cliente, com a ficha montada a partir do acervo:
   linha do tempo das alterações, documentos presentes, lacunas e o que
   foi extraído do Cartão CNPJ e do QSA.

   POR QUE ISSO FICA NO BANCO E NÃO NO REPOSITÓRIO
   ----------------------------------------------
   Porque o acervo muda toda semana. Um arquivo commitado nasce
   desatualizado e passa a discordar do SharePoint — e a regra da casa é
   que autoridade não se duplica. O que está aqui é CÓPIA DE LEITURA,
   para a tela abrir rápido e para ninguém reler o mesmo PDF duas vezes.
   A verdade sobre o documento continua sendo o SharePoint; quando os
   dois divergirem, quem manda é lá, e a solução é varrer de novo.

   Quem varre é o navegador da pessoa logada, com a permissão dela. A API
   só guarda o resultado. Por isso a leitura respeita a mesma regra dos
   processos: usuário de cliente enxerga só as empresas dele.
   ===================================================================== */

const { pode } = require('../auth');

async function empresasPermitidas(banco, usuario) {
  if (usuario.papel !== 'Cliente') return null;   /* null = todas */
  const cadastro = await banco.listar('cadastros', { tipo: 'usuariosCliente' });
  const eu = cadastro.find(u => String(u.email || '').toLowerCase() === usuario.email);
  return (eu && Array.isArray(eu.empresas)) ? eu.empresas : [];
}

function negado(acao) {
  return { status: 403, corpo: { erro: 'Seu perfil não tem permissão para ' + acao + '.' } };
}

/* Identificador estável a partir do nome da pasta do cliente. O nome tem
   acento, barra e espaço; o id não pode ter. */
function idDe(cliente) {
  return 'acervo:' + String(cliente || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
}

async function listar(ctx) {
  if (!pode(ctx.usuario, 'acervo:ler')) return negado('ver o acervo');
  const permitidas = await empresasPermitidas(ctx.banco, ctx.usuario);
  let todos = await ctx.banco.listar('acervo');
  if (permitidas) todos = todos.filter(a => permitidas.includes(a.cliente));

  /* A lista completa é só o resumo: a ficha inteira de 60 clientes seria
     grande demais para trafegar a cada abertura de tela. */
  if (ctx.query.resumo === '1') {
    todos = todos.map(a => ({
      id: a.id, cliente: a.cliente, varridoEm: a.varridoEm,
      lido: !!(a.ficha && a.ficha.lido),
      documentos: a.totalDocumentos || 0,
      avisos: (a.ficha && a.ficha.avisos ? a.ficha.avisos.length : 0)
    }));
  }
  return { status: 200, corpo: todos };
}

async function obter(ctx) {
  if (!pode(ctx.usuario, 'acervo:ler')) return negado('ver o acervo');
  const cliente = ctx.params.cliente;
  const permitidas = await empresasPermitidas(ctx.banco, ctx.usuario);
  if (permitidas && !permitidas.includes(cliente)) return negado('ver o acervo deste cliente');
  const doc = await ctx.banco.obter('acervo', idDe(cliente), cliente);
  /* idDe() achata acento, pontuação e espaço: "E. BETONI" e "E BETONI"
     dão o mesmo id. Conferir o nome exato impede que o acervo de uma
     empresa seja entregue a quem só tem acesso à outra. */
  if (!doc || doc.cliente !== cliente) {
    return { status: 404, corpo: { erro: 'Este cliente ainda não foi varrido.' } };
  }
  return { status: 200, corpo: doc };
}

async function salvar(ctx) {
  if (!pode(ctx.usuario, 'acervo:escrever')) return negado('gravar o acervo');
  const cliente = ctx.params.cliente;
  const corpo = ctx.corpo || {};

  /* Mesmo motivo da leitura: não sobrescrever o acervo de outra empresa
     cujo nome achate para o mesmo id. */
  const existente = await ctx.banco.obter('acervo', idDe(cliente), cliente);
  if (existente && existente.cliente !== cliente) {
    return { status: 409, corpo: { erro:
      `O identificador deste acervo já pertence a "${existente.cliente}". ` +
      'Dois clientes com nomes quase iguais — renomeie uma das pastas no SharePoint.' } };
  }

  const doc = {
    id: idDe(cliente),
    cliente: cliente,
    caminho: corpo.caminho || null,
    grupo: !!corpo.grupo,
    ficha: corpo.ficha || null,
    unidades: corpo.unidades || [],
    totalDocumentos: corpo.totalDocumentos || 0,
    varridoEm: new Date().toISOString(),
    varridoPor: ctx.usuario.email
  };

  await ctx.banco.salvar('acervo', doc);
  await ctx.auditoria.registrar(ctx.usuario, 'varrer', 'acervo/' + cliente,
    doc.totalDocumentos + ' documento(s)');
  return { status: 200, corpo: doc };
}

async function apagar(ctx) {
  if (!pode(ctx.usuario, 'acervo:escrever')) return negado('apagar o acervo');
  const cliente = ctx.params.cliente;
  const ok = await ctx.banco.remover('acervo', idDe(cliente), cliente);
  if (!ok) return { status: 404, corpo: { erro: 'Este cliente não tinha acervo gravado.' } };
  await ctx.auditoria.registrar(ctx.usuario, 'apagar', 'acervo/' + cliente, '');
  return { status: 200, corpo: { removido: cliente } };
}

module.exports = { listar, obter, salvar, apagar, idDe };
