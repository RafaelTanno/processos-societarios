#!/usr/bin/env node
/* =====================================================================
   Teste do interpretador de nomes de arquivo do acervo.

       node testes/interpretador-de-nomes.js

   Os nomes abaixo são REAIS, copiados da biblioteca do SharePoint em
   07/09/2026. Eles estão aqui porque a convenção de nomes da GS2 não é
   única: se alguém "arrumar" o interpretador e quebrar um destes casos,
   este arquivo avisa antes de a ferramenta ir para o ar.

   Não invente caso novo de cabeça — só acrescente nome que exista mesmo
   na biblioteca.
   ===================================================================== */

const fs = require('fs');
const path = require('path');

/* acervo.js é escrito para o navegador; aqui ele roda como texto. */
const fonte = fs.readFileSync(path.join(__dirname, '..', 'web', 'js', 'acervo.js'), 'utf8');
const GS2Acervo = new Function(fonte + '; return GS2Acervo;')();

/* nome do arquivo → o que se espera ler dele */
const CASOS = [
  /* ABTHEX — convenção da casa */
  ['1° ALTERAÇÃO_27.02.2026_ABTHEX SOLUÇÕES EM TECNOLOGIA LTDA.pdf', {tipo:'alteracao', ordem:1, data:'27/02/2026', confianca:'alta'}],
  ['2° ALTERAÇÃO_01.07.2026_ABTHEX SOLUÇÕES EM TECNOLOGIA LTDA.pdf', {tipo:'alteracao', ordem:2, data:'01/07/2026', confianca:'alta'}],
  ['CNPJ_27.02.2026_ABTHEX SOLUÇÕES EM TECNOLOGIA LTDA.pdf',         {tipo:'cnpj', ordem:null, data:'27/02/2026', confianca:'alta'}],
  ['QSA_24.08.2026_ABTHEX SOLUÇÕES EM TECNOLOGIA LTDA.pdf',          {tipo:'qsa', data:'24/08/2026', confianca:'alta'}],

  /* SERION — espaço e hífen no lugar do underscore */
  ['1ª ALTERACAO 03.08.2026 - SERION CENTRO DE DESENVOLVIMENTO INTEGRADO LTDA.pdf', {tipo:'alteracao', ordem:1, data:'03/08/2026', confianca:'alta'}],
  ['CNPJ 03.08.2026 - SERION CENTRO DE DESENVOLVIMENTO INTEGRADO LTDA.pdf',         {tipo:'cnpj', data:'03/08/2026', confianca:'alta'}],
  ['CNPJ SERION CENTRO DE DESENVOLVIMENTO INTEGRADO LTDA.pdf',                      {tipo:'cnpj', data:null, confianca:'media'}],
  ['CONTRATO SOCIAL - SERION CENTRO DE DESENVOLVIMENTO INTEGRADO LTDA.pdf',         {tipo:'contrato', data:null, confianca:'media'}],
  ['QSA 03.08.2026 - SERION CENTRO DE DESENVOLVIMENTO INTEGRADO LTDA.pdf',          {tipo:'qsa', data:'03/08/2026', confianca:'alta'}],
  ['CÓDIGO DE ACESSO SIMPLES NACIONAL.pdf',                                          {tipo:'simples'}],

  /* RB TRANSPORTES — "º" masculino e ALTERAÇAO sem o segundo til */
  ['10º ALTERAÇAO_27.01.2022_RB TRANSPORTES LTDA.pdf', {tipo:'alteracao', ordem:10, data:'27/01/2022', confianca:'alta'}],
  ['1º ALTERAÇAO_15.07.2007_RB TRANSPORTES LTDA.pdf',  {tipo:'alteracao', ordem:1,  data:'15/07/2007', confianca:'alta'}],
  ['13º ALTERAÇAO_03.08.2023_RB TRANSPORTES LTDA.pdf', {tipo:'alteracao', ordem:13, data:'03/08/2023', confianca:'alta'}],
  ['CONTRATO SOCIAL_01.03.2006_RB TRANSPORTES LTDA.pdf', {tipo:'contrato', data:'01/03/2006', confianca:'alta'}],
  ['QSA_RB TRANSPORTES LTDA.pdf',                        {tipo:'qsa', data:null, confianca:'media'}],
  ['DESENQUADRAMENTO DE EPP - 24.01.2025.pdf',           {tipo:'enquadramento', data:'24/01/2025'}],

  /* CONTROL CARD — ordinal no meio, duplicata do Windows */
  ['Alteração Contratual nº 4 e Consolidação.pdf', {tipo:'alteracao', ordem:4, data:null}],
  ['Cartão CNPJ atualizado (1).pdf',               {tipo:'cnpj', ordem:null, data:null}],
  ['Certidão Simplificada.pdf',                    {tipo:'certidao'}],

  /* ROBSON BOSSA — nome livre: o tipo ainda sai, o resto não */
  ['CNPJ Robson.pdf',                       {tipo:'cnpj', data:null}],
  ['QSA Robson.pdf',                        {tipo:'qsa', data:null}],
  ['Contrato Social Registrado - OAB.pdf',  {tipo:'contrato', data:null}],

  /* GRUPO MIRIAN — dentro da subpasta a convenção volta a valer */
  ['8° ALTERAÇÃO_14.01.2019_MIRIAN AMAZONAS.pdf',  {tipo:'alteracao', ordem:8, data:'14/01/2019', confianca:'alta'}],
  ['CONTRATO SOCIAL_14.01.2008_MIRIAN AMAZONAS.pdf', {tipo:'contrato', data:'14/01/2008', confianca:'alta'}],
  ['QUOTAS ALIENADAS_MIRIAN MILENIO AUTO POSTO LTDA.pdf', {tipo:'quotas', data:null}],

  /* Ruídos que já foram vistos na biblioteca */
  ['CNPJ_1° ALTERAÇÃO_10.03.2025_FULANO LTDA.pdf', {tipo:'cnpj', ordem:1, data:'10/03/2025'}],
  ['QSA_10.03.2025_MIRIAN AMAZONAS.pdf.pdf',        {tipo:'qsa', data:'10/03/2025'}],
  ['3° ALTERACAO_05.03.15_EXEMPLO LTDA.PDF',        {tipo:'alteracao', ordem:3, data:'05/03/2015'}]
];

let falhas = 0;
let acertos = 0;

console.log('\n  Interpretador de nomes — ' + CASOS.length + ' nomes reais do acervo\n');

for(const [nome, esperado] of CASOS){
  const lido = GS2Acervo.interpretar(nome);
  const erros = [];
  for(const campo of Object.keys(esperado)){
    if(lido[campo] !== esperado[campo]){
      erros.push(`${campo}: esperava ${JSON.stringify(esperado[campo])}, veio ${JSON.stringify(lido[campo])}`);
    }
  }
  if(erros.length){
    falhas++;
    console.log('  ✗ ' + nome);
    erros.forEach(e => console.log('      ' + e));
    console.log('      razão lida: ' + JSON.stringify(lido.razao));
  }else{
    acertos++;
    const partes = [lido.rotulo];
    if(lido.ordem) partes.push(lido.ordem + 'ª');
    if(lido.data) partes.push(lido.data);
    if(lido.razao) partes.push('“' + lido.razao + '”');
    console.log('  ✓ ' + nome);
    console.log('      → ' + partes.join(' · ') + '  [' + lido.confianca + ']');
  }
}

console.log(`\n  ${acertos} de ${CASOS.length} corretos.` + (falhas ? `  ${falhas} FALHA(S).\n` : '  Nenhuma falha.\n'));
process.exit(falhas ? 1 : 0);
