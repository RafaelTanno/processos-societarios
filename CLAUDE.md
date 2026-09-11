# Processos Societários — GS2 Negócios

Ferramenta interna do escritório para conduzir e acompanhar processos societários
(abertura, alteração, filial, baixa e outros eventos) junto à Junta Comercial, à
Receita Federal e às prefeituras, com os documentos arquivados no SharePoint.

Este arquivo é lido automaticamente por sessões do Claude neste repositório.
Ele existe para que nenhuma sessão futura recomece do zero nem contrarie o que já
foi decidido. **Leia antes de mexer em qualquer coisa.**

---

## Decisões que não devem ser revertidas sem conversa

**Autenticação.** Microsoft Entra ID da GS2, sem marca Microsoft na tela. O login
é por e-mail corporativo; ninguém cria senha nesta ferramenta. O papel
(Administrador / Colaborador / Cliente) **é derivado do e-mail dentro do token
assinado**, na API — nunca de cabeçalho ou de campo que o navegador possa forjar.
Administrador hoje: `vinicius@gs2negocios.com.br`.

**SharePoint é delegado, não app-only.** A gravação de documento é feita pelo
navegador, em nome da pessoa logada. Quem não enxerga uma pasta lá não enxerga
aqui, e a autoria do arquivo fica com o nome de quem arquivou. A identidade
própria da API (etapa 2) tem permissão **somente de leitura**, e só no site
`/sites/clientes`, via `Sites.Selected`.

**Autoridade não se duplica.** O banco é a verdade sobre o **estado** do processo;
o SharePoint é a verdade sobre o **documento**. A réplica existe para conferir e
para deixar a tela rápida — nunca para discordar.

**A ferramenta nunca conclui ato oficial sozinha.** Não faz login gov.br, não
clica em "Concluir" na Junta, não protocola nada por conta própria. A automação da
Fase 2 preenche e **para na tela de resumo**; concluir exige autorização humana
explícita, por processo (`GS2Redesim.autorizarConclusao`). Isso é regra, não
configuração, e vale mesmo se alguém pedir o contrário.

**O acervo do SharePoint é cópia de leitura, não autoridade.** O Painel de
Clientes é montado a partir do que está arquivado em
`03 - Societario/03.01`, e o resultado fica no **banco** — nunca num arquivo do
repositório, porque o acervo muda toda semana e um arquivo commitado nasce
desatualizado. Quando os dois divergirem, quem manda é o SharePoint, e a
solução é varrer de novo.

**A ferramenta não deduz campo que não leu.** O que não foi encontrado aparece
como `—`, e a ficha diz de onde veio o que está nela e quando foi lido. Capital
social e NIRE ficam em branco de propósito: não estão no Cartão CNPJ. Contrato
social não é lido automaticamente — é texto corrido, e extração ali erra mais do
que acerta.

**Nenhuma configuração falha em aberto.** Sem Entra configurado a API não
autentica ninguém: o modo demonstração exige `GS2_PERMITIR_DEMO=1`, que só o
`servidor-local.js` define. O banco também exige escolha explícita — `arquivo`
fora do modo demonstração é recusado, porque o disco da Function é efêmero e os
dados sumiriam sem erro nenhum. Esquecer uma variável no portal do Azure tem de
derrubar a API, nunca publicá-la aberta.

**Escapar é obrigatório, e o helper certo importa.** `escapeHtml` para texto e
atributo comum; `escapeAttr` SÓ para valor que vira string JavaScript dentro de um
atributo (`onclick="App.f('AQUI')"`). O `escapeAttr` escapa primeiro para JS e
depois para HTML, nessa ordem — o navegador decodifica as entidades ANTES de
compilar o manipulador, e por causa disso um nome de arquivo do SharePoint com
`&#39;` chegava a executar código. Nome de arquivo, célula de planilha, texto de
PDF e mensagem de erro são todos dado não confiável.

**Nada é gravado sem o usuário ver.** Vale para a importação de planilha (confere
antes), para a varredura do acervo (mostra a tabela antes de gravar) e para o
teste de gravação no SharePoint (exige clique e confirmação).

**A base embutida é vazia, e fica vazia.** Em 08/09/2026 saíram de `web/dados/`
todos os exemplos — processos, clientes, fichas, requerentes, usuários de cliente,
base de pessoas — porque carregavam CPF, CNPJ, e-mail e telefone reais (pendência
C3). Só ficam o administrador em `USERS`, os modelos de contrato (anonimizados),
a tabela CNAE e a estrutura de pastas. **Não volte a embutir dado de cliente no
código**: dado entra pela varredura do acervo, pela importação de planilha ou
pelo wizard — e mora no banco.

**Falha de backend não pode custar o trabalho da pessoa.** Se a API cair, a
ferramenta segue em memória, avisa no selo do topo e mostra um aviso discreto —
nunca um alerta que interrompe, nunca perda do que foi digitado.

---

## Identidade visual (Manual da Marca GS2)

O manual oficial está com o Vinícius; o essencial fica registrado aqui.

**Cores — use apenas estas.** Verde escuro `#003232`, verde claro `#82C81E`,
branco `#FFFFFF`. O manual proíbe aplicar a marca em outras cores ou alterar a
tonalidade delas. Os tokens em `web/css/estilo.css` já são exatamente esses.

**Tipografia — Segoe UI, três pesos:**

| Peso | Onde |
|---|---|
| **Bold** | títulos e mensagens de peso (`.view-title`) |
| *Light itálico* | subtítulos e mensagens de destaque (`.panel-head h3`, `.sec-title`, a frase do login) |
| Regular | texto corrido |

O light itálico é o traço mais reconhecível da marca — é o que o próprio manual
usa em todos os títulos de seção. Não troque por bold "para dar mais peso".

**Uma ressalva consciente:** o manual escreve os títulos de seção em verde claro
sobre branco. Numa ferramenta lida o dia inteiro isso dá contraste de ~2:1, abaixo
do mínimo legível, então `.view-title` ficou em verde escuro. O verde claro fica
onde tem contraste de sobra: sobre a foto escura do login. Foi decisão pensada,
não descuido.

**Marca.** `web/assets/logo-gs2.png` sobre fundo claro; `logo-gs2-branco.png`
sobre fundo escuro (branco com a seta em verde claro, como manda o manual).
Área de proteção: distância igual à altura da letra "G" em volta.

**Ícone** (`web/assets/icone-gs2.svg`). Quadrado com o quadrante inferior-esquerdo
vazado e o canto inferior-direito arredondado em 27% — geometria medida no manual.
Usa `currentColor`, então serve em verde, verde escuro ou branco. O manual autoriza
usá-lo como avatar, como destaque junto de imagens e como bullet de listas, e
**proíbe** usá-lo junto da marca completa. Como avatar/favicon vai o ícone, nunca a
marca completa — ela fica irreconhecível em tamanho pequeno.

**Fotografia** em preto e branco, com o verde aparecendo só no texto. Sobre a foto
vai a moldura: linha branca fina com um canto arredondado generoso, as pontas
tocando as bordas.

**Slogan oficial:** "Inteligência é a solução". A frase do login —
"Nosso negócio é ligar você aos seus objetivos" — foi definida pelo Vinícius em
07/09/2026, a partir do material do site.

## Estrutura

```
web/                 a ferramenta (app_location no Azure Static Web Apps)
  index.html         só marcação; os scripts entram na ordem definida lá
  config.js          ÚNICO arquivo que muda entre ambientes (tenantId, clientId…)
  css/estilo.css
  js/integracao.js   GS2_CONFIG, GS2Auth (Entra), GS2Api (backend), GS2SP (Graph)
  js/acervo.js       GS2Acervo — interpretador de nomes, varredura do acervo
                     e leitura do Cartão CNPJ / QSA. Não conhece DOM.
  js/redesim.js      MAPA_VIABILIDADE + GS2Redesim — gatilhos da automação (Fase 2)
  js/estado.js       wizard, currentUser
  js/app-1..6*.js    o objeto App, dividido; a parte 1 cria, as demais fazem
                     Object.assign(App, {...}) — sem bundler, a ordem importa
  js/app-7-acervo.js tela da varredura + ligação do acervo com o Painel
  js/importacao.js   importação da base inicial por planilha
  js/inicializacao.js
  dados/             CNAE (IBGE), clientes, estrutura de pastas, modelos, cadastros
  vendor/            msal-browser (Entra) e xlsx (leitura de planilha)
api/                 Azure Functions (api_location); handlers puros em src/rotas
modelos/             planilha modelo de importação
servidor-local.js    sobe web/ + api/ juntos em http://localhost:5173
testes/              testes que rodam com `node`, sem framework
```

**Por que o App está dividido:** era um arquivo de 914 KB, que o GitHub se recusa
a mostrar em diff e que torna qualquer edição paralela um conflito insolúvel. Não
há build: são `<script src>` em ordem. Se criar um arquivo novo, **acrescente a
tag em `web/index.html`** — é fácil esquecer e o sintoma é `App.metodo is not a
function`.

## Rodar e testar

```bash
cd api && npm install     # uma vez
cd .. && node servidor-local.js
```

`http://localhost:5173/login`. Sem `tenantId`/`clientId` no `config.js`, tudo roda
em **modo demonstração**: banco em arquivo (`.dados/`), identidade declarada, nada
toca o SharePoint. O servidor escuta só em `127.0.0.1` justamente por isso.

Dentro da ferramenta, o selo do topo abre o **Diagnóstico da integração**, que
roda as chamadas reais e diz o que falta configurar.

Para apagar tudo e recomeçar: `rm -rf .dados`.

## Ao mexer no código

- Comentários e mensagens de tela **em português**, explicando *por que*, não *o quê*.
- Depois de editar, confira a sintaxe: `for f in web/js/*.js web/dados/*.js; do node --check $f; done`.
- **Rode a bateria antes de commitar** — são quatro arquivos, sem framework e sem rede:

  ```bash
  node testes/interpretador-de-nomes.js   # 28 nomes REAIS da biblioteca
  node testes/montagem-da-ficha.js        # ficha, linha do tempo, leitura do Cartão CNPJ
  node testes/seguranca-da-api.js         # 36 regressões da auditoria de 08/09/2026
  node testes/estresse.js                 # 20 mil nomes hostis, 400 escritas simultâneas
  ```

  `seguranca-da-api.js` não é teoria: cada linha dele corresponde a uma porta que
  estava aberta e foi fechada. Se um daqueles testes voltar a passar do jeito
  errado, a porta reabriu.
- Mudou tela? Teste no navegador antes de dizer que está pronto.
- Não introduza dependência nova sem necessidade real; o que precisa vir de fora
  é vendorizado em `web/vendor/`.
- Performance nunca passa por cima de segurança: nada de cache em `config.js`,
  em `index.html` ou em `/api/*`; nenhuma checagem de permissão é lembrada entre
  requisições; a auditoria continua sendo esperada (`await`) em toda escrita. O que
  pode ser rápido é o que não decide acesso — estáticos em cache, leituras em
  paralelo, leitura pontual no Cosmos quando a partição é conhecida.
- `config.js` **não** guarda segredo: `tenantId` e `clientId` são públicos numa
  página estática. Segredo de verdade vai nas configurações do Static Web App.

## Estado atual

Funciona de verdade: login Entra, lista de clientes vinda das pastas do
SharePoint, criação da pasta do cliente, gravação dos documentos anexados, busca
de CEP, OCR da CNH no navegador, persistência no banco, trilha de auditoria,
importação da base inicial e **o Painel de Clientes montado a partir do acervo
real** (Administração › Acervo do SharePoint).

Também reais, quando conectada: baixar documento, abrir a pasta societária,
link de compartilhamento criado pelo próprio SharePoint (com validade e escopo),
releitura do Cartão CNPJ/QSA pela ficha do cliente. Em demonstração, cada um
desses botões DIZ que é demonstração — nunca finge que fez.

Ainda simulado: geração do `.docx` do contrato; JUCEMAT/REDESIM e RFB
(acompanhamento manual, por decisão de segurança); réplica do SharePoint (escrita,
desligada — ver `api/src/rotas/replica.js`). **Não existe mais "leitura
automática" com valor inventado**: a etapa 4 do wizard mostrava nome e CNPJ de
exemplo como se tivessem sido extraídos do anexo — saiu, e não volta.

Pendências abertas e ordem sugerida ficam no projeto do Claude, em
`claude/pendencias-a-avaliar.md`. A mais próxima é a **A2**: subir o anexo para o
SharePoint no momento em que ele é anexado, e não só no envio do processo.
