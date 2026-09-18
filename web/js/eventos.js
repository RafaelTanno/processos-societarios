/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */

/* ======================= EVENTOS =======================
   A Content-Security-Policy (script-src sem 'unsafe-inline') bloqueia
   atributos onclick/onchange/oninput/onfocus/onblur/onkeydown/onmousedown,
   então nenhum clique ou digitação pode chamar código JS direto do HTML —
   nem no index.html, nem no HTML que as telas montam sozinhas com
   innerHTML (tabelas, cartões, formulários, listas que crescem). Em vez
   disso, tudo passa por delegação de evento num único listener por tipo de
   evento, aqui.

   ---- caso comum: um elemento, um evento ----
   data-action="metodo" despacha para App.metodo(...args) em clique
   (padrão) — ou em change/input, com data-event="change"/"input".
     • data-args é uma lista JSON com os argumentos fixos (ver
       App.attrJson, em app-1-sessao-clientes.js — sempre escapada para
       caber no atributo HTML);
     • data-value-from="value"|"checked"|"files"|"element" lê a
       propriedade do próprio elemento no momento do evento (equivalente
       ao antigo this.value/this.checked/this.files/this) e soma ao final
       dos argumentos fixos.
   Três ações não passam por App: data-action="click-target" repassa o
   clique para o <input type="file"> apontado por data-target (abrir
   seletor de arquivo a partir de um link ou de uma dropzone); data-
   action="remove-parent" remove o elemento pai de quem foi clicado (botão
   "fechar" de avisos/banners); data-action="clear-target" esvazia o
   elemento apontado por data-target.

   ---- caso raro: um elemento, vários eventos diferentes ----
   Poucos campos (busca de CNAE, CEP) reagiam a mais de um evento inline
   com ações diferentes (input pesquisa, focus repete a pesquisa, blur
   fecha o resultado). Para esses, além de data-action/data-event acima
   (que cobre o evento "principal"), existem atributos dedicados e
   independentes por evento — só use quando o evento precisar de uma ação
   DIFERENTE da de data-action:
     • data-focus-action/data-focus-args/data-focus-value-from (evento focus)
     • data-blur-action/data-blur-args/data-blur-value-from/data-blur-delay
       (evento blur; data-blur-delay atrasa o despacho em ms — usado para
       dar tempo de um clique no resultado registrar antes de fechá-lo)
     • data-mousedown-action/data-mousedown-args (evento mousedown; sempre
       chama event.preventDefault() antes, como o onmousedown original,
       para o campo não perder o foco antes do clique no resultado valer)

   ---- campos estáticos do index.html ----
   Os que reagiam a onchange/oninput/onkeydown têm id fixo e recebem o
   listener direto aqui, pelo id, no fim do arquivo. */

(function(){
  function despachar(acao, args){
    if(typeof App[acao] === 'function') App[acao].apply(App, args);
  }

  function valorDoElemento(el, prop){
    return prop === 'element' ? el : el[prop];
  }

  document.addEventListener('click', function(e){
    const el = e.target.closest('[data-action]');
    if(!el || (el.dataset.event && el.dataset.event !== 'click')) return;
    const acao = el.dataset.action;
    if(acao === 'click-target'){
      const alvo = document.getElementById(el.dataset.target);
      if(alvo) alvo.click();
      return;
    }
    if(acao === 'remove-parent'){
      if(el.parentNode) el.parentNode.remove();
      return;
    }
    if(acao === 'clear-target'){
      const alvo = document.getElementById(el.dataset.target);
      if(alvo) alvo.innerHTML = '';
      return;
    }
    const args = el.dataset.args ? JSON.parse(el.dataset.args) : [];
    if(el.dataset.valueFrom) args.push(valorDoElemento(el, el.dataset.valueFrom));
    despachar(acao, args);
  });

  ['change', 'input'].forEach(function(tipoEvento){
    document.addEventListener(tipoEvento, function(e){
      const el = e.target.closest('[data-action][data-event="' + tipoEvento + '"]');
      if(!el) return;
      const args = el.dataset.args ? JSON.parse(el.dataset.args) : [];
      if(el.dataset.valueFrom) args.push(valorDoElemento(el, el.dataset.valueFrom));
      despachar(el.dataset.action, args);
    });
  });

  document.addEventListener('focusin', function(e){
    const el = e.target.closest('[data-focus-action]');
    if(!el) return;
    const args = el.dataset.focusArgs ? JSON.parse(el.dataset.focusArgs) : [];
    if(el.dataset.focusValueFrom) args.push(valorDoElemento(el, el.dataset.focusValueFrom));
    despachar(el.dataset.focusAction, args);
  });

  document.addEventListener('focusout', function(e){
    const el = e.target.closest('[data-blur-action]');
    if(!el) return;
    const args = el.dataset.blurArgs ? JSON.parse(el.dataset.blurArgs) : [];
    if(el.dataset.blurValueFrom) args.push(valorDoElemento(el, el.dataset.blurValueFrom));
    const atraso = parseInt(el.dataset.blurDelay || '0', 10);
    if(atraso) setTimeout(function(){ despachar(el.dataset.blurAction, args); }, atraso);
    else despachar(el.dataset.blurAction, args);
  });

  document.addEventListener('mousedown', function(e){
    const el = e.target.closest('[data-mousedown-action]');
    if(!el) return;
    e.preventDefault();
    const args = el.dataset.mousedownArgs ? JSON.parse(el.dataset.mousedownArgs) : [];
    despachar(el.dataset.mousedownAction, args);
  });

  function porId(id, evento, fn){
    const el = document.getElementById(id);
    if(el) el.addEventListener(evento, fn);
  }

  porId('loginEmailGS2', 'keydown', function(e){ if(e.key === 'Enter') App.entrarGS2(); });
  porId('loginEmailCliente', 'keydown', function(e){ if(e.key === 'Enter') App.entrarCliente(); });

  porId('fiRascunho', 'change', function(){ App.abrirRascunhoArquivo(this.files); });
  porId('tplSelect', 'change', function(){ App.renderContractPreview(); });
  porId('juntaRequerente', 'change', function(){ App.setJuntaRequerente(this.value); });
  porId('juntaProtocolo', 'input', function(){ App.setJuntaProtocolo(this.value); });
  porId('rfbDbeStatus', 'change', function(){ App.setRfbDbeStatus(this.value); });
  porId('fi-dbeDeferida', 'change', function(){ App.handleDbeDeferidaFile(this.files); });

  porId('filterTipo', 'change', function(){ App.renderProcessosTable(); });
  porId('filterStatus', 'change', function(){ App.renderProcessosTable(); });
  porId('filterBusca', 'input', function(){ App.aoParar('processos', function(){ App.renderProcessosTable(); }); });

  porId('cliBusca', 'input', function(){ App.aoParar('clientes', function(){ App.renderClientesGrid(); }); });
  porId('cliFiltroSit', 'change', function(){ App.renderClientesGrid(); });

  porId('socioBusca', 'input', function(){ App.aoParar('socios', function(){ App.renderSociosCadastro(); }); });
  porId('socioFiltroDoc', 'change', function(){ App.renderSociosCadastro(); });

  porId('clientSearch', 'input', function(){ App.aoParar('wizard', function(){ App.filterClients(); }); });
})();
