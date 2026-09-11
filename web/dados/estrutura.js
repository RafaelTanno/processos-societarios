/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */

/* ============================================================================
   ESTRUTURA PADRÃO DE PASTAS DO CLIENTE NO SHAREPOINT
   ----------------------------------------------------------------------------
   Espelha fielmente a pasta-modelo oficial da GS2:
   /sites/clientes/Documentos Compartilhados/Z - Estrutura de Pasta - Novos Clientes

   REGRA: ao cadastrar uma empresa nova, a ferramenta cria a pasta do cliente na
   raiz de "Documentos Compartilhados" (nome = razão social, sem a letra inicial
   como nível intermediário) e replica esta árvore inteira dentro dela, ANTES de
   salvar qualquer documento. Nenhum documento é salvo solto na raiz do cliente.

   As duas subpastas de 03.01 (DOCUMENTOS AUXILIARES e PROCESSOS DE ALTERAÇÃO)
   não estão na pasta-modelo, mas existem em todos os clientes ativos — então
   entram no padrão para não gerar divergência.
   ============================================================================ */
const ESTRUTURA_PASTAS_PADRAO = [
  {nome:"01 - Fiscal"},
  {nome:"02 - Contabilidade"},
  {nome:"03 - Societario", filhos:[
    {nome:"03.01 - Contratos Sociais, CNPJ e QSA", filhos:[
      {nome:"DOCUMENTOS AUXILIARES"},
      {nome:"PROCESSOS DE ALTERAÇÃO"}
    ]},
    {nome:"03.02 - Alvarás e Legalizaçoes"}
  ]},
  {nome:"04 - Folha de Pagamento"},
  {nome:"05 - Certificado Digital"},
  {nome:"06 - Material Institucional da Empresa"},
  {nome:"07 - Relatorio de Resultados"},
  {nome:"08 - Compartilhar Documentos com GS2", filhos:[
    {nome:"08.01 - Fiscal"},
    {nome:"08.02 - Contabilidade"},
    {nome:"08.03 - Trabalhista"},
    {nome:"08.04 - Societário"}
  ]}
];

/* Para onde cada documento do processo vai dentro da pasta do cliente.
   `pasta` é o caminho relativo à pasta do cliente; `prefixo` é o TIPO usado na
   convenção de nome de arquivo TIPO_DD.MM.AAAA_RAZAO SOCIAL.ext observada no acervo.
   Documentos de sócio (RG/CPF/comprovante) NÃO vão para 03.01: eles são dado
   pessoal de apoio e ficam em DOCUMENTOS AUXILIARES. */
const PASTA_SOCIETARIO       = "03 - Societario/03.01 - Contratos Sociais, CNPJ e QSA";
const PASTA_AUXILIARES       = PASTA_SOCIETARIO + "/DOCUMENTOS AUXILIARES";
const PASTA_ALTERACOES       = PASTA_SOCIETARIO + "/PROCESSOS DE ALTERAÇÃO";
const PASTA_ALVARAS          = "03 - Societario/03.02 - Alvarás e Legalizaçoes";

const DESTINO_DOCUMENTOS = {
  /* Etapa 4 — documentos coletados do cliente */
  rg:              {pasta:PASTA_AUXILIARES, prefixo:"RG-CNH"},
  cnhSocio:        {pasta:PASTA_AUXILIARES, prefixo:"CNH"},
  cpf:             {pasta:PASTA_AUXILIARES, prefixo:"CPF"},
  end_socios:      {pasta:PASTA_AUXILIARES, prefixo:"COMPROVANTE ENDERECO SOCIO"},
  end_sede:        {pasta:PASTA_AUXILIARES, prefixo:"COMPROVANTE ENDERECO SEDE"},
  minuta:          {pasta:PASTA_SOCIETARIO, prefixo:"MINUTA CONTRATO SOCIAL"},
  contrato_atual:  {pasta:PASTA_SOCIETARIO, prefixo:"CONTRATO SOCIAL"},
  contrato_atual2: {pasta:PASTA_SOCIETARIO, prefixo:"CONTRATO SOCIAL"},
  contrato_atual3: {pasta:PASTA_SOCIETARIO, prefixo:"CONTRATO SOCIAL"},
  ultima_alt:      {pasta:PASTA_ALTERACOES, prefixo:"ULTIMA ALTERACAO"},
  doc_socios:      {pasta:PASTA_AUXILIARES, prefixo:"DOCUMENTOS SOCIOS"},
  ata:             {pasta:PASTA_ALTERACOES, prefixo:"ATA"},
  end_novo:        {pasta:PASTA_AUXILIARES, prefixo:"COMPROVANTE ENDERECO"},
  certidoes:       {pasta:PASTA_AUXILIARES, prefixo:"CERTIDOES NEGATIVAS"},
  balanco:         {pasta:PASTA_AUXILIARES, prefixo:"BALANCO ENCERRAMENTO"},
  distrato:        {pasta:PASTA_SOCIETARIO, prefixo:"DISTRATO SOCIAL"},
  procuracao:      {pasta:PASTA_AUXILIARES, prefixo:"PROCURACAO"},
  descritivo:      {pasta:PASTA_SOCIETARIO, prefixo:"DESCRITIVO DO EVENTO"},
  outros_docs:     {pasta:PASTA_AUXILIARES, prefixo:"DOCUMENTOS DIVERSOS"},
  /* Etapa 6 — documentos da Junta Comercial */
  viabilidade:     {pasta:PASTA_ALTERACOES, prefixo:"VIABILIDADE"},
  fcn:             {pasta:PASTA_ALTERACOES, prefixo:"FCN"},
  contratoSocialChancelado: {pasta:PASTA_SOCIETARIO, prefixo:"CONTRATO SOCIAL"},
  /* Etapa 7 e 8 */
  dbe:             {pasta:PASTA_ALTERACOES, prefixo:"DBE"},
  alvaraMunicipal: {pasta:PASTA_ALVARAS, prefixo:"ALVARA MUNICIPAL"},
  inscricaoEstadual:{pasta:PASTA_ALVARAS, prefixo:"INSCRICAO ESTADUAL"},
  alvaraPropaganda:{pasta:PASTA_ALVARAS, prefixo:"ALVARA PROPAGANDA"},
  vigilanciaSanitaria:{pasta:PASTA_ALVARAS, prefixo:"VIGILANCIA SANITARIA"},
  /* Gerados pela ferramenta */
  contratoGerado:  {pasta:PASTA_SOCIETARIO, prefixo:"CONTRATO SOCIAL"},
  cartaoCnpj:      {pasta:PASTA_SOCIETARIO, prefixo:"CNPJ"},
  qsa:             {pasta:PASTA_SOCIETARIO, prefixo:"QSA"}
};

const ALTERACAO_STATUS_META = {
  registrado:{label:"Registrada", cls:"good"},
  andamento:{label:"Em andamento", cls:"info"},
  documentos:{label:"Aguardando documentos", cls:"warn"},
  indeferido:{label:"Indeferida", cls:"crit"}
};

const DOC_STATUS_META = {
  ok:{label:"Em dia", cls:"good"},
  /* anexado ao processo, mas ainda NÃO arquivado no SharePoint — a
     ferramenta não pode dizer "em dia" sobre documento que não subiu */
  anexado:{label:"Anexado ao processo", cls:"info"},
  vencido:{label:"Vencido", cls:"warn"},
  faltando:{label:"Faltando", cls:"crit"}
};

const TIPOS = {
  abertura: {label:"Abertura de Empresa", ic:"🏢", desc:"Constituição de uma nova empresa: contrato social, sócios, capital e atividade."},
  alteracao: {label:"Alteração Societária", ic:"🔄", desc:"Mudança de sócios, capital, endereço, atividade, razão social ou administração."},
  filial: {label:"Abertura de Filial", ic:"🏬", desc:"Constituição de filial de empresa já existente: endereço, atividades e inscrição do novo estabelecimento."},
  baixa: {label:"Baixa de Empresa", ic:"🔻", desc:"Encerramento e dissolução da empresa perante os órgãos competentes."},
  outros: {label:"Outros Eventos", ic:"📁", desc:"Transformação, incorporação, cisão, fusão, procurações e demais eventos."}
};

/* each doc can optionally define `extract`: simulated OCR result + which wizard field(s) it fills */
const DOCS_REQUIRED = {
  abertura: [
    {id:"rg", label:"RG ou CNH dos sócios", leitura:"Documento anexado. A leitura da CNH é feita na etapa de dados, no cadastro de cada sócio (OCR no navegador)."},
    {id:"cpf", label:"CPF dos sócios (se não constar no documento acima)"},
    {id:"end_socios", label:"Comprovante de endereço dos sócios"},
    /* Comprovante de endereço da sede: só anexo. A leitura por OCR do IPTU foi
       dispensada — o endereço da sede já vem do CEP na etapa de dados, então o
       documento aqui serve como comprovação, não como fonte de preenchimento. */
    {id:"end_sede", label:"Comprovante de endereço da sede (IPTU ou contrato de locação)"},
    {id:"minuta", label:"Minuta do Contrato Social / Estatuto (se já elaborada)"}
  ],
  alteracao: [
    {id:"contrato_atual", label:"Contrato Social consolidado atual", leitura:"Documento anexado. Contrato social não é lido automaticamente — os dados vêm do Cartão CNPJ e do QSA do acervo, e do preenchimento da etapa de dados."},
    {id:"ultima_alt", label:"Última alteração contratual registrada"},
    {id:"doc_socios", label:"Documentos pessoais dos sócios envolvidos"},
    {id:"ata", label:"Ata de reunião / assembleia (se aplicável)"},
    {id:"end_novo", label:"Comprovante de endereço atualizado (se houver mudança)"}
  ],
  filial: [
    {id:"contrato_matriz", label:"Contrato Social consolidado atual da matriz"},
    {id:"cnpj_matriz", label:"Cartão CNPJ da matriz"},
    {id:"end_filial", label:"Comprovante de endereço da filial (IPTU ou contrato de locação)"},
    {id:"doc_admin_filial", label:"Documentos do administrador responsável pela filial"},
    {id:"minuta_filial", label:"Minuta da alteração contratual de abertura de filial (se já elaborada)"}
  ],
  baixa: [
    {id:"contrato_atual2", label:"Contrato Social consolidado atual", leitura:"Documento anexado. Contrato social não é lido automaticamente — os dados vêm do acervo e da etapa de dados."},
    {id:"certidoes", label:"Certidões negativas (Federal, Estadual, Municipal, FGTS, Trabalhista)"},
    {id:"balanco", label:"Balanço de encerramento"},
    {id:"distrato", label:"Minuta do Distrato Social (se já elaborada)"},
    {id:"procuracao", label:"Procuração (se aplicável)"}
  ],
  outros: [
    {id:"descritivo", label:"Documento descritivo do evento"},
    {id:"contrato_atual3", label:"Contrato Social consolidado atual"},
    {id:"outros_docs", label:"Demais documentos pertinentes ao evento"}
  ]
};

const STATUS_META = {
  analise:{label:"Em análise",cls:"info"}, documentos:{label:"Aguardando documentos",cls:"warn"},
  andamento:{label:"Em andamento",cls:"info"}, concluido:{label:"Concluído",cls:"good"}, cancelado:{label:"Cancelado",cls:"crit"}
};

/* Fluxo baseado nos manuais da JUCEMAT (Portal de Serviços / REDESIM) — ver documentação do projeto para as fontes */
const JUCEMAT_STEPS = [
  {key:"viabilidade", label:"Viabilidade (Portal de Serviços / REDESIM)"},
  {key:"dbe", label:"DBE — RFB / Módulo Integrador (quando aplicável)"},
  {key:"fcn", label:"FCN / Integrador Nacional (RC/REMP)"},
  {key:"pagamento", label:"Pagamento da taxa (DARE)"},
  {key:"registro", label:"Assinatura e Registro Digital (gov.br / certificado)"},
  {key:"licenciamentos", label:"Licenciamentos (alvarás, inscrição estadual, vigilância sanitária)"}
];
const JUCEMAT_STATUS_LABEL = {pendente:"Pendente", andamento:"Em andamento", concluido:"Concluído", indeferido:"Indeferida", na:"Não se aplica"};

/* Acompanhamento do Protocolo de Reconsideração aberto junto ao órgão municipal (ex.: Integrador Digital
   da Prefeitura de Campo Grande/MS), quando a Viabilidade vem indeferida na análise de endereço/atividade.
   Esse protocolo é aberto pelo próprio usuário no sistema do município (login gov.br dele) — a ferramenta
   só registra o acompanhamento manual, igual já faz com o restante do fluxo da Junta Comercial. */
const RECONSIDERACAO_STATUS_LABEL = {pendente:"Ainda não aberta", aberta:"Protocolo aberto — aguardando análise manual", deferida:"Deferida", indeferida:"Indeferida (mantido o indeferimento)"};

/* Etapa 6 do wizard — protocolo e documentos da Junta Comercial */
const JUNTA_DOCS = [
  {id:"viabilidade", label:"Documento de Viabilidade"},
  {id:"fcn", label:"FCN — Ficha de Cadastro Nacional"},
  {id:"contratoSocialChancelado", label:"Contrato Social chancelado (após aprovação da JUCEMAT)"}
];

/* Etapa 7 do wizard — licenciamentos complementares (algumas licenças não se aplicam a todo processo) */
const LICENCIAMENTOS_ITEMS = [
  {id:"alvaraMunicipal", label:"Alvará da Prefeitura Municipal"},
  {id:"inscricaoEstadual", label:"Inscrição Estadual"},
  {id:"alvaraPropaganda", label:"Alvará de Propaganda"},
  {id:"vigilanciaSanitaria", label:"Vigilância Sanitária"}
];
