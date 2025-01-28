const mongoose = require('mongoose');

const MultaSchema = new mongoose.Schema({
    departamento: { type: String, required: true },
    motivoMulta: { type: String, required: true },
    multa: { type: String, required: true },
}, {
    timestamps: true, // Opcional: agrega createdAt y updatedAt automáticamente
});

module.exports = mongoose.model('Multa', MultaSchema);