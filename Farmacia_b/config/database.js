const PouchDB = require('pouchdb');
const PouchDBFind = require('pouchdb-find');

// Load the find plugin
PouchDB.plugin(PouchDBFind);

const path = require('path');

const COUCHDB_USER = process.env.COUCHDB_USER || 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD || 'password1234';
const COUCHDB_HOST = process.env.COUCHDB_HOST || 'localhost:5984';
const COUCHDB_URL = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_HOST}`;
const SUCURSAL_ID = process.env.SUCURSAL_ID || 'B';
const SUCURSALES = (process.env.SUCURSALES || 'A,B,C').split(',');

const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || path.join(__dirname, '..', 'data');

class MultiSucursalDatabaseManager {
  constructor() {
    // Base de datos propia (lectura/escritura)
    this.localDBSucursal = null;
    this.remoteDBSucursal = null;
    
    // Bases de datos de otras sucursales (solo lectura)
    this.otherSucursalesDBs = new Map();
    
    // Base de datos compartida
    this.localDBCompartida = null;
    this.remoteDBCompartida = null;
    
    // Handlers de sincronización
    this.syncHandlers = {
      propia: null,
      compartida: null,
      otras: new Map()
    };
    
    // Estadísticas
    this.syncStats = {
      propia: { active: false, lastSync: null, docs_read: 0, docs_written: 0, errors: 0 },
      compartida: { active: false, lastSync: null, docs_read: 0, docs_written: 0, errors: 0 },
      otras: new Map()
    };

    this.sucursalActual = SUCURSAL_ID;
    this.todasLasSucursales = SUCURSALES;
  }

  async initialize() {
    console.log('🔧 Inicializando sistema multi-sucursal...');
    console.log(`📍 Sucursal actual: ${this.sucursalActual}`);
    console.log(`🏢 Sucursales en la red: ${this.todasLasSucursales.join(', ')}`);
    console.log('='.repeat(60));

    // 1. Crear base de datos local PROPIA (lectura/escritura)
    const dbNamePropia = `farmacia_${this.sucursalActual.toLowerCase()}_productos_ventas`;
    this.localDBSucursal = new PouchDB(path.join(LOCAL_DB_PATH, dbNamePropia));
    this.remoteDBSucursal = new PouchDB(`${COUCHDB_URL}/${dbNamePropia}`);
    console.log(`✅ BD Local Propia: ${dbNamePropia} (R/W)`);

    // 2. Crear base de datos compartida
    this.localDBCompartida = new PouchDB(path.join(LOCAL_DB_PATH, 'farmacias_clientes_proveedores'));
    this.remoteDBCompartida = new PouchDB(`${COUCHDB_URL}/farmacias_clientes_proveedores`);
    console.log(`✅ BD Compartida: farmacias_clientes_proveedores (R/W)`);

    // 3. Crear bases de datos de OTRAS sucursales (solo lectura)
    console.log('\n📥 Configurando réplicas de otras sucursales (solo lectura)...');
    for (const sucursal of this.todasLasSucursales) {
      if (sucursal !== this.sucursalActual) {
        const dbNameOtra = `farmacia_${sucursal.toLowerCase()}_productos_ventas`;
        const localDBOtra = new PouchDB(path.join(LOCAL_DB_PATH, `${dbNameOtra}_readonly`));
        const remoteDBOtra = new PouchDB(`${COUCHDB_URL}/${dbNameOtra}`);
        
        this.otherSucursalesDBs.set(sucursal, {
          local: localDBOtra,
          remote: remoteDBOtra
        });
        
        this.syncStats.otras.set(sucursal, {
          active: false,
          lastSync: null,
          docs_read: 0,
          errors: 0
        });
        
        console.log(`   ✅ Sucursal ${sucursal}: ${dbNameOtra} (READ-ONLY)`);
      }
    }

    // 4. Crear índices
    await this.createIndexes();

    // 5. Iniciar sincronización
    await this.startSync();

    return true;
  }

  async createIndexes() {
    console.log('\n📑 Creando índices...');
    
    const indexConfigs = [
      { fields: ['tipo'] },
      { fields: ['tipo', 'nombre'] },
      { fields: ['tipo', 'fecha'] },
      { fields: ['tipo', 'sucursal'] },
      { fields: ['tipo', 'stock_actual'] }
    ];

    try {
      // Índices para BD propia
      for (const config of indexConfigs) {
        await this.localDBSucursal.createIndex({ index: config });
      }

      // Índices para BD compartida
      await this.localDBCompartida.createIndex({ index: { fields: ['tipo'] } });
      await this.localDBCompartida.createIndex({ index: { fields: ['tipo', 'nombre'] } });

      // Índices para BDs de otras sucursales
      for (const [sucursal, dbs] of this.otherSucursalesDBs) {
        for (const config of indexConfigs) {
          await dbs.local.createIndex({ index: config });
        }
      }

      console.log('✅ Índices creados');
    } catch (error) {
      console.log('⚠️  Algunos índices ya existen');
    }
  }

  async startSync() {
    console.log('\n🔄 Iniciando sincronización...');

    const syncOptions = {
      live: true,
      retry: true,
      back_off_function: (delay) => {
        if (delay === 0) return 1000;
        return Math.min(delay * 2, 10000);
      }
    };

    // 1. Sincronización BIDIRECCIONAL de base de datos PROPIA
    console.log(`\n🔄 Sync BIDIRECCIONAL: Sucursal ${this.sucursalActual}`);
    this.syncHandlers.propia = this.localDBSucursal.sync(
      this.remoteDBSucursal,
      syncOptions
    )
    .on('change', (info) => {
      console.log(`📥 [${this.sucursalActual}] Cambio: ${info.direction}`);
      this.syncStats.propia.lastSync = new Date().toISOString();
      this.syncStats.propia.docs_read += info.change?.docs_read || 0;
      this.syncStats.propia.docs_written += info.change?.docs_written || 0;
    })
    .on('active', () => {
      this.syncStats.propia.active = true;
    })
    .on('paused', () => {
      this.syncStats.propia.active = false;
    })
    .on('error', (err) => {
      console.error(`🔴 [${this.sucursalActual}] Error sync:`, err.message);
      this.syncStats.propia.errors += 1;
    });

    // 2. Sincronización BIDIRECCIONAL de base de datos COMPARTIDA
    console.log('🔄 Sync BIDIRECCIONAL: BD Compartida');
    this.syncHandlers.compartida = this.localDBCompartida.sync(
      this.remoteDBCompartida,
      syncOptions
    )
    .on('change', (info) => {
      console.log(`📥 [Compartida] Cambio: ${info.direction}`);
      this.syncStats.compartida.lastSync = new Date().toISOString();
      this.syncStats.compartida.docs_read += info.change?.docs_read || 0;
      this.syncStats.compartida.docs_written += info.change?.docs_written || 0;
    })
    .on('active', () => {
      this.syncStats.compartida.active = true;
    })
    .on('paused', () => {
      this.syncStats.compartida.active = false;
    })
    .on('error', (err) => {
      console.error('🔴 [Compartida] Error sync:', err.message);
      this.syncStats.compartida.errors += 1;
    });

    // 3. Sincronización UNIDIRECCIONAL (solo FROM) de OTRAS sucursales
    console.log('\n🔄 Sync UNIDIRECCIONAL (READ-ONLY): Otras sucursales');
    for (const [sucursal, dbs] of this.otherSucursalesDBs) {
      const handler = dbs.local.replicate.from(
        dbs.remote,
        {
          live: true,
          retry: true,
          back_off_function: syncOptions.back_off_function
        }
      )
      .on('change', (info) => {
        console.log(`📥 [${sucursal}] Réplica recibida: ${info.docs_read || 0} docs`);
        const stats = this.syncStats.otras.get(sucursal);
        stats.lastSync = new Date().toISOString();
        stats.docs_read += info.docs_read || 0;
      })
      .on('active', () => {
        this.syncStats.otras.get(sucursal).active = true;
      })
      .on('paused', () => {
        this.syncStats.otras.get(sucursal).active = false;
      })
      .on('error', (err) => {
        console.error(`🔴 [${sucursal}] Error réplica:`, err.message);
        this.syncStats.otras.get(sucursal).errors += 1;
      });

      this.syncHandlers.otras.set(sucursal, handler);
      console.log(`   ✅ Sucursal ${sucursal}: réplica activa`);
    }

    console.log('\n✅ Todas las sincronizaciones configuradas');
  }

  // ============================================
  // MÉTODOS PARA BASE DE DATOS PROPIA (R/W)
  // ============================================

  async getDocument(db, id) {
    try {
      return await db.get(id);
    } catch (error) {
      throw { status: 404, message: 'Documento no encontrado', details: error.message };
    }
  }

  async createDocument(db, doc) {
    try {
      return await db.put(doc);
    } catch (error) {
      throw { status: 400, message: 'Error creando documento', details: error.message };
    }
  }

  async updateDocument(db, id, doc) {
    try {
      const existing = await db.get(id);
      doc._rev = existing._rev;
      return await db.put({ ...doc, _id: id });
    } catch (error) {
      throw { status: 400, message: 'Error actualizando documento', details: error.message };
    }
  }

  async deleteDocument(db, id) {
    try {
      const doc = await db.get(id);
      doc.deleted = true;
      doc.fecha_eliminacion = new Date().toISOString();
      return await db.put(doc);
    } catch (error) {
      throw { status: 400, message: 'Error eliminando documento', details: error.message };
    }
  }

  async hardDeleteDocument(db, id) {
    try {
      const doc = await db.get(id);
      return await db.remove(doc);
    } catch (error) {
      throw { status: 400, message: 'Error eliminando documento', details: error.message };
    }
  }

  async find(db, selector, options = {}) {
    try {
      return await db.find({ selector, ...options });
    } catch (error) {
      throw { status: 400, message: 'Error en búsqueda', details: error.message };
    }
  }

  async getAllByType(db, tipo, includeDeleted = false) {
    const selector = includeDeleted 
      ? { tipo } 
      : { tipo, $or: [{ deleted: { $exists: false } }, { deleted: false }] };
    return await this.find(db, selector);
  }

  // ============================================
  // MÉTODOS PARA CONSULTAS MULTI-SUCURSAL
  // ============================================

  // Obtener productos de TODAS las sucursales
  async getAllProductosMultiSucursal(includeDeleted = false) {
    const resultados = [];

    // Productos de sucursal propia
    const propios = await this.getAllByType(this.localDBSucursal, 'producto', includeDeleted);
    resultados.push({
      sucursal: this.sucursalActual,
      es_propia: true,
      productos: propios.docs
    });

    // Productos de otras sucursales
    for (const [sucursal, dbs] of this.otherSucursalesDBs) {
      try {
        const otros = await this.getAllByType(dbs.local, 'producto', includeDeleted);
        resultados.push({
          sucursal,
          es_propia: false,
          productos: otros.docs
        });
      } catch (error) {
        console.error(`Error obteniendo productos de sucursal ${sucursal}:`, error.message);
      }
    }

    return resultados;
  }

  // Obtener un producto específico de cualquier sucursal
  async getProductoEnCualquierSucursal(productoId) {
    // Buscar en sucursal propia
    try {
      const doc = await this.getDocument(this.localDBSucursal, productoId);
      if (doc.tipo === 'producto') {
        return {
          encontrado: true,
          sucursal: this.sucursalActual,
          es_propia: true,
          producto: doc
        };
      }
    } catch (error) {
      // No encontrado en propia, buscar en otras
    }

    // Buscar en otras sucursales
    for (const [sucursal, dbs] of this.otherSucursalesDBs) {
      try {
        const doc = await this.getDocument(dbs.local, productoId);
        if (doc.tipo === 'producto') {
          return {
            encontrado: true,
            sucursal,
            es_propia: false,
            producto: doc
          };
        }
      } catch (error) {
        // Continuar buscando
      }
    }

    return { encontrado: false };
  }

  // Buscar productos por nombre en todas las sucursales
  async searchProductosGlobal(nombre) {
    const resultados = [];

    // Buscar en sucursal propia
    const propios = await this.find(this.localDBSucursal, {
      tipo: 'producto',
      nombre: { $regex: new RegExp(nombre, 'i') },
      deleted: { $exists: false }
    });

    if (propios.docs.length > 0) {
      resultados.push({
        sucursal: this.sucursalActual,
        es_propia: true,
        count: propios.docs.length,
        productos: propios.docs
      });
    }

    // Buscar en otras sucursales
    for (const [sucursal, dbs] of this.otherSucursalesDBs) {
      try {
        const otros = await this.find(dbs.local, {
          tipo: 'producto',
          nombre: { $regex: new RegExp(nombre, 'i') },
          deleted: { $exists: false }
        });

        if (otros.docs.length > 0) {
          resultados.push({
            sucursal,
            es_propia: false,
            count: otros.docs.length,
            productos: otros.docs
          });
        }
      } catch (error) {
        console.error(`Error buscando en sucursal ${sucursal}:`, error.message);
      }
    }

    return resultados;
  }

  // Obtener stock consolidado de un producto
  async getStockConsolidado(nombreProducto) {
    const stocks = [];

    // Stock en sucursal propia
    const propios = await this.find(this.localDBSucursal, {
      tipo: 'producto',
      nombre: nombreProducto,
      deleted: { $exists: false }
    });

    propios.docs.forEach(doc => {
      stocks.push({
        sucursal: this.sucursalActual,
        es_propia: true,
        producto_id: doc._id,
        nombre: doc.nombre,
        stock_actual: doc.stock_actual || 0,
        precio_venta: doc.precio_venta
      });
    });

    // Stock en otras sucursales
    for (const [sucursal, dbs] of this.otherSucursalesDBs) {
      try {
        const otros = await this.find(dbs.local, {
          tipo: 'producto',
          nombre: nombreProducto,
          deleted: { $exists: false }
        });

        otros.docs.forEach(doc => {
          stocks.push({
            sucursal,
            es_propia: false,
            producto_id: doc._id,
            nombre: doc.nombre,
            stock_actual: doc.stock_actual || 0,
            precio_venta: doc.precio_venta
          });
        });
      } catch (error) {
        console.error(`Error obteniendo stock de ${sucursal}:`, error.message);
      }
    }

    const totalStock = stocks.reduce((sum, s) => sum + s.stock_actual, 0);

    return {
      nombre_producto: nombreProducto,
      total_stock_red: totalStock,
      por_sucursal: stocks
    };
  }

  // Obtener ventas de todas las sucursales
  async getAllVentasMultiSucursal(fechaInicio, fechaFin) {
    const resultados = [];

    // Ventas de sucursal propia
    let selector = { tipo: 'venta', cancelada: { $ne: true } };
    if (fechaInicio && fechaFin) {
      selector.fecha = { $gte: fechaInicio, $lte: fechaFin + 'T23:59:59' };
    }

    const propias = await this.find(this.localDBSucursal, selector);
    const totalPropio = propias.docs.reduce((sum, v) => sum + (v.total || 0), 0);

    resultados.push({
      sucursal: this.sucursalActual,
      es_propia: true,
      count: propias.docs.length,
      total: totalPropio,
      ventas: propias.docs
    });

    // Ventas de otras sucursales
    for (const [sucursal, dbs] of this.otherSucursalesDBs) {
      try {
        const otras = await this.find(dbs.local, selector);
        const totalOtra = otras.docs.reduce((sum, v) => sum + (v.total || 0), 0);

        resultados.push({
          sucursal,
          es_propia: false,
          count: otras.docs.length,
          total: totalOtra,
          ventas: otras.docs
        });
      } catch (error) {
        console.error(`Error obteniendo ventas de ${sucursal}:`, error.message);
      }
    }

    return resultados;
  }

  // Obtener estadísticas consolidadas
  async getEstadisticasConsolidadas() {
    const stats = {
      por_sucursal: [],
      totales_red: {
        productos: 0,
        ventas: 0,
        monto_total_ventas: 0
      }
    };

    // Stats sucursal propia
    const productos = await this.getAllByType(this.localDBSucursal, 'producto');
    const ventas = await this.getAllByType(this.localDBSucursal, 'venta');
    const totalVentas = ventas.docs
      .filter(v => !v.cancelada)
      .reduce((sum, v) => sum + (v.total || 0), 0);

    stats.por_sucursal.push({
      sucursal: this.sucursalActual,
      es_propia: true,
      productos: productos.docs.length,
      ventas: ventas.docs.filter(v => !v.cancelada).length,
      monto_ventas: totalVentas
    });

    stats.totales_red.productos += productos.docs.length;
    stats.totales_red.ventas += ventas.docs.filter(v => !v.cancelada).length;
    stats.totales_red.monto_total_ventas += totalVentas;

    // Stats otras sucursales
    for (const [sucursal, dbs] of this.otherSucursalesDBs) {
      try {
        const prods = await this.getAllByType(dbs.local, 'producto');
        const vents = await this.getAllByType(dbs.local, 'venta');
        const total = vents.docs
          .filter(v => !v.cancelada)
          .reduce((sum, v) => sum + (v.total || 0), 0);

        stats.por_sucursal.push({
          sucursal,
          es_propia: false,
          productos: prods.docs.length,
          ventas: vents.docs.filter(v => !v.cancelada).length,
          monto_ventas: total
        });

        stats.totales_red.productos += prods.docs.length;
        stats.totales_red.ventas += vents.docs.filter(v => !v.cancelada).length;
        stats.totales_red.monto_total_ventas += total;
      } catch (error) {
        console.error(`Error stats ${sucursal}:`, error.message);
      }
    }

    return stats;
  }

  getSyncStats() {
    const stats = {
      sucursal_actual: this.sucursalActual,
      propia: this.syncStats.propia,
      compartida: this.syncStats.compartida,
      otras_sucursales: {}
    };

    for (const [sucursal, stat] of this.syncStats.otras) {
      stats.otras_sucursales[sucursal] = stat;
    }

    return stats;
  }

  async forceSyncNow() {
    console.log('🔄 Forzando sincronización manual...');
    
    try {
      // Sync propia
      await this.localDBSucursal.replicate.to(this.remoteDBSucursal);
      await this.localDBSucursal.replicate.from(this.remoteDBSucursal);
      
      // Sync compartida
      await this.localDBCompartida.replicate.to(this.remoteDBCompartida);
      await this.localDBCompartida.replicate.from(this.remoteDBCompartida);
      
      // Sync otras
      for (const [sucursal, dbs] of this.otherSucursalesDBs) {
        await dbs.local.replicate.from(dbs.remote);
      }
      
      console.log('✅ Sincronización manual completada');
      return true;
    } catch (error) {
      console.error('❌ Error en sincronización manual:', error);
      throw error;
    }
  }

  stopSync() {
    if (this.syncHandlers.propia) {
      this.syncHandlers.propia.cancel();
    }
    if (this.syncHandlers.compartida) {
      this.syncHandlers.compartida.cancel();
    }
    for (const [, handler] of this.syncHandlers.otras) {
      handler.cancel();
    }
    console.log('🛑 Sincronización detenida');
  }

  get dbSucursal() {
    return this.localDBSucursal;
  }

  get dbCompartida() {
    return this.localDBCompartida;
  }
}

const dbManager = new MultiSucursalDatabaseManager();

module.exports = {
  db: dbManager,
  initializeDatabases: () => dbManager.initialize()
};