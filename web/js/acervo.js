/* =====================================================================
   Acervo societário — leitura real do SharePoint.

   Parte da ferramenta Processos Societários — GS2 Negócios.
   Carregado por web/index.html na ordem definida lá.

   POR QUE ESTE ARQUIVO EXISTE
   ---------------------------
   O Painel de Clientes precisa mostrar dado real, não exemplo. O dado
   real está no SharePoint, em dois lugares diferentes:

     • no NOME do arquivo — tipo do ato, ordinal da alteração, data e
       razão social. Sai de graça, sem abrir nada;
     • DENTRO do PDF — CNPJ, endereço, natureza jurídica, CNAE e quadro
       societário. Só o Cartão CNPJ e o QSA trazem isso em formato
       previsível; contrato social é texto corrido e não entra aqui.

   Este arquivo cuida dos dois. Ele NÃO toca no DOM e NÃO grava nada no
   SharePoint — só lê. Quem desenha tela é app-7-acervo.js.

   A CONVENÇÃO DE NOMES NÃO É ÚNICA
   --------------------------------
   A varredura de 07/09/2026 (ver o projeto, `varredura-sharepoint-societario.md`)
   mostrou que a convenção `TIPO_DD.MM.AAAA_RAZAO` vale em pouco mais da
   metade dos clientes. Exemplos reais que precisam funcionar:

     1° ALTERAÇÃO_27.02.2026_ABTHEX SOLUÇÕES EM TECNOLOGIA LTDA.pdf
     10º ALTERAÇAO_27.01.2022_RB TRANSPORTES LTDA.pdf     (º e sem til)
     1ª ALTERACAO 03.08.2026 - SERION ... LTDA.pdf        (espaço e hífen)
     QSA_RB TRANSPORTES LTDA.pdf                          (sem data)
     Alteração Contratual nº 4 e Consolidação.pdf         (ordinal no meio)
     Cartão CNPJ atualizado (1).pdf                       (sufixo do Windows)
     CNPJ Robson.pdf                                      (nome livre)

   Por isso o interpretador NÃO tenta casar o nome inteiro contra um
   punhado de moldes. Ele procura três coisas de forma independente —
   tipo, data e ordinal — e chama de razão social o que sobrou. Molde
   fixo quebra no primeiro nome fora do padrão; busca independente
   degrada com elegância: perde a razão social mas ainda acerta que
   aquilo é a 4ª alteração.

   Cada leitura devolve um grau de confiança, e a tela mostra isso. O
   que a ferramenta não conseguiu ler ela diz que não conseguiu — nunca
   preenche por dedução.
   ===================================================================== */

const GS2Acervo = {

  /* Nomes das pastas no padrão da GS2. A comparação é por prefixo e sem
     acento, porque "Societario" aparece com e sem acento na biblioteca. */
  PASTA_NIVEL1: '03',
  PASTA_NIVEL2: '03.01',

  /* Pastas de trabalho dentro do 03.01. O que está aqui é rascunho de
     processo, não acervo definitivo — não entra na linha do tempo. */
  PASTAS_DE_TRABALHO: ['DOCUMENTOS AUXILIARES', 'PROCESSO', 'PROCESSOS', 'DOCS'],

  /* ================================================================
     1. VOCABULÁRIO
     ================================================================ */

  /* Sem acento e em maiúsculas, só para comparar. Nunca para exibir. */
  _sem(s){
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  },

  /* A ordem importa: o primeiro que casar vence. QSA e CNPJ vêm antes de
     ALTERAÇÃO de propósito — em "CNPJ_1° ALTERAÇÃO_..." o documento é o
     cartão CNPJ emitido depois da 1ª alteração, e não a alteração em si.
     O ordinal é extraído à parte e sobrevive de qualquer jeito. */
  TIPOS: [
    {chave:'qsa',           rotulo:'QSA (Receita Federal)',        termos:['QSA','QUADRO DE SOCIOS','QUADRO SOCIETARIO']},
    {chave:'cnpj',          rotulo:'Cartão CNPJ',                  termos:['CARTAO CNPJ','COMPROVANTE DE INSCRICAO','CNPJ']},
    {chave:'contrato',      rotulo:'Contrato social',              termos:['CONTRATO SOCIAL','ATO CONSTITUTIVO','ESTATUTO SOCIAL','REQUERIMENTO DE EMPRESARIO']},
    {chave:'constituicao',  rotulo:'Constituição',                 termos:['CONSTITUICAO']},
    {chave:'alteracao',     rotulo:'Alteração contratual',         termos:['ALTERACAO','ALTERACOES','CONSOLIDACAO']},
    {chave:'distrato',      rotulo:'Distrato / baixa',             termos:['DISTRATO','ENCERRAMENTO','BAIXA']},
    {chave:'certidao',      rotulo:'Certidão simplificada',        termos:['CERTIDAO SIMPLIFICADA','CERTIDAO']},
    {chave:'enquadramento', rotulo:'Enquadramento de porte',       termos:['DESENQUADRAMENTO','ENQUADRAMENTO']},
    {chave:'acordo',        rotulo:'Acordo de sócios',             termos:['ACORDO DE SOCIOS','ACORDO DE QUOTISTAS']},
    {chave:'ata',           rotulo:'Ata de reunião',               termos:['ATA','ATAS']},
    {chave:'procuracao',    rotulo:'Procuração',                   termos:['PROCURACAO']},
    {chave:'simples',       rotulo:'Simples Nacional',             termos:['SIMPLES NACIONAL','CODIGO DE ACESSO']},
    {chave:'quotas',        rotulo:'Alienação de quotas',          termos:['QUOTAS ALIENADAS','ALIENACAO DE QUOTAS','CESSAO DE QUOTAS']}
  ],

  ORDINAIS_ESCRITOS: {
    PRIMEIRA:1, PRIMEIRO:1, SEGUNDA:2, SEGUNDO:2, TERCEIRA:3, TERCEIRO:3,
    QUARTA:4, QUARTO:4, QUINTA:5, QUINTO:5, SEXTA:6, SEXTO:6,
    SETIMA:7, SETIMO:7, OITAVA:8, OITAVO:8, NONA:9, NONO:9,
    DECIMA:10, DECIMO:10
  },

  /* ================================================================
     2. INTERPRETADOR DE NOMES
     ================================================================ */

  /* Tira o que é ruído de sistema de arquivos e não diz nada sobre o
     documento: extensão (inclusive o ".pdf.pdf" que aparece quando
     alguém salva por cima), o "(1)" que o Windows põe em duplicata e
     espaço sobrando. O nome original continua intacto para exibição. */
  _limpar(nomeArquivo){
    let n = String(nomeArquivo || '');
    const m = n.match(/\.([A-Za-z]{2,5})$/);
    const extensao = m ? m[1].toLowerCase() : '';
    /* Só letras: com [A-Za-z0-9] a regra comia a data de
       "DESENQUADRAMENTO DE EPP - 24.01.2025.pdf" junto com a extensão. */
    n = n.replace(/(\.[A-Za-z]{2,5})+$/, '');      /* .pdf e .pdf.pdf */
    n = n.replace(/\s*\(\d+\)\s*$/, '');            /* duplicata do Windows */
    n = n.replace(/\s+/g, ' ').trim();
    return { base: n, extensao: extensao };
  },

  /* Igual ao _sem, mas preservando o comprimento e a posição de cada
     caractere. É o que permite achar um termo ignorando acento e depois
     recortar o pedaço certo do nome ORIGINAL — sem isso, "ALTERAÇAO"
     nunca casaria com o termo "ALTERACAO" na hora de remover. */
  _dobrar(s){
    const original = String(s == null ? '' : s);
    let saida = '';
    for(let i = 0; i < original.length; i++){
      const ch = original[i];
      const sem = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cand = (sem.length === 1 ? sem : ch).toUpperCase();
      saida += (cand.length === 1 ? cand : ch);
    }
    return saida;
  },

  /* Casa um termo como palavra inteira, para "ATA" não achar "PARATA"
     e "CNPJ" não achar pedaço de razão social. */
  _acharTermo(dobrado, termo, aPartirDe){
    const t = this._sem(termo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s_]+');
    const re = new RegExp('(^|[^A-Z0-9])(' + t + ')([^A-Z0-9]|$)', 'g');
    re.lastIndex = aPartirDe || 0;
    const m = re.exec(dobrado);
    if(!m) return null;
    return { inicio: m.index + m[1].length, fim: m.index + m[1].length + m[2].length };
  },

  _acharTipo(dobrado){
    for(const t of this.TIPOS){
      for(const termo of t.termos){
        const pos = this._acharTermo(dobrado, termo);
        if(pos) return { chave:t.chave, rotulo:t.rotulo, termo:termo, pos:pos };
      }
    }
    return null;
  },

  /* Tira do nome TODOS os termos de tipo que aparecerem, não só o que
     definiu o tipo. Sem isso, "CÓDIGO DE ACESSO SIMPLES NACIONAL" ainda
     devolveria "CÓDIGO DE ACESSO" como se fosse razão social. */
  _tirarTermos(base){
    let texto = base;
    let mudou = true;
    let voltas = 0;
    while(mudou && voltas++ < 12){
      mudou = false;
      const dobrado = this._dobrar(texto);
      for(const t of this.TIPOS){
        for(const termo of t.termos){
          const pos = this._acharTermo(dobrado, termo);
          if(pos){
            texto = texto.slice(0, pos.inicio) + ' ' + texto.slice(pos.fim);
            mudou = true;
            break;
          }
        }
        if(mudou) break;
      }
    }
    return texto;
  },

  /* Primeira data válida do nome. Aceita 27.02.2026, 27-02-2026,
     27/02/2026 e ano de dois dígitos. Valida dia e mês para não ler
     "10.000" de um valor como se fosse data. */
  _acharData(base){
    const re = /(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/g;
    let m;
    while((m = re.exec(base)) !== null){
      const dia = parseInt(m[1], 10);
      const mes = parseInt(m[2], 10);
      let ano = parseInt(m[3], 10);
      if(dia < 1 || dia > 31 || mes < 1 || mes > 12) continue;
      if(m[3].length === 2) ano = ano <= 79 ? 2000 + ano : 1900 + ano;
      if(ano < 1900 || ano > 2100) continue;
      const dd = String(dia).padStart(2,'0');
      const mm = String(mes).padStart(2,'0');
      return {
        texto: m[0],
        exibicao: `${dd}/${mm}/${ano}`,
        iso: `${ano}-${mm}-${dd}`
      };
    }
    return null;
  },

  /* Ordinal da alteração. Roda DEPOIS que a data saiu da string, senão o
     dia vira ordinal. Cobre "10º", "1°", "nº 4" e "PRIMEIRA". */
  _acharOrdinal(baseSemData){
    let m = baseSemData.match(/(\d{1,2})\s*[°ºª]/);
    if(m) return parseInt(m[1], 10);

    m = this._sem(baseSemData).match(/\bN[°ºªO]?\.?\s*(\d{1,2})\b/);
    if(m) return parseInt(m[1], 10);

    const palavras = this._sem(baseSemData).split(/[^A-Z]+/);
    for(const p of palavras){
      if(this.ORDINAIS_ESCRITOS[p] !== undefined) return this.ORDINAIS_ESCRITOS[p];
    }
    return null;
  },

  /* Lê um nome de arquivo. Nunca lança: nome que não dá para entender
     volta com confianca 'nenhuma', e é assim que a tela mostra. */
  interpretar(nomeArquivo){
    const { base, extensao } = this._limpar(nomeArquivo);

    const tipo = this._acharTipo(this._dobrar(base));
    const data = this._acharData(base);

    /* A data sai antes de procurar o ordinal, senão o dia vira ordinal. */
    let resto = base;
    if(data) resto = resto.replace(data.texto, ' ');
    const ordem = this._acharOrdinal(resto);

    /* A razão social é o que sobra depois de tirar tipo, data, ordinal e
       as palavras de ligação. Em nome livre isso vira lixo — por isso só
       é aceita quando o que sobrou ainda tem cara de nome de empresa. */
    resto = this._tirarTermos(resto)
      .replace(/\d{1,2}\s*[°ºª]/g, ' ')
      .replace(/\bn[°ºo.]?\s*\d{1,2}\b/gi, ' ')
      .replace(/\b(contratual|registrad[ao]|atualizad[ao]|assinad[ao])\b/gi, ' ')
      .replace(/[_]+/g, ' ')
      .replace(/^[\s\-–—.·]+|[\s\-–—.·]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const razao = (resto.length >= 4 && /[A-Za-zÀ-ÿ]{3}/.test(resto)) ? resto : null;

    let confianca = 'nenhuma';
    if(tipo && data && razao) confianca = 'alta';
    else if(tipo && (data || razao)) confianca = 'media';
    else if(tipo) confianca = 'baixa';

    return {
      arquivo: nomeArquivo,
      extensao: extensao,
      tipo: tipo ? tipo.chave : null,
      rotulo: tipo ? tipo.rotulo : 'Não identificado',
      ordem: ordem,
      data: data ? data.exibicao : null,
      dataISO: data ? data.iso : null,
      razao: razao,
      confianca: confianca
    };
  },

  /* ================================================================
     3. VARREDURA DO SHAREPOINT
     ================================================================ */

  _acharPastaPorPrefixo(itens, prefixo){
    const p = this._sem(prefixo);
    return itens.find(i => i.folder && this._sem(i.name).trim().indexOf(p) === 0) || null;
  },

  _ehPastaDeTrabalho(nome){
    const n = this._sem(nome).trim();
    return this.PASTAS_DE_TRABALHO.some(t => n.indexOf(t) === 0);
  },

  /* Encontra o 03.01 de um cliente. Devolve null quando o cliente não
     tem acervo societário — que é uma resposta legítima, não um erro. */
  async _acharSocietario(cliente){
    /* A maioria dos clientes segue o padrão à risca. Tentar o caminho
       completo de uma vez custa UMA chamada ao Graph; procurar por
       prefixo custa três (raiz do cliente, depois o 03, depois o 03.01).
       Numa varredura de 60 clientes é a diferença entre ~180 e ~60
       chamadas — e o Graph limita por minuto. Só se o caminho padrão não
       existir é que se procura. */
    const padrao = `${cliente}/03 - Societario/03.01 - Contratos Sociais, CNPJ e QSA`;
    try{
      await GS2SP.item(padrao);
      return padrao;
    }catch(e){
      if(e.status !== 404) throw e;   /* 403, 429, 5xx: não é "não existe" */
    }
    const raiz = await GS2SP.listar(cliente);
    const n1 = this._acharPastaPorPrefixo(raiz, this.PASTA_NIVEL1);
    if(!n1) return null;
    const caminho1 = `${cliente}/${n1.name}`;
    const dentro = await GS2SP.listar(caminho1);
    const n2 = this._acharPastaPorPrefixo(dentro, this.PASTA_NIVEL2);
    if(!n2) return null;
    return `${caminho1}/${n2.name}`;
  },

  /* Uma "unidade" é uma empresa com acervo próprio. Para a maioria dos
     clientes existe uma só — o próprio cliente. Nos grupos (M3BR,
     VIVART, MIRIAN) o 03.01 tem uma subpasta por empresa, e o GRUPO
     MIRIAN ainda desce mais um nível em algumas delas. Por isso a busca
     desce até dois níveis, e para. */
  async _coletarUnidades(caminho03_01, nomeCliente){
    const itens = await GS2SP.listar(caminho03_01);
    const arquivos = itens.filter(i => i.file);
    const subpastas = itens.filter(i => i.folder && !this._ehPastaDeTrabalho(i.name));

    /* Caso normal: os documentos estão soltos no 03.01. */
    if(arquivos.length){
      return [{ nome: nomeCliente, caminho: caminho03_01, itens: arquivos, grupo: false }];
    }

    /* Caso grupo: cada subpasta é uma empresa. */
    const unidades = [];
    for(const sub of subpastas){
      const caminhoSub = `${caminho03_01}/${sub.name}`;
      const dentro = await GS2SP.listar(caminhoSub);
      const arqs = dentro.filter(i => i.file);
      if(arqs.length){
        unidades.push({ nome: sub.name, caminho: caminhoSub, itens: arqs, grupo: true });
        continue;
      }
      /* Subpasta que só tem pastas (ex.: "a. CONTRATOS SOCIAIS"): junta o
         que houver um nível abaixo, sem descer mais. */
      const netos = [];
      for(const p of dentro.filter(i => i.folder && !this._ehPastaDeTrabalho(i.name))){
        const filhos = await GS2SP.listar(`${caminhoSub}/${p.name}`);
        filhos.filter(i => i.file).forEach(i => netos.push(i));
      }
      if(netos.length){
        unidades.push({ nome: sub.name, caminho: caminhoSub, itens: netos, grupo: true });
      }
    }
    return unidades;
  },

  /* Varre um cliente inteiro. Só leitura. */
  async varrer(cliente){
    const inicio = Date.now();
    let caminho = null;
    /* "não tem acervo" e "não consegui ler" são coisas DIFERENTES. Tratar
       as duas como a mesma fazia a varredura declarar tranquilamente que
       um cliente sem permissão ou com o Graph em 503 estava sem acervo —
       e gravar isso por cima do que já se sabia dele. */
    try{
      caminho = await this._acharSocietario(cliente);
    }catch(e){
      return this._falhaDeLeitura(cliente, 'Não consegui abrir a pasta no SharePoint: ' + e.message);
    }
    if(!caminho){
      return this._semAcervo(cliente, 'O cliente não tem a pasta 03 - Societario / 03.01 no SharePoint.');
    }

    let unidades;
    try{
      unidades = await this._coletarUnidades(caminho, cliente);
    }catch(e){
      return this._falhaDeLeitura(cliente, 'Falha ao listar o acervo: ' + e.message);
    }
    if(!unidades.length){
      return this._semAcervo(cliente, 'A pasta 03.01 existe mas está vazia.');
    }

    unidades.forEach(u => {
      u.documentos = u.itens.map(i => {
        const lido = this.interpretar(i.name);
        lido.id = i.id;
        lido.tamanho = i.size;
        lido.webUrl = i.webUrl;
        lido.modificadoEm = i.lastModifiedDateTime;
        return lido;
      });
      u.linhaDoTempo = this.montarLinhaDoTempo(u.documentos);
      u.lacunas = this.acharLacunas(u.documentos);
      u.avisos = this.avisar(u.documentos);
      delete u.itens;
    });

    return {
      cliente: cliente,
      caminho: caminho,
      grupo: unidades.length > 1 || unidades[0].grupo,
      unidades: unidades,
      semAcervo: false,
      varridoEm: new Date().toISOString(),
      duracaoMs: Date.now() - inicio
    };
  },

  _semAcervo(cliente, motivo){
    return {
      cliente: cliente, caminho: null, grupo: false, unidades: [],
      semAcervo: true, falha: false, motivo: motivo,
      varridoEm: new Date().toISOString()
    };
  },

  /* Não conseguimos ler. Não sabemos nada sobre este cliente — e não
     saber é diferente de saber que não há nada. Nunca é gravado. */
  _falhaDeLeitura(cliente, motivo){
    return {
      cliente: cliente, caminho: null, grupo: false, unidades: [],
      semAcervo: true, falha: true, motivo: motivo,
      varridoEm: new Date().toISOString()
    };
  },

  /* ================================================================
     4. LINHA DO TEMPO, LACUNAS E AVISOS
     ================================================================ */

  /* Documento arquivado no 03.01 é ato já praticado — por isso entra
     como "registrado". Processo em andamento vem da própria ferramenta,
     não daqui. */
  montarLinhaDoTempo(documentos){
    const atos = documentos.filter(d =>
      d.tipo === 'contrato' || d.tipo === 'constituicao' ||
      d.tipo === 'alteracao' || d.tipo === 'distrato' || d.tipo === 'quotas'
    );

    const linha = atos.map(d => {
      let evento;
      if(d.tipo === 'contrato' || d.tipo === 'constituicao') evento = 'Constituição da empresa';
      else if(d.tipo === 'distrato') evento = 'Distrato / baixa';
      else if(d.tipo === 'quotas') evento = 'Alienação de quotas';
      else evento = d.ordem ? `${d.ordem}ª alteração contratual` : 'Alteração contratual';

      return {
        ordem: (d.tipo === 'contrato' || d.tipo === 'constituicao') ? 0 : (d.ordem || 999),
        data: d.data || '—',
        dataISO: d.dataISO,
        evento: evento,
        protocolo: '—',
        status: 'registrado',
        responsavel: 'Acervo SharePoint',
        documento: d.arquivo,
        webUrl: d.webUrl,
        confianca: d.confianca,
        resumo: []
      };
    });

    linha.sort((a,b) => {
      if(a.ordem !== b.ordem) return a.ordem - b.ordem;
      return String(a.dataISO || '').localeCompare(String(b.dataISO || ''));
    });
    return linha;
  },

  /* Alterações faltando no meio da sequência. Foi assim que apareceu a 7ª
     ausente da RB TRANSPORTES — o acervo tem 1 a 6 e 8 a 13. */
  acharLacunas(documentos){
    const ordens = documentos
      .filter(d => d.tipo === 'alteracao' && d.ordem)
      .map(d => d.ordem)
      .sort((a,b) => a - b);
    if(ordens.length < 2) return [];
    const faltando = [];
    for(let i = 1; i <= ordens[ordens.length-1]; i++){
      if(ordens.indexOf(i) === -1) faltando.push(i);
    }
    return faltando;
  },

  /* Coisas que a GS2 vai querer olhar, independentemente da ferramenta. */
  avisar(documentos){
    const avisos = [];
    const tem = c => documentos.some(d => d.tipo === c);

    if(!tem('cnpj')) avisos.push({nivel:'crit', texto:'Sem Cartão CNPJ arquivado.'});
    if(!tem('qsa'))  avisos.push({nivel:'warn', texto:'Sem QSA arquivado.'});
    if(!tem('contrato') && !tem('constituicao')) avisos.push({nivel:'warn', texto:'Sem contrato social ou ato constitutivo arquivado.'});

    documentos.forEach(d => {
      if(d.tamanho !== undefined && d.tamanho < 20 * 1024 && d.extensao === 'pdf'){
        avisos.push({nivel:'warn', texto:`"${d.arquivo}" tem só ${Math.round((d.tamanho||0)/1024)} KB — arquivo provavelmente truncado. Vale abrir e conferir.`});
      }
      if(d.confianca === 'nenhuma'){
        avisos.push({nivel:'info', texto:`Não reconheci o tipo de "${d.arquivo}".`});
      }
    });

    const nomes = {};
    documentos.forEach(d => { if(d.razao) nomes[this._sem(d.razao)] = d.razao; });
    const distintos = Object.keys(nomes);
    if(distintos.length > 1){
      avisos.push({nivel:'info', texto:'A razão social aparece grafada de mais de uma forma nos arquivos: ' + distintos.map(k=>`"${nomes[k]}"`).join(', ') + '.'});
    }
    return avisos;
  },

  /* ================================================================
     5. LEITURA DO PDF (Cartão CNPJ e QSA)
     ================================================================ */

  /* A URL de download que o Graph devolve já vem autenticada e vale por
     alguns minutos — por isso o fetch aqui NÃO manda o cabeçalho de
     autorização; mandar faz a Microsoft recusar. */
  async _baixar(idItem){
    const d = await GS2SP.drive();
    const item = await GS2SP.chamar(`/drives/${d.id}/items/${idItem}`);
    const url = item['@microsoft.graph.downloadUrl'] || item['@content.downloadUrl'];
    if(!url) throw new Error('O SharePoint não devolveu URL de download para este arquivo.');
    const r = await fetch(url);
    if(!r.ok) throw new Error('Download falhou: HTTP ' + r.status);
    return r.arrayBuffer();
  },

  /* Só a camada de texto. Cartão CNPJ e QSA saem do site da Receita com
     texto de verdade; se algum vier digitalizado, não há camada e a
     leitura simplesmente não acontece — sem OCR e sem chute. */
  async lerTextoPdf(idItem){
    if(!window.pdfjsLib) throw new Error('O leitor de PDF (pdf.js) não carregou.');
    const buf = await this._baixar(idItem);
    const pdf = await pdfjsLib.getDocument({data: new Uint8Array(buf)}).promise;
    let texto = '';
    /* Cartão CNPJ tem 1–2 páginas; QSA, 1–3. Se alguém arquivou um PDF de
       80 páginas com o nome errado, ler tudo só atrasa a varredura — o
       cabeçalho que interessa está no começo. */
    const LIMITE = 6;
    for(let p = 1; p <= Math.min(pdf.numPages, LIMITE); p++){
      const pagina = await pdf.getPage(p);
      const conteudo = await pagina.getTextContent();
      texto += conteudo.items.map(i => i.str).join(' ') + '\n';
    }
    return texto.replace(/\s+/g, ' ').trim();
  },

  /* Pega o que está entre um rótulo e o próximo. O Comprovante de
     Inscrição da Receita tem rótulos fixos, então isso é confiável —
     desde que o rótulo seja procurado como PALAVRA INTEIRA. Sem isso,
     "RB TRANSPORTES LTDA" era cortado no meio, porque "TRANSPORTES"
     contém "PORTE", que também é rótulo do documento. */

  /* Ocorrência do rótulo que não seja pedaço de um rótulo maior:
     "NÚMERO" existe sozinho no endereço e dentro de "NÚMERO DE
     INSCRIÇÃO"; "SITUAÇÃO CADASTRAL" também aparece dentro de "DATA DA
     SITUAÇÃO CADASTRAL". Vale a primeira ocorrência livre. */
  _acharRotulo(dobrado, rotulo, aPartirDe){
    const maiores = this.ROTULOS.filter(r =>
      r.length > rotulo.length && this._sem(r).indexOf(this._sem(rotulo)) > -1);

    let de = aPartirDe || 0;
    for(let tentativa = 0; tentativa < 20; tentativa++){
      const pos = this._acharTermo(dobrado, rotulo, de);
      if(!pos) return null;
      const engolido = maiores.some(r => {
        let d = 0;
        for(let k = 0; k < 20; k++){
          const q = this._acharTermo(dobrado, r, d);
          if(!q) return false;
          if(q.inicio <= pos.inicio && q.fim >= pos.fim) return true;
          d = q.inicio + 1;
        }
        return false;
      });
      if(!engolido) return pos;
      de = pos.inicio + 1;
    }
    return null;
  },

  _entre(texto, rotulo, proximos){
    const dobrado = this._dobrar(texto);
    const aqui = this._acharRotulo(dobrado, rotulo);
    if(!aqui) return null;
    let fim = texto.length;
    (proximos || []).forEach(p => {
      const q = this._acharRotulo(dobrado, p, aqui.fim);
      if(q && q.inicio < fim) fim = q.inicio;
    });
    const v = texto.slice(aqui.fim, fim)
      .replace(/^[\s:\-–\/]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
    return v || null;
  },

  ROTULOS: [
    'NUMERO DE INSCRICAO','DATA DE ABERTURA','NOME EMPRESARIAL',
    'TITULO DO ESTABELECIMENTO','CODIGO E DESCRICAO DA ATIVIDADE ECONOMICA PRINCIPAL',
    'CODIGO E DESCRICAO DAS ATIVIDADES ECONOMICAS SECUNDARIAS',
    'CODIGO E DESCRICAO DA NATUREZA JURIDICA','LOGRADOURO','NUMERO','COMPLEMENTO',
    'CEP','BAIRRO','MUNICIPIO','UF','ENDERECO ELETRONICO','TELEFONE',
    'ENTE FEDERATIVO RESPONSAVEL','SITUACAO CADASTRAL','DATA DA SITUACAO CADASTRAL',
    'MOTIVO DE SITUACAO CADASTRAL','SITUACAO ESPECIAL','DATA DA SITUACAO ESPECIAL',
    'PORTE','QUADRO DE SOCIOS','QUADRO DE SOCIOS E ADMINISTRADORES',
    /* O título do documento contém "SITUAÇÃO CADASTRAL". Sem declará-lo
       aqui, a busca pelo campo parava no título e voltava vazia. */
    'COMPROVANTE DE INSCRICAO E DE SITUACAO CADASTRAL'
  ],

  _campo(texto, rotulo){
    const outros = this.ROTULOS.filter(r => this._sem(r) !== this._sem(rotulo));
    return this._entre(texto, rotulo, outros);
  },

  /* Lê o Comprovante de Inscrição e de Situação Cadastral (Cartão CNPJ).
     Campo que não aparecer volta '—'. Capital social e NIRE NÃO estão
     neste documento — quem tem isso é o contrato e a Junta, então eles
     ficam em branco de propósito, e não preenchidos por dedução. */
  interpretarCartaoCNPJ(texto){
    const cnpj = (texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/) || [null])[0];
    const cep  = (texto.match(/\b\d{2}\.?\d{3}-\d{3}\b/) || [null])[0];

    const principal = this._campo(texto, 'CODIGO E DESCRICAO DA ATIVIDADE ECONOMICA PRINCIPAL');
    const secText   = this._campo(texto, 'CODIGO E DESCRICAO DAS ATIVIDADES ECONOMICAS SECUNDARIAS');
    const secundarias = secText
      ? secText.split(/(?=\d{2}\.\d{2}-\d-\d{2})/).map(s => s.trim()).filter(s => s.length > 8)
      : [];

    const traco = v => (v && v !== '' ? v : '—');

    return {
      cnpj: traco(cnpj),
      nire: '—',
      razaoSocial: traco(this._campo(texto, 'NOME EMPRESARIAL')),
      /* No documento o rótulo é "TÍTULO DO ESTABELECIMENTO (NOME DE
         FANTASIA)" — o parêntese vem junto do valor e sai aqui. */
      nomeFantasia: traco((this._campo(texto, 'TITULO DO ESTABELECIMENTO') || '')
        .replace(/^\(NOME DE FANTASIA\)\s*/i, '').trim() || null),
      naturezaJuridica: traco(this._campo(texto, 'CODIGO E DESCRICAO DA NATUREZA JURIDICA')),
      aberturaData: traco(this._campo(texto, 'DATA DE ABERTURA')),
      situacao: traco((this._campo(texto, 'SITUACAO CADASTRAL') || '').toUpperCase().split(' ')[0] || null),
      situacaoData: traco(this._campo(texto, 'DATA DA SITUACAO CADASTRAL')),
      porte: traco(this._campo(texto, 'PORTE')),
      capitalSocial: '—',
      regime: '—',
      endereco: {
        cep: traco(cep),
        logradouro: traco(this._campo(texto, 'LOGRADOURO')),
        numero: traco(this._campo(texto, 'NUMERO')),
        complemento: this._campo(texto, 'COMPLEMENTO') || '',
        /* o rótulo impresso é "BAIRRO/DISTRITO" */
        bairro: traco((this._campo(texto, 'BAIRRO') || '')
          .replace(/^DISTRITO\s*/i, '').trim() || null),
        municipio: traco(this._campo(texto, 'MUNICIPIO')),
        uf: traco((this._campo(texto, 'UF') || '').slice(0,2) || null)
      },
      atividades: {
        principal: traco(principal),
        secundarias: secundarias
      }
    };
  },

  /* Lê o QSA. O CPF vem mascarado ou ausente no documento da Receita —
     a ferramenta registra isso em vez de inventar um número. */
  interpretarQSA(texto){
    const socios = [];
    const re = /Nome\s*\/\s*Nome\s+Empresarial\s*:?\s*(.+?)\s*Qualifica[çc][ãa]o\s*:?\s*([^:]{3,60}?)(?=\s*Nome\s*\/|\s*Para\s|\s*Emitido\s|$)/gi;
    let m;
    while((m = re.exec(texto)) !== null){
      const nome = m[1].replace(/\s+/g,' ').trim();
      if(!nome || nome.length < 3) continue;
      socios.push({
        nome: nome,
        cpf: 'não consta no QSA da RFB',
        participacao: '—',
        cargo: m[2].replace(/\s+/g,' ').trim(),
        entrada: '—'
      });
    }
    return socios;
  },

  /* ================================================================
     6. MONTAGEM DA FICHA DO CLIENTE
     ================================================================ */

  /* Forma vazia, porém completa. Existe para que a tela nunca quebre com
     cliente ainda não varrido — e para que ela mostre "ainda não lido"
     em vez de um zero que parece dado. */
  formaVazia(nome){
    return {
      origem: 'nao-lido',
      lido: false,
      dadosCnpj: {
        cnpj:'—', nire:'—', razaoSocial:nome, nomeFantasia:'—',
        naturezaJuridica:'—', aberturaData:'—', situacao:'—', situacaoData:'—',
        porte:'—', capitalSocial:'—', regime:'—',
        endereco:{cep:'—', logradouro:'—', numero:'—', complemento:'', bairro:'—', municipio:'—', uf:'—'}
      },
      ocr:{arquivo:'—', lidoEm:'—', origem:'Ainda não varrido'},
      atividades:{principal:'—', secundarias:[]},
      socios:[],
      alteracoes:[{
        ordem:0, data:'—', evento:'Acervo ainda não varrido', protocolo:'—',
        status:'documentos', responsavel:'—', documento:'—', resumo:[]
      }],
      avisos:[], lacunas:[], unidades:[]
    };
  },

  /* Ficha que veio do banco pode estar incompleta: gravada por uma
     versão anterior da ferramenta, truncada, ou de um cliente cuja
     leitura falhou no meio. A tela lê os campos direto, sem checar se
     existem — então o que faltar volta da forma vazia, e o Painel
     continua de pé mostrando "—" em vez de quebrar. */
  completar(nome, ficha){
    const base = this.formaVazia(nome);
    if(!ficha || typeof ficha !== 'object') return base;

    /* `Object.assign(base, ...)` MUTA o base — então os valores de
       reserva precisam ser guardados ANTES. Sem isso, uma ficha com o
       campo do tipo errado (alteracoes:42, dadosCnpj:"texto") passava
       direto: o "fallback" já lia o valor estragado. */
    const reserva = {
      dadosCnpj: base.dadosCnpj,
      endereco: base.dadosCnpj.endereco,
      atividades: base.atividades,
      ocr: base.ocr,
      alteracoes: base.alteracoes
    };
    const objeto = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};

    const pronta = Object.assign(base, ficha);
    const cnpjGravado = objeto(ficha.dadosCnpj);
    pronta.dadosCnpj = Object.assign({}, reserva.dadosCnpj, cnpjGravado);
    pronta.dadosCnpj.endereco = Object.assign({}, reserva.endereco, objeto(cnpjGravado.endereco));
    pronta.atividades = Object.assign({}, reserva.atividades, objeto(ficha.atividades));
    if(!Array.isArray(pronta.atividades.secundarias)) pronta.atividades.secundarias = [];
    pronta.ocr = Object.assign({}, reserva.ocr, objeto(ficha.ocr));

    pronta.socios = (Array.isArray(ficha.socios) ? ficha.socios : []).map(s =>
      Object.assign({nome:'—', cpf:'—', participacao:'—', cargo:'—', entrada:'—'}, s, {
        documentos: Array.isArray(s.documentos) ? s.documentos : []
      }));

    if(!Array.isArray(pronta.alteracoes) || !pronta.alteracoes.length) pronta.alteracoes = reserva.alteracoes;
    if(!Array.isArray(pronta.avisos)) pronta.avisos = [];
    if(!Array.isArray(pronta.documentos)) pronta.documentos = [];
    if(!Array.isArray(pronta.unidades)) pronta.unidades = [];
    return pronta;
  },

  /* Junta o que veio do nome dos arquivos com o que veio de dentro do
     Cartão CNPJ e do QSA, no formato que o Painel de Clientes espera. */
  montarFicha(nomeCliente, varredura, extraido){
    if(!varredura || varredura.semAcervo){
      const vazia = this.formaVazia(nomeCliente);
      vazia.origem = (varredura && varredura.falha) ? 'falha-leitura' : 'sem-acervo';
      vazia.falha = !!(varredura && varredura.falha);
      vazia.alteracoes[0].evento = varredura ? varredura.motivo : 'Acervo não encontrado';
      vazia.avisos = [{nivel:'crit', texto: varredura ? varredura.motivo : 'Acervo não encontrado.'}];
      return vazia;
    }

    const u = varredura.unidades[0];
    const cartao = (extraido && extraido.cartao) || null;
    const socios = (extraido && extraido.socios) || [];

    const base = this.formaVazia(nomeCliente);
    base.origem = 'sharepoint';
    base.lido = true;
    base.caminho = varredura.caminho;
    base.varridoEm = varredura.varridoEm;
    base.unidades = varredura.unidades.map(x => ({nome:x.nome, caminho:x.caminho, documentos:x.documentos.length}));

    if(cartao){
      base.dadosCnpj = Object.assign({}, base.dadosCnpj, cartao);
      delete base.dadosCnpj.atividades;
      base.atividades = cartao.atividades || base.atividades;
      base.dadosCnpj.razaoSocial = cartao.razaoSocial !== '—' ? cartao.razaoSocial : nomeCliente;
    }

    const arqQsa = u.documentos.find(d => d.tipo === 'qsa');
    base.socios = socios.map(s => Object.assign({}, s, {
      documentos: [
        {tipo:'QSA (Receita Federal)', arquivo: arqQsa ? arqQsa.arquivo : '—', validade:'—', status: arqQsa ? 'ok' : 'faltando'},
        {tipo:'RG / CNH', arquivo:'—', validade:'—', status:'faltando'},
        {tipo:'Comprovante de endereço', arquivo:'—', validade:'—', status:'faltando'}
      ]
    }));

    if(u.linhaDoTempo.length) base.alteracoes = u.linhaDoTempo;

    const arqCnpj = u.documentos.find(d => d.tipo === 'cnpj');
    base.ocr = {
      arquivo: arqCnpj ? arqCnpj.arquivo : '—',
      lidoEm: new Date(varredura.varridoEm).toLocaleString('pt-BR'),
      origem: 'SharePoint · ' + varredura.caminho
    };

    /* Grupos (M3BR, VIVART, MIRIAN) têm uma empresa por subpasta. A ficha
       é montada a partir da primeira — dizer isso na cara é melhor que
       deixar parecer que o grupo inteiro tem um CNPJ só. */
    if(varredura.unidades.length > 1){
      base.avisos = base.avisos.concat([{nivel:'info', texto:
        `Este cliente é um grupo com ${varredura.unidades.length} empresas. A ficha abaixo é de ` +
        `"${varredura.unidades[0].nome}". As demais: ` +
        varredura.unidades.slice(1).map(x => x.nome).join(', ') + '.'}]);
    }

    base.avisos = base.avisos.concat(u.avisos).concat(
      u.lacunas.length
        ? [{nivel:'crit', texto:'Falta no acervo a ' + u.lacunas.map(n=>n+'ª').join(', a ') + ' alteração contratual.'}]
        : []
    );
    base.lacunas = u.lacunas;
    base.documentos = u.documentos;
    return base;
  },

  /* Pipeline de um cliente: varre, lê os dois PDFs que valem a pena e
     devolve a ficha pronta. `aoAndar` recebe mensagens de progresso para
     a tela poder mostrar o que está acontecendo. */
  async processarCliente(nomeCliente, aoAndar){
    const diz = m => { if(aoAndar) aoAndar(m); };

    diz('listando o acervo…');
    const varredura = await this.varrer(nomeCliente);
    if(varredura.semAcervo) return { varredura, ficha: this.montarFicha(nomeCliente, varredura, null) };

    const u = varredura.unidades[0];
    const extraido = { cartao: null, socios: [], erros: [] };

    /* Entre vários cartões CNPJ, vale o mais recente. */
    const cnpjs = u.documentos.filter(d => d.tipo === 'cnpj' && d.extensao === 'pdf');
    cnpjs.sort((a,b) => String(b.dataISO||b.modificadoEm||'').localeCompare(String(a.dataISO||a.modificadoEm||'')));
    if(cnpjs.length){
      try{
        diz('lendo o Cartão CNPJ…');
        extraido.cartao = this.interpretarCartaoCNPJ(await this.lerTextoPdf(cnpjs[0].id));
      }catch(e){ extraido.erros.push('Cartão CNPJ: ' + e.message); }
    }

    const qsas = u.documentos.filter(d => d.tipo === 'qsa' && d.extensao === 'pdf');
    qsas.sort((a,b) => String(b.dataISO||b.modificadoEm||'').localeCompare(String(a.dataISO||a.modificadoEm||'')));
    if(qsas.length){
      try{
        diz('lendo o QSA…');
        const texto = await this.lerTextoPdf(qsas[0].id);
        extraido.socios = this.interpretarQSA(texto);
        /* O QSA da Receita traz o mesmo cabeçalho do cartão; se o cartão
           não foi lido, aproveita este. */
        if(!extraido.cartao) extraido.cartao = this.interpretarCartaoCNPJ(texto);
      }catch(e){ extraido.erros.push('QSA: ' + e.message); }
    }

    const ficha = this.montarFicha(nomeCliente, varredura, extraido);
    extraido.erros.forEach(t => ficha.avisos.push({nivel:'warn', texto:t}));
    return { varredura, ficha, extraido };
  }
};
