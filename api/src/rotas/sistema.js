/* =====================================================================
   Rotas de sistema: saúde, carga inicial e leitura da auditoria.
   ===================================================================== */

const cfg = require('../config');
const { pode } = require('../auth');
const { TIPOS } = require('./cadastros');
const { empresasPermitidas } = require('./processos');

/* Sem autenticação, de propósito: é o que a tela de diagnóstico chama
   para saber se a API existe e em que modo está. Não devolve nenhum dado
   de negócio nem segredo — só o estado do ambiente. */
async function saude(ctx) {
  let banco = { ok: false };
  if (ctx.banco && ctx.banco.indisponivel) {
    banco = { ok: false, erro: ctx.banco.motivo };
  } else {
    try { banco = await ctx.banco.saude(); }
    catch (e) { banco = { ok: false, erro: e.message }; }
  }

  const publico = {
    ok: true,
    versao: '1.0.0',
    modo: cfg.malConfigurada ? 'mal-configurada' : (cfg.modoLocal ? 'local' : 'entra'),
    autenticacao: cfg.malConfigurada
      ? 'API sem Entra configurado e sem permissão de demonstração — ninguém autentica'
      : (cfg.modoLocal
        ? 'modo local — identidade de demonstração, sem validação de token'
        : 'Microsoft Entra ID (token validado por assinatura)'),
    bancoOk: !!banco.ok,
    /* o motivo do banco fora do ar é útil para quem está publicando e não
       entrega segredo: é a mensagem de configuração, não a chave */
    bancoErro: banco.ok ? undefined : (banco.erro || 'não respondeu')
  };

  /* O detalhe — endpoint do Cosmos, caminho no servidor, contagem de
     registros por contêiner, estado do webhook — é reconhecimento de
     graça para quem varre a internet, e a contagem no Cosmos custa uma
     varredura cross-partition por chamada numa rota sem autenticação.
     Fica atrás da permissão de administrador. */
  if (!pode(ctx.usuario, 'auditoria:ler')) {
    return { status: 200, corpo: publico };
  }

  return {
    status: 200,
    corpo: Object.assign(publico, {
      banco,
      replica: {
        ligada: cfg.replicaLigada,
        webhookConfigurado: !!(cfg.webhookUrl && cfg.webhookClientState)
      },
      retencaoDias: cfg.retencaoDias
    })
  };
}

/* Uma chamada só, no login, com tudo que a ferramenta precisa para
   montar as telas — em vez de cinco idas e voltas. */
async function estado(ctx) {
  const u = ctx.usuario;
  const permitidas = await empresasPermitidas(ctx.banco, u);

  /* A permissão sai da MESMA tabela das outras rotas. Antes esta era a
     única que filtrava por conta própria — então mudar REGRAS não teria
     efeito aqui, e a permissão passaria a existir em dois lugares que
     podem discordar. */
  let processos = pode(u, 'processos:ler') ? await ctx.banco.listar('processos') : [];
  if (permitidas) processos = processos.filter(p => permitidas.includes(p.cliente));
  processos.sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));

  const cadastros = {};
  if (pode(u, 'cadastros:ler')) {
    /* cinco leituras independentes: em paralelo, não em fila */
    const listas = await Promise.all(TIPOS.map(tipo => ctx.banco.listar('cadastros', { tipo })));
    TIPOS.forEach((tipo, i) => { cadastros[tipo] = listas[i]; });
    /* a leitura em bloco também é leitura de dado pessoal */
    await ctx.auditoria.registrar(u, 'ler-pessoais', 'cadastros/*', 'carga inicial');
  }

  await ctx.auditoria.registrar(u, 'entrar', '', u.papel);

  return {
    status: 200,
    corpo: {
      usuario: { nome: u.nome, email: u.email, papel: u.papel, modo: u.modo },
      processos,
      cadastros,
      empresasPermitidas: permitidas
    }
  };
}

async function auditoria(ctx) {
  if (!pode(ctx.usuario, 'auditoria:ler')) {
    return { status: 403, corpo: { erro: 'A trilha de auditoria é visível apenas para administradores.' } };
  }
  const linhas = await ctx.auditoria.doDia(ctx.query.dia);
  return { status: 200, corpo: linhas };
}

module.exports = { saude, estado, auditoria };
