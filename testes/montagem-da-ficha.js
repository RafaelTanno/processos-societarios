#!/usr/bin/env node
/* =====================================================================
   Teste da montagem da ficha do cliente a partir do acervo.

       node testes/montagem-da-ficha.js

   Não toca no SharePoint: alimenta as funções com a lista de nomes de
   arquivo que a varredura devolveria e confere o que sai — linha do
   tempo em ordem, lacunas da sequência de alterações e a forma vazia
   que segura a tela quando o cliente ainda não foi lido.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const fonte = fs.readFileSync(path.join(__dirname, '..', 'web', 'js', 'acervo.js'), 'utf8');
const GS2Acervo = new Function(fonte + '; return GS2Acervo;')();

let falhas = 0;
function confere(titulo, condicao, detalhe){
  if(condicao){ console.log('  ✓ ' + titulo); }
  else { falhas++; console.log('  ✗ ' + titulo + (detalhe ? '\n      ' + detalhe : '')); }
}

/* Acervo real da RB TRANSPORTES: tem da 1ª à 6ª e da 8ª à 13ª. */
const RB = [
  'CONTRATO SOCIAL_01.03.2006_RB TRANSPORTES LTDA.pdf',
  '1º ALTERAÇAO_15.07.2007_RB TRANSPORTES LTDA.pdf',
  '2º ALTERAÇAO_04.09.2013_RB TRANSPORTES LTDA.pdf',
  '3º ALTERAÇAO_05.03.2015_RB TRANSPORTES LTDA.pdf',
  '4º ALTERAÇAO_15.09.2015_RB TRANSPORTES LTDA.pdf',
  '5º ALTERAÇAO_12.06.2017_RB TRANSPORTES LTDA.pdf',
  '6º ALTERAÇAO_17.01.2019_RB TRANSPORTES LTDA.pdf',
  '8º ALTERAÇAO_20.01.2020_RB TRANSPORTES LTDA.pdf',
  '9º ALTERAÇAO_13.08.2020_RB TRANSPORTES LTDA.pdf',
  '10º ALTERAÇAO_27.01.2022_RB TRANSPORTES LTDA.pdf',
  '11º ALTERAÇAO_10.03.2023_RB TRANSPORTES LTDA.pdf',
  '12º ALTERAÇAO_03.07.2023_RB TRANSPORTES LTDA.pdf',
  '13º ALTERAÇAO_03.08.2023_RB TRANSPORTES LTDA.pdf',
  'CNPJ_28.03.2006_RB TRANSPORTES LTDA.pdf',
  'QSA_RB TRANSPORTES LTDA.pdf'
].map(n => GS2Acervo.interpretar(n));

console.log('\n  Montagem da ficha\n');

const linha = GS2Acervo.montarLinhaDoTempo(RB);
confere('a constituição vem primeiro na linha do tempo',
  linha[0].evento === 'Constituição da empresa' && linha[0].data === '01/03/2006',
  JSON.stringify(linha[0]));
confere('a linha do tempo tem 13 atos (constituição + 12 alterações)',
  linha.length === 13, 'veio ' + linha.length);
confere('a última é a 13ª alteração',
  linha[linha.length-1].evento === '13ª alteração contratual', linha[linha.length-1].evento);
confere('as alterações saem em ordem crescente',
  linha.every((a,i) => i === 0 || a.ordem >= linha[i-1].ordem));

const lacunas = GS2Acervo.acharLacunas(RB);
confere('encontra a 7ª alteração faltando — e só ela',
  lacunas.length === 1 && lacunas[0] === 7, JSON.stringify(lacunas));

const avisos = GS2Acervo.avisar(RB);
confere('não reclama de Cartão CNPJ nem de QSA, que existem',
  !avisos.some(a => /Cartão CNPJ|QSA/.test(a.texto) && a.nivel !== 'info'),
  JSON.stringify(avisos.map(a=>a.texto)));

/* Cliente sem os dois documentos que importam */
const magro = ['Contrato Social Registrado - OAB.pdf'].map(n => GS2Acervo.interpretar(n));
const avisosMagro = GS2Acervo.avisar(magro);
confere('avisa quando falta o Cartão CNPJ',
  avisosMagro.some(a => a.nivel === 'crit' && /Cartão CNPJ/.test(a.texto)));
confere('avisa quando falta o QSA',
  avisosMagro.some(a => /QSA/.test(a.texto)));

/* Forma vazia: a tela lê estes campos sem checar se existem. */
const vazia = GS2Acervo.formaVazia('EMPRESA EXEMPLO LTDA');
confere('a forma vazia traz dadosCnpj completo',
  ['cnpj','nire','razaoSocial','situacao','porte','capitalSocial'].every(k => vazia.dadosCnpj[k] !== undefined));
confere('a forma vazia traz endereço completo',
  ['cep','logradouro','numero','bairro','municipio','uf'].every(k => vazia.dadosCnpj.endereco[k] !== undefined));
confere('a forma vazia tem pelo menos uma alteração (a tela lê a última)',
  Array.isArray(vazia.alteracoes) && vazia.alteracoes.length >= 1);
confere('a forma vazia diz que não foi lida, em vez de fingir zero',
  vazia.lido === false && vazia.origem === 'nao-lido');
confere('a razão social da forma vazia é o nome da pasta, não vazio',
  vazia.dadosCnpj.razaoSocial === 'EMPRESA EXEMPLO LTDA');

/* Ficha montada com acervo, sem leitura de PDF */
const varredura = {
  cliente:'RB TRANSPORTES LTDA', caminho:'RB TRANSPORTES LTDA/03 - Societario/03.01 - Contratos Sociais, CNPJ e QSA',
  grupo:false, semAcervo:false, varridoEm:new Date().toISOString(),
  unidades:[{nome:'RB TRANSPORTES LTDA', caminho:'x', documentos:RB,
             linhaDoTempo:linha, lacunas:lacunas, avisos:avisos}]
};
const ficha = GS2Acervo.montarFicha('RB TRANSPORTES LTDA', varredura, null);
confere('a ficha montada sem PDF ainda traz a linha do tempo real',
  ficha.alteracoes.length === 13 && ficha.lido === true);
confere('sem Cartão CNPJ lido, o CNPJ fica "—" em vez de inventado',
  ficha.dadosCnpj.cnpj === '—');
confere('a lacuna da 7ª vira aviso na ficha',
  ficha.avisos.some(a => /7ª/.test(a.texto)), JSON.stringify(ficha.avisos.map(a=>a.texto)));
confere('a ficha registra de onde veio',
  ficha.origem === 'sharepoint' && /03.01/.test(ficha.ocr.origem));

/* Cliente sem acervo nenhum */
const semAcervo = GS2Acervo.montarFicha('CT ENGENHARIA', {semAcervo:true, motivo:'A pasta 03.01 existe mas está vazia.'}, null);
confere('cliente sem acervo não quebra e diz o motivo',
  semAcervo.origem === 'sem-acervo' && semAcervo.alteracoes.length === 1 && /vazia/.test(semAcervo.avisos[0].texto));

/* Leitura do Cartão CNPJ a partir do texto do PDF */
const textoCartao = 'COMPROVANTE DE INSCRIÇÃO E DE SITUAÇÃO CADASTRAL NÚMERO DE INSCRIÇÃO 11.222.333/0001-44 MATRIZ ' +
  'DATA DE ABERTURA 01/03/2006 NOME EMPRESARIAL RB TRANSPORTES LTDA ' +
  'TÍTULO DO ESTABELECIMENTO (NOME DE FANTASIA) RB TRANSPORTES ' +
  'PORTE EPP CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL 49.30-2-02 - Transporte rodoviário de carga ' +
  'CÓDIGO E DESCRIÇÃO DAS ATIVIDADES ECONÔMICAS SECUNDÁRIAS 52.50-8-05 - Operador de transporte multimodal 45.20-0-01 - Serviços de manutenção ' +
  'CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA 206-2 - Sociedade Empresária Limitada ' +
  'LOGRADOURO AV DAS TORRES NÚMERO 1500 COMPLEMENTO SALA 2 CEP 78.048-000 BAIRRO/DISTRITO JARDIM IMPERIAL ' +
  'MUNICÍPIO CUIABA UF MT SITUAÇÃO CADASTRAL ATIVA DATA DA SITUAÇÃO CADASTRAL 01/03/2006';
const cartao = GS2Acervo.interpretarCartaoCNPJ(textoCartao);
confere('lê o CNPJ do cartão', cartao.cnpj === '11.222.333/0001-44', cartao.cnpj);
confere('lê o nome empresarial', cartao.razaoSocial === 'RB TRANSPORTES LTDA', cartao.razaoSocial);
confere('lê a natureza jurídica', /206-2/.test(cartao.naturezaJuridica), cartao.naturezaJuridica);
confere('lê o município e a UF', cartao.endereco.municipio === 'CUIABA' && cartao.endereco.uf === 'MT',
  cartao.endereco.municipio + '/' + cartao.endereco.uf);
confere('lê a atividade principal', /49.30-2-02/.test(cartao.atividades.principal), cartao.atividades.principal);
confere('separa as duas atividades secundárias', cartao.atividades.secundarias.length === 2,
  JSON.stringify(cartao.atividades.secundarias));
confere('lê o número do endereço, e não o "número de inscrição"',
  cartao.endereco.numero === '1500', cartao.endereco.numero);
confere('lê o bairro sem o "/DISTRITO" do rótulo',
  cartao.endereco.bairro === 'JARDIM IMPERIAL', cartao.endereco.bairro);
confere('lê o nome fantasia sem o "(NOME DE FANTASIA)" do rótulo',
  cartao.nomeFantasia === 'RB TRANSPORTES', cartao.nomeFantasia);
confere('lê a situação cadastral, e não a data dela',
  cartao.situacao === 'ATIVA', cartao.situacao);
confere('NÃO inventa capital social, que não está no cartão', cartao.capitalSocial === '—');
confere('NÃO inventa NIRE, que não está no cartão', cartao.nire === '—');

/* Leitura do QSA */
const textoQsa = 'QUADRO DE SÓCIOS E ADMINISTRADORES (QSA) Nome/Nome Empresarial: JOAO DA SILVA Qualificação: 49-Sócio-Administrador ' +
  'Nome/Nome Empresarial: MARIA SOUZA Qualificação: 22-Sócio Para verificar a autenticidade acesse';
const socios = GS2Acervo.interpretarQSA(textoQsa);
confere('lê os dois sócios do QSA', socios.length === 2, JSON.stringify(socios));
confere('lê o nome e a qualificação do primeiro',
  socios[0] && socios[0].nome === 'JOAO DA SILVA' && /Sócio-Administrador/.test(socios[0].cargo),
  JSON.stringify(socios[0]));
confere('registra que o CPF não vem no QSA, em vez de inventar',
  socios[0] && /não consta/.test(socios[0].cpf));

console.log(falhas ? `\n  ${falhas} FALHA(S).\n` : '\n  Tudo certo.\n');
process.exit(falhas ? 1 : 0);
