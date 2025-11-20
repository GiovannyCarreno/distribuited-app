const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

router.get('/', async (req, res, next) => {
  try {
    const result = await db.getAllByType(db.dbSucursal, 'venta');
    
    res.json({
      success: true,
      sucursal: process.env.SUCURSAL_ID || 'C',
      count: result.docs.length,
      data: result.docs,
      note: 'Para ver ventas de todas las sucursales usa /api/global/ventas'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/fecha/:fecha', async (req, res, next) => {
  try {
    const fecha = req.params.fecha;
    const result = await db.find(db.dbSucursal, {
      tipo: 'venta',
      fecha: { $gte: fecha, $lt: fecha + 'T23:59:59' }
    });
    
    res.json({
      success: true,
      sucursal: process.env.SUCURSAL_ID || 'C',
      count: result.docs.length,
      data: result.docs
    });
  } catch (error) {
    next(error);
  }
});

router.get('/rango', async (req, res, next) => {
  try {
    const { inicio, fin } = req.query;
    
    if (!inicio || !fin) {
      return res.status(400).json({ 
        error: 'Parámetros requeridos: inicio, fin (formato: YYYY-MM-DD)' 
      });
    }

    const result = await db.find(db.dbSucursal, {
      tipo: 'venta',
      fecha: { $gte: inicio, $lte: fin + 'T23:59:59' }
    });
    
    const total = result.docs
      .filter(v => !v.cancelada)
      .reduce((sum, v) => sum + (v.total || 0), 0);
    
    res.json({
      success: true,
      sucursal: process.env.SUCURSAL_ID || 'C',
      count: result.docs.length,
      data: result.docs,
      total
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const venta = await db.getDocument(db.dbSucursal, req.params.id);
    
    if (venta.tipo !== 'venta') {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    res.json({
      success: true,
      data: venta
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { cliente_id, productos, metodo_pago } = req.body;

    if (!productos || productos.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    let total = 0;
    const productosConDetalle = [];

    for (const item of productos) {
      const producto = await db.getDocument(db.dbSucursal, item.producto_id);
      
      if ((producto.stock_actual || 0) < item.cantidad) {
        return res.status(400).json({ 
          error: `Stock insuficiente para ${producto.nombre}` 
        });
      }

      const subtotal = producto.precio_venta * item.cantidad;
      total += subtotal;

      productosConDetalle.push({
        producto_id: producto._id,
        nombre: producto.nombre,
        cantidad: item.cantidad,
        precio_unitario: producto.precio_venta,
        subtotal
      });

      producto.stock_actual -= item.cantidad;
      await db.updateDocument(db.dbSucursal, producto._id, producto);
    }

    const venta = {
      _id: `venta_${Date.now()}`,
      tipo: 'venta',
      cliente_id,
      productos: productosConDetalle,
      total,
      metodo_pago: metodo_pago || 'efectivo',
      sucursal: process.env.SUCURSAL_ID || 'C',
      fecha: new Date().toISOString()
    };

    const result = await db.createDocument(db.dbSucursal, venta);
    
    res.status(201).json({
      success: true,
      message: 'Venta registrada (sincronizándose...)',
      data: { 
        id: result.id, 
        rev: result.rev,
        total,
        productos_vendidos: productos.length
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const venta = await db.getDocument(db.dbSucursal, req.params.id);
    
    if (venta.cancelada) {
      return res.status(400).json({ error: 'La venta ya está cancelada' });
    }

    for (const item of venta.productos) {
      const producto = await db.getDocument(db.dbSucursal, item.producto_id);
      producto.stock_actual = (producto.stock_actual || 0) + item.cantidad;
      await db.updateDocument(db.dbSucursal, producto._id, producto);
    }

    venta.cancelada = true;
    venta.fecha_cancelacion = new Date().toISOString();
    venta.motivo_cancelacion = req.body.motivo || 'No especificado';

    const result = await db.updateDocument(db.dbSucursal, req.params.id, venta);
    
    res.json({
      success: true,
      message: 'Venta cancelada y stock revertido (sincronizándose...)',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;