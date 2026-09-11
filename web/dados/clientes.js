/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */

/* Lista de clientes. Em modo demonstração vale esta lista embutida; conectado ao
   SharePoint ela é substituída pelas pastas reais da biblioteca (ver App.sincronizarClientes). */
/* Lista de clientes. NASCE VAZIA: conectada ao SharePoint, a lista passa a
   ser as pastas reais da biblioteca (ver App.sincronizarClientes). Em modo
   demonstração fica vazia mesmo — melhor tela vazia que razão social de
   cliente real dentro do código publicado. */
let CLIENTES = [];

const SHAREPOINT_SITE = "https://gs2negocios.sharepoint.com/sites/Societario";

/* Fichas dos clientes. NASCEM VAZIAS: quem as preenche é a varredura do
   acervo (Administração › Acervo do SharePoint), que lê o Cartão CNPJ e o
   QSA de cada pasta e grava no banco. As fichas de exemplo que existiam
   aqui continham CNPJ, QSA e endereço reais (pendência C3) e foram
   removidas em 08/09/2026. Cliente ainda não varrido recebe a forma vazia
   (GS2Acervo.formaVazia) em tempo de execução. */
const CLIENTES_DETALHE = {};

/* Fila de regularização: clientes sem Cartão CNPJ nem QSA arquivados.
   Calculada a partir do acervo real (App.recalcularSemDocumentos). */
let CLIENTES_SEM_DOCUMENTOS = [];
