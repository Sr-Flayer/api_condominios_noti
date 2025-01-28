const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario'); // Modelo de Usuario
const Notificacion = require('../models/notificaciones'); // Modelo de notificaciones

router.post('/insertar_usuario', async (req, res) => {
    try {
        const {nombre, apellido, telefono, departamento, correo } = req.body;

        // Validar datos
        if (!nombre || !apellido || !telefono || !departamento || !correo) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        console.log('Datos recibidos:', req.body);

        // Crear nueva multa
        const nuevoUsuario = new Usuario({ nombre, apellido, telefono, departamento, correo });
        await nuevoUsuario.save();
        console.log('Usuario creada:', nuevoUsuario);

       

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            usuario: nuevoUsuario,
        });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).json({ message: 'Error al registrar el usuario' });
    }
});

// Obtener notificaciones por departamento
router.get('/notificaciones/:departamento', async (req, res) => {
    try {
        const { departamento } = req.params;
        const notificaciones = await Notificacion.find({ departamento, visto: false });
        res.json(notificaciones);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ message: 'Error al obtener notificaciones' });
    }
});

// Marcar notificación como vista
router.put('/notificaciones/visto/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Notificacion.findByIdAndUpdate(id, { visto: true });
        res.status(200).json({ message: 'Notificación marcada como vista' });
    } catch (error) {
        console.error('Error al marcar notificación como vista:', error);
        res.status(500).json({ message: 'Error al marcar notificación como vista' });
    }
});

module.exports = router;