/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */

/* ===================================================================
   GATILHOS PARA A AUTOMAÇÃO DA JUNTA COMERCIAL (Fase 2)
   ===================================================================
   Nada aqui automatiza nada hoje. É o encaixe: o ponto único por onde a
   automação futura vai entrar, para que ela não precise mexer no wizard
   nem conhecer a estrutura interna da ferramenta.

   Quatro peças:

   1. PAYLOAD  — GS2Redesim.payloadViabilidade() devolve, num formato
      estável e versionado, tudo que a Consulta de Viabilidade pede, na
      ordem das telas do portal. É o contrato entre a ferramenta e
      qualquer automação (RPA, extensão de navegador, integrador
      credenciado). Quem automatizar consome isto, não o wizard.

   2. MAPA    — MAPA_VIABILIDADE diz, campo a campo, de onde sai cada
      informação e qual é a armadilha de cada tela. É documentação
      executável: alimenta a tela de preparação e serve de roteiro para
      o robô.

   3. EVENTOS — GS2Redesim.ao(evento, fn) / .emitir(evento, dados).
      Os momentos em que a automação precisa acordar já estão marcados
      no código (processo.enviado, viabilidade.pronta, viabilidade.
      protocolada, viabilidade.indeferida, dbe.pronta, registro.concluido).

   4. ADAPTADORES — um por UF/órgão. Registrar um adaptador é tudo que a
      Fase 2 precisa fazer para ligar a automação de um estado:
        GS2Redesim.registrarAdaptador('MT', { protocolarViabilidade(p){...} });

   TRAVA DE SEGURANÇA: nenhum adaptador pode concluir uma submissão
   oficial sem autorização humana explícita e por processo — ver
   GS2Redesim.podeConcluir(). Isso é regra, não configuração: quem
   preenche não é quem conclui.
   =================================================================== */

/* Mapa campo a campo: tela do portal → origem na ferramenta.
   Levantado no protocolo real MTB2600227890 (BCG PARTICIPACOES LTDA,
   Cuiabá/MT, 07/09/2026). */
const MAPA_VIABILIDADE = [
  {tela:2,  campo:'Evento',                    origem:'campos.viabEvento',           obrigatorio:true,
   nota:'101 = matriz nova, 102 = filial, 150 = proteção de nome. O botão chama "Continuar com Inscrição".'},
  {tela:2,  campo:'Somente regularização RFB', origem:'campos.viabSomenteRfb',       obrigatorio:false, padrao:'Não'},
  {tela:3,  campo:'Enquadramento',             origem:'campos.viabEnquadramento',    obrigatorio:true,
   nota:'ME / EPP / Outros. Não confundir com regime tributário.'},
  {tela:3,  campo:'Natureza jurídica',         origem:'campos.tipoSocietario',       obrigatorio:true},
  {tela:4,  campo:'Município',                 origem:'campos.endereco.municipio',   obrigatorio:true},
  {tela:5,  campo:'Sócios (CPF)',              origem:'socios[].documento',          obrigatorio:true,
   nota:'O portal traz o nome da Receita a partir do CPF. Se não bater com o cadastro, há erro em um dos dois.'},
  {tela:5,  campo:'1ª opção de nome empresarial', origem:'campos.razaoSocial',       obrigatorio:true},
  {tela:5,  campo:'2ª opção de nome',          origem:'campos.razaoSocialOpcao2',    obrigatorio:false,
   nota:'Ter alternativas evita uma rodada de exigência se a primeira colidir.'},
  {tela:5,  campo:'3ª opção de nome',          origem:'campos.razaoSocialOpcao3',    obrigatorio:false},
  {tela:5,  campo:'Natureza do imóvel',        origem:'campos.viabNaturezaImovel',   obrigatorio:true,
   nota:'Na abertura só há Urbano e Sem Regularização. Os campos de endereço só aparecem depois desta escolha.'},
  {tela:5,  campo:'Tipo de unidade',           origem:'campos.viabTipoUnidade',      obrigatorio:true},
  {tela:5,  campo:'Forma de atuação',          origem:'campos.viabFormaAtuacao',     obrigatorio:true,
   nota:'Marcar só "01 - Estabelecimento fixo" força todas as atividades como exercidas no local.'},
  {tela:6,  campo:'CEP',                       origem:'campos.endereco.cep',         obrigatorio:true,
   nota:'Auto-preenche logradouro, bairro e município (travados).'},
  {tela:6,  campo:'Número',                    origem:'campos.endereco.numero',      obrigatorio:true},
  {tela:6,  campo:'Complemento',               origem:'campos.endereco.complemento', obrigatorio:false,
   nota:'É estruturado: modal com Tipo (SALA, LOTE, BLOCO...) + Descrição. Resultado fica "SALA: 01;".'},
  {tela:6,  campo:'Área total da edificação',  origem:'campos.viabAreaTotal',        obrigatorio:true,
   nota:'Do ESTABELECIMENTO, não do prédio. A área construída do IPTU costuma ser do edifício inteiro.'},
  {tela:6,  campo:'Área utilizada',            origem:'campos.viabAreaUtilizada',    obrigatorio:true},
  {tela:6,  campo:'Inscrição imobiliária (IPTU)', origem:'campos.inscricaoImobiliaria', obrigatorio:false},
  {tela:7,  campo:'CNAE principal',            origem:'campos.cnaePrincipal',        obrigatorio:true,
   nota:'Pesquisar código → Adicionar → Definir como principal. Nem todo código tem sub-itens.'},
  {tela:7,  campo:'CNAEs secundários',         origem:'campos.cnaeSecundarios',      obrigatorio:false},
  {tela:7,  campo:'Atividade exercida no local', origem:'campos.viabAtividadeNoLocal', obrigatorio:false,
   nota:'Fica desabilitado quando a forma de atuação é só "estabelecimento fixo".'},
  {tela:8,  campo:'Objeto social',             origem:'(gerado dos CNAEs)',          obrigatorio:false,
   nota:'É editável e vai para o contrato social. Precisa ser repetido igual na Coleta Web do Cadastro Sincronizado.'},
  {tela:9,  campo:'Questionário municipal',    origem:'questionario.municipal', obrigatorio:true,
   nota:'Varia por município. Levantar ANTES de abrir o protocolo: as perguntas de lotes dependem do mapa da prefeitura.'},
  {tela:10, campo:'Concluir',                  origem:'(ato humano)',                obrigatorio:true,
   nota:'Submissão oficial e irreversível. Nunca automatizada sem autorização explícita por processo.'}
];

const GS2Redesim = {
  VERSAO_PAYLOAD: '1.0',

  /* ---------- 1. Payload ---------- */
  /* Tudo que a Viabilidade pede, no formato que a automação vai consumir.
     Estável: mudar a interface não pode mudar este formato sem subir a versão. */
  payloadViabilidade(){
    const c = wizard.campos || {};
    const end = c.endereco || {};
    const uf = end.uf || '';
    const q = (App.questionarioDoMunicipio && App.questionarioDoMunicipio()) || null;
    /* as respostas do questionário municipal ficam achatadas em wizard.campos,
       uma chave por pergunta (muniHabiteSe, muniZona, ...) */
    const respostas = c;

    return {
      _meta: {
        versao: this.VERSAO_PAYLOAD,
        geradoEm: new Date().toISOString(),
        geradoPor: (typeof currentUser !== 'undefined' ? currentUser.email || currentUser.nome : ''),
        tipoProcesso: wizard.tipo || '',
        uf: uf,
        orgao: (this.adaptadores[uf] || {}).orgao || '',
        portal: (this.adaptadores[uf] || {}).portal || ''
      },
      requerente: (function(){
        const r = (typeof REQUERENTES !== 'undefined' && wizard.juntaRequerenteId)
          ? REQUERENTES.find(x => x.id === wizard.juntaRequerenteId) : null;
        return r ? {nome:r.nome, cpf:r.cpf, email:r.email, telefone:r.telefone} : null;
      })(),
      evento: {
        codigo: c.viabEvento || '',
        somenteRfb: c.viabSomenteRfb || 'Não',
        enquadramento: c.viabEnquadramento || '',
        naturezaJuridica: c.tipoSocietario || ''
      },
      nomeEmpresarial: {
        opcao1: c.razaoSocial || '',
        opcao2: c.razaoSocialOpcao2 || '',
        opcao3: c.razaoSocialOpcao3 || '',
        nomeFantasia: c.nomeFantasia || ''
      },
      socios: (wizard.socios || []).map(s => ({
        tipo: s.tipo || 'PF',
        nome: s.nome || '',
        documento: s.documento || '',
        participacao: s.perc || '',
        representantes: (s.representantes || []).map(r => ({nome:r.nome||'', cpf:r.cpf||''}))
      })),
      imovel: {
        natureza: c.viabNaturezaImovel || '',
        tipoUnidade: c.viabTipoUnidade || '',
        formaAtuacao: c.viabFormaAtuacao || '',
        areaTotal: c.viabAreaTotal || '',
        areaUtilizada: c.viabAreaUtilizada || '',
        inscricaoImobiliaria: c.inscricaoImobiliaria || '',
        inscricaoMunicipal: c.inscricaoMunicipal || ''
      },
      endereco: {
        cep: end.cep || '', tipoLogradouro: end.tipoLogradouro || '', logradouro: end.logradouro || '',
        numero: end.numero || '', complemento: end.complemento || '', bairro: end.bairro || '',
        municipio: end.municipio || '', uf: uf, referencia: end.pontoReferencia || ''
      },
      atividades: {
        principal: c.cnaePrincipal || '',
        secundarias: (c.cnaeSecundarios || []).slice(),
        exercidaNoLocal: c.viabAtividadeNoLocal || '',
        horario: {inicio: c.viabHorarioInicio || '', fim: c.viabHorarioFim || '', dias: c.viabDias || ''}
      },
      objetoSocial: (App.montarObjetoSocial ? App.montarObjetoSocial() : ''),
      questionarioMunicipal: q ? {
        municipio: q.municipio, uf: q.uf, orgao: q.orgao,
        respostas: q.perguntas.map(p => ({
          n: p.n, chave: p.chave, pergunta: p.rotulo,
          resposta: respostas[p.chave] !== undefined && respostas[p.chave] !== ''
            ? respostas[p.chave] : (p.padrao || '')
        }))
      } : null
    };
  },

  /* ---------- 2. Prontidão ---------- */
  /* Responde: dá para protocolar? A lição do primeiro protocolo real foi que
     descobrir campo faltando no meio do wizard do portal trava tudo. */
  prontidaoViabilidade(){
    const p = this.payloadViabilidade();
    const valor = (caminho) => caminho.split('.').reduce((o,k)=> (o||{})[k], {campos:wizard.campos, socios:wizard.socios});
    const faltando = [];

    MAPA_VIABILIDADE.filter(m => m.obrigatorio && m.origem.indexOf('(') !== 0).forEach(m => {
      let v;
      if(m.origem === 'socios[].documento') v = (wizard.socios||[]).some(s=>s.documento) ? 'ok' : '';
      else if(m.origem === 'questionario.municipal'){
        const q = App.questionarioDoMunicipio && App.questionarioDoMunicipio();
        /* município ainda não mapeado no catálogo: não há questionário a cobrar */
        if(!q){ v = 'sem-catalogo'; }
        else {
          const r = wizard.campos || {};
          const vazias = q.perguntas.filter(pg => {
            const val = r[pg.chave] !== undefined && r[pg.chave] !== '' ? r[pg.chave] : (pg.padrao || '');
            return val === '' || val === undefined;
          });
          v = vazias.length ? '' : 'ok';
          if(vazias.length) m._detalhe = `${vazias.length} de ${q.perguntas.length} perguntas em branco`;
        }
      }
      else v = valor(m.origem);
      if(v === undefined || v === null || v === '') faltando.push(m);
    });

    return {
      pronto: faltando.length === 0,
      faltando: faltando,
      total: MAPA_VIABILIDADE.filter(m => m.obrigatorio && m.origem.indexOf('(') !== 0).length,
      payload: p
    };
  },

  /* ---------- 3. Eventos ---------- */
  _ouvintes: {},
  ao(evento, fn){ (this._ouvintes[evento] = this._ouvintes[evento] || []).push(fn); return this; },
  emitir(evento, dados){
    (this._ouvintes[evento] || []).forEach(fn => {
      try{ fn(dados, evento); }catch(e){ console.warn('[GS2Redesim] ouvinte de "'+evento+'" falhou:', e); }
    });
    if(this.registrarNoHistorico) this.registrarNoHistorico(evento, dados);
  },
  EVENTOS: [
    'processo.enviado',        /* processo gravado; hora de preparar a viabilidade */
    'viabilidade.pronta',      /* payload completo — a automação pode preencher o portal */
    'viabilidade.protocolada', /* protocolo MTB/MSP registrado */
    'viabilidade.deferida',
    'viabilidade.indeferida',  /* dispara o fluxo de reconsideração municipal */
    'dbe.pronta',
    'fcn.pronta',
    'registro.concluido'
  ],
  historico: [],
  registrarNoHistorico(evento, dados){
    this.historico.push({evento, em:new Date().toISOString(), cliente:(dados&&dados.cliente)||'', protocolo:(dados&&dados.protocolo)||''});
    if(this.historico.length > 200) this.historico.shift();
  },

  /* ---------- 4. Adaptadores por UF ---------- */
  adaptadores: {
    'MT': {orgao:'JUCEMAT', portal:'https://www.jucemat.mt.gov.br', prefixoProtocolo:'MTB', automacao:null},
    'MS': {orgao:'JUCEMS',  portal:'https://www.jucems.ms.gov.br',  prefixoProtocolo:'MSP', automacao:null}
  },
  registrarAdaptador(uf, impl){
    const a = this.adaptadores[uf] = Object.assign(this.adaptadores[uf] || {}, {automacao: impl});
    console.log(`[GS2Redesim] adaptador de ${uf} registrado (${a.orgao||'—'}).`);
    return a;
  },
  adaptadorDoProcesso(){
    const uf = ((wizard.campos.endereco || {}).uf) || '';
    return this.adaptadores[uf] || null;
  },
  automacaoDisponivel(){
    const a = this.adaptadorDoProcesso();
    return !!(a && a.automacao && typeof a.automacao.protocolarViabilidade === 'function');
  },

  /* ---------- Trava de conclusão ----------
     A submissão oficial (o "Concluir" do portal) é irreversível e é ato do
     responsável, não da ferramenta. Nenhuma automação passa daqui sem que uma
     pessoa tenha autorizado ESTE processo, explicitamente, agora. */
  autorizacoes: {},
  autorizarConclusao(idProcesso, quem){
    this.autorizacoes[idProcesso] = {por: quem || (typeof currentUser!=='undefined' ? currentUser.email : ''), em: new Date().toISOString()};
    return this.autorizacoes[idProcesso];
  },
  revogarConclusao(idProcesso){ delete this.autorizacoes[idProcesso]; },
  podeConcluir(idProcesso){ return !!this.autorizacoes[idProcesso]; },

  /* ---------- Chamada única que a Fase 2 vai implementar ---------- */
  async protocolarViabilidade(idProcesso){
    const a = this.adaptadorDoProcesso();
    const pront = this.prontidaoViabilidade();
    if(!pront.pronto) throw new Error('Faltam dados obrigatórios para a Viabilidade: ' + pront.faltando.map(f=>f.campo).join(', '));
    if(!this.automacaoDisponivel()){
      throw new Error(`Ainda não existe automação para ${a ? a.orgao : 'este estado'} — Fase 2. Use "Copiar dados" e preencha o portal manualmente.`);
    }
    if(!this.podeConcluir(idProcesso)){
      /* preenche, mas não conclui: o robô para na tela de resumo */
      return a.automacao.protocolarViabilidade(pront.payload, {concluir:false});
    }
    return a.automacao.protocolarViabilidade(pront.payload, {concluir:true});
  }
};
