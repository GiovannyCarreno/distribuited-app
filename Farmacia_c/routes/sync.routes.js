const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

router.get('/status', (req, res) => {
  const stats = db.getSyncStats();
  
  res.json({
    success: true,
    sync_enabled: true,
    sucursal_actual: stats.sucursal_actual,
    databases: {
      propia: {
        name: `farmacia_${stats.sucursal_actual.toLowerCase()}_productos_ventas`,
        mode: 'READ/WRITE',
        ...stats.propia
      },
      compartida: {
        name: 'farmacias_clientes_proveedores',
        mode: 'READ/WRITE',
        ...stats.compartida
      },
      otras_sucursales: Object.entries(stats.otras_sucursales).map(([sucursal, stat]) => ({
        sucursal,
        name: `farmacia_${sucursal.toLowerCase()}_productos_ventas`,
        mode: 'READ-ONLY',
        ...stat
      }))
    },
    timestamp: new Date().toISOString()
  });
});

router.post('/force', async (req, res, next) => {
  try {
    await db.forceSyncNow();
    
    res.json({
      success: true,
      message: 'Sincronización manual completada para todas las sucursales',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;