/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */

/* ======================= ADMINISTRAÇÃO (visível apenas para Administrador) =======================
   Fase 1: cadastro de usuários e "forçar atualização" são controles internos da própria ferramenta —
   não fazem chamada real a nenhum sistema externo ainda. Ver nota nas telas de admin. */
let TABELAS_REFERENCIA = [
  {id:"cnae", nome:"CNAE — Classificação Nacional de Atividades Econômicas", fonte:"IBGE / Concla (servicodados.ibge.gov.br/api/v2/cnae)", versao:`${CNAE_DATA.subclasses.length} subclasses vigentes`, atualizadoEm:"31/08/2026"},
  {id:"clientes", nome:"Clientes e pastas do SharePoint", fonte:"SharePoint — Documentos Compartilhados", versao:`${CLIENTES.length} clientes cadastrados`, atualizadoEm:"—"},
  {id:"modelos", nome:"Modelos de Contrato", fonte:"Biblioteca interna da ferramenta", versao:`${TEMPLATES.length} modelos cadastrados`, atualizadoEm:"—"},
  {id:"jucemat", nome:"Fluxo e manuais da Junta Comercial (JUCEMAT)", fonte:"jucemat.mt.gov.br/manuais", versao:"Base de conhecimento — Fase 2", atualizadoEm:"28/08/2026"},
  {id:"dominio", nome:"Regras de lançamento — Sistema Domínio", fonte:"A confirmar com TI/contabilidade GS2", versao:"Ainda não integrado", atualizadoEm:"—"}
];
let ADMIN_LOG = [];

/* Diretório interno de usuários. O PAPEL não sai daqui — sai do e-mail dentro
   do token (ver api/src/auth.js). Esta lista é só o cadastro que a tela de
   Administração › Usuários mostra e edita. Nasce com o administrador. */
let USERS = [
  {id:"u1", nome:"Vinícius", email:"vinicius@gs2negocios.com.br", papel:"Administrador", status:"Ativo", ultimoAcesso:"—"}
];

/* ============================================================================
   USUÁRIOS DE CLIENTE (acesso externo)
   ----------------------------------------------------------------------------
   Pessoas que trabalham NO CLIENTE, não na GS2. O cadastro é feito por um
   funcionário GS2 e define exatamente quais empresas aquela pessoa enxerga.

   Regras de acesso do usuário de cliente:
     • vê SOMENTE o Painel de Clientes — nenhum outro item do menu;
     • dentro do painel, vê SOMENTE as empresas habilitadas no seu cadastro;
     • pode baixar e compartilhar os documentos societários dessas empresas;
     • NÃO pode abrir processo, editar cadastro, rodar OCR nem ver a fila de
       pendências internas da GS2.

   Fase integrada: cada usuário destes vira um convidado (guest) no Entra ID e a
   restrição por empresa é aplicada no backend, não só na tela. */
let USUARIOS_CLIENTE = [];

let LINKS_COMPARTILHADOS = [];

/* Requerentes da Viabilidade (dados de CPF/e-mail/telefone usados no login gov.br ao abrir a Viabilidade na JUCEMAT).
   Cadastro restrito à área de Administrador; o colaborador só escolhe qual requerente usar em cada processo. */
let REQUERENTES = [];

/* Base de pessoas da GS2 (sócios pessoa física, representantes legais de sócios PJ e administradores),
   indexada por CPF (só dígitos). Cresce automaticamente a cada processo enviado (ver App.submitProcesso) —
   quando o mesmo CPF aparece de novo (neste processo ou em outro futuro), nome/endereço/contato já
   cadastrados são sugeridos automaticamente (ver App.autoFillPessoa). Nasce vazia. */
let PESSOAS_CADASTRO = {};
