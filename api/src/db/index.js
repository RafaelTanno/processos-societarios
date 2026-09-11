/* =====================================================================
   Adaptador de armazenamento.

   Uma interface só, duas implementações:
     • arquivo — JSON em disco. Zero configuração, para testar na máquina
       antes de criar qualquer recurso no Azure.
     • cosmos  — Azure Cosmos DB serverless, para produção.

   Todo o resto da API fala apenas com esta interface, então trocar de
   banco não encosta em nenhuma rota.

   Contêineres (= "coleções"):
     processos   pk /cliente   — um documento por processo societário
     cadastros   pk /tipo      — usuarios, requerentes, usuariosCliente,
                                 pessoas, modelos (campo `tipo` separa)
     auditoria   pk /dia       — trilha de acesso e alteração
     acervo      pk /cliente   — retrato do acervo societário lido do
                                 SharePoint (cópia de leitura, não autoridade)
     replica     pk /driveId   — espelho do SharePoint + deltaLink (etapa 2)
   ===================================================================== */

const cfg = require('../config');

const CONTEINERES = [
  { nome: 'processos', chave: '/cliente' },
  { nome: 'cadastros', chave: '/tipo' },
  { nome: 'auditoria', chave: '/dia' },
  { nome: 'acervo',    chave: '/cliente' },
  { nome: 'replica',   chave: '/driveId' }
];

let instancia = null;

async function db() {
  if (instancia) return instancia;
  /* Sem escolha explícita a API caía em 'arquivo', que no Azure grava
     num disco efêmero: tudo parece funcionar e os dados somem no próximo
     cold start, sem erro nenhum. Melhor não subir. */
  if (!cfg.banco) {
    throw new Error('Banco não configurado: defina GS2_BANCO=cosmos e COSMOS_ENDPOINT ' +
      '(ou GS2_BANCO=arquivo, que só faz sentido em teste local).');
  }
  if (cfg.banco === 'arquivo' && !cfg.modoLocal) {
    throw new Error('GS2_BANCO=arquivo fora do modo de demonstração: o disco da Function ' +
      'é efêmero e os dados seriam perdidos. Use o Cosmos.');
  }
  const impl = cfg.banco === 'cosmos'
    ? require('./cosmos')
    : require('./arquivo');
  instancia = await impl.abrir(CONTEINERES);
  return instancia;
}

module.exports = { db, CONTEINERES };
