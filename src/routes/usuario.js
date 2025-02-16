const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Usuario = require('../models/usuario'); // Modelo de Usuario
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

router.post('/login', async (req, res) => {
    try {
        const { telefono, correo, departamento } = req.body;
  
        // Validar datos
        if (!telefono || !correo || !departamento) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }
  
        // Buscar usuario
        const usuario = await Usuario.findOne({ telefono, correo, departamento });
  
        // Si no se encuentra el usuario
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
  
        // Generar el token
        const token = jwt.sign({ telefono: usuario.telefono, rol: usuario.rol }, SECRET_KEY, { expiresIn: '1h' });
  
        res.status(200).json({
            message: 'Usuario encontrado',
            token,  // Asegúrate de enviar el token aquí
            usuario: {  
                departamento: usuario.departamento,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error('Error al buscar el usuario:', error);
        res.status(500).json({ message: 'Error al buscar el usuario' });
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

async function generateToken(user) {
    const token = jwt.sign({ telefono: user.telefono, rol: user.rol }, SECRET_KEY, { expiresIn: '1h' });
    return token;
}

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
