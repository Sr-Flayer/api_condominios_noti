const mongoose = require('mongoose');
const Notificacion = require('./models/notificaciones');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Conectado a MongoDB');

        // Insertar un documento de prueba en la colección de notificaciones
        const notificacionPrueba = new Notificacion({
            departamento: '9',
            multa: '100',
            visto: false
        });

        await notificacionPrueba.save();
        console.log('Documento de prueba insertado en la colección de notificaciones');

        mongoose.connection.close();
    })
    .catch(err => {
        console.error('Error al conectar a MongoDB:', err);
    });
