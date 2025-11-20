const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

router.get('/', async (req, res, next) => {
  try {
    const result = await db.getAllByType(db.dbCompartida, 'proveedor');
    res.json({ success: true, count: result.docs.length, data: result.docs });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const proveedor = await db.getDocument(db.dbCompartida, req.params.id);
    if (proveedor.tipo !== 'proveedor') {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json({ success: true, data: proveedor });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const proveedor = {
      _id: `prov_${Date.now()}`,
      tipo: 'proveedor',
      ...req.body,
      fecha_registro: new Date().toISOString()
    };

    if (!proveedor.nombre || !proveedor.contacto) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, contacto' });
    }

    const result = await db.createDocument(db.dbCompartida, proveedor);
    res.status(201).json({
      success: true,
      message: 'Proveedor registrado (sincronizándose...)',
      data: { id: result.id, rev: result.rev }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const proveedor = {
      tipo: 'proveedor',
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };

    const result = await db.updateDocument(db.dbCompartida, req.params.id, proveedor);
    res.json({
      success: true,
      message: 'Proveedor actualizado (sincronizándose...)',
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
      message: 'Proveedor eliminado (sincronizándose...)',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;