require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const multas = require("./src/routes/multas");
const usuario = require("./src/routes/usuario");
const notificaciones = require("./src/notificaciones");
const whatsapp = require("./src/routes/whatsapp");


const app = express();

// Conectar a MongoDB
connectDB();

// Middleware
app.use(cors()); // Habilitar CORS
app.use(express.json());

// Rutas
app.use("/api", multas);
app.use("/api", usuario);
app.use("/api", notificaciones);
app.use("/api", whatsapp);


// Servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Servidor corriendo en el puerto ${PORT}'));