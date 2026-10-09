// --- ATUALIZAÇÃO EM TEMPO REAL DA SAUDAÇÃO, DATA, RELÓGIO E ALARMES ---
var alarmesDisparados = new Set();

function atualizarRelogioESaudacao() {
  const agora = new Date();
  const hora = agora.getHours();
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  const segundos = String(agora.getSeconds()).padStart(2, '0');
  const horaFormatada = String(hora).padStart(2, '0');
  const horaAtualFormatada = `${horaFormatada}:${minutos}`;

  // Atualiza a Saudação
  const elementoSaudacao = document.getElementById("texto-saudacao");
  if (elementoSaudacao) {
    if (hora >= 5 && hora < 12) elementoSaudacao.textContent = "Bom dia!";
    else if (hora >= 12 && hora < 18) elementoSaudacao.textContent = "Boa tarde!";
    else elementoSaudacao.textContent = "Boa noite!";
  }

  // Atualiza a Data
  const dias = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const elData = document.getElementById('texto-data');
  if (elData) {
    elData.textContent = "Hoje é " + dias[agora.getDay()] + ", " + agora.getDate() + " de " + meses[agora.getMonth()] + ".";
  }

  // Atualiza o Relógio Digital Flutuante
  const elRelogio = document.getElementById('relogio-digital');
  if (elRelogio) {
    elRelogio.textContent = `🕒 ${horaFormatada}:${minutos}:${segundos}`;
  }

  // Verificação de Alarmes para Remédios e Agenda
  verificarAlarmes(horaAtualFormatada);
}

function verificarAlarmes(horaAtual) {
  if (!dados) return;

  // Verifica remédios pendentes
  dados.remedios.forEach(function(r) {
    var chave = 'remedio_' + r.id + '_' + horaAtual;
    if (r.hora === horaAtual && !r.feito && !alarmesDisparados.has(chave)) {
      alarmesDisparados.add(chave);
      dispararAlarme(`⏰ HORA DO REMÉDIO: ${r.texto}!`);
    }
  });

  // Verifica compromissos
  dados.agenda.forEach(function(a) {
    var chave = 'agenda_' + a.id + '_' + horaAtual;
    if (a.hora === horaAtual && !alarmesDisparados.has(chave)) {
      alarmesDisparados.add(chave);
      dispararAlarme(`⏰ COMPROMISSO AGORA: ${a.texto}!`);
    }
  });
}

function dispararAlarme(mensagem) {
  var banner = document.getElementById('banner-alarme');
  var textoBanner = document.getElementById('texto-banner-alarme');
  if (banner && textoBanner) {
    textoBanner.textContent = mensagem;
    banner.classList.add('ativo');
  }
  anunciar(mensagem);
  falar(mensagem);
}

// Desativação do Alarme
var btnPararAlarme = document.getElementById('btn-parar-alarme');
if (btnPararAlarme) {
  btnPararAlarme.addEventListener('click', function() {
    var banner = document.getElementById('banner-alarme');
    if (banner) banner.classList.remove('ativo');
    pararFala();
  });
}

// Inicializa a contagem do relógio
atualizarRelogioESaudacao();
setInterval(atualizarRelogioESaudacao, 1000);

// Acionamento direto do seletor ao clicar em qualquer ponto dos campos de horário
['input-remedio-hora', 'input-agenda-hora'].forEach(function(id) {
  var campo = document.getElementById(id);
  if (campo) {
    campo.addEventListener('click', function() {
      if ('showPicker' in HTMLInputElement.prototype) {
        try { campo.showPicker(); } catch(e) {}
      }
    });
  }
});

var statusLeitor = document.getElementById('status-leitor');
function anunciar(mensagem) { if (statusLeitor) statusLeitor.textContent = mensagem; }

var dados = {
  modoDaltonismo: 'nenhum',
  altoContrasteAtivo: false,
  remedios: [],
  agenda: [],
  contatos: []
};

var proximoIdRemedio = 1, proximoIdAgenda = 1, proximoIdContato = 1;

async function salvar() {
  try {
    if (window.storage) {
      await window.storage.set('meu-dia:dados', JSON.stringify(dados), false);
    } else {
      localStorage.setItem('meu-dia:dados', JSON.stringify(dados));
    }
  } catch (e) {}
}

async function carregar() {
  try {
    if (window.storage) {
      var resultado = await window.storage.get('meu-dia:dados', false);
      if (resultado && resultado.value) {
        var salvo = JSON.parse(resultado.value);
        if (salvo && salvo.remedios) dados = salvo;
      }
    } else {
      var local = localStorage.getItem('meu-dia:dados');
      if (local) {
        var salvoLocal = JSON.parse(local);
        if (salvoLocal && salvoLocal.remedios) dados = salvoLocal;
      }
    }
  } catch (e) {}
  
  if (dados.modoDaltonismo) {
    var select = document.getElementById('select-daltonismo');
    if (select) {
      select.value = dados.modoDaltonismo;
      aplicarModoDaltonismo(dados.modoDaltonismo);
    }
  }

  if (dados.altoContrasteAtivo) {
    document.documentElement.classList.add('alto-contraste');
    var btnC = document.getElementById('btn-contraste');
    if (btnC) btnC.setAttribute('aria-pressed', 'true');
  }

  proximoIdRemedio = dados.remedios.length ? 1 + Math.max(0, ...dados.remedios.map(function(r){ return r.id; })) : 1;
  proximoIdAgenda = dados.agenda.length ? 1 + Math.max(0, ...dados.agenda.map(function(a){ return a.id; })) : 1;
  proximoIdContato = dados.contatos.length ? 1 + Math.max(0, ...dados.contatos.map(function(c){ return c.id; })) : 1;
  renderizarTudo();
}

function renderizarRemedios() {
  var lista = document.getElementById('lista-remedios');
  if (!lista) return;
  lista.innerHTML = '';
  if (dados.remedios.length === 0) {
    lista.innerHTML = '<p class="mensagem-vazio">Nenhum remédio cadastrado ainda.</p>';
    return;
  }
  dados.remedios.slice().sort(function(a,b){ return a.hora.localeCompare(b.hora); }).forEach(function(r) {
    var div = document.createElement('div');
    div.className = 'lembrete' + (r.feito ? ' feito' : '');
    div.innerHTML =
      '<span class="marcador" aria-hidden="true">' + (r.feito ? '✓' : '○') + '</span>' +
      '<span class="hora">' + escaparHtml(r.hora) + '</span>' +
      '<span class="texto">' + escaparHtml(r.texto) + '</span>' +
      '<button class="botao-marcar" type="button">' + (r.feito ? 'Tomado ✓' : 'Marcar como tomado') + '</button>' +
      '<button class="botao-excluir" type="button" aria-label="Excluir ' + escaparHtml(r.texto) + '">✕</button>';

    div.querySelector('.botao-marcar').addEventListener('click', function() {
      r.feito = !r.feito;
      salvar();
      renderizarRemedios();
      anunciar(r.texto + (r.feito ? ' marcado como tomado.' : ' desmarcado.'));
    });
    div.querySelector('.botao-excluir').addEventListener('click', function() {
      dados.remedios = dados.remedios.filter(function(x){ return x.id !== r.id; });
      salvar();
      renderizarRemedios();
      anunciar('Remédio removido.');
    });
    lista.appendChild(div);
  });
}

function renderizarAgenda() {
  var lista = document.getElementById('lista-agenda');
  if (!lista) return;
  lista.innerHTML = '';
  if (dados.agenda.length === 0) {
    lista.innerHTML = '<p class="mensagem-vazio">Nenhum compromisso cadastrado ainda.</p>';
    return;
  }
  dados.agenda.slice().sort(function(a,b){ return a.hora.localeCompare(b.hora); }).forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'agenda-item';
    div.innerHTML =
      '<span class="bolinha" aria-hidden="true"></span>' +
      '<span class="texto-agenda"><strong>' + escaparHtml(formatarHoraExtenso(item.hora)) + '</strong> — ' + escaparHtml(item.texto) + '</span>' +
      '<button class="botao-excluir" type="button" aria-label="Excluir compromisso ' + escaparHtml(item.texto) + '">✕</button>';
    div.querySelector('.botao-excluir').addEventListener('click', function() {
      dados.agenda = dados.agenda.filter(function(x){ return x.id !== item.id; });
      salvar();
      renderizarAgenda();
      anunciar('Compromisso removido.');
    });
    lista.appendChild(div);
  });
}

function renderizarContatos() {
  var lista = document.getElementById('lista-contatos');
  if (!lista) return;
  lista.innerHTML = '';
  if (dados.contatos.length === 0) {
    lista.innerHTML = '<p class="mensagem-vazio">Nenhum contato cadastrado ainda.</p>';
    return;
  }
  dados.contatos.forEach(function(c) {
    var wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.innerHTML =
      '<a class="contato" href="tel:' + escaparAtributo(c.tel) + '">' +
        '<span class="icone-contato" aria-hidden="true">' + c.icone + '</span>' +
        '<span class="info-contato">' +
          '<span class="nome-contato">' + escaparHtml(c.nome) + '</span>' +
          '<span class="numero-contato">' + escaparHtml(c.numero) + '</span>' +
        '</span>' +
      '</a>' +
      '<button class="botao-excluir" type="button" style="position:absolute; top:0.6rem; right:0.6rem;" aria-label="Excluir contato ' + escaparHtml(c.nome) + '">✕</button>';
    wrapper.querySelector('.botao-excluir').addEventListener('click', function(ev) {
      ev.preventDefault();
      dados.contatos = dados.contatos.filter(function(x){ return x.id !== c.id; });
      salvar();
      renderizarContatos();
      anunciar('Contato removido.');
    });
    lista.appendChild(wrapper);
  });
}

function renderizarTudo() { renderizarRemedios(); renderizarAgenda(); renderizarContatos(); }
function escaparHtml(texto) { var div = document.createElement('div'); div.textContent = texto; return div.innerHTML; }
function escaparAtributo(texto) { return String(texto).replace(/"/g, '&quot;'); }
function formatarHoraExtenso(hora) { var partes = hora.split(':'); return partes[0] + 'h' + partes[1]; }

// Eventos dos Formulários
document.getElementById('form-remedio').addEventListener('submit', function(ev) {
  ev.preventDefault();
  var hora = document.getElementById('input-remedio-hora').value;
  var texto = document.getElementById('input-remedio-texto').value.trim();
  if (!texto || !hora) return;
  dados.remedios.push({ id: proximoIdRemedio++, hora: hora, texto: texto, feito: false });
  salvar(); renderizarRemedios();
  anunciar('Remédio ' + texto + ' adicionado.');
  document.getElementById('input-remedio-texto').value = '';
});

document.getElementById('form-agenda').addEventListener('submit', function(ev) {
  ev.preventDefault();
  var hora = document.getElementById('input-agenda-hora').value;
  var texto = document.getElementById('input-agenda-texto').value.trim();
  if (!texto || !hora) return;
  dados.agenda.push({ id: proximoIdAgenda++, hora: hora, texto: texto });
  salvar(); renderizarAgenda();
  anunciar('Compromisso ' + texto + ' adicionado.');
  document.getElementById('input-agenda-texto').value = '';
});

document.getElementById('form-contato').addEventListener('submit', function(ev) {
  ev.preventDefault();
  var nome = document.getElementById('input-contato-nome').value.trim();
  var numero = document.getElementById('input-contato-numero').value.trim();
  if (!nome || !numero) return;
  var telLimpo = numero.replace(/[^\d+]/g, '');
  dados.contatos.push({ id: proximoIdContato++, nome: nome, numero: numero, tel: telLimpo, icone: '📞' });
  salvar(); renderizarContatos();
  anunciar('Contato ' + nome + ' adicionado.');
  this.reset();
});

// Controles de Tamanho de Fonte
var escalaAtual = 1;
document.getElementById('btn-aumentar').addEventListener('click', function() {
  if (escalaAtual < 1.6) { escalaAtual = Math.round((escalaAtual + 0.15) * 100) / 100; document.documentElement.style.setProperty('--escala', escalaAtual); }
});
document.getElementById('btn-diminuir').addEventListener('click', function() {
  if (escalaAtual > 0.85) { escalaAtual = Math.round((escalaAtual - 0.15) * 100) / 100; document.documentElement.style.setProperty('--escala', escalaAtual); }
});

// Alto Contraste
var btnContraste = document.getElementById('btn-contraste');
btnContraste.addEventListener('click', function() {
  var ativo = document.documentElement.classList.toggle('alto-contraste');
  btnContraste.setAttribute('aria-pressed', ativo ? 'true' : 'false');
  dados.altoContrasteAtivo = ativo;
  salvar();
  anunciar(ativo ? 'Alto contraste ativado.' : 'Alto contraste desativado.');
});

// Seletor de Daltonismo
var selectDaltonismo = document.getElementById('select-daltonismo');
function aplicarModoDaltonismo(modo) {
  if (modo === 'nenhum') {
    document.documentElement.removeAttribute('data-daltonismo');
  } else {
    document.documentElement.setAttribute('data-daltonismo', modo);
  }
}

selectDaltonismo.addEventListener('change', function() {
  var modoSelecionado = selectDaltonismo.value;
  aplicarModoDaltonismo(modoSelecionado);
  dados.modoDaltonismo = modoSelecionado;
  salvar();
  var rotuloOpcao = selectDaltonismo.options[selectDaltonismo.selectedIndex].text;
  anunciar('Ajuste de cores ativado para: ' + rotuloOpcao);
});

// --- SISTEMA DE NAVEGAÇÃO E ASSISTENTE DE VOZ INTERATIVO ---
var sintetizador = window.speechSynthesis;
var assistenteAtivo = false;

function falar(mensagem, aoTerminar) {
  if (!sintetizador) return;
  sintetizador.cancel();

  var fala = new SpeechSynthesisUtterance(mensagem);
  fala.lang = 'pt-BR';
  fala.rate = 1.0;

  if (aoTerminar) {
    fala.onend = aoTerminar;
    fala.onerror = aoTerminar;
  }

  sintetizador.speak(fala);
}

function pararFala() {
  if (sintetizador) sintetizador.cancel();
}

function obterMensagemInicial() {
  var hora = new Date().getHours();
  var saudacao = "Bom dia!";
  if (hora >= 12 && hora < 18) saudacao = "Boa tarde!";
  else if (hora >= 18 || hora < 5) saudacao = "Boa noite!";

  var textoSaudacao = document.getElementById('texto-saudacao').textContent || saudacao;
  var textoData = document.getElementById('texto-data').textContent || '';
  var agora = new Date();
  var horaFormatada = agora.getHours() + " horas e " + agora.getMinutes() + " minutos";

  return textoSaudacao + " " + textoData + " Agora são " + horaFormatada + ". " +
         "Menu de voz: Pressione 1 para ouvir os Remédios de hoje. " +
         "Pressione 2 para ouvir os Compromissos. " +
         "Pressione 3 para ouvir os Contatos importantes. " +
         "Pressione 0 para ouvir a página inteira. " +
         "Pressione ESC a qualquer momento para parar a leitura.";
}

function lerSecaoRemedios() {
  if (dados.remedios.length === 0) {
    falar("Você não possui nenhum remédio cadastrado para hoje.");
    return;
  }
  var texto = "Seus remédios para hoje são: ";
  dados.remedios.forEach(function(r) {
    texto += "Às " + formatarHoraExtenso(r.hora) + ", " + r.texto + ". Status: " + (r.feito ? "já tomado" : "pendente") + ". ";
  });
  falar(texto);
}

function lerSecaoAgenda() {
  if (dados.agenda.length === 0) {
    falar("Você não possui compromissos agendados para hoje.");
    return;
  }
  var texto = "Seus compromissos para hoje são: ";
  dados.agenda.forEach(function(item) {
    texto += "Às " + formatarHoraExtenso(item.hora) + ", " + item.texto + ". ";
  });
  falar(texto);
}

function lerSecaoContatos() {
  if (dados.contatos.length === 0) {
    falar("Você não possui contatos de emergência cadastrados.");
    return;
  }
  var texto = "Seus contatos importantes são: ";
  dados.contatos.forEach(function(c) {
    texto += c.nome + ", telefone " + c.numero + ". ";
  });
  falar(texto);
}

function lerPaginaInteira() {
  var conteudo = document.getElementById('conteudo-principal').innerText;
  falar(conteudo);
}

function ativarAssistenteVoz() {
  assistenteAtivo = true;
  document.getElementById('painel-voz').style.display = 'none';
  anunciar("Assistente de voz ativado.");
  falar(obterMensagemInicial());
}

function desativarAssistenteVoz() {
  assistenteAtivo = false;
  pararFala();
  document.getElementById('painel-voz').style.display = 'none';
  anunciar("Assistente de voz desativado.");
}

document.getElementById('btn-voz-sim').addEventListener('click', ativarAssistenteVoz);
document.getElementById('btn-voz-nao').addEventListener('click', desativarAssistenteVoz);

var btnOuvir = document.getElementById('btn-ouvir');
btnOuvir.addEventListener('click', function() {
  if (sintetizador && sintetizador.speaking) {
    pararFala();
    btnOuvir.textContent = '🔊 Ouvir a página';
    btnOuvir.setAttribute('aria-pressed', 'false');
  } else {
    lerPaginaInteira();
    btnOuvir.textContent = '⏹ Parar leitura';
    btnOuvir.setAttribute('aria-pressed', 'true');
  }
});

// Captura de Teclas Globais
document.addEventListener('keydown', function(event) {
  var tecla = event.key.toLowerCase();
  var tagAlvo = event.target.tagName ? event.target.tagName.toLowerCase() : '';
  var estaDigitando = tagAlvo === 'input' || tagAlvo === 'textarea' || tagAlvo === 'select' || event.target.isContentEditable;

  if (estaDigitando) {
    if (tecla === 'escape') pararFala();
    return;
  }

  var painelVisivel = document.getElementById('painel-voz').style.display !== 'none';
  if (painelVisivel) {
    if (tecla === 's' || tecla === '1') {
      event.preventDefault();
      ativarAssistenteVoz();
      return;
    }
    if (tecla === 'n' || tecla === 'escape' || tecla === '2') {
      event.preventDefault();
      desativarAssistenteVoz();
      return;
    }
  }

  if (event.altKey && (tecla === 'o')) {
    event.preventDefault();
    btnOuvir.click();
    return;
  }

  if (assistenteAtivo) {
    if (tecla === 'escape') {
      pararFala();
    } else if (tecla === '1') {
      event.preventDefault();
      lerSecaoRemedios();
    } else if (tecla === '2') {
      event.preventDefault();
      lerSecaoAgenda();
    } else if (tecla === '3') {
      event.preventDefault();
      lerSecaoContatos();
    } else if (tecla === '0') {
      event.preventDefault();
      lerPaginaInteira();
    }
  }
});

// Carrega os dados salvos no início
window.addEventListener('DOMContentLoaded', carregar);
