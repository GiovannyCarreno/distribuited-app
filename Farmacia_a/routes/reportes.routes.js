const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

router.get('/dashboard', async (req, res, next) => {
  try {
    const productos = await db.getAllByType(db.dbSucursal, 'producto');
    const ventas = await db.getAllByType(db.dbSucursal, 'venta');
    const clientes = await db.getAllByType(db.dbCompartida, 'cliente');
    
    const stockBajo = productos.docs.filter(p => 
      p.stock_actual < (p.stock_minimo || 20)
    );

    const hoy = new Date().toISOString().substring(0, 10);
    const ventasHoy = ventas.docs.filter(v => 
      v.fecha && v.fecha.substring(0, 10) === hoy && !v.cancelada
    );
    const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);

    res.json({
      success: true,
      sucursal: process.env.SUCURSAL_ID || 'A',
      data: {
        productos_totales: productos.docs.length,
        ventas_totales: ventas.docs.filter(v => !v.cancelada).length,
        clientes_totales: clientes.docs.length,
        productos_stock_bajo: stockBajo.length,
        ventas_hoy: ventasHoy.length,
        total_ventas_hoy: totalVentasHoy,
        fecha_reporte: new Date().toISOString()
      },
      note: 'Para estadísticas de toda la red usa /api/global/estadisticas'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/ventas-mes', async (req, res, next) => {
  try {
    const { mes, anio } = req.query;
    const mesActual = mes || (new Date().getMonth() + 1).toString().padStart(2, '0');
    const anioActual = anio || new Date().getFullYear();

    const inicio = `${anioActual}-${mesActual}-01`;
    const fin = `${anioActual}-${mesActual}-31T23:59:59`;

    const result = await db.find(db.dbSucursal, {
      tipo: 'venta',
      fecha: { $gte: inicio, $lte: fin }
    });

    const ventasValidas = result.docs.filter(v => !v.cancelada);
    const total = ventasValidas.reduce((sum, v) => sum + (v.total || 0), 0);

    res.json({
      success: true,
      sucursal: process.env.SUCURSAL_ID || 'A',
      periodo: `${mesActual}/${anioActual}`,
      count: ventasValidas.length,
      total,
      data: ventasValidas
    });
  } catch (error) {
    next(error);
  }
});

router.get('/productos-mas-vendidos', async (req, res, next) => {
  try {
    const { limite = '10' } = req.query;
    
    const ventas = await db.getAllByType(db.dbSucursal, 'venta');
    const conteoProductos = {};
    
    ventas.docs.forEach(venta => {
      if (!venta.cancelada && venta.productos) {
        venta.productos.forEach(item => {
          if (!conteoProductos[item.producto_id]) {
            conteoProductos[item.producto_id] = {
              producto_id: item.producto_id,
              nombre: item.nombre,
              cantidad_vendida: 0,
              total_generado: 0
            };
          }
          conteoProductos[item.producto_id].cantidad_vendida += item.cantidad;
          conteoProductos[item.producto_id].total_generado += item.subtotal;
        });
      }
    });

    const ranking = Object.values(conteoProductos)
      .sort((a, b) => b.cantidad_vendida - a.cantidad_vendida)
      .slice(0, parseInt(limite));

    res.json({
      success: true,
      sucursal: process.env.SUCURSAL_ID || 'A',
      count: ranking.length,
      data: ranking
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;