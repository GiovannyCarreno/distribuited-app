const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

router.get('/', async (req, res, next) => {
  try {
    const result = await db.getAllByType(db.dbCompartida, 'cliente');
    res.json({ success: true, count: result.docs.length, data: result.docs });
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const { nombre } = req.query;
    if (!nombre) {
      return res.status(400).json({ error: 'Parámetro "nombre" requerido' });
    }

    const result = await db.find(db.dbCompartida, {
      tipo: 'cliente',
      nombre: { $regex: new RegExp(nombre, 'i') }
    });

    res.json({ success: true, count: result.docs.length, data: result.docs });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const cliente = await db.getDocument(db.dbCompartida, req.params.id);
    if (cliente.tipo !== 'cliente') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ success: true, data: cliente });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const cliente = {
      _id: `cli_${Date.now()}`,
      tipo: 'cliente',
      ...req.body,
      sucursales_visitadas: req.body.sucursales_visitadas || [],
      fecha_registro: new Date().toISOString()
    };

    if (!cliente.nombre || !cliente.telefono) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, telefono' });
    }

    const result = await db.createDocument(db.dbCompartida, cliente);
    res.status(201).json({
      success: true,
      message: 'Cliente registrado (compartido con todas las sucursales)',
      data: { id: result.id, rev: result.rev }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const cliente = {
      tipo: 'cliente',
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };

    const result = await db.updateDocument(db.dbCompartida, req.params.id, cliente);
    res.json({
      success: true,
      message: 'Cliente actualizado (sincronizándose...)',
      data: { id: result.id, rev: result.rev }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.deleteDocument(db.dbCompartida, req.params.id);
    res.json({
      success: true,
      message: 'Cliente eliminado (sincronizándose...)',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;