const express = require('express');
const router = express.Router();
const Notificacion = require('../models/Notificacion');

router.get('/notifications', async (req, res) => {
  const { departamento } = req.query;
  if (!departamento) {
    return res.status(400).json({ message: 'Departamento no especificado.' });
  }

  try {
    const notifications = await Notificacion.find({ departamento: departamento, visto: false });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;