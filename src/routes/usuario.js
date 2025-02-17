const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const usuario = require('../models/usuario'); // Modelo de Usuario
const Usuario = require('../models/usuario');
const Notificacion = require('../models/notificaciones'); // Modelo de notificaciones
const SECRET_KEY = 'secret';
const jwt = require('jsonwebtoken');

// Ruta para insertar un usuario
router.post('/insertar_usuario', verifyToken, async (req, res) => {
    try {
        const { nombre, apellido, telefono, departamento, correo, rol } = req.body;

        // Validar datos
        if (!nombre || !apellido || !telefono || !departamento || !correo ||!rol) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        console.log('Datos recibidos:', req.body);

        // Crear nuevo usuario
        const nuevoUsuario = new Usuario({ nombre, apellido, telefono, departamento, correo, rol });
        await nuevoUsuario.save();
        console.log('Usuario creado:', nuevoUsuario);

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            usuario: nuevoUsuario,
        });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).json({ message: 'Error al registrar el usuario' });
    }
});

// Ruta de login
router.post('/login', async (req, res) => {
    try {
        const { telefono, correo, departamento } = req.body;

        if (!telefono || !correo || !departamento) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const usuario = await Usuario.findOne({ telefono, correo, departamento });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        // Generar el token
        const token = jwt.sign(
            { departamento: usuario.departamento, rol: usuario.rol },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Usuario encontrado',
            token: token,  // Ahora enviamos el token correctamente
            departamento: usuario.departamento,
            rol: usuario.rol
        });

    } catch (error) {
        console.error('Error al buscar el usuario:', error);
        res.status(500).json({ message: 'Error al buscar el usuario' });
    }
});


// Middleware para verificar el token
function verifyToken(req, res, next) {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }
    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido o expirado' });
    }
}

// Ruta protegida para obtener información del usuario autenticado
router.get('/usuario', verifyToken, async (req, res) => {
    try {
        const usuario = await Usuario.findOne({ departamento: req.user.departamento });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Acceso permitido',
            user: {
                departamento: usuario.departamento,
                rol: usuario.rol,
                nombre: usuario.nombre,
                correo: usuario.correo
            }
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ message: 'Error al obtener usuario' });
    }
});

  

// Obtener notificaciones por departamento que no han sido vistas
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

// Eliminar múltiples notificaciones y devolverlas
router.delete('/notificaciones/eliminar', async (req, res) => {
    try {
        const { ids } = req.body;

        // Validar si todos los IDs son válidos
        if (!Array.isArray(ids) || !ids.every((id) => mongoose.Types.ObjectId.isValid(id))) {
            return res.status(400).json({ message: 'IDs inválidos' });
        }

        // Obtener las notificaciones a eliminar
        const notificacionesAEliminar = await Notificacion.find({ _id: { $in: ids } });

        // Eliminar las notificaciones
        await Notificacion.deleteMany({ _id: { $in: ids } });

        console.log('Notificaciones eliminadas:', notificacionesAEliminar);
        res.json(notificacionesAEliminar); // Enviar las notificaciones eliminadas al cliente
    } catch (error) {
        console.error('Error al eliminar las notificaciones:', error);
        res.status(500).json({ message: 'Error al eliminar las notificaciones' });
    }
});

module.exports = router;


function verifyToken(req, res, next) {
    const token = req.header('Authorization');  // Obtiene el token del header estándar

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        // Elimina 'Bearer ' y obtiene solo el token
        const decoded = jwt.verify(token.replace('Bearer ', ''), SECRET_KEY);
        req.user = decoded;  // Guarda la información del usuario en req.user
        next();  // Continúa con la ejecución de la siguiente función en la ruta
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido o expirado' });
    }
}


