/* =====================================================================
   ETAPA 2 — réplica do SharePoint e conferência automática.

   Três peças que trabalham juntas:

     webhook   → o SharePoint avisa "mudou alguma coisa nesta biblioteca".
                 A notificação de driveItem NÃO diz o que mudou, só que
                 mudou. Por isso ela sozinha não serve para nada.
     delta     → chamado logo depois, devolve exatamente o que mudou
                 desde a última vez, usando o deltaLink guardado.
     varredura → o mesmo delta, rodando por agendamento, como rede de
                 segurança: notificação perdida não é recuperável, então
                 não dá para confiar só no webhook.

   Regras que evitam as armadilhas conhecidas:
     • rastrear item por `id`, nunca por caminho — renomear uma pasta não
       devolve os filhos, e quem indexa por caminho perde o cliente
       inteiro quando alguém renomeia a pasta dele;
     • `410 Gone` = token vencido: refaz a enumeração completa;
     • itens com a marca `deleted` saem da réplica.

   Tudo isto só executa com GS2_REPLICA=1 e identidade gerenciada com
   Sites.Selected (leitura) no site. Sem isso, as rotas respondem
   explicando o que falta, em vez de estourar erro.
   ===================================================================== */

const cfg = require('../config');
const { pode } = require('../auth');

const ID_ESTADO = 'estado-delta';

function desligada() {
  return {
    status: 200,
    corpo: {
      ligada: false,
      motivo: cfg.replicaLigada
        ? 'GS2_REPLICA=1, mas falta a identidade gerenciada com Sites.Selected no site.'
        : 'Réplica desligada (GS2_REPLICA != 1). Etapa 2 ainda não ativada.',
      comoLigar: [
        'Registrar um aplicativo próprio no Entra ID com segredo (o plano Free do Static Web Apps não oferece identidade gerenciada)',
        'Conceder a ele Sites.Selected (nível read) apenas no site ' + cfg.sharepoint.sitePath,
        'Definir GS2_REPLICA_TENANT_ID, GS2_REPLICA_CLIENT_ID e GS2_REPLICA_CLIENT_SECRET',
        'Definir GS2_REPLICA=1, GS2_WEBHOOK_URL e GS2_WEBHOOK_CLIENT_STATE',
        'Chamar POST /api/replica/assinatura para criar a assinatura no Graph'
      ]
    }
  };
}

async function lerEstado(banco) {
  return (await banco.obter('replica', ID_ESTADO)) || {
    id: ID_ESTADO, driveId: 'pendente', deltaLink: '', proximoLink: '',
    ultimaSincronizacao: '', itens: 0, ultimoErro: '', assinatura: null
  };
}

/* Quanto tempo a varredura pode gastar antes de parar e guardar onde
   estava. As funções gerenciadas do Static Web Apps cortam a requisição
   por volta de 45s; parar em 20s deixa folga para o que já foi lido ser
   gravado e para a resposta sair. */
const ORCAMENTO_MS = 20000;

/* ------------------------------------------------------------------ */
async function estado(ctx) {
  if (!pode(ctx.usuario, 'replica:operar')) {
    return { status: 403, corpo: { erro: 'Apenas administradores.' } };
  }
  const e = await lerEstado(ctx.banco);
  if (!cfg.replicaLigada) {
    const d = desligada();
    d.corpo.ultimoEstado = e;
    return d;
  }
  return { status: 200, corpo: Object.assign({ ligada: true }, e) };
}

/* ------------------------------------------------------------------
   Varredura: pega o deltaLink guardado (ou enumera do zero na primeira
   vez) e atualiza a réplica com o que mudou. */
async function sincronizar(ctx) {
  if (!pode(ctx.usuario, 'replica:operar')) {
    return { status: 403, corpo: { erro: 'Apenas administradores.' } };
  }
  if (!cfg.replicaLigada) return desligada();
  return executarSincronizacao(ctx.banco);
}

async function executarSincronizacao(banco) {
  const graph = require('../graph');
  const comeco = Date.now();
  const resumo = { criados: 0, alterados: 0, removidos: 0, paginas: 0, reenumerou: false, parcial: false };
  let e;

  try {
    e = await lerEstado(banco);
    const d = await graph.drive();
    e.driveId = d.driveId;

    /* `proximoLink` guardado = a varredura anterior parou no meio (estourou
       o orçamento de tempo) e continua daqui. Sem isso, biblioteca grande
       nunca terminaria: cada tentativa recomeçava do zero e era cortada no
       mesmo lugar. */
    let url = e.proximoLink || e.deltaLink || `/drives/${d.driveId}/root/delta`;
    let deltaLink = '';

    while (url) {
      let pagina;
      try {
        pagina = await graph.chamar(url);
      } catch (err) {
        /* token de delta vencido — a única saída é reenumerar do zero */
        if (err.status === 410) {
          resumo.reenumerou = true;
          url = `/drives/${d.driveId}/root/delta`;
          pagina = await graph.chamar(url);
        } else {
          throw err;
        }
      }
      resumo.paginas++;

      for (const item of (pagina.value || [])) {
        const id = 'item-' + item.id;
        if (item.deleted) {
          if (await banco.remover('replica', id)) resumo.removidos++;
          continue;
        }
        const anterior = await banco.obter('replica', id);
        /* guardamos o essencial, não o arquivo: o SharePoint continua
           sendo a verdade sobre o conteúdo */
        await banco.salvar('replica', {
          id,
          driveId: d.driveId,
          itemId: item.id,
          nome: item.name || '',
          paiId: (item.parentReference && item.parentReference.id) || '',
          pasta: !!item.folder,
          tamanho: item.size || 0,
          alteradoEm: item.lastModifiedDateTime || '',
          webUrl: item.webUrl || '',
          vistoEm: new Date().toISOString()
        });
        if (anterior) resumo.alterados++; else resumo.criados++;
      }

      url = pagina['@odata.nextLink'] || '';
      deltaLink = pagina['@odata.deltaLink'] || deltaLink;

      /* Grava o progresso a cada página: se a próxima estourar o tempo, o
         que já foi lido não se perde. */
      e.proximoLink = url;
      if (deltaLink) e.deltaLink = deltaLink;
      e.ultimoErro = '';
      await banco.salvar('replica', e);

      if (url && Date.now() - comeco > ORCAMENTO_MS) {
        resumo.parcial = true;
        break;
      }
    }

    if (!resumo.parcial) {
      e.deltaLink = deltaLink || e.deltaLink;
      e.proximoLink = '';
    }
    e.ultimaSincronizacao = new Date().toISOString();
    e.itens = await banco.contar('replica');
    e.ultimoErro = '';
    await banco.salvar('replica', e);

    return { status: 200, corpo: { ok: true, resumo, estado: e } };
  } catch (err) {
    if (e) {
      e.ultimoErro = err.message;
      e.ultimaSincronizacao = new Date().toISOString();
      try { await banco.salvar('replica', e); } catch (e2) { /* banco fora: o erro original já sobe */ }
    }
    return { status: 502, corpo: { ok: false, erro: err.message } };
  }
}

/* ------------------------------------------------------------------
   Receptor do webhook.

   Duas responsabilidades, nesta ordem:
   1. Handshake: na criação da assinatura o Graph manda ?validationToken=
      e espera o token de volta, em texto puro e decodificado, em até 10s.
   2. Notificação: confere o clientState (senão qualquer um poderia
      disparar isto, já que o endpoint é público) e responde rápido.
      O Graph dá 3 segundos — então respondemos 202 e sincronizamos
      depois, sem segurar a resposta. */
async function webhook(ctx) {
  const vt = ctx.query.validationToken || ctx.query.validationtoken;
  if (vt) {
    /* Só ecoa com a réplica ligada, e com tamanho limitado: com a réplica
       desligada isto era um refletor gratuito para qualquer um. O token
       real do Graph tem algumas dezenas de caracteres. */
    if (!cfg.replicaLigada) return { status: 404, corpo: '', texto: true };
    return { status: 200, corpo: String(vt).slice(0, 512), texto: true };
  }

  if (!cfg.replicaLigada) return { status: 202, corpo: '', texto: true };

  const notificacoes = (ctx.corpo && ctx.corpo.value) || [];
  const legitimas = notificacoes.filter(n =>
    cfg.webhookClientState && n.clientState === cfg.webhookClientState);

  if (notificacoes.length && !legitimas.length) {
    /* clientState não bateu: não é o Graph, ou a assinatura é de outro
       ambiente. Não sincroniza, e devolve 202 para não dar pista. */
    console.warn('[replica] notificação com clientState inválido, ignorada');
    return { status: 202, corpo: '', texto: true };
  }

  /* responde já; o trabalho continua em segundo plano */
  if (legitimas.length) {
    executarSincronizacao(ctx.banco)
      .catch(e => console.error('[replica] sincronização pós-webhook falhou:', e.message));
  }
  return { status: 202, corpo: '', texto: true };
}

/* ------------------------------------------------------------------
   Cria ou renova a assinatura no Graph. A de driveItem vale no máximo
   ~30 dias (42.300 minutos), então isto precisa rodar por agendamento —
   uma vez por semana já dá folga de sobra. */
async function assinatura(ctx) {
  if (!pode(ctx.usuario, 'replica:operar')) {
    return { status: 403, corpo: { erro: 'Apenas administradores.' } };
  }
  if (!cfg.replicaLigada) return desligada();
  if (!cfg.webhookUrl || !cfg.webhookClientState) {
    return { status: 400, corpo: { erro: 'Defina GS2_WEBHOOK_URL e GS2_WEBHOOK_CLIENT_STATE antes de criar a assinatura.' } };
  }

  const graph = require('../graph');
  const e = await lerEstado(ctx.banco);
  /* 25 dias: dentro do teto de ~30 e com margem para o agendamento falhar
     uma vez sem a assinatura expirar */
  const expira = new Date(Date.now() + 25 * 86400000).toISOString();

  try {
    let assin;
    if (e.assinatura && e.assinatura.id) {
      assin = await graph.chamar('/subscriptions/' + e.assinatura.id, {
        method: 'PATCH', json: { expirationDateTime: expira }
      });
    } else {
      const d = await graph.drive();
      assin = await graph.chamar('/subscriptions', {
        method: 'POST',
        json: {
          changeType: 'updated',
          notificationUrl: cfg.webhookUrl,
          resource: `/drives/${d.driveId}/root`,
          expirationDateTime: expira,
          clientState: cfg.webhookClientState
        }
      });
    }
    e.assinatura = { id: assin.id, expiraEm: assin.expirationDateTime, recurso: assin.resource };
    await ctx.banco.salvar('replica', e);
    return { status: 200, corpo: { ok: true, assinatura: e.assinatura } };
  } catch (err) {
    /* assinatura sumiu do lado do Graph: limpa e deixa recriar na próxima */
    if (err.status === 404 && e.assinatura) {
      e.assinatura = null;
      await ctx.banco.salvar('replica', e);
    }
    return { status: 502, corpo: { ok: false, erro: err.message } };
  }
}

module.exports = { estado, sincronizar, webhook, assinatura, executarSincronizacao };
