# 🏥 Sistema Distribuido Multi-Sucursal con CouchDB y PouchDB

Sistema de gestión farmacéutica distribuido donde cada sucursal mantiene su propia base de datos local con sincronización automática y **vista global en tiempo real** de todas las demás sucursales.

## ✨ Características Principales

- ✅ **Vista Global**: Consulta productos y ventas de TODAS las sucursales
- ✅ **Réplica Automática**: Cada sucursal replica las BDs de las demás (READ-ONLY)
- ✅ **Stock Consolidado**: Ve el stock total en toda la red
- ✅ **Sincronización Inteligente**:
  - **Bidireccional**: Para tu sucursal (lectura/escritura)
  - **Unidireccional**: De otras sucursales (solo lectura)
- ✅ **Sin Conflictos**: No puedes modificar datos de otras sucursales
- ✅ **Tiempo Real**: Cambios en cualquier sucursal se replican automáticamente
- ✅ **Servidor Central**: Monitoreo y administración centralizada del sistema

## 🗂️ Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────┐
│                 Servidor Central (Express)               │
│              Endpoints: /system/status                   │
│                        /system/docs                      │
│                        /system/stats                     │
└──────────────────────────────────────────────────────────┘
                            ↕
┌──────────────────────────────────────────────────────────┐
│                    CouchDB Central                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ farmacia │  │ farmacia │  │ farmacia │  │ clientes_││
│  │    _a    │  │    _b    │  │    _c    │  │ proveedores│
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
└──────────────────────────────────────────────────────────┘
       ↕              ↕              ↕              ↕
   ┌───────┐      ┌───────┐      ┌───────┐
   │ Suc A │      │ Suc B │      │ Suc C │
   │       │      │       │      │       │
   │ LOCAL │      │ LOCAL │      │ LOCAL │
   │┌─────┐│      │┌─────┐│      │┌─────┐│
   ││ _a  ││      ││ _b  ││      ││ _c  ││  ← Propia (R/W)
   │└─────┘│      │└─────┘│      │└─────┘│
   │┌─────┐│      │┌─────┐│      │┌─────┐│
   ││_b RO││      ││_a RO││      ││_a RO││  ← Réplicas (R)
   │└─────┘│      │└─────┘│      │└─────┘│
   │┌─────┐│      │┌─────┐│      │┌─────┐│
   ││_c RO││      ││_c RO││      ││_b RO││
   │└─────┘│      │└─────┘│      │└─────┘│
   │┌─────┐│      │┌─────┐│      │┌─────┐│
   ││Shared│      ││Shared││      ││Shared││  ← Compartida (R/W)
   │└─────┘│      │└─────┘│      │└─────┘│
   └───────┘      └───────┘      └───────┘
```

### Tipos de Bases de Datos

**Ejemplo para Sucursal A:**

| Base de Datos | Modo | Sincronización | Uso |
|---------------|------|----------------|-----|
| `farmacia_a_productos_ventas` | **R/W** | Bidireccional | Tus productos y ventas |
| `farmacia_b_productos_ventas` | **R** | Unidireccional FROM | Ver stock de Sucursal B |
| `farmacia_c_productos_ventas` | **R** | Unidireccional FROM | Ver stock de Sucursal C |
| `farmacias_clientes_proveedores` | **R/W** | Bidireccional | Clientes y proveedores compartidos |

## 📋 Requisitos

- **Node.js** (versión 16 o superior)
- **npm** (incluido con Node.js)
- **Docker** y **Docker Compose** (para CouchDB)

## 🚀 Instalación

### Paso 1: Clonar e Instalar Dependencias

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd <carpeta-proyecto>

# Instalar dependencias
npm install
```

**Dependencias principales:**
```bash
npm install express cors pouchdb pouchdb-find dotenv
npm install -D nodemon
```

### Paso 2: Configurar CouchDB

El proyecto incluye `docker-compose.yml` con CouchDB preconfigurado:

```bash
# Levantar CouchDB
docker-compose up -d
```

**Credenciales por defecto:**
- Usuario: `admin`
- Password: `password1234`
- Puerto: `5984`
- URL: `http://admin:password1234@localhost:5984`

**Interfaz web (Fauxton):** `http://localhost:5984/_utils`

### Paso 3: Configurar Variables de Entorno

Crea archivos `.env` para cada componente:

**Servidor Central (.env):**
```bash
PORT=3000
COUCHDB_USER=admin
COUCHDB_PASSWORD=password1234
COUCHDB_HOST=localhost:5984
```

**Sucursal A (.env):**
```bash
PORT=3010
NODE_ENV=development
SUCURSAL_ID=A
SUCURSALES=A,B,C

COUCHDB_USER=admin
COUCHDB_PASSWORD=password1234
COUCHDB_HOST=localhost:5984
LOCAL_DB_PATH=./data
```

**Sucursal B (.env):**
```bash
PORT=3011
SUCURSAL_ID=B
SUCURSALES=A,B,C
# ... mismas credenciales CouchDB
```

**Sucursal C (.env):**
```bash
PORT=3012
SUCURSAL_ID=C
SUCURSALES=A,B,C
# ... mismas credenciales CouchDB
```

### Paso 4: Iniciar los Servicios

```bash
# Terminal 1: Servidor Central
npm run start:central

# Terminal 2: Sucursal A
SUCURSAL_ID=A npm run setup
SUCURSAL_ID=A npm run dev

# Terminal 3: Sucursal B
SUCURSAL_ID=B npm run setup
SUCURSAL_ID=B npm run dev

# Terminal 4: Sucursal C
SUCURSAL_ID=C npm run setup
SUCURSAL_ID=C npm run dev
```

## 📡 API Endpoints

### Servidor Central

**Base URL:** `http://localhost:3000`

```
GET /system/status    # Estado del sistema y BD central
GET /system/docs      # Todos los documentos almacenados
GET /system/stats     # Estadísticas agregadas por nodeId
```

### Sucursales - Rutas Locales

Operan solo sobre los datos de **tu sucursal**:

```
GET    /api/productos           # Productos de esta sucursal
POST   /api/productos           # Crear producto en esta sucursal
PUT    /api/productos/:id       # Actualizar (solo si es tuyo)
DELETE /api/productos/:id       # Eliminar (solo si es tuyo)

GET    /api/ventas              # Ventas de esta sucursal
POST   /api/ventas              # Registrar venta aquí

GET    /api/reportes/dashboard  # Dashboard de esta sucursal
```

### 🌍 Sucursales - Rutas Globales

Consultan datos de **TODAS las sucursales** de la red:

```
GET /api/global/productos                    # Productos de TODAS
GET /api/global/productos/search?nombre=X    # Buscar en TODAS
GET /api/global/productos/stock/:nombre      # Stock consolidado
GET /api/global/producto/:id                 # Buscar en cualquier sucursal
GET /api/global/ventas                       # Ventas de TODAS
GET /api/global/ventas?inicio=X&fin=Y        # Ventas por rango
GET /api/global/estadisticas                 # Dashboard consolidado
```

### Sincronización

```
GET  /api/sync/status    # Ver estado de sincronización
POST /api/sync/force     # Forzar sincronización manual
```

## 🔥 Ejemplos de Uso

### 1. Consultar Estado del Sistema (Central)

```bash
curl http://localhost:3000/system/status
```

**Respuesta:**
```json
{
  "status": "ok",
  "database": {
    "name": "distributed-app",
    "docs": 156,
    "connected": true
  },
  "timestamp": "2025-11-20T10:30:00.000Z"
}
```

### 2. Ver Productos de TODAS las Sucursales

```bash
curl http://localhost:3010/api/global/productos
```

**Respuesta:**
```json
{
  "success": true,
  "sucursales": 3,
  "total_productos": 12,
  "data": [
    {
      "sucursal": "A",
      "es_propia": true,
      "productos": [
        {
          "_id": "prod_paracetamol_500mg",
          "nombre": "Paracetamol 500mg",
          "stock_actual": 150,
          "precio_venta": 45.00,
          "sucursal": "A"
        }
      ]
    },
    {
      "sucursal": "B",
      "es_propia": false,
      "productos": [...]
    },
    {
      "sucursal": "C",
      "es_propia": false,
      "productos": [...]
    }
  ]
}
```

### 3. Buscar Producto en Toda la Red

```bash
curl "http://localhost:3010/api/global/productos/search?nombre=paracetamol"
```

**Respuesta:**
```json
{
  "success": true,
  "query": "paracetamol",
  "total_encontrados": 3,
  "sucursales_con_resultados": 3,
  "data": [
    {
      "sucursal": "A",
      "es_propia": true,
      "count": 1,
      "productos": [
        {
          "nombre": "Paracetamol 500mg",
          "stock_actual": 150,
          "precio_venta": 45.00
        }
      ]
    },
    {
      "sucursal": "B",
      "es_propia": false,
      "count": 1,
      "productos": [
        {
          "nombre": "Paracetamol 500mg",
          "stock_actual": 80,
          "precio_venta": 45.00
        }
      ]
    }
  ]
}
```

### 4. Stock Consolidado de un Producto

```bash
curl "http://localhost:3010/api/global/productos/stock/Paracetamol%20500mg"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "nombre_producto": "Paracetamol 500mg",
    "total_stock_red": 430,
    "por_sucursal": [
      {
        "sucursal": "A",
        "es_propia": true,
        "stock_actual": 150,
        "precio_venta": 45.00
      },
      {
        "sucursal": "B",
        "es_propia": false,
        "stock_actual": 80,
        "precio_venta": 45.00
      },
      {
        "sucursal": "C",
        "es_propia": false,
        "stock_actual": 200,
        "precio_venta": 45.00
      }
    ]
  }
}
```

### 5. Dashboard Consolidado

```bash
curl http://localhost:3010/api/global/estadisticas
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "por_sucursal": [
      {
        "sucursal": "A",
        "es_propia": true,
        "productos": 45,
        "ventas": 234,
        "monto_ventas": 105450.50
      },
      {
        "sucursal": "B",
        "es_propia": false,
        "productos": 38,
        "ventas": 198,
        "monto_ventas": 89230.00
      }
    ],
    "totales_red": {
      "productos": 135,
      "ventas": 699,
      "monto_total_ventas": 313350.75
    }
  }
}
```

### 6. Estado de Sincronización

```bash
curl http://localhost:3010/api/sync/status
```

**Respuesta:**
```json
{
  "success": true,
  "sync_enabled": true,
  "sucursal_actual": "A",
  "databases": {
    "propia": {
      "name": "farmacia_a_productos_ventas",
      "mode": "READ/WRITE",
      "active": false,
      "lastSync": "2025-11-20T14:30:00.000Z",
      "docs_read": 45,
      "docs_written": 38,
      "errors": 0
    },
    "otras_sucursales": [
      {
        "sucursal": "B",
        "name": "farmacia_b_productos_ventas",
        "mode": "READ-ONLY",
        "active": false,
        "lastSync": "2025-11-20T14:29:55.000Z",
        "docs_read": 38,
        "errors": 0
      }
    ]
  }
}
```

## 🔒 Seguridad y Permisos

### Reglas de Acceso

| Operación | Sucursal Propia | Otras Sucursales |
|-----------|----------------|------------------|
| Leer productos | ✅ | ✅ |
| Crear producto | ✅ | ❌ |
| Actualizar producto | ✅ | ❌ |
| Eliminar producto | ✅ | ❌ |
| Ver ventas | ✅ | ✅ |
| Registrar venta | ✅ | ❌ |
| Ver clientes | ✅ | ✅ |
| Crear/editar cliente | ✅ | ✅ (compartido) |

### Protecciones Automáticas

- ✅ **No puedes modificar** datos de otras sucursales
- ✅ **Sincronización unidireccional** (FROM) para otras sucursales
- ✅ **Solo lectura** en réplicas de otras sucursales
- ✅ **CouchDB maneja conflictos** automáticamente

## 📊 Casos de Uso Reales

### Caso 1: Cliente Busca Producto Agotado

**Escenario:** Cliente pregunta "¿Tienen Amoxicilina 500mg?"

```bash
curl "http://localhost:3010/api/global/productos/stock/Amoxicilina%20500mg"
```

**Respuesta:**
```json
{
  "total_stock_red": 125,
  "por_sucursal": [
    { "sucursal": "A", "stock_actual": 0 },   // Agotado aquí
    { "sucursal": "B", "stock_actual": 45 },  // ¡Tienen!
    { "sucursal": "C", "stock_actual": 80 }   // ¡Tienen!
  ]
}
```

**Beneficio:** Puedes informar al cliente que la Sucursal B tiene 45 unidades disponibles.

### Caso 2: Gerencia Regional

```bash
# Ver rendimiento de todas las sucursales
curl http://localhost:3000/system/stats
curl http://localhost:3010/api/global/estadisticas
```

Obtiene comparativa de ventas, inventario y desempeño entre sucursales.

### Caso 3: Inventario Consolidado

```bash
# Buscar todos los productos de una categoría en la red
curl "http://localhost:3010/api/global/productos/search?nombre=paracetamol"
```

Útil para planificación de compras y redistribución de inventario.

## 🔄 Flujo de Sincronización

### Escenario: Venta en Sucursal A

```
1. Cliente compra en Sucursal A
   └─> POST /api/ventas

2. Se guarda en PouchDB local de Sucursal A
   └─> Respuesta inmediata ⚡

3. PouchDB sincroniza con CouchDB (automático)
   └─> Sync bidireccional de farmacia_a

4. CouchDB Central registra el cambio

5. Sucursales B y C replican desde CouchDB (automático)
   └─> Sync unidireccional FROM farmacia_a
   └─> Ahora B y C pueden VER la venta de A (read-only)

6. Servidor Central puede consultar estadísticas actualizadas

Tiempo total: < 1 segundo
```

## 🏗️ Estructura del Proyecto

```
proyecto/
├── central_server/
│   └── server.js              # Servidor central (Express + PouchDB)
├── shared/
│   └── db-config.js           # Configuración común de CouchDB
├── sucursales/
│   ├── config/
│   │   └── database.js        # Gestión de bases de datos
│   ├── routes/
│   │   ├── productos.js       # Rutas locales
│   │   └── global.js          # Rutas globales
│   └── server.js              # Servidor de sucursal
├── data/                      # Datos locales de PouchDB
├── docker-compose.yml         # Configuración de CouchDB
├── package.json
└── README.md
```

## 🛠 Troubleshooting

### Problema: No Veo Productos de Otras Sucursales

**Verificar:**
```bash
# 1. ¿Están todas las sucursales en SUCURSALES?
echo $SUCURSALES  # Debe mostrar: A,B,C

# 2. ¿Hay datos en otras sucursales?
curl http://localhost:3011/api/productos  # Sucursal B

# 3. ¿Está sincronizando?
curl http://localhost:3010/api/sync/status
```

**Solución:**
```bash
# Forzar sincronización
curl -X POST http://localhost:3010/api/sync/force
```

### Problema: CouchDB No Responde

```bash
# Verificar estado del contenedor
docker ps

# Ver logs de CouchDB
docker-compose logs couchdb

# Reiniciar CouchDB
docker-compose restart couchdb
```

### Problema: Bases de Datos No Existen

```bash
# Crear manualmente desde Fauxton
# http://localhost:5984/_utils

# O mediante HTTP:
curl -X PUT http://admin:password1234@localhost:5984/farmacia_a_productos_ventas
curl -X PUT http://admin:password1234@localhost:5984/farmacias_clientes_proveedores
```

## ⚡ Optimizaciones

### 1. Caché de Consultas Globales

```javascript
// Caché con TTL de 1 minuto para consultas frecuentes
const CACHE_TTL = 60000;
```

### 2. Índices para Búsquedas Rápidas

```javascript
// Crear índices compuestos
await db.createIndex({
  index: { fields: ['tipo', 'nombre', 'sucursal', 'stock_actual'] }
});
```

### 3. Limitar Réplicas

Para redes grandes (50+ sucursales), configurar solo réplicas necesarias:

```bash
# Solo replicar sucursales cercanas
SUCURSALES_CERCANAS=B,C
```

## 📈 Escalabilidad

Este sistema escala bien para:
- ✅ **10-20 sucursales**: Sin problemas
- ✅ **50-100 sucursales**: Con optimizaciones (caché, índices)
- ✅ **100+ sucursales**: Considerar arquitectura hub-and-spoke

## 🐳 Despliegue con Docker

### Docker Compose Completo

```yaml
version: '3.8'
services:
  couchdb:
    image: couchdb:3
    ports:
      - "5984:5984"
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: password1234
    volumes:
      - couchdb_data:/opt/couchdb/data

  servidor-central:
    build: .
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      COUCHDB_HOST: couchdb:5984
    depends_on:
      - couchdb

  sucursal-a:
    build: .
    ports:
      - "3010:3010"
    environment:
      SUCURSAL_ID: A
      PORT: 3010
      SUCURSALES: A,B,C
      COUCHDB_HOST: couchdb:5984
    depends_on:
      - couchdb

  sucursal-b:
    build: .
    ports:
      - "3011:3011"
    environment:
      SUCURSAL_ID: B
      PORT: 3011
      SUCURSALES: A,B,C
      COUCHDB_HOST: couchdb:5984
    depends_on:
      - couchdb

  sucursal-c:
    build: .
    ports:
      - "3012:3012"
    environment:
      SUCURSAL_ID: C
      PORT: 3012
      SUCURSALES: A,B,C
      COUCHDB_HOST: couchdb:5984
    depends_on:
      - couchdb

volumes:
  couchdb_data:
```

**Iniciar todo el sistema:**
```bash
docker-compose up -d
```

## 📚 Scripts Disponibles

```json
{
  "scripts": {
    "start:central": "node central_server/server.js",
    "dev": "nodemon server.js",
    "setup": "node scripts/setup-databases.js",
    "test": "npm test"
  }
}
```

## 🔐 Configuración de Seguridad

### Producción

Cambiar credenciales por defecto:

```bash
# .env.production
COUCHDB_USER=admin_produccion
COUCHDB_PASSWORD=<contraseña-fuerte>
COUCHDB_HOST=couchdb.tudominio.com:5984
```

### HTTPS

Configurar reverse proxy (Nginx/Caddy) para HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name api.tudominio.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

## 📄 Licencia

MIT

---

## 🎉 ¡Listo!

Ahora tienes un sistema distribuido completo donde:
- ✅ Cada sucursal mantiene autonomía con su BD local
- ✅ Todas pueden ver el inventario completo de la red en tiempo real
- ✅ El servidor central monitorea y administra todo el sistema
- ✅ La sincronización es automática y transparente
- ✅ Sin conflictos gracias a permisos bien definidos

**¿Preguntas?** Revisa la documentación de [CouchDB](https://docs.couchdb.org/) y [PouchDB](https://pouchdb.com/)