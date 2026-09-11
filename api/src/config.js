/* =====================================================================
   Configuração da API — lida do ambiente.

   Em produção (Azure Static Web Apps → Configuração), cada chave vira uma
   variável de aplicativo. Em teste local, saem do local.settings.json ou
   ficam vazias, e aí a API roda em MODO LOCAL: banco em arquivo e
   identidade de demonstração, sem depender de nada do Azure.
   ===================================================================== */

const env = process.env;

const cfg = {
  /* ---- Entra ID (mesmo registro de aplicativo do frontend) ---- */
  tenantId: env.GS2_TENANT_ID || '',
  clientId: env.GS2_CLIENT_ID || '',
  /* audience esperada no token que o frontend manda para cá.
     Vem do "Expose an API" do registro: api://{clientId} */
  audiencia: env.GS2_API_AUDIENCE || (env.GS2_CLIENT_ID ? 'api://' + env.GS2_CLIENT_ID : ''),

  /* ---- Papéis ---- */
  dominioGS2: env.GS2_DOMINIO || 'gs2negocios.com.br',
  administradores: (env.GS2_ADMINS || 'vinicius@gs2negocios.com.br')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),

  /* ---- Banco ---- */
  /* 'cosmos' em produção; 'arquivo' no teste local */
  banco: env.GS2_BANCO || '',
  cosmos: {
    endpoint: env.COSMOS_ENDPOINT || '',
    chave: env.COSMOS_KEY || '',            /* vazio = usa identidade gerenciada */
    bancoNome: env.COSMOS_DB || 'gs2processos'
  },
  pastaDados: env.GS2_PASTA_DADOS || './.dados',

  /* ---- SharePoint (etapa 2 — réplica) ---- */
  sharepoint: {
    hostname: env.GS2_SP_HOSTNAME || 'gs2negociosmt.sharepoint.com',
    sitePath: env.GS2_SP_SITE || '/sites/clientes',
    biblioteca: env.GS2_SP_BIBLIOTECA || 'Documentos Compartilhados'
  },
  /* a réplica só liga quando isto for "1" E houver identidade gerenciada */
  replicaLigada: env.GS2_REPLICA === '1',
  /* segredo combinado com o Graph para provar que a notificação é legítima */
  webhookClientState: env.GS2_WEBHOOK_CLIENT_STATE || '',
  /* URL pública deste endpoint, registrada na assinatura do Graph */
  webhookUrl: env.GS2_WEBHOOK_URL || '',

  /* ---- Retenção (pendência C1) ----
     Dias após os quais um registro com dado pessoal é considerado vencido.
     0 = sem expiração automática. A API só MARCA; não apaga nada sozinha. */
  retencaoDias: parseInt(env.GS2_RETENCAO_DIAS || '0', 10) || 0
};

/* ---------------------------------------------------------------------
   MODO DEMONSTRAÇÃO — precisa ser LIGADO de propósito.

   Antes, bastava faltar `GS2_TENANT_ID` ou `GS2_CLIENT_ID` para a API
   passar a aceitar identidade declarada por cabeçalho. Isso falhava em
   ABERTO: esquecer uma variável no portal do Azure publicava uma API que
   entregava todos os processos, CPFs e cadastros a qualquer um, e o
   /api/saude ainda anunciava a condição.

   Agora o modo demonstração exige GS2_PERMITIR_DEMO=1. O servidor local
   define essa variável sozinho (ver servidor-local.js); no Azure ela não
   existe, então sem Entra configurado a API simplesmente não autentica
   ninguém — que é o comportamento certo para uma configuração
   incompleta.
   --------------------------------------------------------------------- */
cfg.entraConfigurado = !!(cfg.tenantId && cfg.clientId);
cfg.demoPermitida = env.GS2_PERMITIR_DEMO === '1';
cfg.modoLocal = !cfg.entraConfigurado && cfg.demoPermitida;

/* Nem autentica de verdade, nem aceita demonstração: a API está mal
   configurada e precisa dizer isso em vez de fingir que funciona. */
cfg.malConfigurada = !cfg.entraConfigurado && !cfg.demoPermitida;

/* O banco também escolhia sozinho: sem COSMOS_ENDPOINT caía em 'arquivo',
   que no Azure grava num disco efêmero — os dados somem no próximo cold
   start, sem erro nenhum. Fora do modo demonstração, exigir escolha. */
cfg.banco = cfg.banco || (cfg.cosmos.endpoint ? 'cosmos' : (cfg.modoLocal ? 'arquivo' : ''));

module.exports = cfg;
