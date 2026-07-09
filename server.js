require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const servidorHttp = http.createServer(app);
const wss = new WebSocket.Server({ server: servidorHttp });

const PUERTO = process.env.PORT || 3000;
// Usamos una base de datos local llamada EcoTours por defecto
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/EcoTours';

let db;
let clienteMongo;

// Conectar a la base de datos MongoDB
async function conectarBD() {
  try {
    console.log('Intentando conectar a MongoDB...');
    clienteMongo = new MongoClient(MONGODB_URI);
    await clienteMongo.connect();
    db = clienteMongo.db();
    console.log('✅ Conexión exitosa a la base de datos MongoDB:', db.databaseName);

    // Si la base de datos está vacía, sembrar datos de ejemplo en español
    await sembrarBaseDatos();
  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err.message);
    console.log('El servidor seguirá corriendo, pero las operaciones de base de datos fallarán.');
  }
}

// Inicializar la base de datos con un par de reservas de prueba si está vacía
async function sembrarBaseDatos() {
  try {
    const reservas = db.collection('reservas');
    const cantidad = await reservas.countDocuments();
    if (cantidad === 0) {
      console.log('Sembrando datos iniciales en la base de datos...');
      const reservasEjemplo = [
        {
          nombre: 'Carlos Mendoza',
          correo: 'carlos@example.com',
          telefono: '3001234567',
          destino: 'Parque Tayrona',
          personas: 2,
          mensaje: 'Queremos acampar cerca de la playa.',
          fecha: new Date(Date.now() - 3600000 * 2) // Hace 2 horas
        },
        {
          nombre: 'Ana Silva',
          correo: 'ana.silva@example.com',
          telefono: '3159876543',
          destino: 'Cañón del Chicamocha',
          personas: 4,
          mensaje: '¿Incluye el servicio de guía bilingüe?',
          fecha: new Date(Date.now() - 3600000 * 5) // Hace 5 horas
        }
      ];
      await reservas.insertMany(reservasEjemplo);
      console.log('✅ Base de datos sembrada con éxito.');
    }
  } catch (err) {
    console.error('Error al sembrar la base de datos:', err);
  }
}

// Enviar un mensaje a todos los clientes WebSocket conectados (difusión)
function emitir(mensaje) {
  const payload = JSON.stringify(mensaje);
  wss.clients.forEach((cliente) => {
    if (cliente.readyState === WebSocket.OPEN) {
      cliente.send(payload);
    }
  });
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ENDPOINTS ---

// Verificar estado de conexión de la base de datos
app.get('/api/estado', (req, res) => {
  res.json({
    conectado: !!db,
    baseDatos: db ? db.databaseName : null,
    uri: MONGODB_URI.includes('@') ? 'MongoDB Atlas (Oculto)' : MONGODB_URI
  });
});

// Obtener las últimas reservas registradas
app.get('/api/reservas', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Base de datos no disponible' });
  try {
    const listaReservas = await db.collection('reservas')
      .find()
      .sort({ fecha: -1 })
      .limit(10)
      .toArray();
    res.json(listaReservas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar una nueva reserva
app.post('/api/reservar', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Base de datos no disponible' });

  const { nombre, correo, telefono, destino, personas, mensaje } = req.body;

  // Validación sencilla
  if (!nombre || !correo || !destino || !personas || personas <= 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios o los datos son inválidos.' });
  }

  try {
    const nuevaReserva = {
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
      telefono: telefono ? telefono.trim() : '',
      destino,
      personas: parseInt(personas),
      mensaje: mensaje ? mensaje.trim() : '',
      fecha: new Date()
    };

    // 1. Guardar en la base de datos
    const resultado = await db.collection('reservas').insertOne(nuevaReserva);
    nuevaReserva._id = resultado.insertedId;

    console.log(`📝 Nueva reserva guardada en Atlas: ${nuevaReserva.nombre} - ${nuevaReserva.destino}`);

    // 2. Emitir por WebSockets en tiempo real a todos los conectados
    emitir({ tipo: 'NUEVA_RESERVA', datos: nuevaReserva });

    res.json({ success: true, mensaje: '¡Tu solicitud de paseo ha sido registrada con éxito!', datos: nuevaReserva });
  } catch (err) {
    console.error('Error al registrar la reserva:', err);
    res.status(500).json({ error: 'Error del servidor al guardar la reserva.' });
  }
});

// Resetear/vaciar la base de datos para volver a probar
app.post('/api/reiniciar', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Base de datos no disponible' });
  try {
    console.log('Reiniciando base de datos a valores de prueba...');
    await db.collection('reservas').drop().catch(() => { });
    await sembrarBaseDatos();
    emitir({ tipo: 'RESERVAS_REINICIADAS' });
    res.json({ success: true, mensaje: 'Base de datos reiniciada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eventos de WebSocket
wss.on('connection', (ws) => {
  console.log('🔌 Cliente web conectado vía WebSocket');

  ws.send(JSON.stringify({
    tipo: 'ESTADO_CONEXION',
    datos: { dbConectado: !!db }
  }));

  ws.on('close', () => {
    console.log('🔌 Cliente web desconectado');
  });
});

// Arrancar Servidor e iniciar conexión a base de datos
servidorHttp.listen(PUERTO, () => {
  console.log(`Servidor de turismo escuchando en http://localhost:${PUERTO}`);
  conectarBD();
});
