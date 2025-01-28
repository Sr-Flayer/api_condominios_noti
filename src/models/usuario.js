const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    telefono: { type: String, required: true },
    departamento: { type: String, required: true },
    correo: { type: String, required: true },
});

module.exports = mongoose.model('Usuario', UsuarioSchema);