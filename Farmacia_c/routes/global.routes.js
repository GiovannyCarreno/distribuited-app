const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET /api/global/productos - Productos de TODAS las sucursales
router.get('/productos', async (req, res, next) => {
  try {
    const { includeDeleted = 'false' } = req.query;
    const resultados = await db.getAllProductosMultiSucursal(includeDeleted === 'true');
    
    const totalProductos = resultados.reduce((sum, r) => sum + r.productos.length, 0);
    
    res.json({
      success: true,
      sucursales: resultados.length,
      total_productos: totalProductos,
      data: resultados
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/global/productos/search?nombre=paracetamol
router.get('/productos/search', async (req, res, next) => {
  try {
    const { nombre } = req.query;
    if (!nombre) {
      return res.status(400).json({ error: 'Parámetro "nombre" requerido' });
    }

    const resultados = await db.searchProductosGlobal(nombre);
    const totalEncontrados = resultados.reduce((sum, r) => sum + r.count, 0);
    
    res.json({
      success: true,
      query: nombre,
      total_encontrados: totalEncontrados,
      sucursales_con_resultados: resultados.length,
      data: resultados
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/global/productos/stock/:nombre - Stock consolidado
router.get('/productos/stock/:nombre', async (req, res, next) => {
  try {
    const resultado = await db.getStockConsolidado(req.params.nombre);
    
    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/global/ventas - Ventas de TODAS las sucursales
router.get('/ventas', async (req, res, next) => {
  try {
    const { inicio, fin } = req.query;
    const resultados = await db.getAllVentasMultiSucursal(inicio, fin);
    
    const totalVentas = resultados.reduce((sum, r) => sum + r.count, 0);
    const montoTotal = resultados.reduce((sum, r) => sum + r.total, 0);
    
    res.json({
      success: true,
      periodo: inicio && fin ? `${inicio} a ${fin}` : 'Todas',
      sucursales: resultados.length,
      total_ventas: totalVentas,
      monto_total: montoTotal,
      data: resultados
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/global/estadisticas - Dashboard consolidado
router.get('/estadisticas', async (req, res, next) => {
  try {
    const stats = await db.getEstadisticasConsolidadas();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/global/producto/:id - Buscar producto en cualquier sucursal
router.get('/producto/:id', async (req, res, next) => {
  try {
    const resultado = await db.getProductoEnCualquierSucursal(req.params.id);
    
    if (!resultado.encontrado) {
      return res.status(404).json({ 
        success: false,
        error: 'Producto no encontrado en ninguna sucursal' 
      });
    }
    
    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;