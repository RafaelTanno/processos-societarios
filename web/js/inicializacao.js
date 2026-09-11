/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */


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
      if(u && u.status === 'Ativo') App.login('Cliente', u.id, {nome: u.nome, email});
    }
  }catch(e){
    console.warn('[GS2] Falha ao preparar a autenticação:', e && e.message);
    App.renderModoLogin();
  }
})();
