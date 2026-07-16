// --- VARIABLES DE ESTADO ---
let reservas = [];
let socket = null;

// --- ELEMENTOS DEL DOM ---
const badgeEstadoBD = document.getElementById('badge-estado-bd');
const textoEstadoBD = document.getElementById('texto-estado-bd');
const btnReiniciarBD = document.getElementById('btn-reiniciar-bd');

const formularioReserva = document.getElementById('formulario-reserva');
const btnEnviarReserva = document.getElementById('btn-enviar-reserva');
const mensajeErrorFormulario = document.getElementById('mensaje-error-formulario');
const listaReservasEl = document.getElementById('lista-reservas');

const inputNombre = document.getElementById('campo-nombre');
const inputCorreo = document.getElementById('campo-correo');
const inputTelefono = document.getElementById('campo-telefono');
const selectDestino = document.getElementById('campo-destino');
const inputPersonas = document.getElementById('campo-personas');
const inputMensaje = document.getElementById('campo-mensaje');
const inputEvento = document.getElementById('campo-evento');
const inputFecha = document.getElementById('campo-fecha');
const inputHora = document.getElementById('campo-hora');
const selectPiel = document.getElementById('campo-piel');

const notificacionFlotante = document.getElementById('notificacion-flotante');
const mensajeNotificacion = document.getElementById('mensaje-notificacion');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  configurarEventos();
  verificarEstadoBD();
  cargarReservas();
  conectarWebSocket();
});

// Configurar manejadores de eventos
function configurarEventos() {
  // Envío de Formulario
  formularioReserva.addEventListener('submit', manejarEnvioFormulario);

  // Botón para reiniciar/limpiar BD
  btnReiniciarBD.addEventListener('click', reiniciarBaseDatos);

  // Botones de selección en las tarjetas de tours
  document.querySelectorAll('.btn-select-tour').forEach(boton => {
    boton.addEventListener('click', (e) => {
      const nombreDestino = e.target.getAttribute('data-tour-name');
      selectDestino.value = nombreDestino;
      
      // Resaltar visualmente la tarjeta seleccionada
      document.querySelectorAll('.tour-card').forEach(tarjeta => {
        tarjeta.classList.remove('selected-active');
        if (tarjeta.getAttribute('data-tour') === nombreDestino) {
          tarjeta.classList.add('selected-active');
        }
      });

      // Hacer scroll suave hacia el formulario
      document.getElementById('seccion-formulario-reserva').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// --- CONEXIÓN DE DATOS ---

// Verificar conexión a la base de datos
async function verificarEstadoBD() {
  try {
    const res = await fetch('/api/estado');
    const datos = await res.json();
    actualizarBadgeEstado(datos.conectado, datos.baseDatos);
  } catch (err) {
    actualizarBadgeEstado(false);
  }
}

// Obtener reservas iniciales de la API
async function cargarReservas() {
  try {
    const res = await fetch('/api/reservas');
    reservas = await res.json();
    renderizarListaReservas();
  } catch (err) {
    console.error('Error al cargar reservas:', err);
    listaReservasEl.innerHTML = '<div class="loading-state">Error de conexión al cargar registros de MongoDB.</div>';
  }
}

// Conectar WebSockets para recibir actualizaciones en tiempo real
function conectarWebSocket() {
  const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const urlWs = `${protocolo}//${window.location.host}`;
  
  console.log('Conectando WebSocket en:', urlWs);
  socket = new WebSocket(urlWs);

  socket.onopen = () => {
    console.log('🔌 WebSocket Conectado');
  };

  socket.onmessage = (evento) => {
    const mensaje = JSON.parse(evento.data);

    switch (mensaje.tipo) {
      case 'ESTADO_CONEXION':
        actualizarBadgeEstado(mensaje.datos.dbConectado);
        break;

      case 'NUEVA_RESERVA':
        // 1. Agregar la nueva reserva recibida al inicio del arreglo local
        reservas.unshift(mensaje.datos);
        if (reservas.length > 10) {
          reservas.pop(); // Mantener solo las últimas 10 en memoria
        }
        // 2. Volver a pintar la lista
        renderizarListaReservas();
        // 3. Mostrar notificación en pantalla a todos los usuarios conectados
        mostrarNotificacion(`¡Nuevo servicio! ${mensaje.datos.nombre} solicitó ${mensaje.datos.destino}.`);
        break;

      case 'RESERVAS_REINICIADAS':
        cargarReservas();
        mostrarNotificacion('Base de datos reiniciada por otro administrador.');
        break;
    }
  };

  socket.onclose = () => {
    console.log('🔌 Conexión WebSocket cerrada. Reconectando en 3 segundos...');
    setTimeout(conectarWebSocket, 3000);
  };
}

// --- MANEJO DE FORMULARIO ---

async function manejarEnvioFormulario(e) {
  e.preventDefault();
  
  // Limpiar estados de error
  mensajeErrorFormulario.classList.add('hidden');
  mensajeErrorFormulario.textContent = '';

  const datosReserva = {
    nombre: inputNombre.value,
    correo: inputCorreo.value,
    telefono: inputTelefono.value,
    destino: selectDestino.value,
    personas: inputPersonas.value,
    mensaje: inputMensaje.value,
    evento: inputEvento ? inputEvento.value : undefined,
    fecha: inputFecha ? inputFecha.value : undefined,
    hora: inputHora ? inputHora.value : undefined,
    piel: selectPiel ? selectPiel.value : undefined
  };

  // Bloquear botón de envío
  btnEnviarReserva.disabled = true;
  btnEnviarReserva.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando solicitud...';

  try {
    const res = await fetch('/api/reservar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosReserva)
    });

    const datos = await res.json();

    if (res.ok && datos.success) {
      mostrarNotificacion('¡Tu solicitud de maquillaje ha sido guardada en MongoDB!');
      formularioReserva.reset();
      
      // Remover clase seleccionada de las tarjetas
      document.querySelectorAll('.tour-card').forEach(tarjeta => tarjeta.classList.remove('selected-active'));
    } else {
      mostrarErrorFormulario(datos.error || 'No se pudo guardar la solicitud.');
    }
  } catch (err) {
    mostrarErrorFormulario('Error de red. Asegúrate de que el servidor esté activo.');
  } finally {
    btnEnviarReserva.disabled = false;
    btnEnviarReserva.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Guardar en MongoDB';
  }
}

// --- RENDERIZACIÓN DE LA UI ---

// Actualizar badge de estado
function actualizarBadgeEstado(conectado, nombreBD = '') {
  if (conectado) {
    badgeEstadoBD.className = 'status-badge connected';
    textoEstadoBD.textContent = `MongoDB Conectado (${nombreBD || 'EcoTours'})`;
  } else {
    badgeEstadoBD.className = 'status-badge disconnected';
    textoEstadoBD.textContent = 'MongoDB Desconectado';
  }
}

// Pintar la lista de reservas
function renderizarListaReservas() {
  listaReservasEl.innerHTML = '';
  
  if (reservas.length === 0) {
    listaReservasEl.innerHTML = '<div class="loading-state">El muro está vacío. ¡Haz el primer registro en el formulario!</div>';
    return;
  }

  reservas.forEach(reserva => {
    const fila = document.createElement('div');
    fila.className = 'booking-row';
    
    // Asignar clase de estilo según el servicio
    let claseDestino = 'dest-day';
    if (reserva.destino === 'Maquillaje de Noche') claseDestino = 'dest-night';
    if (reserva.destino === 'Maquillaje para Novias') claseDestino = 'dest-bride';

    const nombreLimpio = escaparHTML(reserva.nombre);
    let mensajeLimpio = reserva.mensaje ? escaparHTML(reserva.mensaje) : 'Sin requerimientos especiales';
    // Añadir detalles del servicio (evento / fecha / hora / tipo de piel)
    const detalles = [];
    if (reserva.evento) detalles.push(`Evento: ${reserva.evento}`);
    if (reserva.fecha) detalles.push(`Fecha: ${reserva.fecha}`);
    if (reserva.hora) detalles.push(`Hora: ${reserva.hora}`);
    if (reserva.piel) detalles.push(`Tipo de piel: ${reserva.piel}`);
    const detallesEscapados = detalles.map(d => escaparHTML(d)).join(' | ');
    if (detallesEscapados) mensajeLimpio = `${mensajeLimpio} — ${detallesEscapados}`;
    const fechaFormateada = formatearFechaHora(reserva.fecha);

    fila.innerHTML = `
      <div class="client-name-cell">
        <i class="fa-solid fa-circle-user"></i> ${nombreLimpio}
      </div>
      <div>
        <span class="dest-badge ${claseDestino}">${reserva.destino}</span>
      </div>
      <div class="text-center font-numeric font-semibold">${reserva.personas}</div>
      <div class="message-text" title="${mensajeLimpio}">${mensajeLimpio}</div>
      <div class="text-right booking-date font-numeric">${fechaFormateada}</div>
    `;

    listaReservasEl.appendChild(fila);
  });
}

// --- REINICIAR BASE DE DATOS ---
async function reiniciarBaseDatos() {
  if (!confirm('¿Estás seguro de que deseas limpiar el muro? Esto borrará tus registros y restaurará los paseos iniciales de prueba en MongoDB.')) {
    return;
  }
  
  try {
    const res = await fetch('/api/reiniciar', { method: 'POST' });
    const datos = await res.json();
    if (res.ok && datos.success) {
      mostrarNotificacion('Base de datos reiniciada con éxito.');
      cargarReservas();
    } else {
      mostrarNotificacion('No se pudo resetear la base de datos.', 'error');
    }
  } catch (err) {
    mostrarNotificacion('Error de conexión al reiniciar la base de datos.', 'error');
  }
}

// --- UTILIDADES ---

// Mostrar toast flotante
function mostrarNotificacion(mensaje) {
  notificacionFlotante.classList.add('show');
  mensajeNotificacion.textContent = mensaje;
  
  setTimeout(() => {
    notificacionFlotante.classList.remove('show');
  }, 4000);
}

function mostrarErrorFormulario(msg) {
  mensajeErrorFormulario.textContent = msg;
  mensajeErrorFormulario.classList.remove('hidden');
}

// Evitar inyección HTML (XSS)
function escaparHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Formatear fecha y hora
function formatearFechaHora(fechaStr) {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  }) + ' - ' + fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
}
