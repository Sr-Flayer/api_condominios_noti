const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Usuario = require('../models/usuario');
const Notificacion = require('../models/notificaciones'); // Modelo de notificaciones
const SECRET_KEY = 'secret';
const SECRET_KEY_TWO = 'secret2';
const jwt = require('jsonwebtoken');
const Token = require('../models/whats');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');




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


router.post('/recuperar', async (req, res) => {
    try {
        const { telefono } = req.body;
        

        if (!telefono) {
            return res.status(400).json({ message: 'El teléfono es obligatorio' });
        }

        // Buscar el usuario por número de teléfono
        const usuario = await Usuario.findOne({ telefono });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Generar token de recuperación (válido por 1 hora)
        const tokenRecuperacion = jwt.sign(
            { id: usuario._id, correo: usuario.correo },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Guardar el token en la base de datos
        usuario.token_recuperacion = tokenRecuperacion;
        await usuario.save();

        // Enlace para restablecer la contraseña
        const urlRecuperacion = `http://localhost:5173/All_users/cambiar_pass/${tokenRecuperacion}`;

        // Configurar Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Configurar el correo
        const mailOptions = {
            from: `"Soporte" <${process.env.EMAIL_USER}>`,
            to: usuario.correo, // Se usa el correo asociado al teléfono
            subject: 'Recuperación de contraseña',
            html: `
                <p>Hola ${usuario.nombre},</p>
                <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para restablecerla:</p>
                <a href="${urlRecuperacion}" target="_blank">Restablecer contraseña</a>
                <p>Este enlace es válido por 1 hora.</p>
                <p>Si no solicitaste este cambio, ignora este mensaje.</p>
            `,
        };

        // Enviar el correo
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Token de recuperación enviado al correo registrado' });
    } catch (error) {
        console.error('Error en la recuperación:', error);
        res.status(500).json({ message: 'Error al generar token de recuperación' });
    }
});

router.post('/validar_token_recuperacion', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'El token es obligatorio' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await Usuario.findById(decoded.id);

        if (!usuario || usuario.token_recuperacion !== token) {
            return res.status(401).json({ message: 'Token inválido o expirado' });
        }

        res.status(200).json({ message: 'Token válido', userId: usuario._id });
    } catch (error) {
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
});

router.post('/cambiar_contra_recuperacion', async (req, res) => {
    try {
        const { token, nuevaContraseña } = req.body;

        if (!token || !nuevaContraseña) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        // Verificar el token
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(400).json({ message: 'Token inválido o expirado' });
        }

        // Buscar al usuario por ID y validar el token de recuperación
        const usuario = await Usuario.findById(payload.id);
        if (!usuario || usuario.token_recuperacion !== token) {
            return res.status(400).json({ message: 'Token no válido' });
        }

        // Hashear la nueva contraseña
        usuario.contra = await bcrypt.hash(nuevaContraseña, 10);

        // Eliminar el token de recuperación después del uso
        usuario.token_recuperacion = null;

        await usuario.save();

        res.status(200).json({ message: 'Contraseña cambiada exitosamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña por recuperación:', error);
        res.status(500).json({ message: 'Error al cambiar contraseña' });
    }
});


module.exports = router;



