/* Parte da ferramenta Processos Societários — GS2 Negócios.
   Este arquivo é carregado por web/index.html na ordem definida lá. */

/* ======================= APP STATE ======================= */
const wizard = { step:1, cliente:null, clienteNovo:false, tipo:null, campos:{}, socios:[], administradores:[], docs:{}, extraFiles:[], minutaPropria:false, minutaArquivo:null, _cnaePrincipalId:null, _cnaeSecIds:[],
  aguardaConfirmacaoCliente:false, juntaProtocolo:'', juntaDocs:{}, juntaExtraFiles:[], licenciamentos:{}, juntaRequerenteId: (REQUERENTES.find(r=>r.status==='Ativo')||{}).id || null,
  rfb:{dbeStatus:'pendente', dbeDeferidaArquivo:null} };
let currentUser = { nome:"Vinícius", papel:"Colaborador" };
