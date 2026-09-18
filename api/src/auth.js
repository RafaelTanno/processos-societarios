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

/* Por que a última recusa aconteceu.
   Sem isto, um token recusado vira 401 mudo e não há como distinguir
   "assinatura inválida" de "não consegui falar com a Microsoft" — foi o
   que travou o diagnóstico de 18/09/2026 por horas. É um CÓDIGO curto,
   nunca a mensagem crua: a mensagem do jose/fetch carrega hostname e
   caminho, que é justamente o que não pode ir para a tela. */
let ultimoMotivo = '';

function motivoDaRecusa() { return ultimoMotivo; }

/* Traduz a falha para um código estável, sem detalhe de infraestrutura. */
function classificar(e) {
  const codigo = String((e && (e.code || e.name)) || '');
  if (codigo.includes('ERR_JWKS_NO_MATCHING_KEY')) return 'chave-nao-encontrada';
  if (codigo.includes('ERR_JWS_SIGNATURE_VERIFICATION_FAILED')) return 'assinatura';
  if (codigo.includes('ERR_JWT_EXPIRED')) return 'expirado';
  if (codigo.includes('ERR_JWT_CLAIM_VALIDATION_FAILED')) return 'claim:' + String((e && e.claim) || '');
  if (codigo.includes('ERR_JOSE_GENERIC')) return 'jose';
  /* falha de rede ao buscar o JWKS aparece como TypeError/FetchError */
  if (codigo.includes('TypeError') || codigo.includes('Fetch')) return 'rede-jwks';
  return codigo || 'desconhecido';
}

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
  /* O token vem em X-GS2-Auth, não em Authorization.
     No Azure Static Web Apps o `Authorization` do cliente NÃO chega na
     função gerenciada: a plataforma o descarta e injeta um próprio, com
     outro algoritmo de assinatura — o sintoma é 100% das rotas
     autenticadas respondendo 401 com a configuração toda correta
     (investigado em 18/09/2026). `Authorization` continua sendo aceito
     como segunda opção porque o servidor local de teste não tem essa
     plataforma na frente. Qual cabeçalho carregou o token não afeta
     segurança: ele é validado por assinatura do mesmo jeito. */
  const bruto = cabecalhos['x-gs2-auth'] || cabecalhos['X-GS2-Auth']
             || cabecalhos['authorization'] || cabecalhos['Authorization'] || '';
  const token = bruto.replace(/^Bearer\s+/i, '').trim();

  ultimoMotivo = '';

  /* Mal configurada: não autentica ninguém, em vez de cair na demo. */
  if (cfg.malConfigurada) { ultimoMotivo = 'mal-configurada'; return null; }

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

  if (!token) { ultimoMotivo = 'sem-token'; return null; }

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
    if (payload.tid && payload.tid !== cfg.tenantId) { ultimoMotivo = 'tenant'; return null; }

    /* Access token de verdade traz o escopo delegado. Sem isso, qualquer
       token do mesmo tenant com a audiência certa passaria. */
    const escopos = String(payload.scp || '').split(/\s+/);
    if (!escopos.includes('access_as_user')) { ultimoMotivo = 'escopo'; return null; }

    /* `email` é atributo que o diretório de origem controla em convidado
       B2B — e o papel aqui é derivado do e-mail. Só valem os claims que
       o próprio tenant emite. */
    const email = String(payload.preferred_username || payload.upn || '').toLowerCase();
    if (!email) { ultimoMotivo = 'sem-email'; return null; }
    return {
      email,
      nome: payload.name || email,
      papel: papelDe(email),
      oid: payload.oid || '',
      modo: 'entra'
    };
  } catch (e) {
    ultimoMotivo = classificar(e);
    /* a mensagem crua só no log do servidor, nunca na resposta */
    console.error('[auth] token recusado (' + ultimoMotivo + '):', e && e.message);
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

module.exports = { identificar, pode, papelDe, motivoDaRecusa, REGRAS };
