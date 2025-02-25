const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    telefono: { type: String, required: true },
    departamento: { type: String, required: true },
    contra: { type: String, required: true },
    rol: {type: String, required: true},
    permanentToken: { type: String, required: null },
});

module.exports = mongoose.model('Usuario', UsuarioSchema);