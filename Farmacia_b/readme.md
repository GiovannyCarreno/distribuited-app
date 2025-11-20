# 🏥 Sistema Multi-Sucursal con Vista Global

Backend distribuido donde cada sucursal puede **ver en tiempo real** el stock y ventas de TODAS las demás sucursales, manteniendo su propia base de datos local con sincronización automática.

## ✨ Características Revolucionarias

- ✅ **Vista Global**: Consulta productos y ventas de TODAS las sucursales
- ✅ **Réplica Automática**: Cada sucursal replica las BDs de las demás (READ-ONLY)
- ✅ **Stock Consolidado**: Ve el stock total en toda la red
- ✅ **Sincronización Inteligente**:
  - **Bidireccional**: Para tu sucursal (lectura/escritura)
  - **Unidireccional**: De otras sucursales (solo lectura)
- ✅ **Sin Conflictos**: No puedes modificar datos de otras sucursales
- ✅ **Tiempo Real**: Cambios en cualquier sucursal se replican automáticamente

## 🏗️ Arquitectura Mejorada

```
┌─────────────────────────────────────────────────────────────┐
│                    CouchDB Central                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ farmacia │  │ farmacia │  │ farmacia │  │ clientes_  │ │
│  │    _a    │  │    _b    │  │    _c    │  │ proveedores│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────┘
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

### Tipos de Bases de Datos por Sucursal

Ejemplo para **Sucursal A**:

| Base de Datos | Modo | Sincronización | Uso |
|---------------|------|----------------|-----|
| `farmacia_a_productos_ventas` | **R/W** | Bidireccional | Tus productos y ventas |
| `farmacia_b_productos_ventas` | **R** | Unidireccional FROM | Ver stock de Sucursal B |
| `farmacia_c_productos_ventas` | **R** | Unidireccional FROM | Ver stock de Sucursal C |
| `farmacias_clientes_proveedores` | **R/W** | Bidireccional | Clientes y proveedores compartidos |

## 🚀 Instalación y Configuración

### Paso 1: Instalar Dependencias

```bash
npm install express cors pouchdb pouchdb-find dotenv
npm install -D nodemon
```

### Paso 2: Configurar Variables de Entorno

**Importante**: Define TODAS las sucursales en `SUCURSALES`

```bash
# .env para Sucursal A
PORT=3000
NODE_ENV=development
SUCURSAL_ID=A
SUCURSALES=A,B,C

COUCHDB_USER=admin
COUCHDB_PASSWORD=password1234
COUCHDB_HOST=localhost:5984
LOCAL_DB_PATH=./data
```

```bash
# .env para Sucursal B  
PORT=3001
SUCURSAL_ID=B
SUCURSALES=A,B,C
# ... mismo CouchDB
```

```bash
# .env para Sucursal C
PORT=3002
SUCURSAL_ID=C
SUCURSALES=A,B,C
# ... mismo CouchDB
```

### Paso 3: Configurar Cada Sucursal

```bash
# En Sucursal A
SUCURSAL_ID=A npm run setup
SUCURSAL_ID=A npm run dev

# En Sucursal B
SUCURSAL_ID=B npm run setup
SUCURSAL_ID=B npm run dev

# En Sucursal C
SUCURSAL_ID=C npm run setup
SUCURSAL_ID=C npm run dev
```

## 📡 API Endpoints

### Rutas Locales (Solo Esta Sucursal)

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

### 🌍 Rutas Globales (Todas las Sucursales) - NUEVO

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

## 🔥 Ejemplos de Uso

### 1. Ver Productos de TODAS las Sucursales

```bash
curl http://localhost:3000/api/global/productos
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
        },
        ...
      ]
    },
    {
      "sucursal": "B",
      "es_propia": false,
      "productos": [
        {
          "_id": "prod_paracetamol_500mg_b",
          "nombre": "Paracetamol 500mg",
          "stock_actual": 80,
          "precio_venta": 45.00,
          "sucursal": "B"
        },
        ...
      ]
    },
    {
      "sucursal": "C",
      "es_propia": false,
      "productos": [...]
    }
  ]
}
```

### 2. Buscar Producto en Toda la Red

```bash
curl "http://localhost:3000/api/global/productos/search?nombre=paracetamol"
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
    },
    {
      "sucursal": "C",
      "es_propia": false,
      "count": 1,
      "productos": [
        {
          "nombre": "Paracetamol 500mg",
          "stock_actual": 200,
          "precio_venta": 45.00
        }
      ]
    }
  ]
}
```

### 3. Stock Consolidado de un Producto

```bash
curl "http://localhost:3000/api/global/productos/stock/Paracetamol%20500mg"
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
        "producto_id": "prod_paracetamol_500mg",
        "nombre": "Paracetamol 500mg",
        "stock_actual": 150,
        "precio_venta": 45.00
      },
      {
        "sucursal": "B",
        "es_propia": false,
        "producto_id": "prod_paracetamol_500mg_b",
        "nombre": "Paracetamol 500mg",
        "stock_actual": 80,
        "precio_venta": 45.00
      },
      {
        "sucursal": "C",
        "es_propia": false,
        "producto_id": "prod_paracetamol_500mg_c",
        "nombre": "Paracetamol 500mg",
        "stock_actual": 200,
        "precio_venta": 45.00
      }
    ]
  }
}
```

**Caso de Uso**: Un cliente pregunta si tienen un producto. Aunque tu sucursal no tiene stock, puedes informarle que la Sucursal C tiene 200 unidades disponibles.

### 4. Ventas de Toda la Red

```bash
curl "http://localhost:3000/api/global/ventas?inicio=2025-11-01&fin=2025-11-30"
```

**Respuesta:**
```json
{
  "success": true,
  "periodo": "2025-11-01 a 2025-11-30",
  "sucursales": 3,
  "total_ventas": 245,
  "monto_total": 125450.00,
  "data": [
    {
      "sucursal": "A",
      "es_propia": true,
      "count": 89,
      "total": 45230.00,
      "ventas": [...]
    },
    {
      "sucursal": "B",
      "es_propia": false,
      "count": 76,
      "total": 38920.00,
      "ventas": [...]
    },
    {
      "sucursal": "C",
      "es_propia": false,
      "count": 80,
      "total": 41300.00,
      "ventas": [...]
    }
  ]
}
```

### 5. Dashboard Consolidado

```bash
curl http://localhost:3000/api/global/estadisticas
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
      },
      {
        "sucursal": "C",
        "es_propia": false,
        "productos": 52,
        "ventas": 267,
        "monto_ventas": 118670.25
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

### 6. Ver Estado de Sincronización

```bash
curl http://localhost:3000/api/sync/status
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
      "lastSync": "2025-11-08T14:30:00.000Z",
      "docs_read": 45,
      "docs_written": 38,
      "errors": 0
    },
    "compartida": {
      "name": "farmacias_clientes_proveedores",
      "mode": "READ/WRITE",
      "active": false,
      "lastSync": "2025-11-08T14:30:05.000Z",
      "docs_read": 12,
      "docs_written": 8,
      "errors": 0
    },
    "otras_sucursales": [
      {
        "sucursal": "B",
        "name": "farmacia_b_productos_ventas",
        "mode": "READ-ONLY",
        "active": false,
        "lastSync": "2025-11-08T14:29:55.000Z",
        "docs_read": 38,
        "errors": 0
      },
      {
        "sucursal": "C",
        "name": "farmacia_c_productos_ventas",
        "mode": "READ-ONLY",
        "active": false,
        "lastSync": "2025-11-08T14:29:58.000Z",
        "docs_read": 52,
        "errors": 0
      }
    ]
  },
  "timestamp": "2025-11-08T14:30:10.000Z"
}
```

## 🔐 Seguridad y Permisos

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

```
Cliente: "¿Tienen Amoxicilina 500mg?"
```

**Sucursal A consulta:**
```bash
curl "http://localhost:3000/api/global/productos/stock/Amoxicilina%20500mg"
```

**Respuesta:**
```json
{
  "total_stock_red": 125,
  "por_sucursal": [
    { "sucursal": "A", "stock_actual": 0 },      // Agotado aquí
    { "sucursal": "B", "stock_actual": 45 },     // ¡Tienen!
    { "sucursal": "C", "stock_actual": 80 }      // ¡Tienen!
  ]
}
```

**Respuesta al cliente:**
> "No tenemos en esta sucursal, pero la Sucursal B tiene 45 unidades disponibles."

### Caso 2: Gerencia Regional

```bash
# Ver rendimiento de todas las sucursales
curl http://localhost:3000/api/global/estadisticas
```

Obtiene:
- Total de productos en toda la red
- Ventas consolidadas
- Comparativa entre sucursales

### Caso 3: Inventario Consolidado

```bash
# Buscar todos los productos de una categoría
curl "http://localhost:3000/api/global/productos/search?nombre=paracetamol"
```

Ve el inventario completo de todas las sucursales para planificación de compras.

## 🔄 Flujo de Sincronización

### Escenario: Venta en Sucursal A

```
1. Cliente compra en Sucursal A
   └─> POST /api/ventas

2. Se guarda en PouchDB local de Sucursal A
   └─> Respuesta inmediata ⚡

3. PouchDB sincroniza con CouchDB (automático)
   └─> Sync bidireccional de farmacia_a

4. CouchDB Central tiene el registro

5. Sucursales B y C replican desde CouchDB (automático)
   └─> Sync unidireccional FROM farmacia_a
   └─> Ahora B y C pueden VER la venta de A (read-only)

Tiempo total: < 1 segundo
```

### Monitoreo en Tiempo Real

```bash
# En Sucursal A
watch -n 2 'curl -s http://localhost:3000/api/sync/status | jq'

# Ver cambios en otras sucursales en tiempo real
```

## 🐛 Troubleshooting

### Problema: No Veo Productos de Otras Sucursales

**Verificar:**
```bash
# 1. ¿Están todas las sucursales en SUCURSALES?
echo $SUCURSALES  # Debe mostrar: A,B,C

# 2. ¿Hay datos en otras sucursales?
curl http://localhost:3001/api/productos  # Sucursal B

# 3. ¿Está sincronizando?
curl http://localhost:3000/api/sync/status
```

**Solución:**
```bash
# Forzar sincronización
curl -X POST http://localhost:3000/api/sync/force
```

### Problema: Sincronización Lenta

```bash
# Ver tamaño de bases de datos
du -sh data/

# Compactar si están muy grandes
# (agregar endpoint de compactación)
```

### Problema: Conflictos en Clientes

Los clientes están compartidos. Si dos sucursales editan el mismo cliente al mismo tiempo, CouchDB resuelve usando "last-write-wins".

## ⚡ Optimizaciones

### 1. Caché de Consultas Globales

```javascript
// Agregar en config/database.js
const cache = new Map();
const CACHE_TTL = 60000; // 1 minuto

async getAllProductosMultiSucursal(useCache = true) {
  if (useCache && cache.has('productos_global')) {
    const cached = cache.get('productos_global');
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }
  
  const data = await this.getAllProductosMultiSucursal(false);
  cache.set('productos_global', { data, timestamp: Date.now() });
  return data;
}
```

### 2. Índices Compuestos

```javascript
// Mejora búsquedas
await db.createIndex({
  index: { fields: ['tipo', 'nombre', 'sucursal', 'stock_actual'] }
});
```

### 3. Limitar Réplicas

Si tienes muchas sucursales, puedes filtrar qué réplicas necesitas:

```javascript
// Solo replicar sucursales cercanas
const SUCURSALES_CERCANAS = process.env.SUCURSALES_CERCANAS || 'B,C';
```

## 📈 Escalabilidad

Este sistema escala bien hasta:
- ✅ 10-20 sucursales sin problemas
- ✅ 50-100 sucursales con optimizaciones
- ✅ 100+ sucursales: considerar arquitectura hub-and-spoke

## 🚀 Despliegue

### Docker Compose para 3 Sucursales

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

  sucursal-a:
    build: .
    ports:
      - "3000:3000"
    environment:
      SUCURSAL_ID: A
      PORT: 3000
      SUCURSALES: A,B,C
      COUCHDB_HOST: couchdb:5984

  sucursal-b:
    build: .
    ports:
      - "3001:3001"
    environment:
      SUCURSAL_ID: B
      PORT: 3001
      SUCURSALES: A,B,C
      COUCHDB_HOST: couchdb:5984

  sucursal-c:
    build: .
    ports:
      - "3002:3002"
    environment:
      SUCURSAL_ID: C
      PORT: 3002
      SUCURSALES: A,B,C
      COUCHDB_HOST: couchdb:5984
```

```bash
docker-compose up
```

## 📄 Licencia

MIT

---

**🎉 ¡Ahora cada sucursal puede ver TODO en tiempo real sin perder autonomía!**