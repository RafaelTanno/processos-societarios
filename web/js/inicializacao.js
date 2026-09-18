/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */

/* Worker do pdf.js (extrai a imagem do PDF da CNH-e para o OCR). Vivia como
   <script> inline no index.html; a CSP sem 'unsafe-inline' não permite mais
   bloco de script embutido no HTML, só arquivos externos. */
if(window.pdfjsLib){
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ======================= INICIALIZAÇÃO =======================
   Prepara a autenticação (se o ambiente estiver configurado), avisa na tela de
   login em que modo a ferramenta está e, se a pessoa já tiver uma sessão
   Microsoft aberta, entra direto sem pedir de novo. */
(async function inicializar(){
  App.renderModoLogin();
  if(!GS2Auth.real()) return;
  try{
    await GS2Auth.iniciar();
    const conta = GS2Auth.conta || GS2Auth.contaEmCache();
    if(!conta) return;
    GS2Auth.conta = conta;
    GS2Auth.app.setActiveAccount(conta);
    const email = GS2Auth.emailDaConta(conta);
    if(GS2Auth.ehDominioGS2(email)){
      App.login(GS2Auth.papelDe(email), null, {nome: conta.name || email, email});
      App.sincronizarClientes();
    } else {
      const u = USUARIOS_CLIENTE.find(x => String(x.email||'').toLowerCase() === email);
      if(u && u.status === 'Ativo'){
        App.login('Cliente', u.id, {nome: u.nome, email});
      } else if(GS2_CONFIG.clientesViaEntra){
        /* mesma validação que App.entrarCliente() fazia antes do login virar
           redirect (ver GS2Auth.entrar): a conta autenticou no Microsoft 365,
           mas não é um usuário de cliente ativo — avisa e desloga a sessão
           Microsoft, em vez de deixar a pessoa presa na tela de login sem
           explicação. */
        App.erroLogin(u
          ? `O acesso de <b>${App.escapeHtml(u.nome)}</b> está inativo. Fale com a GS2.`
          : `O e-mail <b>${App.escapeHtml(email)}</b> não está cadastrado como usuário de cliente. Fale com a GS2 para liberar seu acesso.`);
        await GS2Auth.sair();
      }
    }
  }catch(e){
    console.warn('[GS2] Falha ao preparar a autenticação:', e && e.message);
    App.renderModoLogin();
  }
})();
