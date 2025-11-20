const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabases } = require('./config/database');
const productosRoutes = require('./routes/productos.routes');
const ventasRoutes = require('./routes/ventas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const reportesRoutes = require('./routes/reportes.routes');
const syncRoutes = require('./routes/sync.routes');
const globalRoutes = require('./routes/global.routes'); // NUEVO

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

let serverInstance;

initializeDatabases()
  .then(() => {
    console.log('✅ Sistema multi-sucursal inicializado');
    
    // Rutas locales (sucursal propia)
    app.use('/api/productos', productosRoutes);
    app.use('/api/ventas', ventasRoutes);
    app.use('/api/clientes', clientesRoutes);
    app.use('/api/proveedores', proveedoresRoutes);
    app.use('/api/reportes', reportesRoutes);
    app.use('/api/sync', syncRoutes);
    
    // Rutas globales (todas las sucursales)
    app.use('/api/global', globalRoutes); // NUEVO

    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'Farmacia API Multi-Sucursal',
        sucursal: process.env.SUCURSAL_ID || 'C',
        sync_enabled: true
      });
    });

    app.use((req, res) => {
      res.status(404).json({ error: 'Ruta no encontrada' });
    });

    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    serverInstance = app.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📍 Sucursal: ${process.env.SUCURSAL_ID || 'C'}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔄 Estado sync: http://localhost:${PORT}/api/sync/status`);
      console.log(`🌍 Vista global: http://localhost:${PORT}/api/global/estadisticas`);
      console.log(`${'='.repeat(60)}\n`);
    });
  })
  .catch(error => {
    console.error('❌ Error iniciando aplicación:', error);
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('✅ Servidor cerrado');
      process.exit(0);
    });
  }
});

module.exports = app;