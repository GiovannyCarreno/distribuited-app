const PouchDB = require('pouchdb');
const path = require('path');
require('dotenv').config();

const COUCHDB_USER = process.env.COUCHDB_USER || 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD || 'password1234';
const COUCHDB_HOST = process.env.COUCHDB_HOST || 'localhost:5984';
const COUCHDB_URL = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_HOST}`;
const SUCURSAL_ID = process.env.SUCURSAL_ID || 'C';
const LOCAL_DB_PATH = path.join(__dirname, 'data');

const setupInitialData = async () => {
  console.log('🚀 Configuración inicial de PouchDB para Sucursal', SUCURSAL_ID);
  console.log('='.repeat(60));

  // Crear bases de datos locales
  const localDBSucursal = new PouchDB(path.join(LOCAL_DB_PATH, `farmacia_${SUCURSAL_ID.toLowerCase()}_productos_ventas`));
  const localDBCompartida = new PouchDB(path.join(LOCAL_DB_PATH, 'farmacias_clientes_proveedores'));

  console.log('✅ Bases de datos locales creadas');

  // Productos iniciales
  const productos = [
    {
      _id: "prod_paracetamol_500mg",
      tipo: "producto",
      nombre: "Paracetamol 500mg",
      codigo_barras: "7501234567890",
      categoria: "Analgésico",
      precio_compra: 25.50,
      precio_venta: 45.00,
      stock_actual: 150,
      stock_minimo: 20,
      requiere_receta: false,
      caducidad: "2025-12-31",
      lote: "L12345",
      sucursal: SUCURSAL_ID,
      fecha_registro: new Date().toISOString()
    },
    {
      _id: "prod_amoxicilina_500mg",
      tipo: "producto", 
      nombre: "Amoxicilina 500mg",
      codigo_barras: "7501234567891",
      categoria: "Antibiótico",
      precio_compra: 35.00,
      precio_venta: 75.00,
      stock_actual: 45,
      stock_minimo: 15,
      requiere_receta: true,
      caducidad: "2025-06-30",
      lote: "L12346",
      sucursal: SUCURSAL_ID,
      fecha_registro: new Date().toISOString()
    },
    {
      _id: "prod_ibuprofeno_400mg",
      tipo: "producto",
      nombre: "Ibuprofeno 400mg",
      codigo_barras: "7501234567892", 
      categoria: "Antiinflamatorio",
      precio_compra: 18.00,
      precio_venta: 32.00,
      stock_actual: 12,
      stock_minimo: 20,
      requiere_receta: false,
      caducidad: "2025-09-15",
      lote: "L12347",
      sucursal: SUCURSAL_ID,
      fecha_registro: new Date().toISOString()
    },
    {
      _id: "prod_omeprazol_20mg",
      tipo: "producto",
      nombre: "Omeprazol 20mg",
      codigo_barras: "7501234567893",
      categoria: "Antiácido",
      precio_compra: 22.00,
      precio_venta: 40.00,
      stock_actual: 80,
      stock_minimo: 25,
      requiere_receta: false,
      caducidad: "2025-11-30",
      lote: "L12348",
      sucursal: SUCURSAL_ID,
      fecha_registro: new Date().toISOString()
    }
  ];

  console.log('\n📦 Insertando productos...');
  for (const producto of productos) {
    try {
      await localDBSucursal.put(producto);
      console.log(`   ✅ ${producto.nombre}`);
    } catch (error) {
      if (error.status === 409) {
        console.log(`   ℹ️  ${producto.nombre} ya existe`);
      } else {
        console.error(`   ❌ Error: ${producto.nombre}`, error.message);
      }
    }
  }

  // Clientes iniciales
  const clientes = [
    {
      _id: "cli_maria_gonzalez",
      tipo: "cliente",
      nombre: "María González López",
      telefono: "5512345678",
      email: "maria@email.com",
      alergias: ["Penicilina"],
      sucursales_visitadas: [SUCURSAL_ID],
      fecha_registro: new Date().toISOString()
    },
    {
      _id: "cli_carlos_rodriguez", 
      tipo: "cliente",
      nombre: "Carlos Rodríguez Martínez",
      telefono: "5523456789",
      email: "carlos@email.com",
      alergias: [],
      sucursales_visitadas: [SUCURSAL_ID],
      fecha_registro: new Date().toISOString()
    },
    {
      _id: "cli_ana_martinez",
      tipo: "cliente",
      nombre: "Ana Martínez Sánchez",
      telefono: "5534567890",
      email: "ana@email.com",
      alergias: ["Aspirina"],
      sucursales_visitadas: [],
      fecha_registro: new Date().toISOString()
    }
  ];

  console.log('\n👥 Insertando clientes...');
  for (const cliente of clientes) {
    try {
      await localDBCompartida.put(cliente);
      console.log(`   ✅ ${cliente.nombre}`);
    } catch (error) {
      if (error.status === 409) {
        console.log(`   ℹ️  ${cliente.nombre} ya existe`);
      } else {
        console.error(`   ❌ Error: ${cliente.nombre}`, error.message);
      }
    }
  }

  // Proveedores iniciales
  const proveedores = [
    {
      _id: "prov_laboratorios_abc",
      tipo: "proveedor",
      nombre: "Laboratorios ABC",
      contacto: "5555555555",
      email: "ventas@lababc.com",
      direccion: "Av. Principal 123, CDMX",
      fecha_registro: new Date().toISOString()
    },
    {
      _id: "prov_farmaceutica_xyz",
      tipo: "proveedor",
      nombre: "Farmacéutica XYZ",
      contacto: "5566666666",
      email: "contacto@farmxyz.com",
      direccion: "Calle Secundaria 456, Guadalajara",
      fecha_registro: new Date().toISOString()
    }
  ];

  console.log('\n🏢 Insertando proveedores...');
  for (const proveedor of proveedores) {
    try {
      await localDBCompartida.put(proveedor);
      console.log(`   ✅ ${proveedor.nombre}`);
    } catch (error) {
      if (error.status === 409) {
        console.log(`   ℹ️  ${proveedor.nombre} ya existe`);
      } else {
        console.error(`   ❌ Error: ${proveedor.nombre}`, error.message);
      }
    }
  }

  // Sincronizar con CouchDB remoto
  console.log('\n🔄 Sincronizando con CouchDB remoto...');
  
  const remoteDBSucursal = new PouchDB(`${COUCHDB_URL}/farmacia_${SUCURSAL_ID.toLowerCase()}_productos_ventas`);
  const remoteDBCompartida = new PouchDB(`${COUCHDB_URL}/farmacias_clientes_proveedores`);

  try {
    await localDBSucursal.replicate.to(remoteDBSucursal);
    console.log('   ✅ Base de datos de sucursal sincronizada');
    
    await localDBCompartida.replicate.to(remoteDBCompartida);
    console.log('   ✅ Base de datos compartida sincronizada');
  } catch (error) {
    console.error('   ⚠️  Error en sincronización inicial:', error.message);
    console.log('   ℹ️  Los datos están guardados localmente');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 CONFIGURACIÓN COMPLETADA');
  console.log('='.repeat(60));
  console.log(`\n📊 Resumen:`);
  console.log(`   • Sucursal: ${SUCURSAL_ID}`);
  console.log(`   • Productos: ${productos.length} insertados`);
  console.log(`   • Clientes: ${clientes.length} insertados`);
  console.log(`   • Proveedores: ${proveedores.length} insertados`);
  console.log(`\n🔍 Bases de datos locales en: ${LOCAL_DB_PATH}`);
  console.log(`\n🚀 Ahora puedes ejecutar: npm run dev`);
  console.log('');

  process.exit(0);
};

if (require.main === module) {
  setupInitialData().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { setupInitialData };