const mongoose = require('mongoose');
const Schema = mongoose.Schema; // Asegúrate de importar Schema

const NotificacionSchema = new Schema({
    departamento: { type: String, required: true },
    multa: { type: String, required: true },
    visto: { type: Boolean, default: false },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Notificacion', NotificacionSchema);