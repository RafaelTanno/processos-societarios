/* =====================================================================
   Quem está chamando a API.

   O frontend já autentica a pessoa no Microsoft Entra ID. Para falar com
   esta API ele pede um segundo token, com audiência `api://{clientId}`
   (o escopo "access_as_user" criado em "Expose an API" no registro do
   aplicativo). Aqui esse token é validado de verdade:

     • assinatura conferida contra as chaves públicas do tenant (JWKS)
     • emissor (iss) e tenant (tid) precisam ser os da GS2
     • audiência (aud) precisa ser esta API
     • validade (exp/nbf) conferida pela própria biblioteca

   Nada disso confia em cabeçalho que o navegador possa forjar: o papel
   (Administrador / Colaborador / Cliente) é derivado AQUI, do e-mail que
   está dentro do token assinado — nunca do que o cliente disser que é.

   Em MODO LOCAL (sem tenantId/clientId configurados) não há como validar
   token nenhum. Aí a API aceita uma identidade de demonstração vinda do
   cabeçalho — e por isso o servidor local só escuta em 127.0.0.1.
   ===================================================================== */

const cfg = require('./config');

let jose = null;
let jwks = null;

function carregarJose() {
  if (!jose) jose = require('jose');
  return jose;
}

function chaves() {
  if (!jwks) {
    const j = carregarJose();
    jwks = j.createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${cfg.tenantId}/discovery/v2.0/keys`)
    );
  }
  return jwks;
}

function papelDe(email) {
  const e = String(email || '').toLowerCase();
  if (!e) return null;
  if (cfg.administradores.includes(e)) return 'Administrador';
  if (e.endsWith('@' + cfg.dominioGS2)) return 'Colaborador';
  return 'Cliente';
}

/* Lê o token do cabeçalho Authorization e devolve a identidade, ou null. */
async function identificar(cabecalhos) {
  const bruto = cabecalhos['authorization'] || cabecalhos['Authorization'] || '';
  const token = bruto.replace(/^Bearer\s+/i, '').trim();

  /* Mal configurada: não autentica ninguém, em vez de cair na demo. */
  if (cfg.malConfigurada) return null;

  if (cfg.modoLocal) {
    /* demonstração: identidade declarada, sem validação criptográfica */
    const email = String(cabecalhos['x-gs2-demo-email'] || '').toLowerCase();
    if (!email) return null;
    return {
      email,
      nome: cabecalhos['x-gs2-demo-nome'] || email.split('@')[0],
      papel: papelDe(email),
      modo: 'demonstracao'
    };
  }

  if (!token) return null;

  try {
    const j = carregarJose();
    const { payload } = await j.jwtVerify(token, chaves(), {
      /* SÓ api://{clientId}. Aceitar também o clientId puro fazia o ID
         token do frontend valer como credencial da API — e o ID token
         fica no localStorage do navegador e trafega pelo canal frontal.
         Era jogar fora o motivo de existir o "Expose an API". */
      audience: cfg.audiencia,
      issuer: [
        `https://login.microsoftonline.com/${cfg.tenantId}/v2.0`,
        `https://sts.windows.net/${cfg.tenantId}/`
      ],
      algorithms: ['RS256'],
      clockTolerance: 30
    });
    if (payload.tid && payload.tid !== cfg.tenantId) return null;

    /* Access token de verdade traz o escopo delegado. Sem isso, qualquer
       token do mesmo tenant com a audiência certa passaria. */
    const escopos = String(payload.scp || '').split(/\s+/);
    if (!escopos.includes('access_as_user')) return null;

    /* `email` é atributo que o diretório de origem controla em convidado
       B2B — e o papel aqui é derivado do e-mail. Só valem os claims que
       o próprio tenant emite. */
    const email = String(payload.preferred_username || payload.upn || '').toLowerCase();
    if (!email) return null;
    return {
      email,
      nome: payload.name || email,
      papel: papelDe(email),
      oid: payload.oid || '',
      modo: 'entra'
    };
  } catch (e) {
    return null;
  }
}

/* Regras de acesso, num lugar só.
   Cliente externo nunca escreve nada e só lê o que é dele. */
const REGRAS = {
  'processos:ler':     ['Administrador', 'Colaborador', 'Cliente'],
  'processos:escrever':['Administrador', 'Colaborador'],
  'processos:apagar':  ['Administrador'],
  'cadastros:ler':     ['Administrador', 'Colaborador'],
  'pessoas:escrever':  ['Administrador', 'Colaborador'],
  'cadastros:escrever':['Administrador'],
  'auditoria:ler':     ['Administrador'],
  /* O acervo é leitura do SharePoint. Cliente externo lê o dele; varrer
     é ação de quem trabalha no escritório. */
  'acervo:ler':        ['Administrador', 'Colaborador', 'Cliente'],
  'acervo:escrever':   ['Administrador', 'Colaborador'],
  'replica:operar':    ['Administrador']
};

function pode(usuario, acao) {
  if (!usuario) return false;
  const permitidos = REGRAS[acao];
  return !!permitidos && permitidos.includes(usuario.papel);
}

module.exports = { identificar, pode, papelDe, REGRAS };
