# Processos Societários — implantação

Ferramenta interna da **GS2 Negócios**, hospedada no **Azure Static Web Apps**
em `app.gs2negocios.com.br/login`.

Três peças:

| Peça | Onde roda | Para quê |
|---|---|---|
| **Ferramenta** (`index.html`) | navegador | as telas |
| **API** (`api/`) | Azure Functions, dentro do mesmo Static Web App | guarda os processos, os cadastros, o acervo lido do SharePoint e a trilha de auditoria |
| **SharePoint** | Microsoft 365 da GS2 | guarda os documentos |

A divisão de autoridade é a regra que mantém tudo coerente: **o banco é a verdade
sobre o estado do processo; o SharePoint é a verdade sobre o documento.** Nada é
duplicado.

O login é do **Microsoft Entra ID** da GS2. A gravação no SharePoint é feita pelo
navegador, **em nome da pessoa logada** — quem não enxerga uma pasta lá também não
enxerga aqui, e a autoria do arquivo fica com o nome de quem arquivou.

> **Mudou em 08/09/2026 (auditoria de segurança).** Duas coisas na publicação
> passaram a ser **obrigatórias e explícitas**: `GS2_BANCO` e a **ausência** de
> `GS2_PERMITIR_DEMO`. Antes, faltar uma variável fazia a API cair sozinha em
> modo demonstração ou em banco de arquivo — e publicar aberta sem avisar
> ninguém. Agora ela se recusa a autenticar ou a subir. Leia o **Passo 4** com
> atenção; é lá que isso aparece.

---

## O que tem nesta pasta

| Arquivo | Para que serve |
|---|---|
| `web/index.html` | A marcação da ferramenta. O código está em `web/js/` e `web/dados/`. |
| `web/config.js` | **O único arquivo que muda entre ambientes** no lado do navegador: tenantId, clientId, site do SharePoint, quem é administrador. |
| `web/auth.html` | Página em branco para onde a janela de login Microsoft volta. Precisa existir e continuar vazia. |
| `web/js/acervo.js` | Lê o acervo societário do SharePoint: interpreta os nomes de arquivo e extrai o Cartão CNPJ e o QSA. Não conhece tela. |
| `web/js/app-7-acervo.js` | A tela da varredura do acervo e a ligação dela com o Painel de Clientes. |
| `web/vendor/msal-browser.min.js` | Biblioteca de autenticação da Microsoft (MSAL v5), servida junto com a página. |
| `web/staticwebapp.config.json` | Rotas e cabeçalhos de segurança, incluindo a **CSP**. É ele que faz `/login` funcionar e que deixa `/api` passar. |
| `servidor-local.js` | Sobe ferramenta **e** API na sua máquina, para testar antes de publicar. |
| `testes/` | Quatro testes que rodam com `node`, sem framework e sem rede. Rode antes de publicar. |
| `api/` | A API. `src/rotas` tem os handlers; `src/db` tem o adaptador de banco; `index.js` liga tudo ao Azure Functions. |
| `api/local.settings.json.exemplo` | Modelo das variáveis de ambiente da API. |

---

## Testar tudo na sua máquina, antes de criar qualquer coisa no Azure

```bash
cd api && npm install
cd .. && node servidor-local.js
```

Abre `http://localhost:5173/login`. Isso já é a ferramenta **completa**: API de
verdade (os mesmos handlers que vão para o Azure), banco em arquivo dentro de
`.dados`, e as rotas imitando o Static Web Apps.

O que dá para conferir sem gastar nada:

1. entrar com `vinicius@gs2negocios.com.br` → menu **Administração** aparece;
2. entrar com outro `@gs2negocios.com.br` → não aparece;
3. criar um processo, **fechar a aba, abrir de novo** → ele continua lá;
4. abrir em duas janelas com usuários diferentes → os dois veem o mesmo painel;
5. entrar pela aba **Cliente** → só os processos das empresas liberadas para ele;
6. clicar no selo do topo → **Diagnóstico da integração**, que testa API, banco,
   permissões e (quando configurado) o SharePoint.

O servidor local escuta **só em 127.0.0.1**, de propósito, e é ele que define
`GS2_PERMITIR_DEMO=1` — a variável que autoriza a identidade declarada. No Azure
essa variável não existe, e é assim que tem de ser.

Para apagar tudo e recomeçar: `rm -rf .dados`.

### A bateria de testes

```bash
node testes/interpretador-de-nomes.js   # 28 nomes REAIS da biblioteca do SharePoint
node testes/montagem-da-ficha.js        # ficha do cliente, linha do tempo, Cartão CNPJ, QSA
node testes/seguranca-da-api.js         # 36 regressões da auditoria de 08/09/2026
node testes/estresse.js                 # 20 mil nomes hostis, 400 escritas simultâneas
```

São 84 verificações, cerca de meio minuto, sem rede. **Rode antes de cada
publicação.** O `seguranca-da-api.js` não é teoria: cada linha dele corresponde a
uma porta que já esteve aberta — modo demonstração vazando para produção,
travessia de diretório, um colaborador sobrescrevendo processo pelo `id`, um
cliente externo lendo o acervo de outra empresa. Se um deles falhar, **não
publique**.

---

## Passo 1 — Registrar o aplicativo no Entra ID

**portal.azure.com → Microsoft Entra ID → Registros de aplicativo → Novo registro**

1. **Nome:** `GS2 — Processos Societários`
2. **Contas suportadas:** apenas contas neste diretório organizacional.
3. **URI de Redirecionamento:** plataforma **Aplicativo de página única (SPA)**, e cadastre **as duas**:
   - `https://app.gs2negocios.com.br/auth.html`
   - `http://localhost:5173/auth.html`
4. Em **Visão geral**, copie o **ID do aplicativo (cliente)** e o **ID do diretório (locatário)**.
5. **Permissões de API → Microsoft Graph → Delegadas:** `User.Read` e `Sites.ReadWrite.All`.
   Depois clique em **Conceder consentimento do administrador**.
6. **Expose an API** — obrigatório, e agora a API confere de verdade:
   - **Set** o Application ID URI como `api://{clientId}`;
   - **Add a scope** chamado `access_as_user`, quem consente: **Admins and users**;
   - em **Permissões de API**, adicione essa mesma permissão a este próprio
     aplicativo (My APIs → GS2 — Processos Societários → `access_as_user`) e
     conceda consentimento.

   > **Por que ficou mais rigoroso.** Até a auditoria, a API também aceitava o
   > *ID token* do frontend como credencial. O ID token fica no `localStorage` do
   > navegador e trafega pelo canal frontal — quem o obtivesse falava com a API
   > como aquele usuário, e todo o propósito do "Expose an API" ia por água
   > abaixo. Agora a API exige audiência `api://{clientId}` **e** o escopo
   > `access_as_user` dentro do token. Sem este passo 6, a ferramenta entra
   > normalmente e a API responde **401** — e o diagnóstico diz exatamente isso.

## Passo 2 — Preencher o `config.js`

```js
window.GS2_CONFIG_OVERRIDE = {
  tenantId: '00000000-0000-0000-0000-000000000000',
  clientId: '00000000-0000-0000-0000-000000000000',
  administradores: ['vinicius@gs2negocios.com.br'],
  clientesViaEntra: true,     // ver abaixo
  ...
};
```

Enquanto `tenantId` e `clientId` estiverem vazios, a ferramenta abre em **modo
demonstração** e avisa isso na tela — é proposital, dá para mostrar a ferramenta a
alguém sem risco.

> **`clientesViaEntra` precisa ser `true` em produção.** Com `false`, a aba
> *Cliente* autenticava pelo e-mail digitado — ou seja, bastava **conhecer** o
> e-mail de um usuário cadastrado para entrar e ver as empresas dele. Depois da
> auditoria, com o Entra ligado e `clientesViaEntra: false`, a ferramenta
> **recusa** o acesso de cliente e explica o motivo, em vez de deixar entrar.
> Se você ainda não quer liberar acesso externo, deixe assim mesmo: ninguém
> entra por engano.

## Passo 3 — Criar o banco (Cosmos DB serverless)

**Criar recurso → Azure Cosmos DB → Azure Cosmos DB for NoSQL**, capacidade
**Serverless**. Não precisa criar banco nem contêiner à mão: a API cria na
primeira execução, no banco `gs2processos`:

| Contêiner | Chave de partição | Guarda |
|---|---|---|
| `processos` | `/cliente` | um documento por processo societário |
| `cadastros` | `/tipo` | usuários, requerentes, usuários de cliente, pessoas, modelos |
| `auditoria` | `/dia` | trilha de acesso e alteração |
| `acervo` | `/cliente` | o retrato do acervo lido do SharePoint (cópia de leitura) |
| `replica` | `/driveId` | espelho e `deltaLink` da etapa 2 |

Duas formas de autenticar, em ordem de preferência:

- **Identidade gerenciada** (recomendado): ative a identidade do Static Web App,
  atribua a ela a função **Cosmos DB Built-in Data Contributor** na conta do
  Cosmos, e deixe `COSMOS_KEY` vazio. Não existe segredo em lugar nenhum.
- **Chave de conta:** preencha `COSMOS_KEY`. Mais rápido de começar, mas é um
  segredo que alguém precisa guardar e girar.

> O campo `cliente` de um processo é a **chave de partição** e por isso é
> imutável: a API recusa trocá-lo. Para mudar um processo de cliente, apague e
> crie de novo. (Trocar a partição no Cosmos não move o documento — cria um
> segundo com o mesmo id, e o antigo fica para trás, visível para quem tinha
> acesso ao cliente anterior.)

## Passo 4 — Publicar

```bash
npm install -g @azure/static-web-apps-cli     # uma vez
swa deploy ./web --api-location ./api --env production
```

Ou pelo portal, ligando ao repositório com `app_location: web` e
`api_location: api`.

O plano **Free** já inclui as Functions gerenciadas e atende de sobra; o
**Standard** acrescenta SLA, mais domínios e mais espaço.

Depois, em **Static Web App → Configuração**, defina as variáveis da API:

| Variável | Valor | Obrigatória? |
|---|---|---|
| `GS2_TENANT_ID` | ID do locatário | **sim** |
| `GS2_CLIENT_ID` | ID do aplicativo | **sim** |
| `GS2_BANCO` | `cosmos` | **sim** |
| `COSMOS_ENDPOINT` | URI da conta do Cosmos | **sim** |
| `GS2_ADMINS` | `vinicius@gs2negocios.com.br` (separados por vírgula) | recomendada |
| `COSMOS_KEY` | vazio se usar identidade gerenciada | não |
| `GS2_RETENCAO_DIAS` | prazo de retenção de dado pessoal, ou `0` | não |
| `GS2_PERMITIR_DEMO` | **NÃO CRIE ESTA VARIÁVEL** | — |

### O que acontece se faltar alguma

Isto mudou na auditoria de 08/09/2026, e é a parte mais importante desta página.

| Situação | Antes | Agora |
|---|---|---|
| Falta `GS2_TENANT_ID` ou `GS2_CLIENT_ID` | A API aceitava **identidade declarada por cabeçalho**, sem token: qualquer um da internet lia todos os processos e todos os CPFs, e o `/api/saude` público ainda anunciava a condição | A API **não autentica ninguém**. O `/api/saude` responde `modo: "mal-configurada"` |
| Falta `GS2_BANCO` / `COSMOS_ENDPOINT` | Caía em banco de **arquivo**, gravando no disco efêmero da Function: tudo parecia funcionar e os dados sumiam no próximo *cold start*, sem erro nenhum | A API **se recusa a subir**, com a mensagem dizendo o que falta |
| `GS2_PERMITIR_DEMO=1` existe | — | **A API volta a aceitar identidade declarada.** Essa variável existe só para o `servidor-local.js`. **Nunca a crie no Azure.** |

Depois de publicar, confira em uma linha:

```bash
curl -s https://app.gs2negocios.com.br/api/saude
```

Precisa responder `"modo":"entra"`. Se responder `"local"` ou
`"mal-configurada"`, **pare e corrija as variáveis antes de qualquer pessoa
entrar**.

### Cabeçalhos de segurança e a CSP

`web/staticwebapp.config.json` publica `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy` e uma
**Content-Security-Policy**. A CSP é a rede de proteção que transforma um erro de
escape numa falha de renderização, em vez de código executando na origem
`app.gs2negocios.com.br`.

Ela libera exatamente o que a ferramenta usa: `login.microsoftonline.com` e
`graph.microsoft.com` (Entra e SharePoint), `cdnjs.cloudflare.com` (pdf.js e
Tesseract), `*.sharepoint.com` (download dos documentos) e as duas APIs de CEP.
**Se você acrescentar qualquer serviço externo à ferramenta, precisa acrescentá-lo
à CSP também** — senão a chamada é bloqueada silenciosamente pelo navegador, e o
sintoma é uma tela que simplesmente não carrega o dado, sem erro visível.

> **Pendência conhecida:** o `pdf.js`, que lê o Cartão CNPJ e o QSA, vem do
> `cdnjs.cloudflare.com`. O MSAL e o SheetJS já estão em `web/vendor/` justamente
> para não depender de CDN. Se a rede do escritório bloquear o cdnjs, a varredura
> do acervo **degrada em silêncio** para "só nomes de arquivo". Baixar
> `pdf.min.js` e `pdf.worker.min.js` (versão 3.11.174) para `web/vendor/` e
> apontar o `index.html` para lá resolve de vez.

## Passo 5 — Domínio

1. Static Web App → **Domínios personalizados → Adicionar** → `app.gs2negocios.com.br`.
2. No DNS de `gs2negocios.com.br`, crie o **CNAME** que o Azure indicar.
3. O certificado HTTPS sai automático.
4. Confirme que `https://app.gs2negocios.com.br/auth.html` está nas URIs de
   redirecionamento do Entra ID.

## Passo 6 — Primeira entrada

O banco nasce vazio **e a ferramenta também**: desde 08/09/2026 não há exemplo
embutido — nenhum processo, cliente, requerente ou usuário de cliente vem no
código. Ao entrar como administrador, o Painel mostra zero processos e o Painel de
Clientes explica qual é o próximo passo. Só o seu usuário administrador já está no
cadastro.

Daqui, três coisas enchem a ferramenta, nesta ordem:

1. **Acervo do SharePoint** (Passo 7) — as fichas dos clientes;
2. **Administração › Requerentes** — quem faz login no gov.br para a Viabilidade;
3. **Administração › Importar processos** — os processos já em andamento, por planilha.

## Passo 7 — Trazer o acervo do SharePoint (antes do go-live)

A ferramenta nasce sem saber nada sobre os clientes. Quem enche o Painel de
Clientes é o acervo que já está arquivado no SharePoint.

**Administração → Acervo do SharePoint → Varrer todos os clientes.**

Ela percorre, cliente por cliente,
`03 - Societario / 03.01 - Contratos Sociais, CNPJ e QSA`, lê os **nomes** dos
arquivos (tipo do ato, número da alteração, data, razão social) e abre **apenas
dois documentos** por cliente — o Cartão CNPJ e o QSA mais recentes — para tirar
deles CNPJ, endereço, natureza jurídica, CNAE e quadro societário. Contrato
social não é aberto.

Três coisas que valem saber antes de rodar:

- **Ela só lê**, com a permissão de quem está logado. Pasta que você não enxerga
  no SharePoint, a ferramenta também não enxerga.
- **Nada vai para o banco antes de você ver o resultado na tela.** A varredura
  mostra uma tabela cliente a cliente — com acervo, sem acervo, ou falhou — e só
  grava quando você clica em *Gravar no banco*. Cliente cuja **leitura falhou não
  é gravado**: não saber é diferente de saber que não há nada.
- **A convenção de nomes da casa não é única.** O interpretador aceita cinco
  formatos e trata as pastas de grupo (M3BR, VIVART e o MIRIAN, que ainda desce
  mais um nível). O que ele não conseguir ler aparece como *não identificado* —
  nunca como palpite. Nos grupos, a ficha é de **uma** das empresas, e um aviso
  na tela nomeia as demais.

Depois disso, abrir a ficha de um cliente relê aquele cliente em segundo plano
para pegar o que mudou. Essa releitura **atualiza a tela e não grava** — gravar é
sempre um ato do administrador, com o resultado à vista.

Levar de 40 a 60 clientes leva alguns minutos. Dá para parar no meio: o que já foi
lido continua na tela.

---

## Etapa 2 — réplica e conferência automática do SharePoint

Já está escrita (`api/src/rotas/replica.js` e `api/src/graph.js`) e **desligada**.
Ligar é dar identidade à API e virar uma chave.

**Como funciona:** o SharePoint avisa por webhook que algo mudou (a notificação
não diz *o quê*, só que mudou); a API então chama o **delta**, que devolve
exatamente o que mudou desde a última vez. Uma varredura de hora em hora roda o
mesmo delta como rede de segurança, porque notificação perdida não é recuperável.

**Para ligar:**

1. Ative a **identidade gerenciada** da Function App.
2. Conceda a ela **Sites.Selected** no Graph e, depois, permissão **de leitura
   apenas** no site `/sites/clientes` (via PowerShell — o portal não oferece essa
   concessão para Graph). Leitura basta: a escrita continua sendo delegada, feita
   pelo navegador em nome da pessoa.
3. Defina:
   - `GS2_REPLICA=1`
   - `GS2_WEBHOOK_URL=https://app.gs2negocios.com.br/api/webhook/sharepoint`
   - `GS2_WEBHOOK_CLIENT_STATE=` um segredo qualquer, longo e aleatório
4. Chame `POST /api/replica/assinatura` (como administrador) para criar a
   assinatura no Graph. A renovação passa a ser automática, toda segunda às 6h —
   a assinatura de `driveItem` vale no máximo ~30 dias.

`GET /api/replica/estado` mostra o deltaLink guardado, a última sincronização e o
último erro.

> Com `GS2_REPLICA` desligado, o endpoint do webhook responde **404** ao aperto de
> mão de validação, de propósito: ligado, ele ecoa o `validationToken` de volta, e
> com a réplica desligada isso era um refletor gratuito para qualquer um.

---

## Como o acesso funciona

| Perfil | Como entra | O que pode |
|---|---|---|
| **Administrador** | `vinicius@gs2negocios.com.br`, aba *Usuário GS2* | tudo, mais o menu Administração e a trilha de auditoria |
| **Colaborador GS2** | outro e-mail `@gs2negocios.com.br` | criar e alterar processos; ler cadastros; varrer o acervo; **não** apaga processo nem mexe em usuários |
| **Cliente** | e-mail cadastrado em *Usuários de Clientes*, aba *Cliente* (exige `clientesViaEntra: true`) | só leitura, e só das empresas liberadas para ele |

O papel **não é escolhido na tela nem enviado pelo navegador**: a API o deriva do
e-mail que está dentro do token assinado pelo Entra — e só dos campos que o
próprio locatário emite (`preferred_username` / `upn`), nunca de `email`, que um
convidado externo controla no diretório de origem dele. Para incluir outro
administrador, acrescente o e-mail em `GS2_ADMINS` **e** no `config.js`.

## Trilha de auditoria

Toda escrita e toda leitura de dado pessoal (`requerentes`, `usuariosCliente`,
`pessoas`) entram no log, junto com as entradas na ferramenta e com as varreduras
do acervo. O log guarda *o que* mudou — contêiner, id, ação, quem e quando —
nunca o conteúdo: não faz sentido duplicar CPF dentro do log de acesso ao CPF.
Leitura em `GET /api/auditoria?dia=AAAA-MM-DD`, só para administradores.

Registros com dado pessoal recebem carimbo `_retencao`. Com `GS2_RETENCAO_DIAS`
definido, ganham também data de vencimento — a API **marca**, mas nunca apaga
nada sozinha.

> **Limitação conhecida:** o log registra o que foi feito, mas **não** registra as
> tentativas negadas (401/403), e não existe tela que o leia. Uma sondagem de
> centenas de tentativas não deixaria rastro visível. Está na lista de pendências.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `/api/saude` responde `"modo":"mal-configurada"` | Falta `GS2_TENANT_ID` ou `GS2_CLIENT_ID`. A API não autentica ninguém nesse estado — é proposital. |
| `/api/saude` responde `"modo":"local"` em produção | Alguém criou `GS2_PERMITIR_DEMO` no Azure. **Apague a variável imediatamente**: nesse estado a API aceita identidade declarada por cabeçalho. |
| A API não sobe, log diz "Banco não configurado" | Falta `GS2_BANCO=cosmos` ou `COSMOS_ENDPOINT`. |
| Abre em demonstração com o `config.js` preenchido | Arquivo aberto do disco (`file://`). Use o `servidor-local.js` ou publique. |
| API responde **401** com tudo configurado | Falta o escopo `api://{clientId}/access_as_user` (passo 1.6) ou o consentimento. A API agora exige o escopo dentro do token. |
| `AADSTS50011: redirect URI mismatch` | A URI que o diagnóstico mostra não está registrada. Copie exatamente. |
| Aba *Cliente* diz que o acesso não foi habilitado | `clientesViaEntra` está `false` com o Entra ligado. É a proteção nova — mude para `true` no `config.js` quando quiser liberar. |
| Selo diz "sem banco" | A API não respondeu. Em produção, confira as variáveis e o log da Function. |
| Cosmos 403 na primeira execução | A identidade gerenciada não recebeu a função *Cosmos DB Built-in Data Contributor*. |
| `Graph 403` no SharePoint | Falta consentimento em `Sites.ReadWrite.All`, ou a conta não tem acesso ao site. |
| Lista de clientes vazia | A ferramenta lista as pastas da raiz da biblioteca, ignorando pastas de uma letra e as que começam com `Z -`. |
| A varredura do acervo não lê nenhum CNPJ | O `pdf.js` não carregou — provavelmente o `cdnjs.cloudflare.com` está bloqueado na rede ou faltou na CSP. A linha do tempo continua saindo dos nomes de arquivo. |
| Uma tela some ou um botão não faz nada depois de publicar | Confira o console do navegador: uma chamada bloqueada pela CSP não gera erro visível na tela. |
| A API responde "Falha na API. Código para o suporte: xxxx" | É o comportamento certo — a mensagem real fica só no log da Function, associada a esse código. Procure por ele no Application Insights. |
