const express = require('express');
const router = express.Router();
const Multa = require('../models/multas'); // Ajusta la ruta al modelo según tu estructura
const Notificacion = require('../models/notificaciones'); // Modelo de notificaciones
const jwt = require('jsonwebtoken');

// Insertar multas y notificaciones
router.post('/insertar_multas', verifyToken, async (req, res) => {
    try {
        const { departamento, motivoMulta, multa } = req.body;

        // Validar datos
        if (!departamento || !motivoMulta || !multa) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        console.log('Datos recibidos:', req.body);

        // Crear nueva multa
        const nuevaMulta = new Multa({ departamento, motivoMulta, multa });
        await nuevaMulta.save();
        // console.log('Multa creada:', nuevaMulta);

        // Crear notificación
        const nuevaNotificacion = new Notificacion({ departamento, multa, visto: false });
        await nuevaNotificacion.save();
        //console.log('Notificación creada:', nuevaNotificacion);

        res.status(201).json({
            message: 'Multa registrada y notificación creada exitosamente',
            multa: nuevaMulta,
            notificacion: nuevaNotificacion
        });
    } catch (error) {
        console.error('Error al registrar la multa y la notificación:', error);
        res.status(500).json({ message: 'Error al registrar la multa y la notificación' });
    }
});


function verifyToken(req, res, next) {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido o expirado' });
    }
}


module.exports = router;