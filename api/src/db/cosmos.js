/* =====================================================================
   Azure Cosmos DB (serverless) — produção.

   Autenticação, em ordem de preferência:
     1. Identidade gerenciada da Function (COSMOS_KEY vazio) — não existe
        segredo em lugar nenhum; a Function recebe a função RBAC
        "Cosmos DB Built-in Data Contributor" na conta.
     2. Chave de conta (COSMOS_KEY) — mais simples de começar, mas é um
        segredo que alguém precisa guardar e girar.

   O banco e os contêineres são criados na primeira execução, então não é
   preciso preparar nada à mão no portal.
   ===================================================================== */

const cfg = require('../config');

async function abrir(conteineres) {
  const { CosmosClient } = require('@azure/cosmos');

  let cliente;
  if (cfg.cosmos.chave) {
    cliente = new CosmosClient({ endpoint: cfg.cosmos.endpoint, key: cfg.cosmos.chave });
  } else {
    const { DefaultAzureCredential } = require('@azure/identity');
    cliente = new CosmosClient({
      endpoint: cfg.cosmos.endpoint,
      aadCredentials: new DefaultAzureCredential()
    });
  }

  const { database } = await cliente.databases.createIfNotExists({ id: cfg.cosmos.bancoNome });
  const cx = {};
  for (const c of conteineres) {
    const { container } = await database.containers.createIfNotExists({
      id: c.nome,
      partitionKey: { paths: [c.chave] }
    });
    cx[c.nome] = { container, campoChave: c.chave.replace('/', '') };
  }

  const alvo = c => {
    if (!cx[c]) throw new Error('contêiner desconhecido: ' + c);
    return cx[c];
  };

  return {
    tipo: 'cosmos',
    descricao: cfg.cosmos.endpoint + ' / ' + cfg.cosmos.bancoNome,

    async listar(c, filtro) {
      const { container } = alvo(c);
      let sql = 'SELECT * FROM c';
      const params = [];
      if (filtro && Object.keys(filtro).length) {
        const cond = Object.keys(filtro).map((k, i) => {
          params.push({ name: '@p' + i, value: filtro[k] });
          return `c.${k} = @p${i}`;
        });
        sql += ' WHERE ' + cond.join(' AND ');
      }
      const { resources } = await container.items.query({ query: sql, parameters: params }).fetchAll();
      return resources;
    },

    /* Com a chave de partição conhecida, leitura pontual: ~1 RU e sem
       varrer partições. Sem ela, consulta — que custa mais e, se o
       mesmo id existir em duas partições, devolve uma delas ao acaso. */
    async obter(c, id, pk) {
      const { container } = alvo(c);
      if (pk !== undefined && pk !== null && pk !== '') {
        try {
          const { resource } = await container.item(id, pk).read();
          return resource || null;
        } catch (e) {
          if (e.code === 404) return null;
          throw e;
        }
      }
      const { resources } = await container.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      return resources[0] || null;
    },

    async salvar(c, doc) {
      const { container, campoChave } = alvo(c);
      /* a chave de partição precisa existir no documento */
      if (doc[campoChave] === undefined || doc[campoChave] === null || doc[campoChave] === '') {
        doc[campoChave] = 'sem-particao';
      }
      const { resource } = await container.items.upsert(doc);
      return resource;
    },

    async remover(c, id, pk) {
      const doc = await this.obter(c, id, pk);
      if (!doc) return false;
      const { container, campoChave } = alvo(c);
      await container.item(id, doc[campoChave]).delete();
      return true;
    },

    async contar(c, filtro) {
      const { container } = alvo(c);
      let sql = 'SELECT VALUE COUNT(1) FROM c';
      const params = [];
      if (filtro && Object.keys(filtro).length) {
        const cond = Object.keys(filtro).map((k, i) => {
          params.push({ name: '@p' + i, value: filtro[k] });
          return `c.${k} = @p${i}`;
        });
        sql += ' WHERE ' + cond.join(' AND ');
      }
      const { resources } = await container.items.query({ query: sql, parameters: params }).fetchAll();
      return resources[0] || 0;
    },

    async saude() {
      const out = {};
      for (const c of conteineres) out[c.nome] = await this.contar(c.nome);
      return { ok: true, tipo: 'cosmos', local: cfg.cosmos.endpoint, registros: out };
    }
  };
}

module.exports = { abrir };
