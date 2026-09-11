# Processos Societários — GS2 Negócios

Ferramenta interna para conduzir e acompanhar processos societários (abertura,
alteração, filial, baixa e outros eventos) junto à Junta Comercial, à Receita
Federal e às prefeituras, com os documentos arquivados no SharePoint da GS2.

Publicada no **Azure Static Web Apps**, em `app.gs2negocios.com.br/login`.

---

## Rodar na sua máquina

Precisa de **Node 20 ou mais novo**. Nada além disso — não há build.

**Jeito simples (macOS):** clique duas vezes em **`iniciar.command`**. Ele prepara
a API na primeira vez, sobe o servidor e abre o navegador sozinho. Para parar,
feche a janela do Terminal.

**Pelo terminal:**

```bash
cd api && npm install     # só na primeira vez
cd .. && node servidor-local.js
```

Abre em `http://localhost:5173/login`, com a API rodando de verdade (os mesmos
handlers que vão para o Azure) e banco em arquivo dentro de `.dados/`.

Sem `tenantId`/`clientId` preenchidos em `web/config.js`, tudo roda em **modo
demonstração**: identidade declarada, banco local, nada toca o SharePoint. É
proposital — dá para mostrar a ferramenta a alguém sem risco. O servidor escuta
só em `127.0.0.1` por causa disso.

Para zerar: `rm -rf .dados`.

## As três peças

| Peça | Onde roda | Guarda o quê |
|---|---|---|
| `web/` | navegador | as telas |
| `api/` | Azure Functions, no mesmo Static Web App | o **estado** dos processos, os cadastros e a auditoria |
| SharePoint | Microsoft 365 da GS2 | os **documentos** |

O banco é a verdade sobre o estado do processo; o SharePoint é a verdade sobre o
documento. Nada é duplicado, e por isso não há como divergirem.

## Estrutura

```
web/                 a ferramenta (app_location)
  index.html         marcação; define a ordem de carga dos scripts
  config.js          único arquivo que muda entre ambientes
  css/  js/  dados/  vendor/  assets/
api/                 a API (api_location)
  src/rotas/         handlers puros — o mesmo código local e no Azure
  src/db/            adaptador: arquivo (local) | cosmos (produção)
modelos/             planilha modelo de importação da base inicial
servidor-local.js    sobe web/ + api/ juntos
CLAUDE.md            decisões de arquitetura — leia antes de mexer
```

Não há bundler: os scripts entram por `<script src>` na ordem definida em
`web/index.html`. **Arquivo novo em `web/js/` só funciona depois de acrescentar a
tag lá.**

## Publicar

Conecte o Static Web App a este repositório no portal do Azure; ele cria o
workflow do GitHub Actions e guarda o token de deploy como segredo. A partir daí,
`push` na `main` publica, e **cada Pull Request ganha uma URL de pré-visualização**
para você testar antes do merge.

Se preferir criar o recurso pelo CLI, o workflow já está em
`.github/workflows/azure-static-web-apps.yml` — `app_location: web`,
`api_location: api`, sem `output_location`.

O passo a passo completo (registro no Entra ID, Cosmos DB, domínio, variáveis de
ambiente) está em **[`docs/implantacao.md`](docs/implantacao.md)**.

## Importar a base inicial de processos

A ferramenta nasce vazia — sem nenhum exemplo embutido, por decisão (os
exemplos antigos tinham CPF e CNPJ reais). Para trazer de uma vez os processos
já em andamento:

1. Entre como administrador → **Administração › Importar processos**
2. Baixe `modelos/importacao-processos.xlsx`, preencha uma linha por processo
3. Solte o arquivo de volta na tela

Ela confere linha por linha e mostra o que está certo e o que tem problema
**antes** de gravar qualquer coisa. Só `cliente` e `tipo` são obrigatórios.
Sócios, administradores e documentos não vêm pela planilha — são preenchidos no
cadastro de cada processo.

## Trazer o acervo do SharePoint

A ferramenta nasce sem saber nada sobre os clientes. Quem preenche o Painel de
Clientes é o próprio acervo já arquivado no SharePoint:

1. Entre como administrador → **Administração › Acervo do SharePoint**
2. **Varrer todos os clientes** (uma vez, antes de publicar)
3. Confira a tabela e clique em **Gravar no banco**

O que ela faz, cliente por cliente: percorre
`03 - Societario / 03.01 - Contratos Sociais, CNPJ e QSA`, lê os **nomes** dos
arquivos (tipo do ato, número da alteração, data, razão social) e abre **apenas
dois PDFs** — o Cartão CNPJ e o QSA mais recentes — para tirar deles CNPJ,
endereço, natureza jurídica, CNAE e quadro societário. Contrato social não é
aberto.

Ela **só lê**, com a permissão de quem está logado, e nada vai para o banco antes
de você ver o resultado na tela. Depois disso, abrir a ficha de um cliente relê
aquele cliente em segundo plano, para pegar o que mudou.

A convenção de nomes da casa não é única — o interpretador aceita cinco formatos
diferentes e trata as pastas de grupo (M3BR, VIVART e o MIRIAN, que ainda desce
mais um nível). O que ele não conseguir ler aparece como *não identificado*, e
não como palpite.

## Conferir antes de commitar

```bash
for f in web/js/*.js web/dados/*.js web/config.js; do node --check "$f" || echo "ERRO: $f"; done
node testes/interpretador-de-nomes.js   # 28 nomes reais da biblioteca
node testes/montagem-da-ficha.js        # ficha, linha do tempo, leitura do Cartão CNPJ
node testes/seguranca-da-api.js         # permissão, isolamento de cliente, configuração
node testes/estresse.js                 # nomes hostis, volume e escrita concorrente
```

Os quatro rodam sem framework e sem rede — 84 verificações ao todo, em cerca de
meio minuto. `seguranca-da-api.js` sobe o servidor local numa porta própria e
tenta, uma a uma, as coisas que **não** podem funcionar: entrar sem token, ler o
processo de outro cliente, sobrescrever um processo mandando o id no corpo,
alcançar um cadastro de outro tipo pelo id, ler um arquivo fora da pasta `web/`.
`estresse.js` joga 20 mil nomes de arquivo malformados no interpretador e 400
criações simultâneas na API, e confere que nada se perde.

E abra a ferramenta no navegador: o selo do topo leva ao **Diagnóstico da
integração**, que roda as chamadas reais e diz exatamente o que falta configurar.

## Segredos


`web/config.js` é versionado de propósito: `tenantId` e `clientId` são públicos
numa página estática. Segredo de verdade (chave do Cosmos, `clientState` do
webhook) vai nas **configurações do Static Web App**, nunca no repositório.
`api/local.settings.json` está no `.gitignore` por poder conter a chave do banco.
