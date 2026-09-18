/* O objeto App — parte 4 de 6: estado civil, OCR da CNH, sócios e administradores. */

Object.assign(App, {
  /* acaoMetodo/acaoArgs viram data-action/data-args (ver js/eventos.js): a
     CSP sem 'unsafe-inline' não deixa mais montar onchange="App.x(...)" com
     uma string de JS solta — o método e os argumentos fixos são declarados
     à parte, e this.value chega sozinho por data-value-from. */
  selectEstadoCivil(prefix, valor, acaoMetodo, acaoArgs){
    const opcoes = ['','Solteiro(a)','Casado(a)','União estável','Divorciado(a)','Separado(a) judicialmente','Viúvo(a)'];
    return `<select id="${prefix}-estadoCivil" data-action="${acaoMetodo}" data-args='${this.attrJson(acaoArgs)}' data-event="change" data-value-from="value">
      ${opcoes.map(o=>`<option value="${o}" ${((valor||'')===o)?'selected':''}>${o||'Selecione...'}</option>`).join('')}
    </select>`;
  },

  /* Regime de bens: só faz sentido para quem é casado, e aí é obrigatório na
     qualificação do contrato social — sem ele a Junta devolve em exigência.
     Por isso o campo aparece apenas quando o estado civil é "Casado(a)", e é
     limpo automaticamente se o estado civil mudar para outro. */
  REGIMES_BENS: ['Comunhão parcial de bens','Comunhão universal de bens','Separação total de bens','Separação obrigatória de bens','Participação final nos aquestos'],
  exigeRegimeBens(estadoCivil){ return (estadoCivil||'') === 'Casado(a)'; },
  selectRegimeBens(prefix, valor, acaoMetodo, acaoArgs){
    return `<select id="${prefix}-regimeBens" data-action="${acaoMetodo}" data-args='${this.attrJson(acaoArgs)}' data-event="change" data-value-from="value">
      ${[''].concat(this.REGIMES_BENS).map(o=>`<option value="${o}" ${((valor||'')===o)?'selected':''}>${o||'Selecione o regime...'}</option>`).join('')}
    </select>`;
  },
  /* Bloco "Estado civil + Regime de bens", usado nos três cadastros. */
  camposEstadoCivil(prefix, pessoa, acaoEstadoMetodo, acaoEstadoArgs, acaoRegimeMetodo, acaoRegimeArgs){
    const casado = this.exigeRegimeBens(pessoa.estadoCivil);
    return `
      <div class="field"><label>Estado civil</label>${this.selectEstadoCivil(prefix, pessoa.estadoCivil, acaoEstadoMetodo, acaoEstadoArgs)}</div>
      ${casado ? `<div class="field"><label>Regime de bens <span style="color:var(--status-crit);font-weight:700;">obrigatório</span></label>
        ${this.selectRegimeBens(prefix, pessoa.regimeBens, acaoRegimeMetodo, acaoRegimeArgs)}
        ${!pessoa.regimeBens ? `<div style="font-size:11px;color:var(--status-crit);margin-top:4px;">Casado(a) sem regime de bens é exigência certa na Junta.</div>` : ''}
      </div>` : ''}`;
  },
  /* Troca de estado civil: o regime só sobrevive enquanto a pessoa for casada. */
  aplicarEstadoCivil(pessoa, valor){
    if(!pessoa) return;
    pessoa.estadoCivil = valor;
    if(!this.exigeRegimeBens(valor)) pessoa.regimeBens = '';
  },
  setEstadoCivilSocio(i, v){ this.aplicarEstadoCivil(wizard.socios[i], v); this.renderSocios(); this.espelharSeAdministrador(); },
  setRegimeBensSocio(i, v){ wizard.socios[i].regimeBens = v; this.renderSocios(); this.espelharSeAdministrador(); },
  setEstadoCivilRep(i, j, v){ this.aplicarEstadoCivil(wizard.socios[i].representantes[j], v); this.renderSocios(); this.espelharSeAdministrador(); },
  setRegimeBensRep(i, j, v){ wizard.socios[i].representantes[j].regimeBens = v; this.renderSocios(); this.espelharSeAdministrador(); },
  setEstadoCivilAdmin(k, v){ this.aplicarEstadoCivil(wizard.administradores[k], v); this.renderAdministradores(); },
  setRegimeBensAdmin(k, v){ wizard.administradores[k].regimeBens = v; this.renderAdministradores(); },

  /* Flag "Administrador" no cadastro da própria pessoa. */
  flagAdministrador(prefix, marcado, acaoMetodo, acaoArgs, ajuda){
    return `<label class="flag-admin" for="${prefix}-admin">
      <input type="checkbox" id="${prefix}-admin" ${marcado?'checked':''} data-action="${acaoMetodo}" data-args='${this.attrJson(acaoArgs)}' data-event="change" data-value-from="checked">
      <span><b>Administrador</b><span class="ajuda">${this.escapeHtml(ajuda)}</span></span>
    </label>`;
  },

  /* ---------- CNH digital do sócio com leitura automática (OCR) ----------
     O colaborador anexa a CNH-e (PDF ou foto) e a ferramenta preenche nome, CPF,
     RG, nascimento e validade. Depois do CPF preenchido ela ainda consulta a base
     de pessoas da GS2 para completar endereço e contato, quando o CPF já é conhecido.
     Fase 1: leitura simulada. Fase integrada: OCR real (Azure Document Intelligence
     ou equivalente) sobre o arquivo enviado, sem digitação manual. */
  renderCnhBox(prefix, pessoa, rotulo){
    const cnh = pessoa.cnh || null;
    const inputFile = `<input type="file" id="fi-cnh-${prefix}" accept=".pdf,.jpg,.jpeg,.png" style="display:none" data-action="lerCnh" data-args='${this.attrJson([prefix])}' data-event="change" data-value-from="files">`;
    const rotuloFonte = {
      'pdf-texto':'camada de texto do PDF',
      'pdf-ocr':'OCR sobre a página do PDF',
      'imagem-ocr':'OCR sobre a imagem'
    };

    if(cnh && cnh.lido){
      const parcial = (cnh.achados||0) < 5;
      const cor = parcial ? 'warn' : 'good';
      return `
        <div class="ocr-strip" style="margin:14px 0 0;background:var(--status-${cor}-bg);color:var(--status-${cor});align-items:flex-start;">
          <span>${parcial?'⚠️':'✓'}</span>
          <span class="grow">
            <b>CNH lida</b> (${this.escapeHtml(rotuloFonte[cnh.fonte]||cnh.fonte)}): ${this.escapeHtml(cnh.arquivo)}
            ${parcial ? `<div style="font-size:11.5px;margin-top:3px;">Reconheci ${cnh.achados} de 6 campos. Confira e complete o que faltou — os campos acima são editáveis.</div>` : ''}
            <div style="margin-top:5px;font-size:11.5px;line-height:1.7;">
              Nome: <b>${this.escapeHtml(cnh.nome||'—')}</b> · CPF: <b>${this.escapeHtml(cnh.cpf||'—')}</b> · RG: ${this.escapeHtml(cnh.rg||'—')}<br>
              Nascimento: ${this.escapeHtml(cnh.nascimento||'—')} · Local de nascimento: ${this.escapeHtml(cnh.naturalidade||'—')}<br>
              Registro: ${this.escapeHtml(cnh.registro||'—')} · Validade: ${this.escapeHtml(cnh.validade||'—')} · Categoria: ${this.escapeHtml(cnh.categoria||'—')}
            </div>
            <div style="font-size:11px;margin-top:6px;font-family:ui-monospace,monospace;opacity:.9;">
              ↳ ${cnh.arquivada && !cnh.arquivada.pendente ? 'arquivada em' : 'será arquivada em'} <b>${this.escapeHtml(cnh.destinoPasta||'')}</b><br>
              &nbsp;&nbsp;&nbsp;como <b>${this.escapeHtml(cnh.destinoArquivo||'')}</b>
            </div>
            ${cnh.arquivada ? (cnh.arquivada.pendente
              ? `<div style="font-size:11.5px;margin-top:5px;">A pasta desta empresa ainda está sendo criada — o arquivamento sai no relatório de envio do processo.</div>`
              : `<div style="font-size:11.5px;margin-top:5px;">Vinculada ao sócio na ficha de <b>${this.escapeHtml(cnh.arquivada.cliente)}</b>${cnh.arquivada.socioCriado?' (o sócio foi incluído na ficha)':''} — o <b>arquivamento no SharePoint acontece ao enviar o processo</b>.</div>`) : ''}
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn" style="padding:4px 11px;font-size:11px;" data-action="click-target" data-target="fi-cnh-${prefix}">Trocar arquivo</button>
              <button class="btn" style="padding:4px 11px;font-size:11px;" data-action="verTextoCnh" data-args='${this.attrJson([prefix])}'>Ver texto extraído</button>
            </div>
          </span>
        </div>${inputFile}`;
    }

    if(cnh && !cnh.lido){
      const motivo = cnh.fonte === 'sem-pdfjs'
        ? 'O leitor de PDF não carregou — provavelmente a página abriu sem internet. Recarregue com conexão e tente de novo.'
        : (cnh.fonte === 'erro'
            ? 'A leitura falhou. Veja o diagnóstico para entender o que aconteceu.'
            : 'O OCR rodou mas não reconheceu os campos com segurança. Isso acontece com imagem de baixa resolução ou muito inclinada. Veja o texto extraído, tente outro arquivo, ou preencha os campos manualmente — eles continuam editáveis.');
      return `
        <div class="ocr-strip" style="margin:14px 0 0;background:var(--status-crit-bg);color:var(--status-crit);align-items:flex-start;">
          <span>✕</span>
          <span class="grow"><b>Não consegui extrair os dados de ${this.escapeHtml(cnh.arquivo)}.</b>
            <div style="font-size:11.5px;margin-top:3px;">${motivo}</div>
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn" style="padding:4px 11px;font-size:11px;" data-action="click-target" data-target="fi-cnh-${prefix}">Tentar outro arquivo</button>
              <button class="btn" style="padding:4px 11px;font-size:11px;" data-action="verTextoCnh" data-args='${this.attrJson([prefix])}'>Ver diagnóstico</button>
            </div>
          </span>
        </div>${inputFile}`;
    }

    return `
      <div style="margin:14px 0 0;">
        <label style="display:block;font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:.03em;">
          CNH ${rotulo} <span class="ocr-tag">leitura automática</span>
        </label>
        <div class="dropzone" id="dz-cnh-${prefix}" style="text-align:left;min-width:0;" data-action="click-target" data-target="fi-cnh-${prefix}">
          Anexe a CNH em <b>PDF</b> (a CNH-e do app serve) ou uma <b>foto</b> — a ferramenta lê e preenche nome, CPF, RG, nascimento, local de nascimento, registro e validade
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">A leitura roda no seu próprio navegador: o documento não é enviado para nenhum servidor. Na primeira vez o OCR baixa o idioma (alguns segundos).</div>
        ${inputFile}
      </div>`;
  },

  lerCnh(prefix, files){
    if(!files || !files.length) return;
    const file = files[0];
    const ehPdf = /\.pdf$/i.test(file.name);
    const progresso = txt => { const d = document.getElementById('dz-cnh-'+prefix); if(d){ d.classList.add('filled'); d.textContent = txt; } };
    progresso('Abrindo o arquivo...');

    const finalizar = (campos, texto, fonte, diag) => this.aplicarCnh(prefix, file.name, campos, texto, fonte, diag, file);

    if(ehPdf){
      if(!window.pdfjsLib){ finalizar(null, '', 'sem-pdfjs', {}); return; }
      /* 1) tenta a camada de texto (mais rápido e exato, quando existe).
         Na CNH-e a camada só tem o cabeçalho e o aviso do Assinador Serpro —
         por isso só é aceita quando traz um nome confiável junto com os demais
         campos; caso contrário o caminho é o OCR do cartão. */
      this.extrairTextoPdf(file).then(texto=>{
        const campos = this.extrairCamposCnh(texto);
        const caracteres = (texto||'').trim().length;
        if(campos.nome && campos.achados >= 3){
          finalizar(campos, texto, 'pdf-texto', {caracteres: caracteres, achados: campos.achados});
          return;
        }
        /* 2) é a CNH-e (o cartão é imagem): OCR imagem a imagem, mesclando o
              que cada passada reconhecer, até ter nome + campos suficientes */
        return this.canvasesParaOcr(file).then(canvases=>{
          if(!canvases || !canvases.length) throw new Error('não consegui extrair a imagem da CNH do PDF');
          let melhor = null, textoTudo = '', passadas = 0;
          const passo = k => {
            if(k >= canvases.length) return Promise.resolve();
            passadas++;
            progresso(canvases.length>1 ? `Lendo a CNH com OCR (imagem ${k+1} de ${canvases.length})...` : 'Lendo a CNH com OCR...');
            return this.ocrCanvas(canvases[k], progresso).then(txt=>{
              textoTudo += (textoTudo ? '\n\n───\n\n' : '') + (txt||'');
              const c = this.extrairCamposCnh(txt);
              melhor = this.mesclarCamposCnh(melhor, c);
              if(melhor.nome && melhor.achados >= 4) return;   /* já deu: para aqui */
              return passo(k+1);
            });
          };
          return passo(0).then(()=>{
            const c = melhor || this.extrairCamposCnh('');
            finalizar(c, textoTudo, 'pdf-ocr', {caracteres: caracteres, achados: c.achados, ocr:true, imagens: canvases.length, passadas: passadas});
          });
        });
      }).catch(err=>{
        console.error('Falha ao ler a CNH:', err);
        finalizar(null, '', 'erro', {erro: String(err && err.message || err)});
      });
      return;
    }

    /* imagem enviada direto (foto ou print) */
    progresso('Rodando OCR na imagem...');
    this.imagemParaCanvas(file)
      .then(canvas=>this.ocrCanvas(canvas, progresso))
      .then(txt=>{
        const campos = this.extrairCamposCnh(txt);
        finalizar(campos, txt, 'imagem-ocr', {achados: campos.achados, ocr:true});
      })
      .catch(err=>{
        console.error('Falha no OCR da imagem:', err);
        finalizar(null, '', 'erro', {erro: String(err && err.message || err)});
      });
  },

  /* Lê a camada de texto do PDF, página a página, preservando a ordem dos itens. */
  extrairTextoPdf(file){
    return file.arrayBuffer().then(buf=>
      pdfjsLib.getDocument({data: new Uint8Array(buf)}).promise.then(pdf=>{
        const paginas = [];
        for(let n=1; n<=pdf.numPages; n++) paginas.push(n);
        return paginas.reduce((seq, n)=>seq.then(acc=>
          pdf.getPage(n)
            .then(pg=>pg.getTextContent())
            .then(tc=>acc + tc.items.map(it=>it.str).join('\n') + '\n')
        ), Promise.resolve(''));
      })
    );
  },

  /* ---------- Da página do PDF para a imagem que vai ao OCR ----------
     A CNH-e do app é uma folha A4 com o cartão colado como IMAGEM de 963x680px,
     ocupando cerca de 40% da largura da página. Renderizar a página inteira, por
     maior que seja a escala, entrega o cartão em tamanho parecido com o original
     — texto pequeno demais, e o OCR devolve lixo no lugar do nome. A saída é
     pegar a imagem embutida direto do PDF e ampliá-la sozinha. */
  imagensDoPdf(page){
    return page.getOperatorList().then(ops=>{
      const OPS = pdfjsLib.OPS || {};
      const nomes = [];
      for(let i=0;i<ops.fnArray.length;i++){
        const fn = ops.fnArray[i];
        if(fn===OPS.paintImageXObject || fn===OPS.paintJpegXObject){
          const n = ops.argsArray[i] && ops.argsArray[i][0];
          if(typeof n === 'string' && nomes.indexOf(n)===-1) nomes.push(n);
        }
      }
      /* page.objs.get é assíncrono por callback e pode nunca responder: timeout curto */
      const pega = n => new Promise(res=>{
        let pronto = false;
        const fim = o => { if(!pronto){ pronto=true; clearTimeout(t); res(o||null); } };
        const t = setTimeout(()=>fim(null), 5000);
        try{ page.objs.get(n, fim); }catch(e){ fim(null); }
      });
      return nomes.reduce((p,n)=>p.then(acc=>pega(n).then(o=>{
        if(o && o.width && o.height) acc.push(o);
        return acc;
      })), Promise.resolve([]));
    }).catch(()=>[]);
  },

  /* Desenha uma imagem extraída do PDF num canvas ampliado. O OCR precisa de
     letras com uns 25px de altura; a 2x-3x do original o cartão chega lá. */
  imagemPdfParaCanvas(obj, alvoLargura){
    const w = obj.width, h = obj.height;
    if(!w || !h) return null;
    const escala = Math.max(1, Math.min(4, (alvoLargura || 2200) / w));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(w * escala);
    canvas.height = Math.round(h * escala);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled = true;
    try{ ctx.imageSmoothingQuality = 'high'; }catch(e){}

    if(obj.bitmap){                       /* pdf.js moderno: ImageBitmap pronto */
      ctx.drawImage(obj.bitmap, 0, 0, canvas.width, canvas.height);
      return canvas;
    }
    if(obj.data){                         /* pdf.js antigo: buffer cru */
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d');
      const dado = tctx.createImageData(w, h);
      const src = obj.data, dst = dado.data;
      if(obj.kind === 3 || src.length === w*h*4){          /* RGBA */
        dst.set(src.subarray(0, w*h*4));
      } else if(obj.kind === 2 || src.length === w*h*3){   /* RGB */
        for(let i=0,j=0;i<w*h;i++,j+=3){ dst[i*4]=src[j]; dst[i*4+1]=src[j+1]; dst[i*4+2]=src[j+2]; dst[i*4+3]=255; }
      } else {                                             /* 1bpp / cinza */
        for(let i=0;i<w*h;i++){ const g = src[i] !== undefined ? src[i] : 255; dst[i*4]=dst[i*4+1]=dst[i*4+2]=g; dst[i*4+3]=255; }
      }
      tctx.putImageData(dado, 0, 0);
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
      return canvas;
    }
    return null;
  },

  /* Devolve, em ordem de prioridade, os canvases que valem a pena mandar para o
     OCR: primeiro as imagens embutidas grandes (o cartão), da maior para a menor;
     se o PDF não tiver imagem extraível, a página renderizada inteira. */
  canvasesParaOcr(file){
    return file.arrayBuffer().then(buf=>
      pdfjsLib.getDocument({data: new Uint8Array(buf)}).promise.then(pdf=>
        pdf.getPage(1).then(page=>
          this.imagensDoPdf(page).then(imagens=>{
            const grandes = imagens
              .filter(o => o.width >= 350 && o.height >= 200)
              .sort((a,b) => (b.width*b.height) - (a.width*a.height))
              .slice(0, 3);
            const canvases = grandes.map(o => this.imagemPdfParaCanvas(o, 2200)).filter(Boolean);
            if(canvases.length) return canvases;
            /* sem imagem embutida: renderiza a página inteira, bem grande */
            const base = page.getViewport({scale:1});
            const escala = Math.min(6, Math.max(3, 3000 / base.width));
            const viewport = page.getViewport({scale: escala});
            const canvas = document.createElement('canvas');
            canvas.width  = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
            return page.render({canvasContext: ctx, viewport: viewport}).promise.then(()=>[canvas]);
          })
        )
      )
    );
  },

  imagemParaCanvas(file){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=>{
        const escala = Math.min(3, Math.max(1, 2200 / img.width));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width*escala);
        canvas.height = Math.round(img.height*escala);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        resolve(canvas);
      };
      img.onerror = ()=>reject(new Error('não foi possível abrir a imagem'));
      img.src = URL.createObjectURL(file);
    });
  },

  /* OCR no navegador. Converte para tons de cinza e só isso: reforçar contraste
     aqui parecia boa ideia, mas engorda as letras finas do nome na CNH e o
     Tesseract passa a errá-las — testado com CNH-e real, o cinza puro lê o nome
     e o contraste "melhorado" não lê. */
  ocrCanvas(canvas, progresso){
    if(!window.Tesseract) return Promise.reject(new Error('Tesseract não carregou (sem internet?)'));
    try{
      const ctx = canvas.getContext('2d');
      const img = ctx.getImageData(0,0,canvas.width,canvas.height);
      const d = img.data;
      for(let k=0;k<d.length;k+=4){
        const g = 0.299*d[k] + 0.587*d[k+1] + 0.114*d[k+2];
        d[k]=d[k+1]=d[k+2]=g;
      }
      ctx.putImageData(img,0,0);
    }catch(e){ /* canvas "sujo" ou sem permissão: segue sem pré-processar */ }

    return Tesseract.recognize(canvas, 'por', {
      logger: m => {
        if(m.status === 'recognizing text' && progresso){
          progresso('Lendo a CNH com OCR... ' + Math.round((m.progress||0)*100) + '%');
        } else if(progresso && m.status){
          progresso('OCR: ' + m.status + '...');
        }
      }
    }).then(res => (res && res.data && res.data.text) || '');
  },


  /* Mapeia o texto da CNH para os campos do cadastro.
     Precisa aguentar dois cenários bem diferentes: PDF com camada de texto (rótulo
     e valor em linhas separadas) e saída de OCR (rótulo e valor na MESMA linha, com
     ruído). Por isso cada campo é procurado na mesma linha do rótulo, nas linhas
     seguintes e, por último, por formato no texto inteiro. O que não for encontrado
     fica em branco — nunca é inventado. */
  extrairCamposCnh(texto){
    const bruto = String(texto||'');
    const linhas = bruto.split(/\n+/).map(l=>l.trim()).filter(Boolean);
    const semAcento = t => String(t||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

    const ehData = v => /^\d{2}\/\d{2}\/\d{4}$/.test(v.trim());
    const ehCpf  = v => /^\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}$/.test(v.trim());
    const ehRegistro = v => /^\d{9,11}$/.test(v.replace(/\D/g,'')) && !/[A-Za-z]/.test(v);
    const ehCategoria = v => /^(A|B|C|D|E|AB|AC|AD|AE|ACC)$/.test(v.replace(/[\s.]/g,'').toUpperCase());
    const RUIDO = /(REPUBLICA|FEDERATIVA|CARTEIRA|NACIONAL|HABILITACAO|MINISTERIO|INFRAESTRUTURA|DENATRAN|DETRAN|IDENTIDADE|VALIDADE|NASCIMENTO|FILIACAO|PERMISSAO|OBSERVACOES|ASSINATURA|PORTADOR|CADASTRO|DOCUMENTO|EMISSOR|LOCAL|DATA|REGISTRO|CATEGORIA|SEGURANCA|TRANSITO|CODIGO|VALIDAR|CONSULTA|QR ?CODE|ACC|SENATRAN|EMISSAO|ESTADO|SECRETARIA|MUNICIPIO|BRASIL|NOME|SOBRENOME|CPF|HAB)/;

    /* Partículas que fazem parte de nome brasileiro ("DE", "DOS", "E"...). */
    const PARTICULA = /^(DE|DA|DO|DAS|DOS|E|D|VON|VAN|LA|DEL)$/;
    /* Palavras que NUNCA aparecem em um nome próprio. Elas são o que separa o nome
       do titular das frases de rodapé da CNH-e — em especial
       "A autenticidade deste documento pode SER CONFIRMADA POR MEIO DO PROGRAMA
       ASSINADOR SERPRO", que tem cara de nome (só letras, várias palavras) e por
       ser a linha mais longa vencia a disputa com o nome verdadeiro. */
    const NAO_NOME = /^(A|O|AS|OS|UM|UMA|UNS|UMAS|SER|SEJA|SERA|FOI|PODE|PODERA|PODEM|DEVE|DEVERA|POR|PARA|COM|SEM|SOB|SOBRE|QUE|QUAL|NO|NA|NOS|NAS|EM|AO|AOS|ESTE|ESTA|ESSE|ESSA|ISTO|ISSO|DESTE|DESTA|DESSE|DESSA|PELO|PELA|PELOS|PELAS|SEU|SUA|SEUS|SUAS|MEIO|PROGRAMA|ASSINADOR|SERPRO|AUTENTICIDADE|AUTENTICADO|AUTENTICACAO|CONFIRMADA|CONFIRMAR|CONFIRMACAO|VERIFICACAO|VERIFICAR|VALIDO|VALIDA|VALIDOS|VALIDAS|IMPRESSO|IMPRESSA|DIGITAL|DIGITALMENTE|ELETRONICO|ELETRONICA|VIA|COPIA|ORIGINAL|TERRITORIO|CONFORME|LEI|ART|ARTIGO|INCISO|PORTARIA|RESOLUCAO|CONTRAN|SITE|WWW|GOV|COM|ONLINE|APLICATIVO|APP|CELULAR|LEITURA|CHAVE|ACESSO|ASSINADO|ICP|CNH|RENACH|MODELO|FORMULARIO|PAGINA|FOLHA|ANEXO|OBSERVACAO|RESTRICOES|EXERCE|REMUNERADA|ATIVIDADE)$/;

    /* Nome do titular: aceita caixa mista e acento (o OCR nem sempre devolve tudo
       em maiúsculas), exige pelo menos duas palavras, descarta as linhas de rótulo
       e de cabeçalho e recusa qualquer linha que contenha palavra de frase — nome
       próprio só tem nomes e partículas. */
    const ehNome = v => {
      const t = String(v||'').trim().replace(/\s+/g,' ').replace(/[.,;:]+$/,'');
      if(t.length < 8 || t.length > 70) return false;
      if(/[0-9@_/\\|]/.test(t)) return false;
      if(!/^[A-Za-zÀ-ÿ'´` .-]+$/.test(t)) return false;
      if(RUIDO.test(semAcento(t))) return false;
      const palavras = t.split(' ').filter(Boolean);
      if(palavras.length < 2 || palavras.length > 8) return false;
      const cheias = palavras.filter(p=>!PARTICULA.test(semAcento(p)));
      if(cheias.length < 2) return false;                       /* "DA SILVA" sozinho não é nome */
      if(PARTICULA.test(semAcento(palavras[0]))) return false;  /* nome não começa com partícula */
      for(const p of palavras){ if(NAO_NOME.test(semAcento(p))) return false; }
      return true;
    };
    const limparNome = v => String(v||'').trim().replace(/\s+/g,' ').replace(/[.,;:]+$/,'');

    /* Guarda contra lixo de OCR. Quando a imagem sai ruim, o Tesseract devolve
       coisas como "FD EA X NEPAPLOOO LE E FR" — passa em ehNome (só letras,
       várias palavras) mas obviamente não é nome de gente. Um nome de verdade
       tem pelo menos duas palavras de 3+ letras e toda palavra tem vogal.
       Se não passar aqui, o campo fica VAZIO: melhor em branco do que errado. */
    const nomeConfiavel = v => {
      const t = limparNome(v);
      if(!ehNome(t)) return false;
      const palavras = t.split(' ').filter(Boolean);
      const cheias = palavras.filter(p=>!PARTICULA.test(semAcento(p)));
      if(cheias.length < 2) return false;
      if(cheias.some(p=>p.length < 3)) return false;
      if(cheias.some(p=>!/[AEIOUY]/.test(semAcento(p)))) return false;
      if(t.replace(/[^A-Za-zÀ-ÿ]/g,'').length < 10) return false;
      return true;
    };

    /* Uma linha de OCR quase nunca traz só o valor: vem "FULANO DE TAL |
       23/03/2004 |" ou "000.000.000-00 00000000000 AB". Por isso cada linha é
       quebrada em pedaços (por | e por espaços largos) e, quando o campo é curto,
       também em palavras soltas. */
    const segmentos = linha => String(linha||'')
      .split(/\s*[|¦\[\]{}]\s*|\s{2,}/)
      .map(x=>x.trim().replace(/^[:.\-–=]+|[:.\-–=]+$/g,'').trim()).filter(Boolean);
    const tokens = linha => String(linha||'').split(/[\s|¦\[\]{},;]+/).map(x=>x.trim()).filter(Boolean);

    /* procura o valor na mesma linha do rótulo e nas linhas seguintes.
       nivel: 'linha' (valor ocupa a linha toda), 'segmento' ou 'token'. */
    const acharPorRotulo = (rotulos, valido, alcance, nivel)=>{
      alcance = alcance || 6;
      nivel = nivel || 'segmento';
      const candidatosDe = txt => {
        const out = [txt];
        if(nivel === 'linha') return out;
        segmentos(txt).forEach(s=>out.push(s));
        if(nivel === 'token') tokens(txt).forEach(s=>out.push(s));
        return out;
      };
      for(const r of rotulos){
        for(let idx=0; idx<linhas.length; idx++){
          const norm = semAcento(linhas[idx]);
          const pos = norm.indexOf(r);
          if(pos === -1) continue;
          /* (a) resto da mesma linha, depois do rótulo */
          const resto = linhas[idx].slice(pos + r.length).replace(/^[\s:.\-–|]+/,'').trim();
          if(resto){ for(const c of candidatosDe(resto)){ if(valido(c)) return c; } }
          /* (b) linhas seguintes */
          for(let k=idx+1; k<Math.min(idx+1+alcance, linhas.length); k++){
            for(const c of candidatosDe(linhas[k])){ if(valido(c)) return c; }
          }
        }
      }
      return '';
    };
    const porFormato = re => { const m = bruto.match(re); return m ? m[0].trim() : ''; };
    const limparCpf = v => { const d = v.replace(/\D/g,''); return d.length===11 ? d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9) : v.trim(); };

    /* Na mesma faixa do cartão convivem o CPF e o Nº de registro da CNH, os dois
       com 11 dígitos — o registro chegava a ser gravado como CPF. O dígito
       verificador desempata: só o CPF de verdade fecha a conta do módulo 11. */
    const cpfDigitoOk = v => {
      const d = String(v||'').replace(/\D/g,'');
      if(d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
      let s = 0;
      for(let i=0;i<9;i++) s += (+d[i]) * (10-i);
      let r = (s*10) % 11; if(r === 10) r = 0;
      if(r !== +d[9]) return false;
      s = 0;
      for(let i=0;i<10;i++) s += (+d[i]) * (11-i);
      r = (s*10) % 11; if(r === 10) r = 0;
      return r === +d[10];
    };
    const ehCpfSeguro = v => ehCpf(v) && cpfDigitoOk(v);

    let cpf = acharPorRotulo(['CPF'], ehCpfSeguro, 6, 'token')
           || (bruto.match(/\b\d{3}[.\s]\d{3}[.\s]\d{3}[-\s]\d{2}\b/g)||[]).find(cpfDigitoOk)
           || acharPorRotulo(['CPF'], ehCpf, 6, 'token')
           || porFormato(/\d{3}[.\s]\d{3}[.\s]\d{3}[-\s]\d{2}/);
    if(cpf) cpf = limparCpf(cpf);
    const cpfDigitos = cpf.replace(/\D/g,'');

    /* 1) pelo rótulo  2) o nome logo ABAIXO do rótulo "NOME", antes da filiação
       (é essa a ordem na CNH)  3) o mais longo que sobrar.
       Os nomes do pai e da mãe vêm depois de "FILIACAO" — tudo dali para baixo é
       descartado, senão o nome da mãe pode ganhar do titular por ser maior. */
    let nome = acharPorRotulo(['NOME E SOBRENOME','NOME DO TITULAR','NOME'], nomeConfiavel, 3);
    if(!nome){
      const posDe = alvo => linhas.findIndex(l => semAcento(l).indexOf(alvo) > -1);
      const idxCpf = cpfDigitos ? linhas.findIndex(l => l.replace(/\D/g,'').indexOf(cpfDigitos) > -1) : -1;
      const idxFiliacao = posDe('FILIACAO');
      const idxRotuloNome = posDe('NOME');

      let candidatas = [];
      linhas.forEach((l, k)=>{
        segmentos(l).concat([l]).forEach(s=>{ if(nomeConfiavel(s)) candidatas.push({txt:limparNome(s), pos:k}); });
      });
      if(idxFiliacao > -1) candidatas = candidatas.filter(c=>c.pos < idxFiliacao);

      const abaixoDoRotulo = idxRotuloNome > -1 ? candidatas.filter(c=>c.pos > idxRotuloNome) : [];
      if(abaixoDoRotulo.length){
        abaixoDoRotulo.sort((a,b)=> a.pos - b.pos || b.txt.length - a.txt.length);
        nome = abaixoDoRotulo[0].txt;
      } else {
        const antesDoCpf = idxCpf > -1 ? candidatas.filter(c=>c.pos < idxCpf) : [];
        const pool = antesDoCpf.length ? antesDoCpf : candidatas;
        pool.sort((a,b)=> b.txt.length - a.txt.length);
        nome = pool.length ? pool[0].txt : '';
      }
    }
    nome = nomeConfiavel(nome) ? limparNome(nome).toUpperCase() : '';

    /* Datas: numa CNH o nascimento é sempre a data mais antiga do documento e a
       validade sempre a mais recente — mais confiável do que casar com o rótulo,
       porque "4a DATA EMISSÃO" e "4b VALIDADE" dividem a mesma linha e o OCR não
       preserva qual valor é de qual. O rótulo só entra quando há poucas datas. */
    const datas = (bruto.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || [])
      .map(d=>({txt:d, ms:new Date(+d.slice(6), +d.slice(3,5)-1, +d.slice(0,2)).getTime()}))
      .filter(d=>!isNaN(d.ms)).sort((a,b)=>a.ms-b.ms);
    let nascimento = datas.length ? datas[0].txt : acharPorRotulo(['DATA NASCIMENTO','DATA DE NASCIMENTO','NASCIMENTO'], ehData, 6, 'token');
    let validade   = datas.length ? datas[datas.length-1].txt : acharPorRotulo(['VALIDADE'], ehData, 6, 'token');
    if(datas.length === 1) validade = '';   /* uma data só não diz nascimento E validade */

    /* Registro: 9 a 11 dígitos puros. Precisa recusar o CPF, que também tem 11
       dígitos — por isso exige o token SEM ponto e sem traço, e diferente do CPF. */
    const ehRegistroPuro = v => {
      const t = String(v||'').trim();
      if(!/^\d{9,11}$/.test(t)) return false;
      return !cpfDigitos || t !== cpfDigitos;
    };
    let registro = acharPorRotulo(['N REGISTRO','NO REGISTRO','N° REGISTRO','REGISTRO'], ehRegistroPuro, 6, 'token');
    registro = registro ? registro.replace(/\D/g,'') : '';

    const categoria = (acharPorRotulo(['CAT HAB','CATEGORIA','CAT'], ehCategoria, 4, 'token') || '').replace(/[\s.]/g,'').toUpperCase();

    /* RG: "12842591 SSP MT" — número seguido de órgão e UF, no segmento inteiro */
    const ehRg = v => {
      const t = String(v||'').trim();
      if(t.length < 5 || t.length > 30) return false;
      if(ehCpf(t) || ehData(t)) return false;
      const digitos = t.replace(/\D/g,'');
      if(digitos.length < 5 || digitos.length > 12) return false;
      if(cpfDigitos && digitos === cpfDigitos) return false;
      return /^[0-9][0-9.\-\/ ]*[A-Za-zÀ-ÿ0-9 .\-\/]*$/.test(t);
    };
    const rg = acharPorRotulo(['DOC IDENTIDADE','IDENTIDADE','ORG EMISSOR'], ehRg, 4);

    /* Local de nascimento: na CNH o campo 3 é "DATA, LOCAL E UF DE NASCIMENTO" e
       vem numa linha só — "30/08/1983, JUINA, MT". A data já foi extraída acima;
       o que sobra depois dela é a naturalidade. */
    let naturalidade = '';
    const ehLocal = v => {
      const t = String(v||'').trim().replace(/^[,;.\-–\s]+/,'').replace(/[,;.\-–\s]+$/,'');
      if(t.length < 3 || t.length > 60) return false;
      if(/\d/.test(t)) return false;
      if(!/^[A-Za-zÀ-ÿ' .\-\/,]+$/.test(t)) return false;
      if(RUIDO.test(semAcento(t))) return false;
      return true;
    };
    for(let idx=0; idx<linhas.length && !naturalidade; idx++){
      const m = linhas[idx].match(/\b\d{2}\/\d{2}\/\d{4}\b\s*[,\-–]\s*(.+)$/);
      if(!m) continue;
      /* o OCR deixa colchetes e barras no fim da linha: fica só o primeiro pedaço */
      const cap = segmentos(m[1])[0] || m[1];
      if(ehLocal(cap)) naturalidade = cap;
    }
    if(!naturalidade){
      naturalidade = acharPorRotulo(['LOCAL E UF DE NASCIMENTO','LOCAL DE NASCIMENTO','NATURALIDADE'], ehLocal, 3);
    }
    if(naturalidade){
      naturalidade = naturalidade.trim().replace(/^[,;.\-–\s]+|[,;.\-–\s]+$/g,'').replace(/\s+/g,' ').toUpperCase();
    }

    const achados = [nome, cpf, nascimento, validade, registro, categoria].filter(Boolean).length;
    return {nome, cpf, rg, nascimento, naturalidade, validade, registro, categoria, achados};
  },

  /* Junta o resultado de duas passadas de OCR (frente e verso do cartão, por
     exemplo): cada campo fica com o primeiro valor não vazio encontrado. */
  mesclarCamposCnh(a, b){
    if(!a) return b;
    if(!b) return a;
    const out = {};
    ['nome','cpf','rg','nascimento','naturalidade','validade','registro','categoria'].forEach(k=>{
      out[k] = a[k] || b[k] || '';
    });
    out.achados = [out.nome, out.cpf, out.nascimento, out.validade, out.registro, out.categoria].filter(Boolean).length;
    return out;
  },

  /* Aplica no cadastro o que foi lido — serve tanto para sócio pessoa física
     (prefixo "socio-N") quanto para representante legal de sócio PJ
     ("rep-N-M"), que guardam o CPF em campos de nome diferente. */
  aplicarCnh(prefix, arquivo, campos, textoBruto, fonte, diag, file){
    const pessoa = this.resolveEntity(prefix);
    if(!pessoa) return;
    const ehRep = String(prefix||'').indexOf('rep-') === 0;
    const ok = campos && campos.achados >= 2;

    const destino = this.destinoCnhSocio({nome: (campos && campos.nome) || pessoa.nome}, arquivo);
    pessoa.cnh = {
      arquivo: arquivo,
      /* o File em si, para o envio real ao SharePoint (não vai para o rascunho) */
      file: file || null,
      destinoPasta: destino.pasta,
      destinoArquivo: destino.arquivo,
      lido: ok,
      fonte: fonte,
      diag: diag || {},
      textoBruto: textoBruto || '',
      nome: (campos && campos.nome) || '',
      cpf: (campos && campos.cpf) || '',
      rg: (campos && campos.rg) || '',
      nascimento: (campos && campos.nascimento) || '',
      naturalidade: (campos && campos.naturalidade) || '',
      registro: (campos && campos.registro) || '',
      validade: (campos && campos.validade) || '',
      categoria: (campos && campos.categoria) || '',
      achados: campos ? campos.achados : 0
    };

    if(ok){
      if(campos.nome) pessoa.nome = campos.nome;
      if(campos.cpf){ if(ehRep) pessoa.cpf = campos.cpf; else pessoa.documento = campos.cpf; }
      if(campos.rg) pessoa.rg = campos.rg;
      if(campos.nascimento) pessoa.nascimento = campos.nascimento;
      if(campos.naturalidade) pessoa.naturalidade = campos.naturalidade;
      pessoa.cnh.arquivada = this.arquivarCnhNoCliente(pessoa, prefix);
      this.renderSocios();
      this.autoFillPessoa(prefix);
      this.espelharSeAdministrador();
      return;
    }
    this.renderSocios();
  },

  /* Grava a CNH lida na ficha do cliente já no momento do upload, na etapa de
     dados — o arquivo passa a aparecer em "Documentos societários" e na linha
     "RG / CNH" do sócio, no Painel de Clientes, sem esperar o fim do processo.
     Fase 1: a ficha vive em memória; Fase integrada: upload real via Graph API
     para 03.01/DOCUMENTOS AUXILIARES e atualização do índice de documentos. */
  arquivarCnhNoCliente(socio, prefix){
    const cnh = socio && socio.cnh;
    if(!cnh || !cnh.destinoArquivo) return null;
    const ehRep = String(prefix||'').indexOf('rep-') === 0;
    const docPessoa = ehRep ? socio.cpf : socio.documento;

    const cliente = this.nomeClienteAtual();
    const ficha = CLIENTES_DETALHE[cliente];
    if(!ficha){
      /* empresa nova: a pasta ainda está sendo criada — o arquivamento sai no
         relatório de envio, junto com a estrutura de pastas */
      return {cliente: cliente, pendente:true};
    }

    const soDigitos = v => String(v||'').replace(/\D/g,'');
    const chaveNome = v => String(v||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
    const cpfCnh = soDigitos(cnh.cpf || docPessoa);
    const nomeCnh = chaveNome(cnh.nome || socio.nome);

    ficha.socios = ficha.socios || [];
    let alvo = ficha.socios.find(s => cpfCnh && soDigitos(s.cpf) === cpfCnh)
            || ficha.socios.find(s => nomeCnh && chaveNome(s.nome) === nomeCnh);

    let criado = false;
    if(!alvo){
      alvo = {
        nome: cnh.nome || socio.nome || 'Sócio sem nome',
        cpf: cnh.cpf || docPessoa || 'não informado',
        participacao: ehRep ? '—' : (socio.perc || '—'),
        cargo: ehRep ? 'Representante legal de sócio PJ' : (socio.cargo || '—'),
        entrada: '—',
        documentos: [
          {tipo:'QSA (Receita Federal)', arquivo:'—', validade:'—', status:'faltando'},
          {tipo:'RG / CNH', arquivo:'—', validade:'—', status:'faltando'},
          {tipo:'Comprovante de endereço', arquivo:'—', validade:'—', status:'faltando'}
        ]
      };
      ficha.socios.push(alvo);
      criado = true;
    } else if(cnh.cpf && soDigitos(alvo.cpf).length !== 11){
      alvo.cpf = cnh.cpf;   /* QSA da RFB costuma vir sem CPF; a CNH completa */
    }

    alvo.documentos = alvo.documentos || [];
    let linha = alvo.documentos.find(d => /RG|CNH/i.test(d.tipo));
    if(!linha){ linha = {tipo:'RG / CNH', validade:'—', status:'faltando'}; alvo.documentos.push(linha); }
    linha.arquivo   = cnh.destinoArquivo;
    linha.validade  = cnh.validade || '—';
    /* NÃO é 'ok'. O arquivo só sobe para o SharePoint no envio do
       processo; marcar "em dia" aqui fazia a ficha do cliente prometer um
       documento arquivado que não existia, e ainda derrubava o contador
       de pendências do Painel. */
    linha.status    = 'anexado';
    linha.origem    = 'Anexada no processo em andamento — ainda não arquivada no SharePoint';

    return {cliente: cliente, socio: alvo.nome, pasta: cnh.destinoPasta, arquivo: cnh.destinoArquivo, socioCriado: criado};
  },

  verTextoCnh(prefix){
    const pessoa = this.resolveEntity(prefix);
    const c = pessoa && pessoa.cnh;
    if(!c) return;
    const d = c.diag || {};
    let cab = 'Diagnóstico da leitura\n';
    cab += '  Arquivo: ' + c.arquivo + '\n';
    cab += '  Caminho: ' + ({'pdf-texto':'camada de texto do PDF','pdf-ocr':'OCR sobre a página do PDF','imagem-ocr':'OCR sobre a imagem','erro':'falhou','sem-pdfjs':'leitor de PDF não carregou'}[c.fonte] || c.fonte) + '\n';
    if(d.caracteres !== undefined) cab += '  Texto na camada do PDF: ' + d.caracteres + ' caracteres\n';
    if(d.erro) cab += '  Erro: ' + d.erro + '\n';
    cab += '  Campos reconhecidos: ' + (c.achados||0) + ' de 6\n\n';
    cab += '--- TEXTO EXTRAÍDO ---\n';
    alert(cab + (c.textoBruto ? c.textoBruto.slice(0, 3000) : '(nada foi extraído)'));
  },


  addSocio(){ this.abrirCaixa('socio-'+wizard.socios.length); wizard.socios.push({tipo:'PF',nome:'',documento:'',rg:'',estadoCivil:'',regimeBens:'',naturalidade:'',nascimento:'',perc:'',cargo:'',endereco:{},contato:{},representantes:[],cnh:null,admin:false}); this.renderSocios(); },
  updateSocio(i,k,v){
    wizard.socios[i][k]=v;
    this.agendarSalvarRascunho();
    if(k==='tipo'){
      if(v==='PJ'){
        /* pessoa jurídica não administra: o flag passa a ser dos representantes */
        wizard.socios[i].admin = false;
        if(!wizard.socios[i].representantes || !wizard.socios[i].representantes.length){
          wizard.socios[i].representantes = [{nome:'',cpf:'',rg:'',estadoCivil:'',regimeBens:'',naturalidade:'',nascimento:'',endereco:{},contato:{},cnh:null,admin:false}];
          /* virou PJ agora: o representante é o próximo campo a preencher */
          this.abrirCaixa('rep-'+i+'-0');
        }
      }
      this.sincronizarAdministradores();
      this.renderSocios();
      this.renderAdministradores();
      return;
    }
    this.espelharSeAdministrador();
  },
  removeSocio(i){
    this.deslocarCaixas('socio-', i, wizard.socios.length);
    this.deslocarCaixasRep(i, (wizard.socios[i]||{}).representantes ? wizard.socios[i].representantes.length : 0);
    /* os administradores espelhados guardam o índice do sócio: ao remover um,
       os que vinham dele saem e os de baixo sobem uma posição */
    /* A ORDEM IMPORTA: filtrar PRIMEIRO, deslocar depois. Ao contrário,
       quem era i+1 já tinha virado i e saía junto no filtro — o
       administrador do sócio seguinte era removido e recriado com o
       cargo padrão, perdendo o que a pessoa tinha digitado. */
    wizard.administradores = (wizard.administradores||[]).filter(a=>!a.origem || a.origem.i !== i);
    (wizard.administradores||[]).forEach(a=>{ if(a.origem && a.origem.i > i) a.origem.i--; });
    wizard.socios.splice(i,1);
    this.sincronizarAdministradores();
    this.renderSocios();
    this.renderAdministradores();
  },
  addRepresentante(i){
    if(!wizard.socios[i].representantes) wizard.socios[i].representantes = [];
    this.abrirCaixa('rep-'+i+'-'+wizard.socios[i].representantes.length);
    wizard.socios[i].representantes.push({nome:'',cpf:'',rg:'',estadoCivil:'',regimeBens:'',naturalidade:'',nascimento:'',endereco:{},contato:{},cnh:null,admin:false});
    this.renderSocios();
  },
  removeRepresentante(i,j){
    this.deslocarCaixas('rep-'+i+'-', j, (wizard.socios[i].representantes||[]).length);
    (wizard.administradores||[]).forEach(a=>{
      if(a.origem && a.origem.tipo==='rep' && a.origem.i===i && a.origem.j > j) a.origem.j--;
    });
    wizard.administradores = (wizard.administradores||[]).filter(a=>
      !(a.origem && a.origem.tipo==='rep' && a.origem.i===i && a.origem.j===j));
    wizard.socios[i].representantes.splice(j,1);
    this.sincronizarAdministradores();
    this.renderSocios();
    this.renderAdministradores();
  },
  updateRepresentante(i,j,k,v){
    wizard.socios[i].representantes[j][k]=v;
    this.agendarSalvarRascunho();
    this.espelharSeAdministrador();
  },

  /* Repassa para a lista de administradores o que mudou no quadro societário.
     Só re-renderiza quando existe alguém espelhado, para não mexer na tela à
     toa enquanto o colaborador digita. */
  espelharSeAdministrador(){
    this.agendarSalvarRascunho();
    if(!(wizard.administradores||[]).some(a=>a.origem)) return;
    this.sincronizarAdministradores();
    this.renderAdministradores();
  },
  hasSocioPJ(){ return (wizard.socios||[]).some(s=>s.tipo==='PJ'); },

  /* ---------- Administradores da empresa (mesma lógica de endereço/contato/cadastro de pessoas dos sócios) ---------- */
  renderAdministradores(){
    const list = document.getElementById('administradoresList'); if(!list) return;
    list.innerHTML = (wizard.administradores||[]).map((a,k)=>{
      const prefix = 'admin-'+k;

      /* Administrador espelhado a partir do quadro societário: os dados são os
         mesmos da pessoa lá em cima e mudam junto. Aqui ele aparece só para
         conferência, com o cargo editável — assim ninguém digita a mesma pessoa
         duas vezes nem deixa as duas versões divergirem. */
      if(a.origem){
        const rotulo = a.origem.tipo === 'rep'
          ? `Representante legal do sócio PJ #${a.origem.i+1}`
          : `Sócio #${a.origem.i+1}`;
        const corpoEsp = `
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <span style="font-size:11px;font-weight:700;color:var(--status-good);text-transform:uppercase;letter-spacing:.03em;">✓ vem do quadro societário</span>
            <span style="font-size:11.5px;color:var(--muted);">${rotulo} — marcado como administrador</span>
          </div>
          <div class="form-grid">
            <div class="field"><label>Nome completo</label><input type="text" value="${this.escapeHtml(a.nome)}" disabled></div>
            <div class="field"><label>CPF</label><input type="text" value="${this.escapeHtml(a.cpf)}" disabled></div>
            <div class="field"><label>Cargo / função</label><input type="text" placeholder="Ex.: Sócio-Administrador" value="${this.escapeHtml(a.cargo)}" data-action="updateAdministrador" data-args='${this.attrJson([k,'cargo'])}' data-event="input" data-value-from="value"></div>
            <div class="field"><label>Estado civil</label><input type="text" value="${this.escapeHtml(a.estadoCivil||'')}" placeholder="— informe no quadro societário" disabled></div>
            ${this.exigeRegimeBens(a.estadoCivil) ? `<div class="field"><label>Regime de bens</label><input type="text" value="${this.escapeHtml(a.regimeBens||'')}" placeholder="— pendente no quadro societário" disabled></div>` : ''}
          </div>
          ${this.exigeRegimeBens(a.estadoCivil) && !a.regimeBens ? `<div style="font-size:11.5px;color:var(--status-crit);font-weight:600;margin-top:8px;">Falta o regime de bens desta pessoa — informe no cadastro dela, acima.</div>` : ''}
          <p class="view-sub" style="margin:10px 0 0;">Endereço e contato são os mesmos informados no quadro societário. Para corrigir, edite lá em cima — a alteração se reflete aqui. Para tirar esta pessoa da administração, desmarque <b>Administrador</b> no cadastro dela.</p>`;
        return this.caixa('admin-'+k, 'Administrador #'+(k+1)+' (do quadro societário)', corpoEsp, {
          resumo: this.resumoPessoa(a, false),
          selo: '<span class="caixa-selo ok">vem do quadro societário</span>'
        });
      }

      const corpoAdm = `
        <div class="form-grid">
          <div class="field"><label>Nome completo</label><input type="text" id="${prefix}-nome" value="${this.escapeHtml(a.nome)}" data-action="updateAdministrador" data-args='${this.attrJson([k,'nome'])}' data-event="input" data-value-from="value"></div>
          <div class="field"><label>CPF <span id="${prefix}-cadastroBadge" style="display:none;color:var(--status-good);font-size:11px;font-weight:700;">✓ dados do cadastro aplicados</span></label><input type="text" value="${this.escapeHtml(a.cpf)}" data-action="updateAdministrador" data-args='${this.attrJson([k,'cpf'])}' data-event="input" data-value-from="value" data-blur-action="autoFillPessoa" data-blur-args='${this.attrJson([prefix])}'></div>
          <div class="field"><label>Cargo / função</label><input type="text" placeholder="Ex.: Administrador, Diretor" value="${this.escapeHtml(a.cargo)}" data-action="updateAdministrador" data-args='${this.attrJson([k,'cargo'])}' data-event="input" data-value-from="value"></div>
          ${this.camposEstadoCivil(prefix, a, 'setEstadoCivilAdmin', [k], 'setRegimeBensAdmin', [k])}
        </div>
        <h5 style="font-size:12px;margin:14px 0 6px;color:var(--dark);">Endereço</h5>
        ${this.renderEnderecoBlock(prefix, a.endereco)}
        <h5 style="font-size:12px;margin:14px 0 6px;color:var(--dark);">Contato</h5>
        ${this.renderContatoBlock(prefix, a.contato)}`;
      return this.caixa('admin-'+k, 'Administrador #'+(k+1), corpoAdm, {
        resumo: this.resumoPessoa(a, false),
        acoes: `<button type="button" class="btn ghost" data-action="removeAdministrador" data-args='${this.attrJson([k])}'>Remover administrador</button>`
      });
    }).join('') || `<p class="view-sub">Nenhum administrador adicionado ainda. Marque <b>Administrador</b> no cadastro de um sócio para trazê-lo automaticamente, ou cadastre alguém de fora do quadro societário no botão abaixo.</p>`;
  },
  addAdministrador(){
    if(!wizard.administradores) wizard.administradores = [];
    this.abrirCaixa('admin-'+wizard.administradores.length);
    wizard.administradores.push({nome:'',cpf:'',cargo:'',estadoCivil:'',regimeBens:'',endereco:{},contato:{}});
    this.renderAdministradores();
  },
  removeAdministrador(k){
    this.deslocarCaixas('admin-', k, wizard.administradores.length);
    const a = wizard.administradores[k];
    if(a && a.origem){        /* espelhado: desmarca na origem, não remove aqui */
      this.setAdminPessoa(a.origem, false);
      return;
    }
    wizard.administradores.splice(k,1);
    this.renderAdministradores();
  },
  updateAdministrador(k,key,v){ wizard.administradores[k][key]=v; this.agendarSalvarRascunho(); },

  /* ---------- "Administrador" marcado no próprio cadastro do sócio ----------
     Marcar o flag no sócio pessoa física (ou no representante legal de um sócio
     PJ) inclui a pessoa na lista de administradores repetindo os dados dela, e
     mantém as duas versões sincronizadas enquanto o cadastro é editado. Antes
     era preciso digitar a mesma pessoa duas vezes, o que gerava divergência de
     endereço entre o quadro societário e a administração — erro que a Junta
     devolve em exigência. */
});
