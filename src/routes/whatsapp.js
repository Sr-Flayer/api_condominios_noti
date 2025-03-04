const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Token = require('../models/whats');
const Usuario = require('../models/usuario') ;// Importa el modelo de Token

// Configuración de la API de WhatsApp Business
const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta';

// Función para generar un token JWT con duración de 5 minutos
const generateToken = (phoneNumber) => {
  return jwt.sign({ phoneNumber }, JWT_SECRET, { expiresIn: '5m' });
};

router.post('/send-whatsapp', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'phoneNumber es requerido' });
  }

  try {
    // Generar un token JWT
    const token = generateToken(phoneNumber);

    // Guardar el token en la base de datos
    const newToken = new Token({
      phoneNumber,
      token,
    });
    await newToken.save();

    const resetUrl = `${token}`;

    // Enviar el mensaje de WhatsApp
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: 'recuperacion',
          language: { code: 'en' },
          components: [
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [{ type: 'text', text: resetUrl }],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Mensaje enviado:', response.data);
    res.status(200).json({ success: true, data: response.data, token });
  } catch (error) {
    console.error('Error al enviar el mensaje:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
  }
});

router.post('/verify-token', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token es requerido' });
  }

  try {
    // Verificar el JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Extraer el número de teléfono del token decodificado
    const { phoneNumber } = decoded;

    // Buscar el usuario en la colección de usuarios
    const usuario = await Usuario.findOne({ phone: phoneNumber });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si todo está bien, devolver el userId
    res.status(200).json({ message: 'Token válido', userId: usuario.userId });
  } catch (error) {
    console.error(error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }

    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;