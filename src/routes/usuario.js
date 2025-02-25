const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const usuario = require('../models/usuario'); // Modelo de Usuario
const Usuario = require('../models/usuario');
const Notificacion = require('../models/notificaciones'); // Modelo de notificaciones
const SECRET_KEY = 'secret';
const SECRET_KEY_TWO = 'secret2';
const jwt = require('jsonwebtoken');



// Ruta para insertar un usuario
router.post('/insertar_usuario', verifyToken, async (req, res) => {
    try {
        const { nombre, apellido, telefono, departamento, contra, rol } = req.body;

        // Validar datos
        if (!nombre || !apellido || !telefono || !departamento || !contra ||!rol) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        console.log('Datos recibidos:', req.body);

        // Crear nuevo usuario
        const nuevoUsuario = new Usuario({ nombre, apellido, telefono, departamento, contra, rol });
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


router.post('/cambiar-contra', async (req, res) => {
    try {
        const { telefono, departamento, oldPassword, newPassword } = req.body;

        if (!telefono || !departamento || !oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la anterior' });
        }

        const usuario = await Usuario.findOne({ telefono, departamento });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (usuario.contra !== oldPassword) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
        }

        usuario.contra = newPassword;
        await usuario.save();

        res.status(200).json({ message: 'Contraseña actualizada exitosamente' });

    } catch (error) {
        console.error('Error en actualización de contraseña:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});


router.post('/logout-all-devices', async (req, res) => {
    const { telefono } = req.body; // Ahora recibe el teléfono en lugar del userId

    try {
        // Verificar si el usuario existe
        const usuario = await Usuario.findOne({ telefono });
        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Eliminar el token permanente del usuario
        await Usuario.updateOne({ telefono }, { $unset: { permanentToken: "" } });

        // Eliminar todas las sesiones del usuario (si usas una colección de sesiones)
        await Session.deleteMany({ user: usuario._id });

        res.status(200).json({ message: "Sesiones cerradas en todos los dispositivos" });
    } catch (error) {
        res.status(500).json({ message: "Error al cerrar las sesiones", error });
    }
});

    
//Ruta para ferificar token permanente
router.post('/verify-permanent', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ valid: false, message: "Token no proporcionado" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, SECRET_KEY_TWO);

        const usuario = await Usuario.findOne({ _id: decoded.userId, permanentToken: token });

        if (!usuario) { 
            return res.status(401).json({ valid: false, message: 'Token inválido' });
        }

        res.status(200).json({ valid: true, departamento: usuario.departamento, rol: usuario.rol });

    } catch (error) {
        res.status(401).json({ valid: false, message: "Token inválido o expirado" });
    }
});

// Ruta de login
router.post('/login', async (req, res) => {
    try {
        const { telefono, contra, departamento, rememberDevice } = req.body;

        if (!telefono || !contra || !departamento) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const usuario = await Usuario.findOne({ telefono, contra, departamento });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Generar el token temporal
        const token = jwt.sign(
            { userId: usuario._id, departamento: usuario.departamento, rol: usuario.rol },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        let permanentToken = null; 

        if (rememberDevice) {
            permanentToken = jwt.sign(
                { userId: usuario._id, telefono: usuario.telefono },
                SECRET_KEY_TWO
            );

            usuario.permanentToken = permanentToken;
            await usuario.save();
        }

        res.status(200).json({
            message: 'Usuario autenticado',
            token,
            permanentToken,  // Se envía solo si se generó
            departamento: usuario.departamento,
            rol: usuario.rol
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Middleware para verificar el token
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
                nombre: usuario.nombre
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


