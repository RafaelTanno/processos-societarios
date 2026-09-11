/* =====================================================================
   Microsoft Graph pela IDENTIDADE DA PRÓPRIA API (etapa 2).

   Isto é diferente do que o navegador faz. No navegador, o Graph é
   chamado em nome da pessoa logada — e é assim que a GRAVAÇÃO continua
   funcionando, para a autoria no SharePoint ficar com o nome de quem
   realmente arquivou o documento.

   Aqui a API tem identidade própria, porque a réplica roda de madrugada,
   quando não há ninguém logado. Duas travas importantes:

     1. A credencial é uma IDENTIDADE GERENCIADA do Azure — não existe
        segredo guardado em lugar nenhum, nem para vazar nem para girar.
     2. A permissão é Sites.Selected, concedida SOMENTE no site
        /sites/clientes e SOMENTE em nível de leitura. A API não consegue
        escrever no SharePoint nem enxergar outro site do tenant.

   Enquanto GS2_REPLICA != 1, nada aqui é chamado.
   ===================================================================== */

const cfg = require('./config');

let credencial = null;
let cacheToken = { valor: '', expira: 0 };

async function token() {
  if (cacheToken.valor && Date.now() < cacheToken.expira - 60000) return cacheToken.valor;
  if (!credencial) {
    const { DefaultAzureCredential } = require('@azure/identity');
    credencial = new DefaultAzureCredential();
  }
  const t = await credencial.getToken('https://graph.microsoft.com/.default');
  if (!t || !t.token) throw new Error('A identidade gerenciada não devolveu token para o Graph.');
  cacheToken = { valor: t.token, expira: t.expiresOnTimestamp || (Date.now() + 3300000) };
  return cacheToken.valor;
}

async function chamar(caminho, opcoes) {
  opcoes = opcoes || {};
  const url = caminho.startsWith('http') ? caminho : 'https://graph.microsoft.com/v1.0' + caminho;
  const cabecalhos = Object.assign({ Authorization: 'Bearer ' + await token() }, opcoes.headers || {});
  let corpo = opcoes.body;
  if (opcoes.json !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
    corpo = JSON.stringify(opcoes.json);
  }
  const r = await fetch(url, { method: opcoes.method || 'GET', headers: cabecalhos, body: corpo });
  if (!r.ok) {
    let detalhe = '';
    try { const j = await r.json(); detalhe = (j.error && (j.error.message || j.error.code)) || ''; } catch (e) {}
    const err = new Error(`Graph ${r.status} ${r.statusText}${detalhe ? ' — ' + detalhe : ''}`);
    err.status = r.status;
    throw err;
  }
  return r.status === 204 ? null : r.json();
}

let cacheDrive = null;

async function drive() {
  if (cacheDrive) return cacheDrive;
  const sp = cfg.sharepoint;
  const site = await chamar(`/sites/${sp.hostname}:${sp.sitePath}`);
  const drives = await chamar(`/sites/${site.id}/drives`);
  const alvo = (drives.value || []).find(d => d.name === sp.biblioteca)
            || (await chamar(`/sites/${site.id}/drive`));
  cacheDrive = { siteId: site.id, driveId: alvo.id, nome: alvo.name, webUrl: alvo.webUrl };
  return cacheDrive;
}

module.exports = { chamar, drive, token };
