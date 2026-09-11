/* =====================================================================
   Banco em arquivo — só para teste local.

   Guarda cada contêiner num JSON dentro de GS2_PASTA_DADOS (padrão
   ./.dados). Escreve de forma atômica (arquivo temporário + rename) para
   não corromper nada se o processo morrer no meio, e serializa as
   gravações numa fila para dois pedidos simultâneos não se atropelarem.

   Não use isto em produção: não tem concorrência entre instâncias, nem
   backup, nem índice.
   ===================================================================== */

const fs = require('fs/promises');
const path = require('path');
const cfg = require('../config');

async function abrir(conteineres) {
  const raiz = path.resolve(cfg.pastaDados);
  await fs.mkdir(raiz, { recursive: true });

  const caminho = c => path.join(raiz, c + '.json');
  const cache = new Map();
  let fila = Promise.resolve();

  async function ler(c) {
    if (cache.has(c)) return cache.get(c);
    let bruto;
    try {
      bruto = await fs.readFile(caminho(c), 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') { cache.set(c, []); return []; }   /* ainda não existe */
      throw e;
    }
    /* Arquivo existe mas está corrompido. Tratar isso como coleção vazia
       era pior que o problema: a primeira gravação seguinte reescrevia o
       arquivo com um registro só, e a corrupção parcial virava perda
       total. Guarda o original e falha alto. */
    let dados;
    try {
      dados = JSON.parse(bruto);
    } catch (e) {
      const salvo = caminho(c) + '.corrompido-' + Date.now();
      await fs.rename(caminho(c), salvo).catch(() => {});
      throw new Error(`O arquivo ${c}.json está corrompido e foi preservado em ` +
        `${path.basename(salvo)}. Nada foi apagado — recupere-o antes de continuar.`);
    }
    if (!Array.isArray(dados)) dados = [];
    cache.set(c, dados);
    return dados;
  }

  /* grava serializado: cada escrita espera a anterior terminar */
  function gravar(c, dados) {
    cache.set(c, dados);
    /* O erro precisa CHEGAR em quem chamou. Antes o .catch resolvia a
       promise, então `await gravar(...)` dava sucesso mesmo com disco
       cheio ou pasta somente-leitura: a rota respondia 201, a tela
       marcava "salvo", e não estava salvo em lugar nenhum.

       A fila continua andando mesmo quando uma gravação falha — senão
       um erro travaria todas as escritas seguintes. */
    const nome = caminho(c) + '.tmp.' + process.pid;
    const escrita = fila.then(async () => {
      await fs.writeFile(nome, JSON.stringify(dados, null, 2), 'utf8');
      await fs.rename(nome, caminho(c));
    });
    fila = escrita.catch(() => {});
    return escrita;
  }

  for (const c of conteineres) await ler(c.nome);

  return {
    tipo: 'arquivo',
    descricao: 'JSON em ' + raiz,

    async listar(c, filtro) {
      const dados = await ler(c);
      if (!filtro) return dados.slice();
      return dados.filter(d => Object.keys(filtro).every(k => d[k] === filtro[k]));
    },

    /* o terceiro parâmetro (chave de partição) existe só para a interface
       ficar igual à do Cosmos — aqui não há partição */
    async obter(c, id, pk) {
      const dados = await ler(c);
      return dados.find(d => d.id === id) || null;
    },

    async salvar(c, doc) {
      const dados = await ler(c);
      const i = dados.findIndex(d => d.id === doc.id);
      if (i > -1) dados[i] = doc; else dados.push(doc);
      await gravar(c, dados);
      return doc;
    },

    async remover(c, id) {
      const dados = await ler(c);
      const i = dados.findIndex(d => d.id === id);
      if (i === -1) return false;
      dados.splice(i, 1);
      await gravar(c, dados);
      return true;
    },

    async contar(c, filtro) {
      return (await this.listar(c, filtro)).length;
    },

    async saude() {
      const out = {};
      for (const c of conteineres) out[c.nome] = (await ler(c.nome)).length;
      return { ok: true, tipo: 'arquivo', local: raiz, registros: out };
    }
  };
}

module.exports = { abrir };
