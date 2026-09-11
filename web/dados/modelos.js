/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */

let TEMPLATES = [
  {id:"t1", nome:"Contrato Social Padrão — LTDA", tipo:"abertura", arquivo:"contrato_social_ltda.docx", data:"07/09/2026",
    origem:"Mesma estrutura das alterações reais consolidadas lidas no acervo, ajustada para constituição (sem NIRE, sem rerratificação, com capital subscrito e integralizado no ato)",
    placeholders:["razao_social","nome_fantasia","qualificacao_socios","endereco_sede","objeto_social","lista_cnaes","data_inicio_atividades","capital_social","quantidade_quotas","valor_quota","quadro_quotas","administradores","forma_assinatura","enquadramento","comarca_foro","cidade_uf","data_deliberacao","assinaturas"],
    texto:`{{razao_social}}

CONTRATO SOCIAL DE SOCIEDADE EMPRESÁRIA LIMITADA

Pelo presente instrumento particular e na melhor forma de direito, as partes a seguir nominadas:

{{qualificacao_socios}}

resolvem, de comum acordo, constituir uma sociedade empresária limitada, nos termos dos artigos 1.052 e seguintes da Lei nº 10.406/2002 (Código Civil), regendo-se pelas cláusulas e condições a seguir:

DO NOME EMPRESARIAL (art. 997, II, do CC)
CLÁUSULA 1ª — A sociedade adotará o seguinte nome empresarial: {{razao_social}}, e nome fantasia {{nome_fantasia}}, regendo-se pelas disposições da Lei nº 10.406/2002, em especial pelo Capítulo IV do Subtítulo II do Livro II "Do Direito de Empresa" e, em suas omissões, pela Lei nº 6.404/1976 e alterações posteriores.

DA SEDE (art. 997, II, do CC)
CLÁUSULA 2ª — A sociedade terá sede e domicílio em {{endereco_sede}}, podendo abrir filiais, escritórios, representações ou sucursais em qualquer parte do território nacional, mediante alteração contratual.

DO OBJETO SOCIAL (art. 997, II, do CC)
CLÁUSULA 3ª — A sociedade tem por objeto social: {{objeto_social}}.

CODIFICAÇÃO DAS ATIVIDADES ECONÔMICAS:
{{lista_cnaes}}

Parágrafo único — As atividades exercidas por cada estabelecimento, matriz ou filial, poderão corresponder a apenas parte do objeto social acima, observada a legislação específica aplicável quando houver regulação setorial.

DO INÍCIO DAS ATIVIDADES E DO PRAZO (art. 53, III, "f", do Decreto nº 1.800/1996)
CLÁUSULA 4ª — A sociedade iniciará suas atividades em {{data_inicio_atividades}} e seu prazo de duração é indeterminado.

DO CAPITAL SOCIAL (arts. 997, III e IV, 1.052 e 1.055 do CC)
CLÁUSULA 5ª — O capital social é de {{capital_social}}, dividido em {{quantidade_quotas}} quotas no valor nominal de {{valor_quota}} cada uma, totalmente subscritas e integralizadas neste ato, em moeda corrente do País, assim distribuídas entre os sócios:

{{quadro_quotas}}

Parágrafo único — A responsabilidade de cada sócio é restrita ao valor de suas quotas, respondendo todos solidariamente pela integralização do capital social, nos termos do art. 1.052 do Código Civil.

DA ADMINISTRAÇÃO (arts. 997, VI; 1.013; 1.015; 1.061 e 1.064 do CC)
CLÁUSULA 6ª — A administração da sociedade será exercida por {{administradores}}, que agirão sempre de modo a objetivar o maior incremento dos negócios sociais, praticando os atos necessários ao funcionamento regular da sociedade e assinando pela empresa {{forma_assinatura}} na parte fiscal, comercial, bancária, contratos e documentos de qualquer natureza, vedado o uso da denominação social em negócios estranhos aos fins sociais, tais como fianças, avais, endossos ou abonos, em favor próprio, dos sócios ou de terceiros, bem como onerar ou alienar bens imóveis da sociedade sem autorização dos demais sócios.

Parágrafo primeiro — O administrador representa a sociedade perante instituições financeiras, podendo efetuar cadastros, assinar e retirar documentos, solicitar créditos e praticar as demais transações bancárias necessárias.

Parágrafo segundo — Como exceção ao caput, a representação da sociedade deverá ocorrer obrigatoriamente de forma conjunta para os atos que importarem em: a) tomar crédito mediante empréstimos, mútuos ou financiamentos, bem como qualquer ato que implique endividamento; b) alienar e/ou gravar de ônus bens imóveis da sociedade e os direitos a eles relativos; c) prestar garantias, fiança, aval, abono ou endosso.

Parágrafo terceiro — Fica facultado a cada administrador nomear procurador(es), devendo o instrumento de procuração especificar os atos a serem praticados e o prazo de vigência, não superior a 12 (doze) meses, excetuadas as procurações "ad judicia".

Parágrafo quarto — Os administradores, na forma do § 1º do artigo 1.011 do Código Civil, declaram sob as penas da lei que não estão impedidos por lei especial, nem condenados ou sob efeito de condenação a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, o sistema financeiro nacional, as normas de defesa da concorrência, as relações de consumo, a fé pública ou a propriedade.

Parágrafo quinto — É expressamente vedado a todo e qualquer sócio ou administrador utilizar a sociedade para promoção pessoal ou qualquer fim que reverta em proveito próprio.

DO PRÓ-LABORE
CLÁUSULA 7ª — Os sócios poderão, de comum acordo, fixar retirada mensal a título de pró-labore, observadas as condições financeiras da empresa e as disposições regulamentares.

DAS DEMONSTRAÇÕES CONTÁBEIS
CLÁUSULA 8ª — O exercício social encerra-se em 31 de dezembro de cada ano, ocasião em que os administradores prestarão contas justificadas de sua administração, procedendo à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico. A sociedade poderá levantar balanços intermediários para apuração e distribuição antecipada de lucros, na forma do art. 1.007 do Código Civil.

DA DISSOLUÇÃO, LIQUIDAÇÃO E HAVERES
CLÁUSULA 9ª — O falecimento, retirada, interdição ou incapacidade de sócio não dissolverá a sociedade. Os herdeiros ou sucessores somente ingressarão no quadro societário mediante deliberação da maioria dos sócios remanescentes. Não havendo ingresso, os haveres serão apurados com base em balanço especialmente levantado na data da resolução da sociedade em relação ao sócio.

DO DIREITO DE PREFERÊNCIA
CLÁUSULA 10ª — Em caso de retirada, exclusão ou cessão de quotas, os sócios remanescentes terão direito de preferência para adquiri-las, em igualdade de condições com terceiros, nos termos do art. 1.057 do Código Civil. O sócio alienante deverá comunicar a sociedade e os demais sócios com antecedência mínima de 60 (sessenta) dias.

DAS DELIBERAÇÕES SOCIAIS
CLÁUSULA 11ª — As deliberações sociais, inclusive a dissolução, a liquidação e a transformação do tipo societário, serão tomadas em conformidade com o Código Civil, correspondendo cada quota a um voto.

DO DESIMPEDIMENTO E DO ENQUADRAMENTO
CLÁUSULA 12ª — Os sócios declaram, sob as penas da lei, que não estão impedidos de exercer atividade empresarial, por lei especial, em virtude de condenação criminal ou por se encontrarem sob os efeitos dela. Declaram, ainda, que a sociedade se enquadra na condição de {{enquadramento}}, nos termos da legislação aplicável.

DOS CASOS OMISSOS
CLÁUSULA 13ª — Os casos omissos neste instrumento serão regulados pela legislação aplicável, em especial pelo Código Civil (Lei nº 10.406/2002) e, supletivamente, pela Lei das Sociedades Anônimas.

DO FORO
CLÁUSULA 14ª — Fica eleito o foro da comarca de {{comarca_foro}} para dirimir as questões oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento.

{{cidade_uf}}, {{data_deliberacao}}.

{{assinaturas}}`},
  {id:"t2", nome:"Termo de Alteração Contratual", tipo:"alteracao", arquivo:"termo_alteracao.docx", data:"02/07/2026",
    placeholders:["razao_social","alt_tipo","data_deliberacao","socios_afetados"],
    texto:`TERMO DE ALTERAÇÃO CONTRATUAL

A sociedade {{razao_social}} altera seu contrato social conforme deliberação de {{data_deliberacao}}, referente a: {{alt_tipo}}.

Sócios afetados: {{socios_afetados}}.`},
  {id:"t3", nome:"Distrato Social", tipo:"baixa", arquivo:"distrato_social.docx", data:"28/06/2026",
    placeholders:["razao_social","data_encerramento","motivo"],
    texto:`DISTRATO SOCIAL

Os sócios da sociedade {{razao_social}} resolvem, de comum acordo, encerrar suas atividades a partir de {{data_encerramento}}, pelo motivo: {{motivo}}.`},

/* ---------- Modelos construídos a partir de alterações reais já registradas ----------
   Levantados em 07/09/2026 lendo processos arquivados no SharePoint da GS2 (pastas
   "PROCESSOS DE ALTERAÇÃO"). O texto foi ANONIMIZADO: nenhum nome de empresa, sócio,
   administrador, CNPJ, CPF, RG, endereço, valor ou data de cliente permanece — tudo
   virou {{placeholder}}. O que se aproveitou foi a ESTRUTURA jurídica: a ordem das
   cláusulas, a redação padrão que a Junta aceita e o encadeamento "deliberação +
   rerratificação + consolidação", que é como o escritório já trabalha.
   Cada modelo = preâmbulo + cláusula do ato + consolidação completa. */
  {id:"ta1", nome:"Alteração de Nome Empresarial + Consolidação", tipo:"alteracao", arquivo:"alteracao_nome_empresarial.docx", data:"07/09/2026",
    origem:"Derivado de 1 alteração real de nome empresarial registrada na JUCEMAT (2026)",
    placeholders:["razao_social","nome_fantasia","cnpj","nire","uf_junta","numero_alteracao","qualificacao_socios","endereco_sede","objeto_social","lista_cnaes","lista_filiais","data_inicio_atividades","capital_social","quantidade_quotas","valor_quota","quadro_quotas","administradores","forma_assinatura","comarca_foro","cidade_uf","data_deliberacao","assinaturas","nova_razao_social"],
    texto:`{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

{{numero_alteracao}}ª ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL

Pelo presente instrumento particular e na melhor forma de direito, as partes a seguir nominadas:

{{qualificacao_socios}}

Únicos sócios componentes da sociedade empresária limitada que gira nesta praça sob a denominação social de {{razao_social}}, com sede em {{endereco_sede}}, registrada na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, resolvem, de comum acordo, promover a presente {{numero_alteracao}}ª ALTERAÇÃO DO CONTRATO SOCIAL, nos termos dos artigos 997 e seguintes do Código Civil, mediante as cláusulas e condições a seguir:

CLÁUSULA 1ª — DA ALTERAÇÃO DO NOME EMPRESARIAL
Os sócios deliberam alterar o nome empresarial da sociedade, que passa a ser {{nova_razao_social}}.
Em razão dessa deliberação, a Cláusula 1ª do Contrato Social passa a vigorar com a seguinte redação:
"CLÁUSULA 1ª — A sociedade adotará o seguinte nome empresarial: {{nova_razao_social}}."

CLÁUSULA FINAL — Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do contrato social primitivo e posteriores alterações que não colidirem com os dispositivos do presente instrumento.

Para fins de melhor entendimento jurídico, deliberam os sócios, à unanimidade, rerratificar "in totum" o contrato social primitivo e posteriores alterações, consolidando-o num só instrumento contratual, que passará a viger com a seguinte redação:

{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

CONTRATO SOCIAL CONSOLIDADO

{{qualificacao_socios}}

Sócios representando a totalidade do capital social de {{razao_social}}, sociedade empresária limitada, com atos constitutivos registrados na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, deliberam consolidar o contrato social primitivo e posteriores alterações, passando o mesmo a reger-se pelas seguintes cláusulas e condições:

DO NOME EMPRESARIAL (art. 997, II, do CC)
CLÁUSULA 1ª — A sociedade adotará o seguinte nome empresarial: {{razao_social}}, e nome fantasia {{nome_fantasia}}.

DA SEDE (art. 997, II, do CC)
CLÁUSULA 2ª — A sociedade terá sede e domicílio em {{endereco_sede}}, podendo manter filiais, escritórios e representações em qualquer localidade do país.
{{lista_filiais}}

DO OBJETO SOCIAL (art. 997, II, do CC)
CLÁUSULA 3ª — A sociedade tem por objeto social: {{objeto_social}}.

CODIFICAÇÃO DAS ATIVIDADES ECONÔMICAS:
{{lista_cnaes}}

Parágrafo único — As atividades exercidas por cada estabelecimento, matriz ou filial, poderão corresponder a apenas parte do objeto social acima, observada a legislação específica aplicável quando houver regulação setorial.

DO PRAZO (art. 53, III, "f", do Decreto nº 1.800/1996)
CLÁUSULA 4ª — A sociedade iniciou suas atividades em {{data_inicio_atividades}} e seu prazo de duração é indeterminado.

DO CAPITAL SOCIAL (arts. 997, III e IV, 1.052 e 1.055 do CC)
CLÁUSULA 5ª — O capital social é de {{capital_social}}, dividido em {{quantidade_quotas}} quotas no valor nominal de {{valor_quota}} cada uma, totalmente subscritas e integralizadas em moeda corrente do País, assim distribuídas:

{{quadro_quotas}}

Parágrafo único — A responsabilidade de cada sócio é restrita ao valor de suas quotas, respondendo todos solidariamente pela integralização do capital social.

DA ADMINISTRAÇÃO (arts. 997, VI; 1.013; 1.015; 1.061 e 1.064 do CC)
CLÁUSULA 6ª — A administração da sociedade será exercida por {{administradores}}, que agirão sempre de modo a objetivar o maior incremento dos negócios sociais, praticando os atos necessários ao funcionamento regular da sociedade e assinando pela empresa {{forma_assinatura}} na parte fiscal, comercial, bancária, contratos e documentos de qualquer natureza, vedado o uso da denominação social em negócios estranhos aos fins sociais, tais como fianças, avais, endossos ou abonos, em favor próprio, dos sócios ou de terceiros, bem como onerar ou alienar bens imóveis da sociedade sem autorização dos demais sócios.

Parágrafo primeiro — Fica facultado a cada administrador nomear procurador(es), devendo o instrumento de procuração especificar os atos a serem praticados e o prazo de vigência, excetuadas as procurações "ad judicia".

Parágrafo segundo — Como exceção ao caput, a representação da sociedade deverá ocorrer obrigatoriamente de forma conjunta para os atos que importarem em: a) tomar crédito mediante empréstimos, mútuos ou financiamentos, bem como qualquer ato que implique endividamento; b) alienar e/ou gravar de ônus bens imóveis da sociedade e os direitos a eles relativos; c) prestar garantias, fiança, aval, abono ou endosso, autorizadas exclusivamente em favor de sociedades cujo quadro societário coincida com o desta sociedade.

Parágrafo terceiro — Os administradores, na forma do § 1º do artigo 1.011 do Código Civil, declaram sob as penas da lei que não estão impedidos por lei especial, nem condenados ou sob efeito de condenação a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, o sistema financeiro nacional, as normas de defesa da concorrência, as relações de consumo, a fé pública ou a propriedade.

Parágrafo quarto — É expressamente vedado a todo e qualquer sócio ou administrador utilizar a sociedade para promoção pessoal ou qualquer fim que reverta em proveito próprio.

DO PRÓ-LABORE
CLÁUSULA 7ª — Os sócios poderão, de comum acordo, fixar retirada mensal a título de pró-labore, observadas as condições financeiras da empresa e as disposições regulamentares.

DAS DEMONSTRAÇÕES CONTÁBEIS
CLÁUSULA 8ª — O exercício social encerra-se em 31 de dezembro de cada ano, ocasião em que os administradores prestarão contas justificadas de sua administração, procedendo à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico. A sociedade poderá levantar balanços intermediários para distribuição antecipada de lucros.

DA DISSOLUÇÃO, LIQUIDAÇÃO E HAVERES
CLÁUSULA 9ª — O falecimento, retirada, interdição ou incapacidade de sócio não dissolverá a sociedade. Os herdeiros ou sucessores somente ingressarão no quadro societário mediante deliberação da maioria dos sócios remanescentes. Não havendo ingresso, os haveres serão apurados em balanço especialmente levantado na data da resolução da sociedade em relação ao sócio.

DO DIREITO DE PREFERÊNCIA
CLÁUSULA 10ª — Em caso de retirada, exclusão ou cessão de quotas, os sócios remanescentes terão direito de preferência para adquiri-las, nas mesmas condições oferecidas a terceiros, nos termos do art. 1.057 do Código Civil. A alienação a terceiros somente será admitida com autorização da maioria dos sócios e renúncia expressa ao direito de preferência.

DAS DELIBERAÇÕES E DO DESIMPEDIMENTO
CLÁUSULA 11ª — As deliberações sociais serão tomadas na forma do Código Civil. Os sócios e administradores declaram, sob as penas da lei, não estarem impedidos de exercer a administração da sociedade.

DO FORO
CLÁUSULA 12ª — Fica eleito o foro da comarca de {{comarca_foro}} para dirimir as questões oriundas do presente instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento.

{{cidade_uf}}, {{data_deliberacao}}.

{{assinaturas}}`},
  {id:"ta2", nome:"Alteração de Administração + Consolidação", tipo:"alteracao", arquivo:"alteracao_administracao.docx", data:"07/09/2026",
    origem:"Derivado de 2 alterações reais de administração registradas na JUCEMAT (2026)",
    placeholders:["razao_social","nome_fantasia","cnpj","nire","uf_junta","numero_alteracao","qualificacao_socios","endereco_sede","objeto_social","lista_cnaes","lista_filiais","data_inicio_atividades","capital_social","quantidade_quotas","valor_quota","quadro_quotas","administradores","forma_assinatura","comarca_foro","cidade_uf","data_deliberacao","assinaturas"],
    texto:`{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

{{numero_alteracao}}ª ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL

Pelo presente instrumento particular e na melhor forma de direito, as partes a seguir nominadas:

{{qualificacao_socios}}

Únicos sócios componentes da sociedade empresária limitada que gira nesta praça sob a denominação social de {{razao_social}}, com sede em {{endereco_sede}}, registrada na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, resolvem, de comum acordo, promover a presente {{numero_alteracao}}ª ALTERAÇÃO DO CONTRATO SOCIAL, nos termos dos artigos 997 e seguintes do Código Civil, mediante as cláusulas e condições a seguir:

CLÁUSULA 1ª — DA ADMINISTRAÇÃO
Os sócios deliberam alterar a forma de exercício da administração da sociedade, que passa a ser exercida {{forma_assinatura}} por cada um dos administradores, inclusive e principalmente no que se refere às operações e representações de natureza bancária, passando a cláusula de administração do Contrato Social Consolidado a vigorar com a nova redação constante da consolidação abaixo.

Ficam nomeados administradores: {{administradores}}.

Os administradores ora nomeados declaram, sob as penas da lei, que não estão impedidos de exercer a administração da sociedade, por lei especial, ou em virtude de condenação criminal, ou por se encontrarem sob os efeitos dela.

CLÁUSULA FINAL — Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do contrato social primitivo e posteriores alterações que não colidirem com os dispositivos do presente instrumento.

Para fins de melhor entendimento jurídico, deliberam os sócios, à unanimidade, rerratificar "in totum" o contrato social primitivo e posteriores alterações, consolidando-o num só instrumento contratual, que passará a viger com a seguinte redação:

{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

CONTRATO SOCIAL CONSOLIDADO

{{qualificacao_socios}}

Sócios representando a totalidade do capital social de {{razao_social}}, sociedade empresária limitada, com atos constitutivos registrados na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, deliberam consolidar o contrato social primitivo e posteriores alterações, passando o mesmo a reger-se pelas seguintes cláusulas e condições:

DO NOME EMPRESARIAL (art. 997, II, do CC)
CLÁUSULA 1ª — A sociedade adotará o seguinte nome empresarial: {{razao_social}}, e nome fantasia {{nome_fantasia}}.

DA SEDE (art. 997, II, do CC)
CLÁUSULA 2ª — A sociedade terá sede e domicílio em {{endereco_sede}}, podendo manter filiais, escritórios e representações em qualquer localidade do país.
{{lista_filiais}}

DO OBJETO SOCIAL (art. 997, II, do CC)
CLÁUSULA 3ª — A sociedade tem por objeto social: {{objeto_social}}.

CODIFICAÇÃO DAS ATIVIDADES ECONÔMICAS:
{{lista_cnaes}}

Parágrafo único — As atividades exercidas por cada estabelecimento, matriz ou filial, poderão corresponder a apenas parte do objeto social acima, observada a legislação específica aplicável quando houver regulação setorial.

DO PRAZO (art. 53, III, "f", do Decreto nº 1.800/1996)
CLÁUSULA 4ª — A sociedade iniciou suas atividades em {{data_inicio_atividades}} e seu prazo de duração é indeterminado.

DO CAPITAL SOCIAL (arts. 997, III e IV, 1.052 e 1.055 do CC)
CLÁUSULA 5ª — O capital social é de {{capital_social}}, dividido em {{quantidade_quotas}} quotas no valor nominal de {{valor_quota}} cada uma, totalmente subscritas e integralizadas em moeda corrente do País, assim distribuídas:

{{quadro_quotas}}

Parágrafo único — A responsabilidade de cada sócio é restrita ao valor de suas quotas, respondendo todos solidariamente pela integralização do capital social.

DA ADMINISTRAÇÃO (arts. 997, VI; 1.013; 1.015; 1.061 e 1.064 do CC)
CLÁUSULA 6ª — A administração da sociedade será exercida por {{administradores}}, que agirão sempre de modo a objetivar o maior incremento dos negócios sociais, praticando os atos necessários ao funcionamento regular da sociedade e assinando pela empresa {{forma_assinatura}} na parte fiscal, comercial, bancária, contratos e documentos de qualquer natureza, vedado o uso da denominação social em negócios estranhos aos fins sociais, tais como fianças, avais, endossos ou abonos, em favor próprio, dos sócios ou de terceiros, bem como onerar ou alienar bens imóveis da sociedade sem autorização dos demais sócios.

Parágrafo primeiro — Fica facultado a cada administrador nomear procurador(es), devendo o instrumento de procuração especificar os atos a serem praticados e o prazo de vigência, excetuadas as procurações "ad judicia".

Parágrafo segundo — Como exceção ao caput, a representação da sociedade deverá ocorrer obrigatoriamente de forma conjunta para os atos que importarem em: a) tomar crédito mediante empréstimos, mútuos ou financiamentos, bem como qualquer ato que implique endividamento; b) alienar e/ou gravar de ônus bens imóveis da sociedade e os direitos a eles relativos; c) prestar garantias, fiança, aval, abono ou endosso, autorizadas exclusivamente em favor de sociedades cujo quadro societário coincida com o desta sociedade.

Parágrafo terceiro — Os administradores, na forma do § 1º do artigo 1.011 do Código Civil, declaram sob as penas da lei que não estão impedidos por lei especial, nem condenados ou sob efeito de condenação a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, o sistema financeiro nacional, as normas de defesa da concorrência, as relações de consumo, a fé pública ou a propriedade.

Parágrafo quarto — É expressamente vedado a todo e qualquer sócio ou administrador utilizar a sociedade para promoção pessoal ou qualquer fim que reverta em proveito próprio.

DO PRÓ-LABORE
CLÁUSULA 7ª — Os sócios poderão, de comum acordo, fixar retirada mensal a título de pró-labore, observadas as condições financeiras da empresa e as disposições regulamentares.

DAS DEMONSTRAÇÕES CONTÁBEIS
CLÁUSULA 8ª — O exercício social encerra-se em 31 de dezembro de cada ano, ocasião em que os administradores prestarão contas justificadas de sua administração, procedendo à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico. A sociedade poderá levantar balanços intermediários para distribuição antecipada de lucros.

DA DISSOLUÇÃO, LIQUIDAÇÃO E HAVERES
CLÁUSULA 9ª — O falecimento, retirada, interdição ou incapacidade de sócio não dissolverá a sociedade. Os herdeiros ou sucessores somente ingressarão no quadro societário mediante deliberação da maioria dos sócios remanescentes. Não havendo ingresso, os haveres serão apurados em balanço especialmente levantado na data da resolução da sociedade em relação ao sócio.

DO DIREITO DE PREFERÊNCIA
CLÁUSULA 10ª — Em caso de retirada, exclusão ou cessão de quotas, os sócios remanescentes terão direito de preferência para adquiri-las, nas mesmas condições oferecidas a terceiros, nos termos do art. 1.057 do Código Civil. A alienação a terceiros somente será admitida com autorização da maioria dos sócios e renúncia expressa ao direito de preferência.

DAS DELIBERAÇÕES E DO DESIMPEDIMENTO
CLÁUSULA 11ª — As deliberações sociais serão tomadas na forma do Código Civil. Os sócios e administradores declaram, sob as penas da lei, não estarem impedidos de exercer a administração da sociedade.

DO FORO
CLÁUSULA 12ª — Fica eleito o foro da comarca de {{comarca_foro}} para dirimir as questões oriundas do presente instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento.

{{cidade_uf}}, {{data_deliberacao}}.

{{assinaturas}}`},
  {id:"ta3", nome:"Cessão de Quotas — entrada e saída de sócio + Consolidação", tipo:"alteracao", arquivo:"alteracao_cessao_quotas.docx", data:"07/09/2026",
    origem:"Derivado de 1 alteração real com cessão de quotas e administrador não sócio (JUCESP, 2026)",
    placeholders:["razao_social","nome_fantasia","cnpj","nire","uf_junta","numero_alteracao","qualificacao_socios","endereco_sede","objeto_social","lista_cnaes","lista_filiais","data_inicio_atividades","capital_social","quantidade_quotas","valor_quota","quadro_quotas","administradores","forma_assinatura","comarca_foro","cidade_uf","data_deliberacao","assinaturas","socio_retirante","socio_ingressante","quotas_cedidas","valor_cessao"],
    texto:`{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

{{numero_alteracao}}ª ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL

Pelo presente instrumento particular e na melhor forma de direito, as partes a seguir nominadas:

{{qualificacao_socios}}

Únicos sócios componentes da sociedade empresária limitada que gira nesta praça sob a denominação social de {{razao_social}}, com sede em {{endereco_sede}}, registrada na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, resolvem, de comum acordo, promover a presente {{numero_alteracao}}ª ALTERAÇÃO DO CONTRATO SOCIAL, nos termos dos artigos 997 e seguintes do Código Civil, mediante as cláusulas e condições a seguir:

CLÁUSULA 1ª — DA CESSÃO E TRANSFERÊNCIA DE QUOTAS
1.1. O sócio retirante {{socio_retirante}}, titular de {{quotas_cedidas}} quotas do capital social, no valor nominal de {{valor_quota}} cada uma, todas totalmente integralizadas, cede e transfere neste ato, em caráter irrevogável e irretratável, a totalidade de suas quotas a {{socio_ingressante}}, pelo preço certo e ajustado de {{valor_cessao}}, dando à parte cessionária plena, geral e rasa quitação.

1.2. Os demais sócios declaram, de forma expressa e irrevogável, sua renúncia ao direito de preferência assegurado no contrato social, consentindo com a cessão ora praticada e aprovando o ingresso de {{socio_ingressante}} no quadro societário.

1.3. A parte cessionária declara conhecer o contrato social, ao qual adere integralmente nesta data, sub-rogando-se em todos os direitos, prerrogativas, deveres e obrigações antes titularizados pelo sócio cedente.

1.4. O sócio retirante declara e garante que as quotas ora cedidas encontram-se livres e desembaraçadas de quaisquer ônus, gravames, penhoras, usufrutos ou constrições judiciais, respondendo pela evicção de direito.

1.5. Em consequência da cessão, o sócio retirante retira-se do quadro societário, dando e recebendo plena e geral quitação quanto a haveres, lucros, dividendos, pró-labore e quaisquer outros valores relativos à sua participação, observado o disposto no parágrafo único do art. 1.003 do Código Civil quanto à responsabilidade solidária pelo prazo de 2 (dois) anos contados do arquivamento deste instrumento.

CLÁUSULA FINAL — Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do contrato social primitivo e posteriores alterações que não colidirem com os dispositivos do presente instrumento.

Para fins de melhor entendimento jurídico, deliberam os sócios, à unanimidade, rerratificar "in totum" o contrato social primitivo e posteriores alterações, consolidando-o num só instrumento contratual, que passará a viger com a seguinte redação:

{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

CONTRATO SOCIAL CONSOLIDADO

{{qualificacao_socios}}

Sócios representando a totalidade do capital social de {{razao_social}}, sociedade empresária limitada, com atos constitutivos registrados na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, deliberam consolidar o contrato social primitivo e posteriores alterações, passando o mesmo a reger-se pelas seguintes cláusulas e condições:

DO NOME EMPRESARIAL (art. 997, II, do CC)
CLÁUSULA 1ª — A sociedade adotará o seguinte nome empresarial: {{razao_social}}, e nome fantasia {{nome_fantasia}}.

DA SEDE (art. 997, II, do CC)
CLÁUSULA 2ª — A sociedade terá sede e domicílio em {{endereco_sede}}, podendo manter filiais, escritórios e representações em qualquer localidade do país.
{{lista_filiais}}

DO OBJETO SOCIAL (art. 997, II, do CC)
CLÁUSULA 3ª — A sociedade tem por objeto social: {{objeto_social}}.

CODIFICAÇÃO DAS ATIVIDADES ECONÔMICAS:
{{lista_cnaes}}

Parágrafo único — As atividades exercidas por cada estabelecimento, matriz ou filial, poderão corresponder a apenas parte do objeto social acima, observada a legislação específica aplicável quando houver regulação setorial.

DO PRAZO (art. 53, III, "f", do Decreto nº 1.800/1996)
CLÁUSULA 4ª — A sociedade iniciou suas atividades em {{data_inicio_atividades}} e seu prazo de duração é indeterminado.

DO CAPITAL SOCIAL (arts. 997, III e IV, 1.052 e 1.055 do CC)
CLÁUSULA 5ª — O capital social é de {{capital_social}}, dividido em {{quantidade_quotas}} quotas no valor nominal de {{valor_quota}} cada uma, totalmente subscritas e integralizadas em moeda corrente do País, assim distribuídas:

{{quadro_quotas}}

Parágrafo único — A responsabilidade de cada sócio é restrita ao valor de suas quotas, respondendo todos solidariamente pela integralização do capital social.

DA ADMINISTRAÇÃO (arts. 997, VI; 1.013; 1.015; 1.061 e 1.064 do CC)
CLÁUSULA 6ª — A administração da sociedade será exercida por {{administradores}}, que agirão sempre de modo a objetivar o maior incremento dos negócios sociais, praticando os atos necessários ao funcionamento regular da sociedade e assinando pela empresa {{forma_assinatura}} na parte fiscal, comercial, bancária, contratos e documentos de qualquer natureza, vedado o uso da denominação social em negócios estranhos aos fins sociais, tais como fianças, avais, endossos ou abonos, em favor próprio, dos sócios ou de terceiros, bem como onerar ou alienar bens imóveis da sociedade sem autorização dos demais sócios.

Parágrafo primeiro — Fica facultado a cada administrador nomear procurador(es), devendo o instrumento de procuração especificar os atos a serem praticados e o prazo de vigência, excetuadas as procurações "ad judicia".

Parágrafo segundo — Como exceção ao caput, a representação da sociedade deverá ocorrer obrigatoriamente de forma conjunta para os atos que importarem em: a) tomar crédito mediante empréstimos, mútuos ou financiamentos, bem como qualquer ato que implique endividamento; b) alienar e/ou gravar de ônus bens imóveis da sociedade e os direitos a eles relativos; c) prestar garantias, fiança, aval, abono ou endosso, autorizadas exclusivamente em favor de sociedades cujo quadro societário coincida com o desta sociedade.

Parágrafo terceiro — Os administradores, na forma do § 1º do artigo 1.011 do Código Civil, declaram sob as penas da lei que não estão impedidos por lei especial, nem condenados ou sob efeito de condenação a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, o sistema financeiro nacional, as normas de defesa da concorrência, as relações de consumo, a fé pública ou a propriedade.

Parágrafo quarto — É expressamente vedado a todo e qualquer sócio ou administrador utilizar a sociedade para promoção pessoal ou qualquer fim que reverta em proveito próprio.

DO PRÓ-LABORE
CLÁUSULA 7ª — Os sócios poderão, de comum acordo, fixar retirada mensal a título de pró-labore, observadas as condições financeiras da empresa e as disposições regulamentares.

DAS DEMONSTRAÇÕES CONTÁBEIS
CLÁUSULA 8ª — O exercício social encerra-se em 31 de dezembro de cada ano, ocasião em que os administradores prestarão contas justificadas de sua administração, procedendo à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico. A sociedade poderá levantar balanços intermediários para distribuição antecipada de lucros.

DA DISSOLUÇÃO, LIQUIDAÇÃO E HAVERES
CLÁUSULA 9ª — O falecimento, retirada, interdição ou incapacidade de sócio não dissolverá a sociedade. Os herdeiros ou sucessores somente ingressarão no quadro societário mediante deliberação da maioria dos sócios remanescentes. Não havendo ingresso, os haveres serão apurados em balanço especialmente levantado na data da resolução da sociedade em relação ao sócio.

DO DIREITO DE PREFERÊNCIA
CLÁUSULA 10ª — Em caso de retirada, exclusão ou cessão de quotas, os sócios remanescentes terão direito de preferência para adquiri-las, nas mesmas condições oferecidas a terceiros, nos termos do art. 1.057 do Código Civil. A alienação a terceiros somente será admitida com autorização da maioria dos sócios e renúncia expressa ao direito de preferência.

DAS DELIBERAÇÕES E DO DESIMPEDIMENTO
CLÁUSULA 11ª — As deliberações sociais serão tomadas na forma do Código Civil. Os sócios e administradores declaram, sob as penas da lei, não estarem impedidos de exercer a administração da sociedade.

DO FORO
CLÁUSULA 12ª — Fica eleito o foro da comarca de {{comarca_foro}} para dirimir as questões oriundas do presente instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento.

{{cidade_uf}}, {{data_deliberacao}}.

{{assinaturas}}`},
  {id:"ta4", nome:"Alteração de Capital Social + Consolidação", tipo:"alteracao", arquivo:"alteracao_capital_social.docx", data:"07/09/2026",
    origem:"Cláusula de capital extraída do esqueleto comum das alterações consolidadas lidas",
    placeholders:["razao_social","nome_fantasia","cnpj","nire","uf_junta","numero_alteracao","qualificacao_socios","endereco_sede","objeto_social","lista_cnaes","lista_filiais","data_inicio_atividades","capital_social","quantidade_quotas","valor_quota","quadro_quotas","administradores","forma_assinatura","comarca_foro","cidade_uf","data_deliberacao","assinaturas","capital_atual"],
    texto:`{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

{{numero_alteracao}}ª ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL

Pelo presente instrumento particular e na melhor forma de direito, as partes a seguir nominadas:

{{qualificacao_socios}}

Únicos sócios componentes da sociedade empresária limitada que gira nesta praça sob a denominação social de {{razao_social}}, com sede em {{endereco_sede}}, registrada na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, resolvem, de comum acordo, promover a presente {{numero_alteracao}}ª ALTERAÇÃO DO CONTRATO SOCIAL, nos termos dos artigos 997 e seguintes do Código Civil, mediante as cláusulas e condições a seguir:

CLÁUSULA 1ª — DA ALTERAÇÃO DO CAPITAL SOCIAL
O capital social, atualmente de {{capital_atual}}, passa a ser de {{capital_social}}, dividido em {{quantidade_quotas}} quotas no valor nominal de {{valor_quota}} cada uma, totalmente subscritas e integralizadas em moeda corrente do País, assim distribuídas entre os sócios:

{{quadro_quotas}}

Em razão dessa deliberação, a cláusula do capital social passa a vigorar com a redação constante da consolidação abaixo.

CLÁUSULA FINAL — Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do contrato social primitivo e posteriores alterações que não colidirem com os dispositivos do presente instrumento.

Para fins de melhor entendimento jurídico, deliberam os sócios, à unanimidade, rerratificar "in totum" o contrato social primitivo e posteriores alterações, consolidando-o num só instrumento contratual, que passará a viger com a seguinte redação:

{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

CONTRATO SOCIAL CONSOLIDADO

{{qualificacao_socios}}

Sócios representando a totalidade do capital social de {{razao_social}}, sociedade empresária limitada, com atos constitutivos registrados na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, deliberam consolidar o contrato social primitivo e posteriores alterações, passando o mesmo a reger-se pelas seguintes cláusulas e condições:

DO NOME EMPRESARIAL (art. 997, II, do CC)
CLÁUSULA 1ª — A sociedade adotará o seguinte nome empresarial: {{razao_social}}, e nome fantasia {{nome_fantasia}}.

DA SEDE (art. 997, II, do CC)
CLÁUSULA 2ª — A sociedade terá sede e domicílio em {{endereco_sede}}, podendo manter filiais, escritórios e representações em qualquer localidade do país.
{{lista_filiais}}

DO OBJETO SOCIAL (art. 997, II, do CC)
CLÁUSULA 3ª — A sociedade tem por objeto social: {{objeto_social}}.

CODIFICAÇÃO DAS ATIVIDADES ECONÔMICAS:
{{lista_cnaes}}

Parágrafo único — As atividades exercidas por cada estabelecimento, matriz ou filial, poderão corresponder a apenas parte do objeto social acima, observada a legislação específica aplicável quando houver regulação setorial.

DO PRAZO (art. 53, III, "f", do Decreto nº 1.800/1996)
CLÁUSULA 4ª — A sociedade iniciou suas atividades em {{data_inicio_atividades}} e seu prazo de duração é indeterminado.

DO CAPITAL SOCIAL (arts. 997, III e IV, 1.052 e 1.055 do CC)
CLÁUSULA 5ª — O capital social é de {{capital_social}}, dividido em {{quantidade_quotas}} quotas no valor nominal de {{valor_quota}} cada uma, totalmente subscritas e integralizadas em moeda corrente do País, assim distribuídas:

{{quadro_quotas}}

Parágrafo único — A responsabilidade de cada sócio é restrita ao valor de suas quotas, respondendo todos solidariamente pela integralização do capital social.

DA ADMINISTRAÇÃO (arts. 997, VI; 1.013; 1.015; 1.061 e 1.064 do CC)
CLÁUSULA 6ª — A administração da sociedade será exercida por {{administradores}}, que agirão sempre de modo a objetivar o maior incremento dos negócios sociais, praticando os atos necessários ao funcionamento regular da sociedade e assinando pela empresa {{forma_assinatura}} na parte fiscal, comercial, bancária, contratos e documentos de qualquer natureza, vedado o uso da denominação social em negócios estranhos aos fins sociais, tais como fianças, avais, endossos ou abonos, em favor próprio, dos sócios ou de terceiros, bem como onerar ou alienar bens imóveis da sociedade sem autorização dos demais sócios.

Parágrafo primeiro — Fica facultado a cada administrador nomear procurador(es), devendo o instrumento de procuração especificar os atos a serem praticados e o prazo de vigência, excetuadas as procurações "ad judicia".

Parágrafo segundo — Como exceção ao caput, a representação da sociedade deverá ocorrer obrigatoriamente de forma conjunta para os atos que importarem em: a) tomar crédito mediante empréstimos, mútuos ou financiamentos, bem como qualquer ato que implique endividamento; b) alienar e/ou gravar de ônus bens imóveis da sociedade e os direitos a eles relativos; c) prestar garantias, fiança, aval, abono ou endosso, autorizadas exclusivamente em favor de sociedades cujo quadro societário coincida com o desta sociedade.

Parágrafo terceiro — Os administradores, na forma do § 1º do artigo 1.011 do Código Civil, declaram sob as penas da lei que não estão impedidos por lei especial, nem condenados ou sob efeito de condenação a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, o sistema financeiro nacional, as normas de defesa da concorrência, as relações de consumo, a fé pública ou a propriedade.

Parágrafo quarto — É expressamente vedado a todo e qualquer sócio ou administrador utilizar a sociedade para promoção pessoal ou qualquer fim que reverta em proveito próprio.

DO PRÓ-LABORE
CLÁUSULA 7ª — Os sócios poderão, de comum acordo, fixar retirada mensal a título de pró-labore, observadas as condições financeiras da empresa e as disposições regulamentares.

DAS DEMONSTRAÇÕES CONTÁBEIS
CLÁUSULA 8ª — O exercício social encerra-se em 31 de dezembro de cada ano, ocasião em que os administradores prestarão contas justificadas de sua administração, procedendo à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico. A sociedade poderá levantar balanços intermediários para distribuição antecipada de lucros.

DA DISSOLUÇÃO, LIQUIDAÇÃO E HAVERES
CLÁUSULA 9ª — O falecimento, retirada, interdição ou incapacidade de sócio não dissolverá a sociedade. Os herdeiros ou sucessores somente ingressarão no quadro societário mediante deliberação da maioria dos sócios remanescentes. Não havendo ingresso, os haveres serão apurados em balanço especialmente levantado na data da resolução da sociedade em relação ao sócio.

DO DIREITO DE PREFERÊNCIA
CLÁUSULA 10ª — Em caso de retirada, exclusão ou cessão de quotas, os sócios remanescentes terão direito de preferência para adquiri-las, nas mesmas condições oferecidas a terceiros, nos termos do art. 1.057 do Código Civil. A alienação a terceiros somente será admitida com autorização da maioria dos sócios e renúncia expressa ao direito de preferência.

DAS DELIBERAÇÕES E DO DESIMPEDIMENTO
CLÁUSULA 11ª — As deliberações sociais serão tomadas na forma do Código Civil. Os sócios e administradores declaram, sob as penas da lei, não estarem impedidos de exercer a administração da sociedade.

DO FORO
CLÁUSULA 12ª — Fica eleito o foro da comarca de {{comarca_foro}} para dirimir as questões oriundas do presente instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento.

{{cidade_uf}}, {{data_deliberacao}}.

{{assinaturas}}`},
  {id:"ta5", nome:"Alteração de Endereço da Sede + Consolidação", tipo:"alteracao", arquivo:"alteracao_endereco.docx", data:"07/09/2026",
    origem:"Cláusula de sede extraída do esqueleto comum das alterações consolidadas lidas",
    placeholders:["razao_social","nome_fantasia","cnpj","nire","uf_junta","numero_alteracao","qualificacao_socios","endereco_sede","objeto_social","lista_cnaes","lista_filiais","data_inicio_atividades","capital_social","quantidade_quotas","valor_quota","quadro_quotas","administradores","forma_assinatura","comarca_foro","cidade_uf","data_deliberacao","assinaturas"],
    texto:`{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

{{numero_alteracao}}ª ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL

Pelo presente instrumento particular e na melhor forma de direito, as partes a seguir nominadas:

{{qualificacao_socios}}

Únicos sócios componentes da sociedade empresária limitada que gira nesta praça sob a denominação social de {{razao_social}}, com sede em {{endereco_sede}}, registrada na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, resolvem, de comum acordo, promover a presente {{numero_alteracao}}ª ALTERAÇÃO DO CONTRATO SOCIAL, nos termos dos artigos 997 e seguintes do Código Civil, mediante as cláusulas e condições a seguir:

CLÁUSULA 1ª — DA ALTERAÇÃO DO ENDEREÇO DA SEDE
Os sócios deliberam transferir a sede social para {{endereco_sede}}, permanecendo inalterados os demais dados cadastrais da sociedade.

Em razão dessa deliberação, a cláusula da sede passa a vigorar com a redação constante da consolidação abaixo.

CLÁUSULA FINAL — Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do contrato social primitivo e posteriores alterações que não colidirem com os dispositivos do presente instrumento.

Para fins de melhor entendimento jurídico, deliberam os sócios, à unanimidade, rerratificar "in totum" o contrato social primitivo e posteriores alterações, consolidando-o num só instrumento contratual, que passará a viger com a seguinte redação:

{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

CONTRATO SOCIAL CONSOLIDADO

{{qualificacao_socios}}

Sócios representando a totalidade do capital social de {{razao_social}}, sociedade empresária limitada, com atos constitutivos registrados na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, deliberam consolidar o contrato social primitivo e posteriores alterações, passando o mesmo a reger-se pelas seguintes cláusulas e condições:

DO NOME EMPRESARIAL (art. 997, II, do CC)
CLÁUSULA 1ª — A sociedade adotará o seguinte nome empresarial: {{razao_social}}, e nome fantasia {{nome_fantasia}}.

DA SEDE (art. 997, II, do CC)
CLÁUSULA 2ª — A sociedade terá sede e domicílio em {{endereco_sede}}, podendo manter filiais, escritórios e representações em qualquer localidade do país.
{{lista_filiais}}

DO OBJETO SOCIAL (art. 997, II, do CC)
CLÁUSULA 3ª — A sociedade tem por objeto social: {{objeto_social}}.

CODIFICAÇÃO DAS ATIVIDADES ECONÔMICAS:
{{lista_cnaes}}

Parágrafo único — As atividades exercidas por cada estabelecimento, matriz ou filial, poderão corresponder a apenas parte do objeto social acima, observada a legislação específica aplicável quando houver regulação setorial.

DO PRAZO (art. 53, III, "f", do Decreto nº 1.800/1996)
CLÁUSULA 4ª — A sociedade iniciou suas atividades em {{data_inicio_atividades}} e seu prazo de duração é indeterminado.

DO CAPITAL SOCIAL (arts. 997, III e IV, 1.052 e 1.055 do CC)
CLÁUSULA 5ª — O capital social é de {{capital_social}}, dividido em {{quantidade_quotas}} quotas no valor nominal de {{valor_quota}} cada uma, totalmente subscritas e integralizadas em moeda corrente do País, assim distribuídas:

{{quadro_quotas}}

Parágrafo único — A responsabilidade de cada sócio é restrita ao valor de suas quotas, respondendo todos solidariamente pela integralização do capital social.

DA ADMINISTRAÇÃO (arts. 997, VI; 1.013; 1.015; 1.061 e 1.064 do CC)
CLÁUSULA 6ª — A administração da sociedade será exercida por {{administradores}}, que agirão sempre de modo a objetivar o maior incremento dos negócios sociais, praticando os atos necessários ao funcionamento regular da sociedade e assinando pela empresa {{forma_assinatura}} na parte fiscal, comercial, bancária, contratos e documentos de qualquer natureza, vedado o uso da denominação social em negócios estranhos aos fins sociais, tais como fianças, avais, endossos ou abonos, em favor próprio, dos sócios ou de terceiros, bem como onerar ou alienar bens imóveis da sociedade sem autorização dos demais sócios.

Parágrafo primeiro — Fica facultado a cada administrador nomear procurador(es), devendo o instrumento de procuração especificar os atos a serem praticados e o prazo de vigência, excetuadas as procurações "ad judicia".

Parágrafo segundo — Como exceção ao caput, a representação da sociedade deverá ocorrer obrigatoriamente de forma conjunta para os atos que importarem em: a) tomar crédito mediante empréstimos, mútuos ou financiamentos, bem como qualquer ato que implique endividamento; b) alienar e/ou gravar de ônus bens imóveis da sociedade e os direitos a eles relativos; c) prestar garantias, fiança, aval, abono ou endosso, autorizadas exclusivamente em favor de sociedades cujo quadro societário coincida com o desta sociedade.

Parágrafo terceiro — Os administradores, na forma do § 1º do artigo 1.011 do Código Civil, declaram sob as penas da lei que não estão impedidos por lei especial, nem condenados ou sob efeito de condenação a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, o sistema financeiro nacional, as normas de defesa da concorrência, as relações de consumo, a fé pública ou a propriedade.

Parágrafo quarto — É expressamente vedado a todo e qualquer sócio ou administrador utilizar a sociedade para promoção pessoal ou qualquer fim que reverta em proveito próprio.

DO PRÓ-LABORE
CLÁUSULA 7ª — Os sócios poderão, de comum acordo, fixar retirada mensal a título de pró-labore, observadas as condições financeiras da empresa e as disposições regulamentares.

DAS DEMONSTRAÇÕES CONTÁBEIS
CLÁUSULA 8ª — O exercício social encerra-se em 31 de dezembro de cada ano, ocasião em que os administradores prestarão contas justificadas de sua administração, procedendo à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico. A sociedade poderá levantar balanços intermediários para distribuição antecipada de lucros.

DA DISSOLUÇÃO, LIQUIDAÇÃO E HAVERES
CLÁUSULA 9ª — O falecimento, retirada, interdição ou incapacidade de sócio não dissolverá a sociedade. Os herdeiros ou sucessores somente ingressarão no quadro societário mediante deliberação da maioria dos sócios remanescentes. Não havendo ingresso, os haveres serão apurados em balanço especialmente levantado na data da resolução da sociedade em relação ao sócio.

DO DIREITO DE PREFERÊNCIA
CLÁUSULA 10ª — Em caso de retirada, exclusão ou cessão de quotas, os sócios remanescentes terão direito de preferência para adquiri-las, nas mesmas condições oferecidas a terceiros, nos termos do art. 1.057 do Código Civil. A alienação a terceiros somente será admitida com autorização da maioria dos sócios e renúncia expressa ao direito de preferência.

DAS DELIBERAÇÕES E DO DESIMPEDIMENTO
CLÁUSULA 11ª — As deliberações sociais serão tomadas na forma do Código Civil. Os sócios e administradores declaram, sob as penas da lei, não estarem impedidos de exercer a administração da sociedade.

DO FORO
CLÁUSULA 12ª — Fica eleito o foro da comarca de {{comarca_foro}} para dirimir as questões oriundas do presente instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento.

{{cidade_uf}}, {{data_deliberacao}}.

{{assinaturas}}`},
  {id:"ta6", nome:"Alteração de Atividades (objeto social/CNAE) + Consolidação", tipo:"alteracao", arquivo:"alteracao_atividades.docx", data:"07/09/2026",
    origem:"Cláusula de objeto social extraída do esqueleto comum das alterações consolidadas lidas",
    placeholders:["razao_social","nome_fantasia","cnpj","nire","uf_junta","numero_alteracao","qualificacao_socios","endereco_sede","objeto_social","lista_cnaes","lista_filiais","data_inicio_atividades","capital_social","quantidade_quotas","valor_quota","quadro_quotas","administradores","forma_assinatura","comarca_foro","cidade_uf","data_deliberacao","assinaturas"],
    texto:`{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

{{numero_alteracao}}ª ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL

Pelo presente instrumento particular e na melhor forma de direito, as partes a seguir nominadas:

{{qualificacao_socios}}

Únicos sócios componentes da sociedade empresária limitada que gira nesta praça sob a denominação social de {{razao_social}}, com sede em {{endereco_sede}}, registrada na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, resolvem, de comum acordo, promover a presente {{numero_alteracao}}ª ALTERAÇÃO DO CONTRATO SOCIAL, nos termos dos artigos 997 e seguintes do Código Civil, mediante as cláusulas e condições a seguir:

CLÁUSULA 1ª — DA ALTERAÇÃO DAS ATIVIDADES ECONÔMICAS
Os sócios deliberam alterar o objeto social da sociedade, que passa a ser: {{objeto_social}}.

Codificação das atividades econômicas:
{{lista_cnaes}}

Em razão dessa deliberação, a cláusula do objeto social passa a vigorar com a redação constante da consolidação abaixo.

CLÁUSULA FINAL — Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do contrato social primitivo e posteriores alterações que não colidirem com os dispositivos do presente instrumento.

Para fins de melhor entendimento jurídico, deliberam os sócios, à unanimidade, rerratificar "in totum" o contrato social primitivo e posteriores alterações, consolidando-o num só instrumento contratual, que passará a viger com a seguinte redação:

{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

CONTRATO SOCIAL CONSOLIDADO

{{qualificacao_socios}}

Sócios representando a totalidade do capital social de {{razao_social}}, sociedade empresária limitada, com atos constitutivos registrados na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, deliberam consolidar o contrato social primitivo e posteriores alterações, passando o mesmo a reger-se pelas seguintes cláusulas e condições:

DO NOME EMPRESARIAL (art. 997, II, do CC)
CLÁUSULA 1ª — A sociedade adotará o seguinte nome empresarial: {{razao_social}}, e nome fantasia {{nome_fantasia}}.

DA SEDE (art. 997, II, do CC)
CLÁUSULA 2ª — A sociedade terá sede e domicílio em {{endereco_sede}}, podendo manter filiais, escritórios e representações em qualquer localidade do país.
{{lista_filiais}}

DO OBJETO SOCIAL (art. 997, II, do CC)
CLÁUSULA 3ª — A sociedade tem por objeto social: {{objeto_social}}.

CODIFICAÇÃO DAS ATIVIDADES ECONÔMICAS:
{{lista_cnaes}}

Parágrafo único — As atividades exercidas por cada estabelecimento, matriz ou filial, poderão corresponder a apenas parte do objeto social acima, observada a legislação específica aplicável quando houver regulação setorial.

DO PRAZO (art. 53, III, "f", do Decreto nº 1.800/1996)
CLÁUSULA 4ª — A sociedade iniciou suas atividades em {{data_inicio_atividades}} e seu prazo de duração é indeterminado.

DO CAPITAL SOCIAL (arts. 997, III e IV, 1.052 e 1.055 do CC)
CLÁUSULA 5ª — O capital social é de {{capital_social}}, dividido em {{quantidade_quotas}} quotas no valor nominal de {{valor_quota}} cada uma, totalmente subscritas e integralizadas em moeda corrente do País, assim distribuídas:

{{quadro_quotas}}

Parágrafo único — A responsabilidade de cada sócio é restrita ao valor de suas quotas, respondendo todos solidariamente pela integralização do capital social.

DA ADMINISTRAÇÃO (arts. 997, VI; 1.013; 1.015; 1.061 e 1.064 do CC)
CLÁUSULA 6ª — A administração da sociedade será exercida por {{administradores}}, que agirão sempre de modo a objetivar o maior incremento dos negócios sociais, praticando os atos necessários ao funcionamento regular da sociedade e assinando pela empresa {{forma_assinatura}} na parte fiscal, comercial, bancária, contratos e documentos de qualquer natureza, vedado o uso da denominação social em negócios estranhos aos fins sociais, tais como fianças, avais, endossos ou abonos, em favor próprio, dos sócios ou de terceiros, bem como onerar ou alienar bens imóveis da sociedade sem autorização dos demais sócios.

Parágrafo primeiro — Fica facultado a cada administrador nomear procurador(es), devendo o instrumento de procuração especificar os atos a serem praticados e o prazo de vigência, excetuadas as procurações "ad judicia".

Parágrafo segundo — Como exceção ao caput, a representação da sociedade deverá ocorrer obrigatoriamente de forma conjunta para os atos que importarem em: a) tomar crédito mediante empréstimos, mútuos ou financiamentos, bem como qualquer ato que implique endividamento; b) alienar e/ou gravar de ônus bens imóveis da sociedade e os direitos a eles relativos; c) prestar garantias, fiança, aval, abono ou endosso, autorizadas exclusivamente em favor de sociedades cujo quadro societário coincida com o desta sociedade.

Parágrafo terceiro — Os administradores, na forma do § 1º do artigo 1.011 do Código Civil, declaram sob as penas da lei que não estão impedidos por lei especial, nem condenados ou sob efeito de condenação a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, o sistema financeiro nacional, as normas de defesa da concorrência, as relações de consumo, a fé pública ou a propriedade.

Parágrafo quarto — É expressamente vedado a todo e qualquer sócio ou administrador utilizar a sociedade para promoção pessoal ou qualquer fim que reverta em proveito próprio.

DO PRÓ-LABORE
CLÁUSULA 7ª — Os sócios poderão, de comum acordo, fixar retirada mensal a título de pró-labore, observadas as condições financeiras da empresa e as disposições regulamentares.

DAS DEMONSTRAÇÕES CONTÁBEIS
CLÁUSULA 8ª — O exercício social encerra-se em 31 de dezembro de cada ano, ocasião em que os administradores prestarão contas justificadas de sua administração, procedendo à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico. A sociedade poderá levantar balanços intermediários para distribuição antecipada de lucros.

DA DISSOLUÇÃO, LIQUIDAÇÃO E HAVERES
CLÁUSULA 9ª — O falecimento, retirada, interdição ou incapacidade de sócio não dissolverá a sociedade. Os herdeiros ou sucessores somente ingressarão no quadro societário mediante deliberação da maioria dos sócios remanescentes. Não havendo ingresso, os haveres serão apurados em balanço especialmente levantado na data da resolução da sociedade em relação ao sócio.

DO DIREITO DE PREFERÊNCIA
CLÁUSULA 10ª — Em caso de retirada, exclusão ou cessão de quotas, os sócios remanescentes terão direito de preferência para adquiri-las, nas mesmas condições oferecidas a terceiros, nos termos do art. 1.057 do Código Civil. A alienação a terceiros somente será admitida com autorização da maioria dos sócios e renúncia expressa ao direito de preferência.

DAS DELIBERAÇÕES E DO DESIMPEDIMENTO
CLÁUSULA 11ª — As deliberações sociais serão tomadas na forma do Código Civil. Os sócios e administradores declaram, sob as penas da lei, não estarem impedidos de exercer a administração da sociedade.

DO FORO
CLÁUSULA 12ª — Fica eleito o foro da comarca de {{comarca_foro}} para dirimir as questões oriundas do presente instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento.

{{cidade_uf}}, {{data_deliberacao}}.

{{assinaturas}}`},
  {id:"tf1", nome:"Constituição de Filial + Consolidação", tipo:"filial", arquivo:"alteracao_constituicao_filial.docx", data:"07/09/2026",
    origem:"Derivado de 1 alteração real com constituição de 3 filiais e alteração de administração (JUCEMAT, 2026)",
    placeholders:["razao_social","nome_fantasia","cnpj","nire","uf_junta","numero_alteracao","qualificacao_socios","endereco_sede","objeto_social","lista_cnaes","lista_filiais","data_inicio_atividades","capital_social","quantidade_quotas","valor_quota","quadro_quotas","administradores","forma_assinatura","comarca_foro","cidade_uf","data_deliberacao","assinaturas","nome_filial","endereco_filial","objeto_filial","cnaes_filial"],
    texto:`{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

{{numero_alteracao}}ª ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL

Pelo presente instrumento particular e na melhor forma de direito, as partes a seguir nominadas:

{{qualificacao_socios}}

Únicos sócios componentes da sociedade empresária limitada que gira nesta praça sob a denominação social de {{razao_social}}, com sede em {{endereco_sede}}, registrada na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, resolvem, de comum acordo, promover a presente {{numero_alteracao}}ª ALTERAÇÃO DO CONTRATO SOCIAL, nos termos dos artigos 997 e seguintes do Código Civil, mediante as cláusulas e condições a seguir:

CLÁUSULA 1ª — DA CONSTITUIÇÃO DE FILIAL
Fica constituída a filial {{nome_filial}}, no endereço {{endereco_filial}}.

Objeto social e atividades da filial: {{objeto_filial}}.

Codificação das atividades econômicas da filial:
{{cnaes_filial}}

Parágrafo único — O capital social da matriz permanece inalterado, não havendo destaque de capital para a filial ora constituída.

Em razão da constituição acima, a cláusula da sede do Contrato Social passa a listar os estabelecimentos da sociedade conforme a consolidação abaixo.

CLÁUSULA FINAL — Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do contrato social primitivo e posteriores alterações que não colidirem com os dispositivos do presente instrumento.

Para fins de melhor entendimento jurídico, deliberam os sócios, à unanimidade, rerratificar "in totum" o contrato social primitivo e posteriores alterações, consolidando-o num só instrumento contratual, que passará a viger com a seguinte redação:

{{razao_social}}
CNPJ {{cnpj}} — NIRE {{nire}}

CONTRATO SOCIAL CONSOLIDADO

{{qualificacao_socios}}

Sócios representando a totalidade do capital social de {{razao_social}}, sociedade empresária limitada, com atos constitutivos registrados na Junta Comercial do Estado de {{uf_junta}} sob o NIRE {{nire}}, deliberam consolidar o contrato social primitivo e posteriores alterações, passando o mesmo a reger-se pelas seguintes cláusulas e condições:

DO NOME EMPRESARIAL (art. 997, II, do CC)
CLÁUSULA 1ª — A sociedade adotará o seguinte nome empresarial: {{razao_social}}, e nome fantasia {{nome_fantasia}}.

DA SEDE (art. 997, II, do CC)
CLÁUSULA 2ª — A sociedade terá sede e domicílio em {{endereco_sede}}, podendo manter filiais, escritórios e representações em qualquer localidade do país.
{{lista_filiais}}

DO OBJETO SOCIAL (art. 997, II, do CC)
CLÁUSULA 3ª — A sociedade tem por objeto social: {{objeto_social}}.

CODIFICAÇÃO DAS ATIVIDADES ECONÔMICAS:
{{lista_cnaes}}

Parágrafo único — As atividades exercidas por cada estabelecimento, matriz ou filial, poderão corresponder a apenas parte do objeto social acima, observada a legislação específica aplicável quando houver regulação setorial.

DO PRAZO (art. 53, III, "f", do Decreto nº 1.800/1996)
CLÁUSULA 4ª — A sociedade iniciou suas atividades em {{data_inicio_atividades}} e seu prazo de duração é indeterminado.

DO CAPITAL SOCIAL (arts. 997, III e IV, 1.052 e 1.055 do CC)
CLÁUSULA 5ª — O capital social é de {{capital_social}}, dividido em {{quantidade_quotas}} quotas no valor nominal de {{valor_quota}} cada uma, totalmente subscritas e integralizadas em moeda corrente do País, assim distribuídas:

{{quadro_quotas}}

Parágrafo único — A responsabilidade de cada sócio é restrita ao valor de suas quotas, respondendo todos solidariamente pela integralização do capital social.

DA ADMINISTRAÇÃO (arts. 997, VI; 1.013; 1.015; 1.061 e 1.064 do CC)
CLÁUSULA 6ª — A administração da sociedade será exercida por {{administradores}}, que agirão sempre de modo a objetivar o maior incremento dos negócios sociais, praticando os atos necessários ao funcionamento regular da sociedade e assinando pela empresa {{forma_assinatura}} na parte fiscal, comercial, bancária, contratos e documentos de qualquer natureza, vedado o uso da denominação social em negócios estranhos aos fins sociais, tais como fianças, avais, endossos ou abonos, em favor próprio, dos sócios ou de terceiros, bem como onerar ou alienar bens imóveis da sociedade sem autorização dos demais sócios.

Parágrafo primeiro — Fica facultado a cada administrador nomear procurador(es), devendo o instrumento de procuração especificar os atos a serem praticados e o prazo de vigência, excetuadas as procurações "ad judicia".

Parágrafo segundo — Como exceção ao caput, a representação da sociedade deverá ocorrer obrigatoriamente de forma conjunta para os atos que importarem em: a) tomar crédito mediante empréstimos, mútuos ou financiamentos, bem como qualquer ato que implique endividamento; b) alienar e/ou gravar de ônus bens imóveis da sociedade e os direitos a eles relativos; c) prestar garantias, fiança, aval, abono ou endosso, autorizadas exclusivamente em favor de sociedades cujo quadro societário coincida com o desta sociedade.

Parágrafo terceiro — Os administradores, na forma do § 1º do artigo 1.011 do Código Civil, declaram sob as penas da lei que não estão impedidos por lei especial, nem condenados ou sob efeito de condenação a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, o sistema financeiro nacional, as normas de defesa da concorrência, as relações de consumo, a fé pública ou a propriedade.

Parágrafo quarto — É expressamente vedado a todo e qualquer sócio ou administrador utilizar a sociedade para promoção pessoal ou qualquer fim que reverta em proveito próprio.

DO PRÓ-LABORE
CLÁUSULA 7ª — Os sócios poderão, de comum acordo, fixar retirada mensal a título de pró-labore, observadas as condições financeiras da empresa e as disposições regulamentares.

DAS DEMONSTRAÇÕES CONTÁBEIS
CLÁUSULA 8ª — O exercício social encerra-se em 31 de dezembro de cada ano, ocasião em que os administradores prestarão contas justificadas de sua administração, procedendo à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico. A sociedade poderá levantar balanços intermediários para distribuição antecipada de lucros.

DA DISSOLUÇÃO, LIQUIDAÇÃO E HAVERES
CLÁUSULA 9ª — O falecimento, retirada, interdição ou incapacidade de sócio não dissolverá a sociedade. Os herdeiros ou sucessores somente ingressarão no quadro societário mediante deliberação da maioria dos sócios remanescentes. Não havendo ingresso, os haveres serão apurados em balanço especialmente levantado na data da resolução da sociedade em relação ao sócio.

DO DIREITO DE PREFERÊNCIA
CLÁUSULA 10ª — Em caso de retirada, exclusão ou cessão de quotas, os sócios remanescentes terão direito de preferência para adquiri-las, nas mesmas condições oferecidas a terceiros, nos termos do art. 1.057 do Código Civil. A alienação a terceiros somente será admitida com autorização da maioria dos sócios e renúncia expressa ao direito de preferência.

DAS DELIBERAÇÕES E DO DESIMPEDIMENTO
CLÁUSULA 11ª — As deliberações sociais serão tomadas na forma do Código Civil. Os sócios e administradores declaram, sob as penas da lei, não estarem impedidos de exercer a administração da sociedade.

DO FORO
CLÁUSULA 12ª — Fica eleito o foro da comarca de {{comarca_foro}} para dirimir as questões oriundas do presente instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento.

{{cidade_uf}}, {{data_deliberacao}}.

{{assinaturas}}`}
];
