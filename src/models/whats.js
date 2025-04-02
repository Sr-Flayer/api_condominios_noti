const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
    phoneNumber: { 
        type: String, 
        required: true, 
    },
    tokenw: { 
        type: String, 
        required: true, 
}
}, {
    timestamps: true, // Añade campos `createdAt` y `updatedAt`
});

module.exports = mongoose.model('Token', TokenSchema);