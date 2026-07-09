# 🏕️ EcoTours — Portal de Reservas de Turismo en Tiempo Real

EcoTours es una aplicación web básica pero muy moderna diseñada para la enseñanza práctica de **MongoDB Atlas**. Ofrece un portal con un catálogo visual de excursiones ecológicas y un formulario interactivo para que los usuarios soliciten información o reserven su paseo.

El proyecto demuestra cómo una acción simple (como rellenar un formulario web) se traduce en la persistencia inmediata en la nube a través de MongoDB y se propaga en tiempo real a todas las pantallas de otros usuarios usando WebSockets.

---

## 🛠️ Tecnologías Utilizadas

1. **Frontend:** HTML5 Semántico, CSS3 de naturaleza (diseño responsivo con acentos orgánicos) y JavaScript ES6+ nativo sin frameworks.
2. **Backend:** Node.js, Express (API REST para guardar reservas) y WebSockets mediante el paquete `ws` (para notificaciones instantáneas a todos los usuarios cuando se registra una reserva).
3. **Base de Datos:** MongoDB (local o clúster en la nube con Atlas) conectada mediante el driver oficial de Node.js.

---

## 🚀 Guía de Instalación y Configuración

### Paso 1: Instalar Dependencias
Asegúrate de tener instalado [Node.js](https://nodejs.org/). En la terminal de la raíz del proyecto, ejecuta:

```bash
npm install
```

### Paso 2: Configurar MongoDB
Por defecto, la aplicación se conectará a tu MongoDB local en la base de datos `ecotours` (`mongodb://127.0.0.1:27017/ecotours`).

Si deseas conectar el proyecto con **MongoDB Atlas en la nube**:
1. Ve a tu consola de [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Haz clic en **Connect** en tu Clúster y selecciona **Drivers** (Node.js).
3. Copia tu cadena de conexión (URI).
4. Abre el archivo `.env` en la raíz de este proyecto y edita la variable `MONGODB_URI` con tu cadena de conexión (reemplaza `<usuario>` y `<password>` por tus credenciales de base de datos):

```env
PORT=3000
MONGODB_URI=mongodb+srv://tuUsuario:tuPassword@tu-cluster.mongodb.net/ecotours?retryWrites=true&w=majority
```

### Paso 3: Ejecutar la Aplicación
Arranca el servidor local:

```bash
npm start
```
O en modo de desarrollo con recarga automática al guardar código:
```bash
npm run dev
```

Abre tu navegador e ingresa a: **`http://localhost:3000`**.

---

## 🎓 Guía Docente: Conceptos de MongoDB Aprendidos

Este proyecto es ideal para explicar a tus estudiantes los fundamentos de MongoDB en una aplicación real. Pueden revisar el archivo [`server.js`](file:///c:/Users/User/OneDrive%20-%20Servicio%20Nacional%20de%20Aprendizaje/Documentos/SENA%20MOSQUERA/SISTEMAS%20CONTENIDO/MONGO/sitio/server.js) para ver el código:

### 1. Inserción de Datos (`insertOne`)
Cuando el cliente envía el formulario de reserva, el backend recibe el objeto JSON, le añade una marca de tiempo y lo guarda directamente en Atlas usando la función `insertOne()` del driver oficial:
```javascript
const booking = {
  name: name.trim(),
  email: email.trim().toLowerCase(),
  phone: phone ? phone.trim() : '',
  tour,
  people: parseInt(people),
  message: message ? message.trim() : '',
  timestamp: new Date()
};

const result = await db.collection('bookings').insertOne(booking);
```
Esto crea instantáneamente el documento dentro de la colección `bookings`.

### 2. Consulta y Ordenamiento (`find` + `sort` + `limit`)
Al cargar la página web, el frontend hace una petición al servidor para rellenar el "Muro de Reservas en Vivo". El servidor consulta los últimos 10 registros ordenados por fecha de creación (de forma descendente):
```javascript
const bookings = await db.collection('bookings')
  .find()
  .sort({ timestamp: -1 })
  .limit(10)
  .toArray();
```
Esto ayuda a enseñar el uso de modificadores de consultas en MongoDB.

### 3. Dinámica del Esquema Flexible
Puedes explicar a los estudiantes la ventaja del esquema flexible de MongoDB: el campo `phone` o `message` pueden dejarse vacíos o no enviarse, y MongoDB guardará el documento sin lanzar errores de esquema rígido, a diferencia de las bases de datos relacionales tradicionales (SQL).

---

## 🗂️ Cómo ver los datos en MongoDB Compass

1. Abre **MongoDB Compass** y conéctate usando el URI de tu `.env`.
2. Busca la base de datos llamada **`ecotours`**.
3. Abre la colección **`bookings`**.
4. Rellena el formulario en tu navegador y haz clic en **"Guardar en MongoDB Atlas"**.
5. Haz clic en el botón de **Refresh** (recargar) en MongoDB Compass. ¡Verás aparecer el documento con tu nombre y detalles al instante!
