/* O objeto App — parte 3 de 6: formulários, endereço/CEP, questionário municipal e CNAE. */

Object.assign(App, {
  resumoEmpresa(){
    const c = wizard.campos;
    return this.escapeHtml([c.razaoSocial, c.tipoSocietario, c.capital ? 'R$ '+c.capital : '', c.cnaePrincipal ? c.cnaePrincipal.split(' - ')[0] : ''].filter(Boolean).join(' · ')) || '—';
  },
  resumoEndereco(){
    return this.escapeHtml(this.enderecoTexto(wizard.campos.endereco)) || '— endereço não preenchido';
  },
  resumoImovel(){
    const c = wizard.campos;
    return this.escapeHtml([c.inscricaoImobiliaria ? 'IPTU '+c.inscricaoImobiliaria : '', c.alvaraBombeiros ? 'AVCB '+c.alvaraBombeiros : ''].filter(Boolean).join(' · ')) || '—';
  },
  resumoViabilidade(){
    const c = wizard.campos;
    return this.escapeHtml([c.viabEvento ? c.viabEvento.split(' - ')[0] : '', c.viabEnquadramento, c.viabAreaUtilizada ? c.viabAreaUtilizada+' m² utilizados' : ''].filter(Boolean).join(' · ')) || '—';
  },
  resumoQuestionario(){
    const q = this.questionarioDoMunicipio();
    if(!q) return '—';
    const c = wizard.campos;
    const respondidas = q.perguntas.filter(p=>c[p.chave]).length;
    return `${respondidas} de ${q.perguntas.length} respondidas`;
  },
  resumoPessoa(p, isPJ){
    const doc = isPJ ? p.documento : (p.documento !== undefined ? p.documento : p.cpf);
    return this.escapeHtml([p.nome || '(sem nome)', doc, p.cargo, p.perc ? p.perc+'%' : ''].filter(Boolean).join(' · '));
  },

  /* ---------- Step 3 ---------- */
  renderDynamicFields(){
    const el = document.getElementById('dynamicFields');
    if(!wizard.tipo){ el.innerHTML = '<p class="view-sub">Volte e selecione o tipo de processo.</p>'; return; }
    const c = wizard.campos; const get=(k,d='')=> c[k]!==undefined?c[k]:d;

    if(wizard.tipo==='abertura'){
      el.innerHTML = `
        ${this.caixa('empresa','Dados da empresa', `
        <div class="form-grid">
          <div class="field span2"><label>Razão social pretendida</label>
            <input type="text" data-f="razaoSocial" id="aberturaRazaoSocial" value="${get('razaoSocial')}"
                   placeholder="Digite a razão social e saia do campo — a ferramenta vai propor criar a pasta no SharePoint"
                   data-blur-action="checarPastaSharePoint" data-blur-value-from="value">
            <div id="pastaStatusBox"></div>
          </div>
          <div class="field"><label>Nome fantasia</label><input type="text" data-f="nomeFantasia" value="${get('nomeFantasia')}"></div>
          <div class="field"><label>Tipo societário</label><select data-f="tipoSocietario">${['LTDA','EIRELI','Sociedade Anônima','MEI','Sociedade Simples'].map(o=>`<option ${get('tipoSocietario')===o?'selected':''}>${o}</option>`).join('')}</select></div>
          <div class="field"><label>Capital social (R$)</label>
            <input type="text" inputmode="numeric" data-f="capital" data-moeda="1" value="${this.formatarMoeda(get('capital'))}" placeholder="0,00" data-action="aplicarMascaraMoeda" data-event="input" data-value-from="element"></div>
          <div class="field"><label>Regime tributário pretendido</label><select data-f="regime">${['Simples Nacional','Lucro Presumido','Lucro Real'].map(o=>`<option ${get('regime')===o?'selected':''}>${o}</option>`).join('')}</select></div>
          <div class="field"><label>Data prevista de início</label><input type="date" data-f="dataPrevista" value="${get('dataPrevista')}"></div>
          <div class="field span2">
            <label>CNAE principal</label>
            <div class="cnae-picker">
              <input type="text" id="cnaePrincipalSearch" placeholder="Buscar por código ou descrição da atividade (base oficial IBGE)..." data-action="searchCnae" data-args='["principal"]' data-event="input" data-value-from="value" data-focus-action="searchCnae" data-focus-args='["principal"]' data-focus-value-from="value" data-blur-action="closeCnaeResults" data-blur-args='["principal"]' data-blur-delay="150">
              <div class="cnae-results" id="cnaePrincipalResults"></div>
              <div class="cnae-selected" id="cnaePrincipalSelected"></div>
            </div>
          </div>
          <div class="field span2">
            <label>CNAEs secundários</label>
            <div class="cnae-picker">
              <input type="text" id="cnaeSecundariosSearch" placeholder="Buscar atividade e clicar para adicionar..." data-action="searchCnae" data-args='["secundarios"]' data-event="input" data-value-from="value" data-focus-action="searchCnae" data-focus-args='["secundarios"]' data-focus-value-from="value" data-blur-action="closeCnaeResults" data-blur-args='["secundarios"]' data-blur-delay="150">
              <div class="cnae-results" id="cnaeSecundariosResults"></div>
              <div class="cnae-chips" id="cnaeSecundariosChips"></div>
            </div>
          </div>
        </div>`, {resumo: this.resumoEmpresa()})}

        ${this.caixa('endereco','Endereço da sede', this.renderEnderecoBlock('sede', c.endereco), {
          resumo: this.resumoEndereco(),
          ajuda: 'Digite o CEP e clique em "Buscar" (ou saia do campo) para preencher Logradouro, Bairro, Município e UF automaticamente, do mesmo jeito que a JUCEMAT faz na Viabilidade. Confira e complete o Número e o Complemento manualmente.'
        })}

        ${this.caixa('imovel','Imóvel e licenciamento', this.blocoImovelSede(get), {
          resumo: this.resumoImovel(),
          ajuda: 'A inscrição imobiliária está no carnê do IPTU. O alvará do Corpo de Bombeiros pode ainda não existir na abertura — deixe em branco e preencha quando sair.'
        })}

        ${this.caixa('viabilidade','Dados para a Consulta de Viabilidade (JUCEMAT)', this.blocoViabilidade(get), {
          resumo: this.resumoViabilidade(),
          ajuda: 'Campos que o Portal de Serviços da JUCEMAT exige no protocolo e que não aparecem em nenhum outro documento — levante com o cliente <b>antes</b> de abrir o protocolo, senão o preenchimento trava no meio do wizard.'
        })}

        ${this.caixa('questionario','Questionário do município', this.blocoQuestionarioMunicipal(get), {
          resumo: this.resumoQuestionario()
        })}

        ${this.caixa('socios','Sócios', `
          <div id="sociosList"></div>
          <button class="add-socio" data-action="addSocio">+ Adicionar sócio</button>`, {
          resumo: (wizard.socios||[]).length ? this.escapeHtml(wizard.socios.map(s=>s.nome||'(sem nome)').join(' · ')) : 'nenhum sócio adicionado',
          ajuda: 'Um sócio pode ser pessoa física ou pessoa jurídica. Pessoa física: informe endereço e contato. Pessoa jurídica: cadastre um ou mais representantes legais, cada um com seu próprio endereço e contato. Se o CPF já constar na base de pessoas da GS2, os dados são preenchidos automaticamente.'
        })}
        ${this.caixa('administradores','Administradores da empresa', `
          <div id="administradoresList"></div>
          <button class="add-socio" data-action="addAdministrador">+ Adicionar administrador</button>`, {
          resumo: (wizard.administradores||[]).length ? this.escapeHtml(wizard.administradores.map(a=>a.nome||'(sem nome)').join(' · ')) : 'nenhum administrador',
          ajuda: 'Pessoas com poder de administração da empresa (podem ou não ser sócios). Marque <b>Administrador</b> no cadastro de um sócio para trazê-lo automaticamente para cá.'
        })}`;
      this.renderSocios();
      this.renderAdministradores();
      this.renderCnaePrincipalSelected();
      this.renderCnaeSecundariosChips();
      this.renderPastaStatus();
    } else if(wizard.tipo==='alteracao'){
      if(!wizard._caixasAltSincronizadas){ this.sincronizarCaixasAlteracao(); wizard._caixasAltSincronizadas = true; }
      const opts = ['Entrada de sócio','Saída de sócio','Alteração de capital social','Alteração de endereço','Alteração de atividade (CNAE)','Alteração de razão social','Alteração de administração','Outro'];
      el.innerHTML = `
        <div class="form-grid wide">
          <div class="field"><label>Tipo(s) de alteração</label>
            <p class="view-sub" style="margin:-2px 0 6px;font-size:11.5px;">Marque o que muda nesta alteração. <b>Só os blocos correspondentes ficam liberados</b> — o resto do formulário fica bloqueado, para não alterar por engano um dado que não faz parte do ato.</p>
            <div class="checks">${opts.map(o=>`<label class="check-item"><input type="checkbox" data-f="altTipo" value="${o}" ${((c.altTipo||[]).includes(o))?'checked':''} data-action="trocarTipoAlteracao" data-event="change"> ${o}</label>`).join('')}</div>
          </div>
          <div class="field"><label>Descrição da alteração</label><textarea data-f="descricao">${get('descricao')}</textarea></div>
          <div class="field"><label>Data da assembleia / deliberação</label><input type="date" data-f="dataDeliberacao" value="${get('dataDeliberacao')}"></div>
        </div>

        ${wizard.origemCliente ? `
        <div class="ocr-strip" style="margin-top:18px;">
          <span>📌</span>
          <span class="grow">Dados carregados do <b>Painel de Clientes</b>, a partir da <b>${wizard.origemCliente.ordemBase}ª alteração</b> (${this.escapeHtml(wizard.origemCliente.data)}) — a versão vigente do contrato social. Endereço, atividades e quadro societário abaixo já vêm do CNPJ atual: altere só o que muda.</span>
        </div>` : ''}

        ${this.caixa('alt-razao','Razão social', `
          <div class="form-grid wide">
            <div class="field span2"><label>Nova razão social</label><input type="text" data-f="razaoSocial" value="${get('razaoSocial')}"></div>
          </div>`, {classe:'bloco-alt', flag:'Alteração de razão social', resumo: this.escapeHtml(get('razaoSocial')) || '—'})}

        ${this.caixa('alt-capital','Capital social', `
          <div class="form-grid wide">
            <div class="field"><label>Capital social atual (R$)</label>
              <input type="text" inputmode="numeric" data-f="capitalAtual" data-moeda="1" value="${this.formatarMoeda(get('capitalAtual'))}" placeholder="5.000,00" data-action="aplicarMascaraMoeda" data-event="input" data-value-from="element"></div>
            <div class="field"><label>Novo capital social (R$)</label>
              <input type="text" inputmode="numeric" data-f="capital" data-moeda="1" value="${this.formatarMoeda(get('capital'))}" placeholder="50.000,00" data-action="aplicarMascaraMoeda" data-event="input" data-value-from="element"></div>
          </div>`, {classe:'bloco-alt', flag:'Alteração de capital social',
            resumo: this.escapeHtml([get('capitalAtual')?'de R$ '+get('capitalAtual'):'', get('capital')?'para R$ '+get('capital'):''].filter(Boolean).join(' ')) || '—'})}

        ${this.caixa('alt-cnae','Atividades econômicas (quadro atual do CNPJ)', `
          <div class="form-grid wide">
            <div class="field span2">
              <label>CNAE principal</label>
              <div class="cnae-picker">
                <input type="text" id="cnaePrincipalSearch" placeholder="Buscar por código ou descrição da atividade (base oficial IBGE)..." data-action="searchCnae" data-args='["principal"]' data-event="input" data-value-from="value" data-focus-action="searchCnae" data-focus-args='["principal"]' data-focus-value-from="value" data-blur-action="closeCnaeResults" data-blur-args='["principal"]' data-blur-delay="150">
                <div class="cnae-results" id="cnaePrincipalResults"></div>
                <div class="cnae-selected" id="cnaePrincipalSelected"></div>
              </div>
            </div>
            <div class="field span2">
              <label>CNAEs secundários</label>
              <div class="cnae-picker">
                <input type="text" id="cnaeSecundariosSearch" placeholder="Buscar atividade e clicar para adicionar..." data-action="searchCnae" data-args='["secundarios"]' data-event="input" data-value-from="value" data-focus-action="searchCnae" data-focus-args='["secundarios"]' data-focus-value-from="value" data-blur-action="closeCnaeResults" data-blur-args='["secundarios"]' data-blur-delay="150">
                <div class="cnae-results" id="cnaeSecundariosResults"></div>
                <div class="cnae-chips" id="cnaeSecundariosChips"></div>
              </div>
            </div>
          </div>`, {classe:'bloco-alt', flag:'Alteração de atividade (CNAE)',
            ajuda:'Vem do OCR do Cartão CNPJ guardado no cadastro do cliente. Inclua ou remova apenas as atividades que esta alteração muda — o que ficar aqui é o quadro que será enviado na Viabilidade.',
            resumo: this.escapeHtml(get('cnaePrincipal')) || '—'})}

        ${this.caixa('alt-endereco','Endereço da sede', `
          ${this.renderEnderecoBlock('sede', c.endereco)}
          ${this.blocoImovelSede(get)}`, {classe:'bloco-alt', flag:'Alteração de endereço', resumo: this.resumoEndereco()})}

        ${this.caixa('alt-socios','Quadro societário', `
          <div class="form-grid wide" style="margin-bottom:10px;">
            <div class="field span2"><label>Sócios afetados</label><input type="text" data-f="sociosAfetados" value="${get('sociosAfetados')}" placeholder="nomes separados por vírgula"></div>
          </div>
          <div id="sociosList"></div>
          <button class="add-socio" data-action="addSocio">+ Adicionar sócio</button>`, {
          classe:'bloco-alt', flag:'Entrada de sócio|Saída de sócio',
          ajuda:'Carregado do cadastro do cliente. Ajuste participações, inclua a entrada de um novo sócio ou remova quem está saindo.',
          resumo: (wizard.socios||[]).length ? this.escapeHtml(wizard.socios.map(x=>x.nome||'(sem nome)').join(' · ')) : 'nenhum sócio adicionado'})}

        ${this.caixa('alt-admin','Administração', `
          <div id="administradoresList"></div>
          <button class="add-socio" data-action="addAdministrador">+ Adicionar administrador</button>`, {
          classe:'bloco-alt', flag:'Alteração de administração',
          ajuda:'Pessoas com poder de administração da empresa (podem ou não ser sócios).',
          resumo: (wizard.administradores||[]).length ? this.escapeHtml(wizard.administradores.map(x=>x.nome||'(sem nome)').join(' · ')) : 'nenhum administrador'})}

        ${this.caixa('alt-outro','Outro evento', `
          <div class="form-grid wide">
            <div class="field span2"><label>Descreva o que muda neste ato</label><textarea data-f="descricaoOutro">${get('descricaoOutro')}</textarea></div>
          </div>`, {classe:'bloco-alt', flag:'Outro', resumo: this.escapeHtml(get('descricaoOutro')) || '—'})}`;
      this.renderSocios();
      this.renderAdministradores();
      this.renderCnaePrincipalSelected();
      this.renderCnaeSecundariosChips();
      this.aplicarBloqueiosAlteracao();
    } else if(wizard.tipo==='filial'){
      /* Abertura de filial é sempre de empresa JÁ EXISTENTE: a matriz vem do
         Painel de Clientes e o que se coleta aqui é o novo estabelecimento.
         O capital da matriz não muda — a filial pode ou não ter capital
         destacado, e o objeto dela costuma ser um recorte do objeto da matriz
         (foi assim nas alterações reais que serviram de base ao modelo). */
      el.innerHTML = `
        ${this.caixa('fil-matriz','Matriz', `
          <div class="form-grid wide">
            <div class="field span2"><label>Razão social da matriz</label><input type="text" data-f="razaoSocial" value="${get('razaoSocial')}"></div>
            <div class="field"><label>CNPJ da matriz</label><input type="text" data-f="cnpjMatriz" value="${get('cnpjMatriz')}"></div>
            <div class="field"><label>NIRE da matriz</label><input type="text" data-f="nireMatriz" value="${get('nireMatriz')}"></div>
            <div class="field"><label>Nº desta alteração contratual</label><input type="text" data-f="numeroAlteracao" placeholder="Ex.: 2" value="${get('numeroAlteracao')}"></div>
            <div class="field"><label>Data da deliberação</label><input type="date" data-f="dataDeliberacao" value="${get('dataDeliberacao')}"></div>
          </div>`, {
          ajuda:'Carregado do Painel de Clientes quando a matriz já está cadastrada. A abertura de filial é feita por alteração contratual da matriz — por isso o número da alteração.',
          resumo: this.escapeHtml([get('razaoSocial'), get('cnpjMatriz')].filter(Boolean).join(' · ')) || '—'})}

        ${this.caixa('fil-dados','Dados da filial', `
          <div class="form-grid wide">
            <div class="field span2"><label>Nome da filial (identificação do estabelecimento)</label><input type="text" data-f="nomeFilial" placeholder="Ex.: LOJA CENTRO" value="${get('nomeFilial')}"></div>
            <div class="field"><label>Nome fantasia da filial</label><input type="text" data-f="nomeFantasiaFilial" value="${get('nomeFantasiaFilial')}"></div>
            <div class="field"><label>Capital destacado para a filial (R$)</label>
              <input type="text" inputmode="numeric" data-f="capitalFilial" data-moeda="1" value="${this.formatarMoeda(get('capitalFilial'))}" placeholder="0,00 — deixe zerado se não houver destaque" data-action="aplicarMascaraMoeda" data-event="input" data-value-from="element"></div>
            <div class="field"><label>Data prevista de início das atividades</label><input type="date" data-f="dataPrevista" value="${get('dataPrevista')}"></div>
            <div class="field span2"><label>Objeto social da filial</label>
              <textarea data-f="objetoFilial" placeholder="Costuma ser um recorte do objeto da matriz — descreva o que esta filial vai exercer">${get('objetoFilial')}</textarea></div>
            <div class="field span2">
              <label>CNAE principal da filial</label>
              <div class="cnae-picker">
                <input type="text" id="cnaePrincipalSearch" placeholder="Buscar por código ou descrição da atividade (base oficial IBGE)..." data-action="searchCnae" data-args='["principal"]' data-event="input" data-value-from="value" data-focus-action="searchCnae" data-focus-args='["principal"]' data-focus-value-from="value" data-blur-action="closeCnaeResults" data-blur-args='["principal"]' data-blur-delay="150">
                <div class="cnae-results" id="cnaePrincipalResults"></div>
                <div class="cnae-selected" id="cnaePrincipalSelected"></div>
              </div>
            </div>
            <div class="field span2">
              <label>CNAEs secundários da filial</label>
              <div class="cnae-picker">
                <input type="text" id="cnaeSecundariosSearch" placeholder="Buscar atividade e clicar para adicionar..." data-action="searchCnae" data-args='["secundarios"]' data-event="input" data-value-from="value" data-focus-action="searchCnae" data-focus-args='["secundarios"]' data-focus-value-from="value" data-blur-action="closeCnaeResults" data-blur-args='["secundarios"]' data-blur-delay="150">
                <div class="cnae-results" id="cnaeSecundariosResults"></div>
                <div class="cnae-chips" id="cnaeSecundariosChips"></div>
              </div>
            </div>
          </div>`, {
          resumo: this.escapeHtml([get('nomeFilial'), get('cnaePrincipal')].filter(Boolean).join(' · ')) || '—'})}

        ${this.caixa('fil-endereco','Endereço da filial', this.renderEnderecoBlock('sede', c.endereco), {
          resumo: this.resumoEndereco(),
          ajuda:'Endereço do novo estabelecimento. Digite o CEP para preencher logradouro, bairro, município e UF automaticamente.'})}

        ${this.caixa('fil-imovel','Imóvel e licenciamento da filial', this.blocoImovelSede(get), {
          resumo: this.resumoImovel(),
          ajuda:'A filial precisa da própria inscrição imobiliária e do próprio alvará de bombeiros — não herda os da matriz.'})}

        ${this.caixa('fil-viabilidade','Dados para a Consulta de Viabilidade (JUCEMAT)', this.blocoViabilidade(get), {
          resumo: this.resumoViabilidade(),
          ajuda:'Para filial o evento é <b>102 - Inscrição dos demais estabelecimentos (Filial)</b>. A viabilidade é do endereço da filial, não da matriz.'})}

        ${this.caixa('fil-questionario','Questionário do município', this.blocoQuestionarioMunicipal(get), {
          resumo: this.resumoQuestionario()})}

        ${this.caixa('fil-admin','Administrador responsável pela filial', `
          <div id="administradoresList"></div>
          <button class="add-socio" data-action="addAdministrador">+ Adicionar administrador</button>`, {
          resumo: (wizard.administradores||[]).length ? this.escapeHtml(wizard.administradores.map(a=>a.nome||'(sem nome)').join(' · ')) : 'nenhum administrador',
          ajuda:'Opcional. Nas alterações reais que serviram de base, a abertura de filial vinha junto com a nomeação de administradores — inclua aqui quem responde pelo novo estabelecimento.'})}`;
      this.renderAdministradores();
      this.renderCnaePrincipalSelected();
      this.renderCnaeSecundariosChips();
    } else if(wizard.tipo==='baixa'){
      el.innerHTML = `
        <div class="form-grid">
          <div class="field"><label>Razão social</label><input type="text" data-f="razaoSocial" value="${get('razaoSocial')}"></div>
          <div></div>
          <div class="field span2"><label>Motivo do encerramento</label><textarea data-f="motivo">${get('motivo')}</textarea></div>
          <div class="field"><label>Data de encerramento das atividades</label><input type="date" data-f="dataEncerramento" value="${get('dataEncerramento')}"></div>
          <div class="field"><label>Possui débitos pendentes?</label><select data-f="debitos"><option ${get('debitos')==='Não'?'selected':''}>Não</option><option ${get('debitos')==='Sim'?'selected':''}>Sim</option></select></div>
          <div class="field"><label>Responsável pela guarda de documentos</label><input type="text" data-f="responsavelGuarda" value="${get('responsavelGuarda')}"></div>
          <div class="field"><label>Destino do acervo documental</label><input type="text" data-f="destinoAcervo" value="${get('destinoAcervo')}"></div>
        </div>`;
    } else if(wizard.tipo==='outros'){
      el.innerHTML = `
        <div class="form-grid">
          <div class="field"><label>Tipo de evento</label><select data-f="tipoEvento">${['Transformação','Incorporação','Cisão','Fusão','Mudança de administrador','Procuração','Outro'].map(o=>`<option ${get('tipoEvento')===o?'selected':''}>${o}</option>`).join('')}</select></div>
          <div></div>
          <div class="field span2"><label>Descrição do evento</label><textarea data-f="descricaoEvento">${get('descricaoEvento')}</textarea></div>
        </div>`;
    }

    el.insertAdjacentHTML('beforeend', `
      <div style="margin-top:18px;border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;">
        <h4 style="margin:0 0 10px;font-size:13px;color:var(--dark);">Grupo econômico</h4>
        <div class="form-grid">
          <div class="field"><label>Esta empresa faz parte de um grupo econômico?</label>
            <select data-f="grupoEconomico" data-action="toggleGrupoEconomico" data-event="change" data-value-from="value">
              <option value="Não" ${get('grupoEconomico')==='Sim'?'':'selected'}>Não</option>
              <option value="Sim" ${get('grupoEconomico')==='Sim'?'selected':''}>Sim</option>
            </select>
          </div>
          <div></div>
          <div class="field span2" id="grupoEconomicoDetalhes" style="display:${get('grupoEconomico')==='Sim'?'grid':'none'};grid-template-columns:repeat(2,1fr);gap:14px 16px;">
            <div class="field"><label>Nome do grupo econômico</label><input type="text" data-f="grupoEconomicoNome" value="${get('grupoEconomicoNome')}"></div>
            <div class="field"><label>Outras empresas do grupo</label><input type="text" data-f="grupoEconomicoEmpresas" value="${get('grupoEconomicoEmpresas')}" placeholder="nomes ou CNPJs separados por vírgula"></div>
          </div>
        </div>
      </div>`);

    el.querySelectorAll('[data-f]').forEach(input=>{ input.addEventListener('input', ()=>this.captureField(input)); input.addEventListener('change', ()=>this.captureField(input)); });
  },
  /* Etapa 3 da Alteração Societária: só ficam editáveis os blocos correspondentes
     aos "Tipo(s) de alteração" marcados. Os demais são bloqueados (inputs disabled
     + bloco esmaecido), para não alterar por engano um dado fora do escopo do ato. */
  /* Marcar/desmarcar um tipo de alteração muda o que está em jogo: as caixas
     correspondentes abrem e as demais recolhem. */
  trocarTipoAlteracao(){
    this.sincronizarCaixasAlteracao();
    this.renderDynamicFields();
  },
  aplicarBloqueiosAlteracao(){
    if(wizard.tipo !== 'alteracao') return;
    const marcados = wizard.campos.altTipo || [];
    document.querySelectorAll('.bloco-alt').forEach(bloco=>{
      const flags = (bloco.getAttribute('data-flag')||'').split('|');
      const ativo = flags.some(f=>marcados.indexOf(f)>-1);
      bloco.classList.toggle('bloqueado', !ativo);
      /* o cabeçalho da caixa continua clicável mesmo bloqueado: fora do escopo
         do ato os campos ficam só para consulta, não somem da tela */
      bloco.querySelectorAll('.caixa-body input, .caixa-body select, .caixa-body textarea, .caixa-body button')
           .forEach(campo=>{ campo.disabled = !ativo; });
      const selo = bloco.querySelector('.caixa-selo-escopo');
      if(selo) selo.outerHTML = '';
      const head = bloco.querySelector('.caixa-head .caixa-titulo');
      if(head && !ativo && !bloco.querySelector('.caixa-selo-escopo')){
        head.insertAdjacentHTML('afterend', '<span class="caixa-selo pend caixa-selo-escopo">fora deste ato — só consulta</span>');
      }
    });
  },

  /* ---------- Máscara de valores em reais ----------
     Qualquer campo monetário exibe o número no padrão brasileiro: ponto como
     separador de milhar e vírgula nos centavos (ex.: 1.250.000,00). A digitação é
     da direita para a esquerda, como em caixa: o usuário digita só os números e a
     vírgula se posiciona sozinha. O valor guardado no wizard é o texto já formatado,
     que é o mesmo que vai para o contrato e para a revisão. */
  formatarMoeda(valor){
    const digitos = String(valor==null?'':valor).replace(/\D/g,'');
    if(!digitos) return '';
    const centavos = parseInt(digitos, 10);
    return (centavos/100).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  },
  aplicarMascaraMoeda(input){
    /* preserva a posição do cursor medindo a distância até o fim do texto */
    const distanciaDoFim = input.value.length - (input.selectionStart||input.value.length);
    input.value = this.formatarMoeda(input.value);
    const pos = Math.max(0, input.value.length - distanciaDoFim);
    try{ input.setSelectionRange(pos, pos); }catch(e){}
    this.captureField(input);
  },

  captureField(input){
    this.agendarSalvarRascunho();
    const key = input.dataset.f;
    if(input.type==='checkbox'){
      const arr = wizard.campos[key] || [];
      if(input.checked){ if(!arr.includes(input.value)) arr.push(input.value); } else { const i=arr.indexOf(input.value); if(i>-1) arr.splice(i,1); }
      wizard.campos[key] = arr;
    } else { wizard.campos[key] = input.value; }
  },

  /* ---------- Endereço da sede: busca automática de CEP em bases nacionais públicas -----------
     A JUCEMAT também auto-preenche Logradouro/Bairro/Município a partir do CEP na Viabilidade
     (ver skill "jucemat-viabilidade"). Aqui usamos uma cadeia de serviços públicos e gratuitos de
     CEP (todos com CORS liberado, sem necessidade de chave), tentando um após o outro até um
     responder: ViaCEP (mais usado/estável) → BrasilAPI (agrega Correios/ViaCEP/OpenCEP) → OpenCEP
     (mais rápido, formato compatível com ViaCEP). Se nenhum responder (ex.: sem internet), a
     ferramenta avisa e o usuário preenche manualmente — nunca trava o formulário. */
  CEP_PROVIDERS: [
    { nome:'ViaCEP', url:cep=>`https://viacep.com.br/ws/${cep}/json/`, parse:d=> (d && !d.erro) ? {logradouro:d.logradouro, bairro:d.bairro, municipio:d.localidade, uf:d.uf} : null },
    { nome:'BrasilAPI', url:cep=>`https://brasilapi.com.br/api/cep/v1/${cep}`, parse:d=> (d && d.cep) ? {logradouro:d.street, bairro:d.neighborhood, municipio:d.city, uf:d.state} : null },
    { nome:'OpenCEP', url:cep=>`https://opencep.com/v1/${cep}`, parse:d=> (d && d.cep) ? {logradouro:d.logradouro, bairro:d.bairro, municipio:d.localidade, uf:d.uf} : null }
  ],
  /* Renderiza um bloco de endereço reutilizável (sede, sócio, representante legal ou administrador).
     `prefix` identifica onde os dados moram: 'sede' | 'socio-<i>' | 'rep-<i>-<j>' | 'admin-<k>' — ver resolveEntity(). */
  /* Dados do imóvel da sede. A inscrição imobiliária (índice cadastral do IPTU)
     é pedida na Viabilidade da JUCEMAT e no licenciamento municipal; o alvará do
     Corpo de Bombeiros (AVCB/CLCB) é condição para o alvará de funcionamento e
     tem validade curta, então guardamos o número e o vencimento para acompanhar. */
  /* Nomes legíveis dos campos na revisão e no PDF (a chave interna é camelCase). */
  ROTULOS_CAMPOS: {
    razaoSocial:'Razão social', nomeFantasia:'Nome fantasia', tipoSocietario:'Tipo societário',
    capital:'Capital social', capitalAtual:'Capital social atual',
    cnaePrincipal:'CNAE principal', cnaeSecundarios:'CNAEs secundários',
    regime:'Regime tributário', dataPrevista:'Data prevista de início',
    inscricaoImobiliaria:'Inscrição imobiliária (IPTU)', inscricaoMunicipal:'Inscrição municipal',
    alvaraBombeiros:'Alvará do Corpo de Bombeiros', alvaraBombeirosValidade:'Validade do alvará de bombeiros',
    altTipo:'Tipo(s) de alteração', descricao:'Descrição da alteração',
    dataDeliberacao:'Data da assembleia / deliberação', sociosAfetados:'Sócios afetados',
    tipoEvento:'Tipo de evento', descricaoEvento:'Descrição do evento', descricaoOutro:'Outro evento',
    motivo:'Motivo do encerramento', dataEncerramento:'Data de encerramento',
    debitos:'Possui débitos pendentes', destinoAcervo:'Destino do acervo documental',
    responsavelGuarda:'Responsável pela guarda de documentos',
    grupoEconomico:'Faz parte de grupo econômico', grupoEconomicoNome:'Nome do grupo econômico',
    grupoEconomicoEmpresas:'Empresas do grupo',
    cnpjMatriz:'CNPJ da matriz', nireMatriz:'NIRE da matriz', numeroAlteracao:'Nº da alteração contratual',
    nomeFilial:'Nome da filial', nomeFantasiaFilial:'Nome fantasia da filial',
    capitalFilial:'Capital destacado para a filial', objetoFilial:'Objeto social da filial',
    viabEvento:'Evento da viabilidade', viabEnquadramento:'Enquadramento',
    viabSomenteRfb:'Consulta somente para regularização RFB', viabNaturezaImovel:'Natureza do imóvel',
    viabTipoUnidade:'Tipo de unidade do empreendimento', viabAreaTotal:'Área total da edificação (m²)',
    viabAreaUtilizada:'Área utilizada (m²)', viabFormaAtuacao:'Forma de atuação',
    viabAtividadeNoLocal:'Atividade exercida no local',
    viabHorarioInicio:'Abre às', viabHorarioFim:'Fecha às', viabDias:'Dias de funcionamento', muniOcupacaoImovel:'Ocupação do imóvel',
    muniHabiteSe:'Possui Habite-se', muniAnexoResidencia:'Anexo/integrado à residência',
    muniCondominioResidencial:'Em condomínio residencial', muniMercadoPorto:'No Mercado Varejista do Porto',
    muniBebidasAlcoolicas:'Comercializa bebidas alcoólicas', muniHorarioEspecial:'Horário especial',
    muniZona:'Zona', muniSomenteFiscal:'Somente endereço fiscal',
    muniCombustivelLitros:'Revenda de combustível (litros)', muniGlpQuantidade:'Revenda de GLP',
    muniLotesConfinantesRes:'Lotes confinantes residenciais', muniLotesConfinantesNao:'Lotes confinantes não residenciais',
    muniLotesDefrontantesRes:'Lotes defrontantes residenciais', muniLotesDefrontantesNao:'Lotes defrontantes não residenciais',
    muniLotesCircundantesRes:'Lotes circundantes residenciais', muniLotesCircundantesNao:'Lotes circundantes não residenciais',
    muniTelefoneProprietario:'Telefone do proprietário', muniEmailProprietario:'E-mail do proprietário',
    muniLicencasExistentes:'Licenças existentes da Prefeitura'
  },

  blocoImovelSede(get){
    return `
      <h4 style="font-size:13px;margin:20px 0 4px;color:var(--dark);">Imóvel e licenciamento da sede</h4>
      <p class="view-sub" style="margin:-2px 0 8px;">A inscrição imobiliária está no carnê do IPTU do imóvel. O alvará do Corpo de Bombeiros pode ainda não existir na abertura — deixe em branco e preencha quando sair.</p>
      <div class="form-grid">
        <div class="field"><label>Inscrição imobiliária (índice cadastral do IPTU)</label><input type="text" data-f="inscricaoImobiliaria" placeholder="Ex.: 04790060070" value="${get('inscricaoImobiliaria')}"></div>
        <div class="field"><label>Inscrição municipal (se já houver)</label><input type="text" data-f="inscricaoMunicipal" value="${get('inscricaoMunicipal')}"></div>
        <div class="field"><label>Alvará do Corpo de Bombeiros (nº do AVCB/CLCB)</label><input type="text" data-f="alvaraBombeiros" value="${get('alvaraBombeiros')}"></div>
        <div class="field"><label>Validade do alvará de bombeiros</label><input type="date" data-f="alvaraBombeirosValidade" value="${get('alvaraBombeirosValidade')}"></div>
      </div>`;
  },

  /* ======================================================================
     DADOS EXIGIDOS PELA CONSULTA DE VIABILIDADE (JUCEMAT / REDESIM)
     Levantados percorrendo o wizard real do Portal de Serviços. São campos
     que o portal pede e que não existiam na ferramenta — sem eles o
     preenchimento trava no meio e alguém tem de ligar para o cliente.
     Reunidos aqui para que a ficha do processo seja, ela mesma, o roteiro
     do protocolo (e, na Fase 2, a entrada do robô).
     ====================================================================== */
  VIAB_EVENTOS: [
    '101 - Inscrição de primeiro estabelecimento (Matriz)',
    '102 - Inscrição dos demais estabelecimentos (Filial)',
    '220 - Alteração de endereço dentro do mesmo município',
    '221 - Alteração de endereço entre municípios',
    '244 - Alteração de atividades econômicas',
    '246 - Alteração de nome empresarial',
    '247 - Alteração de natureza jurídica'
  ],
  VIAB_ENQUADRAMENTO: ['Micro Empresa (ME)','Empresa de Pequeno Porte (EPP)','Demais (sem enquadramento)'],
  VIAB_NATUREZA_IMOVEL: ['Urbano','Rural','Sem regularização'],
  VIAB_TIPO_UNIDADE: ['Produtiva','Auxiliar','Produtiva e Auxiliar'],
  VIAB_FORMA_ATUACAO: [
    '01 - Estabelecimento fixo','02 - Internet','03 - Em local fixo fora de loja','04 - Correio',
    '05 - Porta a porta, postos móveis ou ambulantes','06 - Televendas','07 - Máquinas automáticas',
    '08 - Atividade desenvolvida fora do estabelecimento'
  ],
  VIAB_OCUPACAO: ['Próprio','Alugado','Cedido','Comodato','Permissão','Concessão','Outros'],
  DIAS_SEMANA: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],

  campoSelect(chave, rotulo, opcoes, get, extra){
    return `<div class="field${extra&&extra.span2?' span2':''}"><label>${rotulo}</label>
      <select data-f="${chave}">
        ${[''].concat(opcoes).map(o=>`<option value="${this.escapeAttr(o)}" ${get(chave)===o?'selected':''}>${o||'Selecione...'}</option>`).join('')}
      </select></div>`;
  },
  campoSimNao(chave, rotulo, get, extra){
    return this.campoSelect(chave, rotulo, ['Sim','Não'], get, extra);
  },

  /* ---------- Questionários municipais de regulação urbana ----------
     Cada município integrado ao REDESIM tem o SEU questionário, com perguntas
     próprias — não existe um formulário nacional. O de Cuiabá tem 21 perguntas
     (ocupação do imóvel, habite-se, contagem de lotes vizinhos...); o de outra
     prefeitura será diferente.

     Por isso o questionário aqui é DADO, não código: cada município entra como
     uma entrada neste catálogo, com suas perguntas, e a ferramenta mostra
     apenas o do município da sede. Acrescentar Várzea Grande, Rondonópolis ou
     um município de outro estado é acrescentar uma entrada — sem mexer no
     resto da ferramenta.

     Levantado percorrendo o wizard real da JUCEMAT em 07/09/2026. */
  QUESTIONARIOS_MUNICIPAIS: {
    'CUIABA': {
      municipio: 'Cuiabá',
      uf: 'MT',
      orgao: 'Prefeitura de Cuiabá',
      fonte: 'Questionário para regulação urbana — Portal de Serviços da JUCEMAT, levantado em 07/09/2026',
      perguntas: [
        {n:1,  chave:'muniOcupacaoImovel',       tipo:'select', rotulo:'Ocupação do imóvel', opcoes:['Próprio','Alugado','Cedido','Comodato','Permissão','Concessão','Outros']},
        {n:2,  chave:'muniHabiteSe',             tipo:'simnao', rotulo:'O imóvel possui Habite-se?'},
        {n:3,  chave:'muniAnexoResidencia',      tipo:'simnao', rotulo:'Anexo e integrado à residência?'},
        {n:4,  chave:'muniCondominioResidencial',tipo:'simnao', rotulo:'A empresa está em Condomínio Residencial?'},
        {n:5,  chave:'muniMercadoPorto',         tipo:'simnao', rotulo:'Está no Mercado Varejista do Porto "Antônio Moisés Nadaf"?'},
        {n:6,  chave:'muniBebidasAlcoolicas',    tipo:'simnao', rotulo:'A empresa comercializa bebidas alcoólicas?'},
        {n:7,  chave:'muniHorarioEspecial',      tipo:'simnao', rotulo:'Utilizará horário especial (antes das 7h, após 18h, ou sábado após 13h)?',
               ajuda:'Responder Sim costuma puxar análise adicional de incomodidade pela Prefeitura.'},
        {n:8,  chave:'muniZona',                 tipo:'select', rotulo:'Zona', opcoes:['URBANA','RURAL']},
        {n:9,  chave:'muniSomenteFiscal',        tipo:'simnao', rotulo:'A atividade pretendida é somente para endereço fiscal?',
               ajuda:'Precisa ser coerente com o Tipo de unidade e com "atividade exercida no local".'},
        {n:10, chave:'muniCombustivelLitros',    tipo:'texto',  rotulo:'Revenda de combustível — capacidade de armazenamento (litros)', padrao:'0',
               ajuda:'Sem atividade de combustível, preencher 0 — o campo em branco vira exigência.'},
        {n:12, chave:'muniGlpQuantidade',        tipo:'texto',  rotulo:'Revenda de GLP — quantidade de botijões ou kg', padrao:'0',
               ajuda:'Sem revenda de GLP, preencher 0.'},
        {n:13, chave:'muniLotesConfinantesRes',  tipo:'numero', rotulo:'Lotes confinantes residenciais'},
        {n:14, chave:'muniLotesConfinantesNao',  tipo:'numero', rotulo:'Lotes confinantes não residenciais'},
        {n:15, chave:'muniLotesDefrontantesRes', tipo:'numero', rotulo:'Lotes defrontantes residenciais'},
        {n:16, chave:'muniLotesDefrontantesNao', tipo:'numero', rotulo:'Lotes defrontantes não residenciais'},
        {n:17, chave:'muniLotesCircundantesRes', tipo:'numero', rotulo:'Lotes circundantes residenciais'},
        {n:18, chave:'muniLotesCircundantesNao', tipo:'numero', rotulo:'Lotes circundantes não residenciais'},
        {n:19, chave:'muniTelefoneProprietario', tipo:'texto',  rotulo:'Telefone do proprietário do imóvel'},
        {n:20, chave:'muniEmailProprietario',    tipo:'texto',  rotulo:'E-mail do proprietário do imóvel'},
        {n:21, chave:'muniLicencasExistentes',   tipo:'texto',  rotulo:'Licenças da Prefeitura já existentes para o endereço', span2:true,
               ajuda:'Informar os números agiliza a análise. Se não houver, escreva "nenhuma".'}
      ],
      nota: 'Perguntas 13 a 18 — contagem dos lotes vizinhos: levantar no mapa público da Prefeitura (app.smartgis.net.br/cuiaba/publico), localizando o imóvel pela inscrição imobiliária do IPTU. A definição de confinante, defrontante e circundante está no manual da JUCEMAT em jucemat.mt.gov.br/faqs/94. Perguntas 10 e 12 — sem combustível ou GLP, preencher 0, não deixar em branco.'
    }
    /* Próximos: Várzea Grande/MT, Rondonópolis/MT, Campo Grande/MS... */
  },
  /* Normaliza o município para casar com a chave do catálogo. */
  chaveMunicipio(nome){
    return String(nome||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  },
  questionarioDoMunicipio(){
    const mun = ((wizard.campos.endereco||{}).municipio) || '';
    return this.QUESTIONARIOS_MUNICIPAIS[this.chaveMunicipio(mun)] || null;
  },
  /* Redesenha a etapa de dados quando o município da sede muda, para trocar (ou
     tirar) o questionário da prefeitura. Só redesenha se o questionário aplicável
     realmente mudou — senão o formulário piscaria a cada tecla. */
  _questionarioAtual: null,
  reavaliarQuestionarioMunicipal(){
    const q = this.questionarioDoMunicipio();
    const chave = q ? q.municipio : '';
    if(chave === this._questionarioAtual) return;
    this._questionarioAtual = chave;
    if(wizard.step === 3) this.renderDynamicFields();
  },

  blocoQuestionarioMunicipal(get){
    const mun = ((wizard.campos.endereco||{}).municipio) || '';
    const q = this.questionarioDoMunicipio();

    if(!q){
      return `
        <h5 style="font-size:12px;margin:16px 0 6px;color:var(--dark);">Questionário da Prefeitura</h5>
        <div class="ocr-strip" style="margin:0;background:var(--surface);color:var(--muted);align-items:flex-start;">
          <span>🏛️</span>
          <span class="grow">${mun
            ? `A ferramenta ainda não tem o questionário de regulação urbana de <b>${this.escapeHtml(mun)}</b>. Cada prefeitura integrada ao REDESIM tem o seu, com perguntas próprias — quando fizermos o primeiro processo nesse município, as perguntas entram aqui e passam a aparecer sozinhas.`
            : 'Preencha o <b>município</b> no endereço da sede: se a prefeitura for integrada e já estiver mapeada, o questionário de regulação urbana aparece aqui.'}
            <div style="font-size:11.5px;margin-top:4px;">Mapeados até agora: ${Object.keys(this.QUESTIONARIOS_MUNICIPAIS).map(k=>this.escapeHtml(this.QUESTIONARIOS_MUNICIPAIS[k].municipio+'/'+this.QUESTIONARIOS_MUNICIPAIS[k].uf)).join(' · ')}.</div>
          </span>
        </div>`;
    }

    const campo = p => {
      const span = p.span2 ? {span2:true} : null;
      const ajuda = p.ajuda ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;">${this.escapeHtml(p.ajuda)}</div>` : '';
      const rot = `${p.n}. ${p.rotulo}${p.opcional?' <span style="color:var(--muted);font-weight:400;">(se aplicável)</span>':''}`;
      if(p.tipo === 'select') return this.campoSelect(p.chave, rot, p.opcoes, get, span).replace('</div>', ajuda+'</div>');
      if(p.tipo === 'simnao') return this.campoSimNao(p.chave, rot, get, span).replace('</div>', ajuda+'</div>');
      const tipoInput = p.tipo === 'numero' ? 'number' : 'text';
      const valor = get(p.chave) || (p.padrao !== undefined ? p.padrao : '');
      if(!wizard.campos[p.chave] && p.padrao !== undefined) wizard.campos[p.chave] = p.padrao;
      return `<div class="field${p.span2?' span2':''}"><label>${rot}</label>
        <input type="${tipoInput}" data-f="${p.chave}" value="${this.escapeAttr(valor)}">${ajuda}</div>`;
    };

    return `
      <h5 style="font-size:12px;margin:16px 0 6px;color:var(--dark);">Questionário de regulação urbana — ${this.escapeHtml(q.orgao)}</h5>
      <p class="view-sub" style="margin:-2px 0 8px;">Aparece porque o município da sede é <b>${this.escapeHtml(q.municipio)}/${q.uf}</b>. Cada prefeitura integrada tem o seu questionário — este é o de ${this.escapeHtml(q.municipio)}, e nenhuma dessas respostas consta em documento do cliente.</p>
      <div class="form-grid">
        ${q.perguntas.map(campo).join('')}
      </div>
      ${q.nota ? `<div style="font-size:11.5px;color:var(--muted);margin-top:8px;">${this.escapeHtml(q.nota)}</div>` : ''}`;
  },

  blocoViabilidade(get){
    return `
      <h4 style="font-size:13px;margin:24px 0 4px;color:var(--dark);">Dados para a Consulta de Viabilidade (JUCEMAT)</h4>
      <p class="view-sub" style="margin:-2px 0 8px;">Campos que o Portal de Serviços da JUCEMAT exige no protocolo da viabilidade e que não aparecem em nenhum outro documento — precisam ser levantados com o cliente <b>antes</b> de abrir o protocolo, senão o preenchimento trava no meio do wizard.</p>

      <h5 style="font-size:12px;margin:14px 0 6px;color:var(--dark);">Enquadramento e evento</h5>
      <div class="form-grid">
        ${this.campoSelect('viabEvento','Evento da viabilidade', this.VIAB_EVENTOS, get, {span2:true})}
        ${this.campoSelect('viabEnquadramento','Enquadramento', this.VIAB_ENQUADRAMENTO, get)}
        ${this.campoSimNao('viabSomenteRfb','Consulta somente para regularização na RFB?', get)}
      </div>

      <h5 style="font-size:12px;margin:16px 0 6px;color:var(--dark);">Imóvel — dados exigidos pela Junta</h5>
      <div class="form-grid">
        ${this.campoSelect('viabNaturezaImovel','Natureza do imóvel', this.VIAB_NATUREZA_IMOVEL, get)}
        ${this.campoSelect('viabTipoUnidade','Tipo de unidade do empreendimento', this.VIAB_TIPO_UNIDADE, get)}
        <div class="field"><label>Área total da edificação (m²)</label><input type="text" data-f="viabAreaTotal" placeholder="Ex.: 892,30" value="${get('viabAreaTotal')}"></div>
        <div class="field"><label>Área utilizada (m²)</label><input type="text" data-f="viabAreaUtilizada" placeholder="Ex.: 45,00" value="${get('viabAreaUtilizada')}"></div>
        ${this.campoSelect('viabFormaAtuacao','Forma de atuação', this.VIAB_FORMA_ATUACAO, get, {span2:true})}
        ${this.campoSimNao('viabAtividadeNoLocal','A atividade é exercida no local?', get)}
      </div>

      <h5 style="font-size:12px;margin:16px 0 6px;color:var(--dark);">Horário de funcionamento</h5>
      <p class="view-sub" style="margin:-2px 0 8px;">Exigido no wizard (visto na JUCEMS e no questionário municipal). Informe o intervalo e marque os dias.</p>
      <div class="form-grid">
        <div class="field"><label>Abre às</label><input type="time" data-f="viabHorarioInicio" value="${get('viabHorarioInicio')}"></div>
        <div class="field"><label>Fecha às</label><input type="time" data-f="viabHorarioFim" value="${get('viabHorarioFim')}"></div>
        <div class="field span2"><label>Dias de funcionamento</label>
          <div class="check-grid">
            ${this.DIAS_SEMANA.map(d=>`<label class="check-item" style="cursor:pointer;"><input type="checkbox" data-f="viabDias" value="${d}" ${(wizard.campos.viabDias||[]).indexOf(d)>-1?'checked':''}> ${d}</label>`).join('')}
          </div>
        </div>
      </div>

      ${this.blocoQuestionarioMunicipal(get)}

      <div class="ocr-strip" style="margin:14px 0 0;background:var(--status-warn-bg);color:var(--status-warn);align-items:flex-start;">
        <span>ℹ️</span>
        <span class="grow"><b>Item do CNAE.</b> No portal, cada CNAE é escolhido pelo <b>item</b> (ex.: 4731-8/00 tem 16 itens). O código sozinho não basta e escolher o item errado é um erro silencioso. Registre o item ao lado de cada atividade no campo de CNAEs acima, no formato <code>6810-2/02 01</code>.</span>
      </div>`;
  },

  renderEnderecoBlock(prefix, endereco){
    endereco = endereco || {};
    const g = k => this.escapeHtml(endereco[k]||'');
    return `<div class="form-grid">
      <div class="field">
        <label>CEP</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="${prefix}-cep" placeholder="00000-000" maxlength="9" value="${g('cep')}" data-action="formatCepGenerico" data-args='${this.attrJson([prefix])}' data-event="input" data-value-from="element" data-blur-action="autoBuscarCepGenerico" data-blur-args='${this.attrJson([prefix])}'>
          <button type="button" class="btn ghost" style="white-space:nowrap;" data-action="buscarCepGenerico" data-args='${this.attrJson([prefix])}'>Buscar</button>
        </div>
        <div id="${prefix}-cepStatus" style="font-size:11px;color:var(--muted);margin-top:4px;min-height:14px;"></div>
      </div>
      <div class="field"><label>Número</label><input type="text" id="${prefix}-numero" value="${g('numero')}" data-action="setEndereco" data-args='${this.attrJson([prefix,'numero'])}' data-event="change" data-value-from="value"></div>
      <div class="field span2"><label>Logradouro (rua/avenida)</label><input type="text" id="${prefix}-logradouro" value="${g('logradouro')}" data-action="setEndereco" data-args='${this.attrJson([prefix,'logradouro'])}' data-event="change" data-value-from="value"></div>
      <div class="field"><label>Bairro</label><input type="text" id="${prefix}-bairro" value="${g('bairro')}" data-action="setEndereco" data-args='${this.attrJson([prefix,'bairro'])}' data-event="change" data-value-from="value"></div>
      <div class="field"><label>Complemento</label><input type="text" id="${prefix}-complemento" placeholder="Ex.: Quadra 16, Lote 08 e 09" value="${g('complemento')}" data-action="setEndereco" data-args='${this.attrJson([prefix,'complemento'])}' data-event="change" data-value-from="value"></div>
      <div class="field"><label>Município</label><input type="text" id="${prefix}-municipio" value="${g('municipio')}" data-action="setEndereco" data-args='${this.attrJson([prefix,'municipio'])}' data-event="change" data-value-from="value"></div>
      <div class="field"><label>UF</label><input type="text" id="${prefix}-uf" maxlength="2" style="text-transform:uppercase;" value="${g('uf')}" data-action="setEndereco" data-args='${this.attrJson([prefix,'uf'])}' data-event="change" data-value-from="value"></div>
      <div class="field span2"><label>Ponto de referência (opcional)</label><input type="text" id="${prefix}-pontoReferencia" value="${g('pontoReferencia')}" data-action="setEndereco" data-args='${this.attrJson([prefix,'pontoReferencia'])}' data-event="change" data-value-from="value"></div>
    </div>`;
  },
  renderContatoBlock(prefix, contato){
    contato = contato || {};
    return `<div class="form-grid">
      <div class="field"><label>E-mail</label><input type="text" id="${prefix}-email" value="${this.escapeHtml(contato.email||'')}" data-action="setContato" data-args='${this.attrJson([prefix,'email'])}' data-event="change" data-value-from="value"></div>
      <div class="field"><label>Telefone</label><input type="text" id="${prefix}-telefone" value="${this.escapeHtml(contato.telefone||'')}" data-action="setContato" data-args='${this.attrJson([prefix,'telefone'])}' data-event="change" data-value-from="value"></div>
    </div>`;
  },
  resolveEntity(prefix){
    const parts = (prefix||'').split('-');
    if(parts[0]==='sede'){ if(!wizard.campos.endereco) wizard.campos.endereco={}; return wizard.campos; }
    if(parts[0]==='socio') return wizard.socios[+parts[1]];
    if(parts[0]==='rep'){ const s = wizard.socios[+parts[1]]; return s && s.representantes ? s.representantes[+parts[2]] : null; }
    if(parts[0]==='admin') return wizard.administradores[+parts[1]];
    return null;
  },
  setEndereco(prefix, key, value){
    const ent = this.resolveEntity(prefix);
    if(!ent) return;
    if(!ent.endereco) ent.endereco = {};
    ent.endereco[key] = key==='uf' ? value.toUpperCase() : value;
    this.espelharSeAdministrador();
    this.agendarSalvarRascunho();
    if(prefix === 'sede' && key === 'municipio') this.reavaliarQuestionarioMunicipal();
  },
  setContato(prefix, key, value){
    const ent = this.resolveEntity(prefix);
    if(!ent) return;
    if(!ent.contato) ent.contato = {};
    ent.contato[key] = value;
    this.espelharSeAdministrador();
    this.agendarSalvarRascunho();
  },
  formatCepGenerico(prefix, el){
    let v = el.value.replace(/\D/g,'').slice(0,8);
    if(v.length>5) v = v.slice(0,5)+'-'+v.slice(5);
    el.value = v;
    this.setEndereco(prefix, 'cep', v);
    clearTimeout(this['_cepDebounce_'+prefix]);
    if(v.replace(/\D/g,'').length===8){
      this['_cepDebounce_'+prefix] = setTimeout(()=>this.buscarCepGenerico(prefix), 350);
    } else {
      this.setCepStatusGenerico(prefix, '');
    }
  },
  autoBuscarCepGenerico(prefix){
    const el = document.getElementById(prefix+'-cep');
    if(!el) return;
    const digits = el.value.replace(/\D/g,'');
    if(digits.length===8) this.buscarCepGenerico(prefix);
  },
  setCepStatusGenerico(prefix, msg, isError){
    const el = document.getElementById(prefix+'-cepStatus');
    if(!el) return;
    el.textContent = msg || '';
    el.style.color = isError ? 'var(--status-crit)' : 'var(--muted)';
  },
  async buscarCepGenerico(prefix){
    const cepEl = document.getElementById(prefix+'-cep');
    if(!cepEl) return;
    const digits = cepEl.value.replace(/\D/g,'');
    if(digits.length!==8){ this.setCepStatusGenerico(prefix, 'Digite um CEP com 8 dígitos.', true); return; }
    this.setCepStatusGenerico(prefix, 'Buscando endereço...');
    for(const prov of this.CEP_PROVIDERS){
      try{
        const ctrl = new AbortController();
        const timer = setTimeout(()=>ctrl.abort(), 5000);
        const res = await fetch(prov.url(digits), {signal: ctrl.signal});
        clearTimeout(timer);
        if(!res.ok) continue;
        const data = await res.json();
        const norm = prov.parse(data);
        if(norm && (norm.logradouro || norm.bairro || norm.municipio)){
          ['logradouro','bairro','municipio','uf'].forEach(k=>{
            if(!norm[k]) return;
            const value = k==='uf' ? norm[k].toUpperCase() : norm[k];
            this.setEndereco(prefix, k, value);
            const input = document.getElementById(prefix+'-'+k);
            if(input) input.value = value;
          });
          this.setCepStatusGenerico(prefix, `Endereço localizado via ${prov.nome}. Confira e complete Número/Complemento.`);
          if(prefix === 'sede') this.reavaliarQuestionarioMunicipal();
          return;
        }
      } catch(e){ /* provedor indisponível — tenta o próximo da lista */ }
    }
    this.setCepStatusGenerico(prefix, 'Não foi possível localizar esse CEP automaticamente (sem internet ou CEP não encontrado). Preencha o endereço manualmente.', true);
  },
  enderecoTexto(endereco){
    endereco = endereco || {};
    const linha1 = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
    const linha2 = [endereco.bairro, [endereco.municipio, endereco.uf].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
    const partes = [linha1, endereco.complemento, linha2, endereco.cep ? 'CEP '+endereco.cep : '', endereco.pontoReferencia ? 'Ref.: '+endereco.pontoReferencia : ''].filter(Boolean);
    return partes.join(', ');
  },
  enderecoCompleto(){ return this.enderecoTexto(wizard.campos.endereco); },

  /* ---------- Base de pessoas da GS2 (endereço/contato de sócios PF, representantes legais e administradores) ----------
     Cadastro interno, indexado por CPF, que vai crescendo conforme os processos são enviados (ver submitProcesso()).
     Sempre que um CPF já conhecido é digitado num desses campos, os dados salvos são sugeridos automaticamente. */
  cpfDigits(v){ return (v||'').replace(/\D/g,''); },
  limparVazios(obj){
    const out = {};
    Object.keys(obj||{}).forEach(k=>{ if(obj[k]) out[k]=obj[k]; });
    return out;
  },
  buscarPessoaPorCpf(cpf){
    const key = this.cpfDigits(cpf);
    if(key.length!==11) return null;
    return PESSOAS_CADASTRO[key] || null;
  },
  salvarPessoaNaBase(nome, cpf, endereco, contato, extras){
    const key = this.cpfDigits(cpf);
    if(key.length!==11) return;
    const existing = PESSOAS_CADASTRO[key] || {};
    const ex = extras || {};
    const _gravaPessoa = () => GS2Api.salvarCadastro('pessoas', 'pessoa-' + key, Object.assign({cpfChave:key}, PESSOAS_CADASTRO[key]));
    PESSOAS_CADASTRO[key] = {
      nome: nome || existing.nome || '',
      /* qualificação pedida pela Junta no contrato social */
      rg:           ex.rg           || existing.rg           || '',
      estadoCivil:  ex.estadoCivil  || existing.estadoCivil  || '',
      regimeBens:   ex.regimeBens   || existing.regimeBens   || '',
      naturalidade: ex.naturalidade || existing.naturalidade || '',
      nascimento:   ex.nascimento   || existing.nascimento   || '',
      endereco: Object.assign({}, existing.endereco, this.limparVazios(endereco)),
      contato: Object.assign({}, existing.contato, this.limparVazios(contato))
    };
    _gravaPessoa();
  },
  /* Chamado ao sair do campo de CPF/CNPJ de um sócio PF, representante legal ou administrador.
     Só preenche campos que ainda estão vazios — nunca sobrescreve o que o usuário já digitou. */
  autoFillPessoa(prefix){
    const ent = this.resolveEntity(prefix);
    if(!ent) return;
    const cpfValue = ent.documento!==undefined ? ent.documento : ent.cpf;
    const pessoa = this.buscarPessoaPorCpf(cpfValue);
    if(!pessoa) return;
    let changed = false;
    if(!ent.nome && pessoa.nome){
      ent.nome = pessoa.nome;
      const elNome = document.getElementById(prefix+'-nome');
      if(elNome) elNome.value = pessoa.nome;
      changed = true;
    }
    /* qualificação (RG, estado civil, naturalidade) já conhecida da pessoa */
    ['rg','estadoCivil','regimeBens','naturalidade','nascimento'].forEach(k=>{
      if(!ent[k] && pessoa[k]){
        ent[k] = pessoa[k];
        const el = document.getElementById(prefix+'-'+k);
        if(el) el.value = pessoa[k];
        changed = true;
      }
    });
    const enderecoVazio = !ent.endereco || !Object.values(ent.endereco).some(Boolean);
    if(enderecoVazio && pessoa.endereco && Object.keys(pessoa.endereco).length){
      ent.endereco = Object.assign({}, pessoa.endereco);
      Object.keys(pessoa.endereco).forEach(k=>{
        const el = document.getElementById(prefix+'-'+k);
        if(el) el.value = pessoa.endereco[k];
      });
      changed = true;
    }
    const contatoVazio = !ent.contato || !Object.values(ent.contato).some(Boolean);
    if(contatoVazio && pessoa.contato && Object.keys(pessoa.contato).length){
      ent.contato = Object.assign({}, pessoa.contato);
      Object.keys(pessoa.contato).forEach(k=>{
        const el = document.getElementById(prefix+'-'+k);
        if(el) el.value = pessoa.contato[k];
      });
      changed = true;
    }
    if(changed){
      const badge = document.getElementById(prefix+'-cadastroBadge');
      if(badge) badge.style.display = 'inline';
      this.espelharSeAdministrador();
    }
  },

  /* ---------- CNAE (base pública IBGE) ---------- */
  normalizeCnaeText(s){
    return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  },
  searchCnae(target, query){
    const box = document.getElementById(target==='principal' ? 'cnaePrincipalResults' : 'cnaeSecundariosResults');
    if(!box) return;
    const raw = (query||'').trim();
    if(raw.length < 2){ box.innerHTML=''; box.classList.remove('open'); return; }
    const nq = this.normalizeCnaeText(raw);
    const excluded = target==='secundarios' ? (wizard._cnaeSecIds||[]) : [];
    const matches = CNAE_DATA.subclasses.filter(x=>{
      if(excluded.includes(x.id)) return false;
      return this.normalizeCnaeText(x.desc).includes(nq) || x.cod.includes(raw) || x.id.includes(raw);
    }).slice(0,40);
    if(!matches.length){
      box.innerHTML = '<div class="cnae-empty">Nenhuma atividade encontrada para esta busca.</div>';
      box.classList.add('open');
      return;
    }
    const handler = target==='principal' ? 'pickCnaePrincipal' : 'addCnaeSecundario';
    box.innerHTML = matches.map(m=>`<div class="cnae-result" data-mousedown-action="${handler}" data-mousedown-args='${this.attrJson([m.id])}'><b>${m.cod}</b>${m.desc}</div>`).join('');
    box.classList.add('open');
  },
  closeCnaeResults(target){
    const box = document.getElementById(target==='principal' ? 'cnaePrincipalResults' : 'cnaeSecundariosResults');
    if(box){ box.innerHTML=''; box.classList.remove('open'); }
  },
  pickCnaePrincipal(id){
    const item = CNAE_DATA.subclasses.find(x=>x.id===id);
    if(!item) return;
    wizard.campos.cnaePrincipal = `${item.cod} - ${item.desc}`;
    wizard._cnaePrincipalId = id;
    const input = document.getElementById('cnaePrincipalSearch');
    if(input) input.value='';
    this.closeCnaeResults('principal');
    this.renderCnaePrincipalSelected();
  },
  clearCnaePrincipal(){
    wizard.campos.cnaePrincipal = '';
    wizard._cnaePrincipalId = null;
    this.renderCnaePrincipalSelected();
  },
  renderCnaePrincipalSelected(){
    const box = document.getElementById('cnaePrincipalSelected');
    if(!box) return;
    const v = wizard.campos.cnaePrincipal;
    box.innerHTML = v
      ? `<span class="cnae-chip principal">${this.escapeHtml(v)}<button type="button" data-action="clearCnaePrincipal">✕</button></span>`
      : '<span class="cnae-hint">Nenhuma atividade principal selecionada ainda.</span>';
  },
  addCnaeSecundario(id){
    const item = CNAE_DATA.subclasses.find(x=>x.id===id);
    if(!item) return;
    if(!Array.isArray(wizard.campos.cnaeSecundarios)) wizard.campos.cnaeSecundarios = [];
    if(!Array.isArray(wizard._cnaeSecIds)) wizard._cnaeSecIds = [];
    if(wizard._cnaeSecIds.includes(id)) return;
    wizard._cnaeSecIds.push(id);
    wizard.campos.cnaeSecundarios.push(`${item.cod} - ${item.desc}`);
    const input = document.getElementById('cnaeSecundariosSearch');
    if(input) input.value='';
    this.closeCnaeResults('secundarios');
    this.renderCnaeSecundariosChips();
  },
  removeCnaeSecundario(i){
    (wizard.campos.cnaeSecundarios||[]).splice(i,1);
    (wizard._cnaeSecIds||[]).splice(i,1);
    this.renderCnaeSecundariosChips();
  },
  renderCnaeSecundariosChips(){
    const box = document.getElementById('cnaeSecundariosChips');
    if(!box) return;
    const arr = wizard.campos.cnaeSecundarios || [];
    box.innerHTML = arr.length
      ? arr.map((label,i)=>`<span class="cnae-chip">${this.escapeHtml(label)}<button type="button" data-action="removeCnaeSecundario" data-args='${this.attrJson([i])}'>✕</button></span>`).join('')
      : '<span class="cnae-hint">Nenhuma atividade secundária adicionada ainda.</span>';
  },

  toggleGrupoEconomico(value){
    wizard.campos.grupoEconomico = value;
    const box = document.getElementById('grupoEconomicoDetalhes');
    if(box) box.style.display = value==='Sim' ? 'grid' : 'none';
  },
  renderSocios(){
    const list = document.getElementById('sociosList'); if(!list) return;
    list.innerHTML = wizard.socios.map((s,i)=>{
      const isPJ = s.tipo==='PJ';
      const prefix = 'socio-'+i;
      let extra;
      if(!isPJ){
        extra = `
          <div class="form-grid" style="margin-top:12px;">
            <div class="field"><label>RG (nº e órgão emissor)</label><input type="text" id="${prefix}-rg" placeholder="Ex.: 12842591 SSP MT" value="${this.escapeHtml(s.rg)}" data-action="updateSocio" data-args='${this.attrJson([i,'rg'])}' data-event="input" data-value-from="value"></div>
            ${this.camposEstadoCivil(prefix, s, 'setEstadoCivilSocio', [i], 'setRegimeBensSocio', [i])}
            <div class="field span2"><label>Local de nascimento (naturalidade)</label><input type="text" id="${prefix}-naturalidade" placeholder="Ex.: JUINA, MT" value="${this.escapeHtml(s.naturalidade)}" data-action="updateSocio" data-args='${this.attrJson([i,'naturalidade'])}' data-event="input" data-value-from="value"></div>
          </div>
          ${this.flagAdministrador('socio-'+i, !!s.admin, 'toggleAdminSocio', [i],
             'Inclui esta pessoa na administração da empresa repetindo nome, CPF, endereço e contato — sem digitar tudo de novo.')}
          ${this.renderCnhBox(prefix, s, 'do sócio')}
          <h5 style="font-size:12px;margin:14px 0 6px;color:var(--dark);">Endereço</h5>
          ${this.renderEnderecoBlock(prefix, s.endereco)}
          <h5 style="font-size:12px;margin:14px 0 6px;color:var(--dark);">Contato</h5>
          ${this.renderContatoBlock(prefix, s.contato)}`;
      } else {
        const reps = s.representantes || [];
        extra = `
          <h5 style="font-size:12px;margin:14px 0 2px;color:var(--dark);">Representantes legais</h5>
          <p class="view-sub" style="margin:0 0 8px;">Pode haver mais de um representante legal para este sócio pessoa jurídica.</p>
          ${reps.map((r,j)=>{
            const rprefix = 'rep-'+i+'-'+j;
            const corpoRep = `
              <div class="form-grid">
                <div class="field"><label>Nome do representante</label><input type="text" id="${rprefix}-nome" value="${this.escapeHtml(r.nome)}" data-action="updateRepresentante" data-args='${this.attrJson([i,j,'nome'])}' data-event="input" data-value-from="value"></div>
                <div class="field"><label>CPF <span id="${rprefix}-cadastroBadge" style="display:none;color:var(--status-good);font-size:11px;font-weight:700;">✓ dados do cadastro aplicados</span></label><input type="text" value="${this.escapeHtml(r.cpf)}" data-action="updateRepresentante" data-args='${this.attrJson([i,j,'cpf'])}' data-event="input" data-value-from="value" data-blur-action="autoFillPessoa" data-blur-args='${this.attrJson([rprefix])}'></div>
                <div class="field"><label>RG (nº e órgão emissor)</label><input type="text" id="${rprefix}-rg" placeholder="Ex.: 12842591 SSP MT" value="${this.escapeHtml(r.rg)}" data-action="updateRepresentante" data-args='${this.attrJson([i,j,'rg'])}' data-event="input" data-value-from="value"></div>
                ${this.camposEstadoCivil(rprefix, r, 'setEstadoCivilRep', [i,j], 'setRegimeBensRep', [i,j])}
                <div class="field span2"><label>Local de nascimento (naturalidade)</label><input type="text" id="${rprefix}-naturalidade" placeholder="Ex.: JUINA, MT" value="${this.escapeHtml(r.naturalidade)}" data-action="updateRepresentante" data-args='${this.attrJson([i,j,'naturalidade'])}' data-event="input" data-value-from="value"></div>
              </div>
              ${this.flagAdministrador(rprefix, !!r.admin, 'toggleAdminRep', [i,j],
                 'Inclui este representante na administração da empresa repetindo nome, CPF, endereço e contato.')}
              ${this.renderCnhBox(rprefix, r, 'do representante')}
              <h5 style="font-size:12px;margin:12px 0 6px;color:var(--dark);">Endereço</h5>
              ${this.renderEnderecoBlock(rprefix, r.endereco)}
              <h5 style="font-size:12px;margin:12px 0 6px;color:var(--dark);">Contato</h5>
              ${this.renderContatoBlock(rprefix, r.contato)}`;
            return this.caixa('rep-'+i+'-'+j, 'Representante legal #'+(j+1), corpoRep, {
              resumo: this.resumoPessoa(r, false),
              acoes: `<button type="button" class="btn ghost" data-action="removeRepresentante" data-args='${this.attrJson([i,j])}'>Remover representante</button>`
            });
          }).join('') || '<p class="view-sub" style="margin:0 0 8px;color:#b4463f;">Nenhum representante legal cadastrado ainda.</p>'}
          <button class="add-socio" data-action="addRepresentante" data-args='${this.attrJson([i])}'>+ Adicionar representante</button>`;
      }
      const corpo = `
        <div class="form-grid">
          <div class="field"><label>Tipo</label><select data-action="updateSocio" data-args='${this.attrJson([i,'tipo'])}' data-event="change" data-value-from="value">
            <option value="PF" ${!isPJ?'selected':''}>Pessoa Física</option>
            <option value="PJ" ${isPJ?'selected':''}>Pessoa Jurídica</option>
          </select></div>
          <div class="field"><label>${isPJ?'Razão social':'Nome completo'}</label><input type="text" id="${prefix}-nome" value="${this.escapeHtml(s.nome)}" data-action="updateSocio" data-args='${this.attrJson([i,'nome'])}' data-event="input" data-value-from="value"></div>
          <div class="field"><label>${isPJ?'CNPJ':'CPF'} ${!isPJ?`<span id="${prefix}-cadastroBadge" style="display:none;color:var(--status-good);font-size:11px;font-weight:700;">✓ dados do cadastro aplicados</span>`:''}</label><input type="text" value="${this.escapeHtml(s.documento)}" data-action="updateSocio" data-args='${this.attrJson([i,'documento'])}' data-event="input" data-value-from="value" ${!isPJ?`data-blur-action="autoFillPessoa" data-blur-args='${this.attrJson([prefix])}'`:''}></div>
          <div class="field"><label>% Participação</label><input type="text" value="${this.escapeHtml(s.perc)}" data-action="updateSocio" data-args='${this.attrJson([i,'perc'])}' data-event="input" data-value-from="value"></div>
          <div class="field"><label>Cargo</label><input type="text" value="${this.escapeHtml(s.cargo)}" data-action="updateSocio" data-args='${this.attrJson([i,'cargo'])}' data-event="input" data-value-from="value"></div>
        </div>
        ${extra}`;
      return this.caixa('socio-'+i, (isPJ?'Sócio PJ':'Sócio')+' #'+(i+1), corpo, {
        resumo: this.resumoPessoa(s, isPJ),
        acoes: `<button type="button" class="btn ghost" data-action="removeSocio" data-args='${this.attrJson([i])}'>Remover sócio</button>`
      });
    }).join('') || `<p class="view-sub">Nenhum sócio adicionado ainda.</p>`;
  },
  /* Qualificação resumida para a revisão, o resumo ao cliente e o PDF. */
  qualificacaoTexto(p){
    if(!p) return '';
    const casado = this.exigeRegimeBens(p.estadoCivil);
    return [
      p.rg ? 'RG ' + p.rg : '',
      p.estadoCivil ? p.estadoCivil + (casado && p.regimeBens ? ' sob ' + p.regimeBens.toLowerCase() : '') : '',
      p.naturalidade ? 'natural de ' + p.naturalidade : '',
      p.nascimento ? 'nascido(a) em ' + p.nascimento : ''
    ].filter(Boolean).join(' · ');
  },

  /* Estado civil — exigido pela Junta na qualificação de sócios e administradores
     no contrato social. Não consta na CNH, então continua sendo escolha manual. */
});
