const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET /api/productos - Solo productos de ESTA sucursal
router.get('/', async (req, res, next) => {
  try {
    const { includeDeleted = 'false' } = req.query;
    const result = await db.getAllByType(
      db.dbSucursal, 
      'producto', 
      includeDeleted === 'true'
    );
    
    res.json({
      success: true,
      sucursal: process.env.SUCURSAL_ID || 'B',
      count: result.docs.length,
      data: result.docs,
      note: 'Para ver productos de todas las sucursales usa /api/global/productos'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/productos/stock-bajo
router.get('/stock-bajo', async (req, res, next) => {
  try {
    const result = await db.find(db.dbSucursal, {
      tipo: 'producto',
      $and: [
        { deleted: { $exists: false } },
        { stock_actual: { $exists: true } },
        { stock_minimo: { $exists: true } }
      ]
    });

    const stockBajo = result.docs.filter(doc => 
      doc.stock_actual < (doc.stock_minimo || 20)
    );

    res.json({
      success: true,
      sucursal: process.env.SUCURSAL_ID || 'B',
      count: stockBajo.length,
      data: stockBajo.map(doc => ({
        _id: doc._id,
        nombre: doc.nombre,
        stock_actual: doc.stock_actual,
        stock_minimo: doc.stock_minimo || 20,
        diferencia: (doc.stock_minimo || 20) - doc.stock_actual
      }))
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/productos/search?nombre=paracetamol (solo en esta sucursal)
router.get('/search', async (req, res, next) => {
  try {
    const { nombre } = req.query;
    if (!nombre) {
      return res.status(400).json({ error: 'Parámetro "nombre" requerido' });
    }

    const result = await db.find(db.dbSucursal, {
      tipo: 'producto',
      nombre: { $regex: new RegExp(nombre, 'i') },
      deleted: { $exists: false }
    });

    res.json({
      success: true,
      sucursal: process.env.SUCURSAL_ID || 'B',
      count: result.docs.length,
      data: result.docs,
      note: 'Para buscar en todas las sucursales usa /api/global/productos/search?nombre=' + nombre
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/productos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const producto = await db.getDocument(db.dbSucursal, req.params.id);
    
    if (producto.tipo !== 'producto') {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      success: true,
      data: producto
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ 
        error: 'Producto no encontrado en esta sucursal',
        note: 'Intenta con /api/global/producto/' + req.params.id
      });
    }
    next(error);
  }
});

// POST /api/productos
router.post('/', async (req, res, next) => {
  try {
    const producto = {
      _id: `prod_${Date.now()}`,
      tipo: 'producto',
      ...req.body,
      sucursal: process.env.SUCURSAL_ID || 'B',
      fecha_registro: new Date().toISOString()
    };

    if (!producto.nombre || !producto.precio_venta) {
      return res.status(400).json({ 
        error: 'Campos requeridos: nombre, precio_venta' 
      });
    }

    const result = await db.createDocument(db.dbSucursal, producto);
    
    res.status(201).json({
      success: true,
      message: 'Producto creado en esta sucursal (sincronizándose...)',
      data: { id: result.id, rev: result.rev, sucursal: producto.sucursal }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/productos/:id
router.put('/:id', async (req, res, next) => {
  try {
    const producto = {
      tipo: 'producto',
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };

    const result = await db.updateDocument(db.dbSucursal, req.params.id, producto);
    
    res.json({
      success: true,
      message: 'Producto actualizado (sincronizándose...)',
      data: { id: result.id, rev: result.rev }
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/productos/:id/stock
router.patch('/:id/stock', async (req, res, next) => {
  try {
    const { cantidad, operacion } = req.body;
    
    if (!cantidad || !operacion) {
      return res.status(400).json({ 
        error: 'Campos requeridos: cantidad, operacion (sumar|restar|establecer)' 
      });
    }

    const producto = await db.getDocument(db.dbSucursal, req.params.id);
    
    if (operacion === 'sumar') {
      producto.stock_actual = (producto.stock_actual || 0) + cantidad;
    } else if (operacion === 'restar') {
      producto.stock_actual = (producto.stock_actual || 0) - cantidad;
    } else if (operacion === 'establecer') {
      producto.stock_actual = cantidad;
    } else {
      return res.status(400).json({ error: 'Operación no válida' });
    }

    producto.fecha_actualizacion = new Date().toISOString();
    
    const result = await db.updateDocument(db.dbSucursal, req.params.id, producto);
    
    res.json({
      success: true,
      message: 'Stock actualizado (sincronizándose...)',
      data: { 
        id: result.id, 
        rev: result.rev,
        stock_actual: producto.stock_actual
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/productos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { hard = 'false' } = req.query;
    
    let result;
    if (hard === 'true') {
      result = await db.hardDeleteDocument(db.dbSucursal, req.params.id);
    } else {
      result = await db.deleteDocument(db.dbSucursal, req.params.id);
    }
    
    res.json({
      success: true,
      message: `Producto ${hard === 'true' ? 'eliminado permanentemente' : 'marcado como eliminado'} (sincronizándose...)`,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;