/* ===================================================================
   CONFIGURAÇÃO DO AMBIENTE — Processos Societários (GS2 Negócios)
   ===================================================================
   Este é o ÚNICO arquivo que muda entre o teste local e a publicação.
   Preencha tenantId e clientId com os valores do registro do aplicativo
   no Microsoft Entra ID (ver README-implantacao.md, passo 1).

   Enquanto estiverem vazios, a ferramenta abre em MODO DEMONSTRAÇÃO:
   tudo funciona na tela, mas nada é lido nem gravado no SharePoint.
   =================================================================== */
window.GS2_CONFIG_OVERRIDE = {

  /* Entra ID → Visão geral do aplicativo registrado */
  tenantId: '',   // "ID do diretório (locatário)"
  clientId: '',   // "ID do aplicativo (cliente)"

  /* Deixe vazio para usar <origem>/auth.html */
  redirectUri: '',

  /* Quem entra como Administrador. O resto da equipe entra como Colaborador. */
  administradores: ['vinicius@gs2negocios.com.br'],

  /* Só e-mails deste domínio entram pela aba "Usuário GS2" */
  dominioGS2: 'gs2negocios.com.br',

  /* Site e biblioteca do SharePoint da GS2 */
  sharepoint: {
    hostname: 'gs2negociosmt.sharepoint.com',
    sitePath: '/sites/clientes',
    biblioteca: 'Documentos Compartilhados',
    pastaTestes: 'Z - Testes da Ferramenta'
  },

  /* Clientes externos autenticam pelo Entra ID (convidados B2B)?
     false = valida só contra o cadastro de Usuários de Clientes da ferramenta. */
  clientesViaEntra: false,

  /* 'auto' decide sozinho; 'demo' força demonstração; 'entra' força o modo real. */
  modo: 'auto'
};
