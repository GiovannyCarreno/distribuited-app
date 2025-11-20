## Servidor Central - Sistema Distribuido con CouchDB y PouchDB

Este proyecto corresponde al **servidor central** de una aplicación distribuida que utiliza **CouchDB** como base de datos y **PouchDB** en el lado del servidor para gestionar la información.  
El servidor está construido con **Node.js** y **Express**, y expone endpoints HTTP para consultar el estado global del sistema y las estadísticas de los nodos.

---

## Requisitos

- **Node.js** (versión 16 o superior recomendada)
- **npm** (incluido con Node.js)
- **Docker** y **Docker Compose** (para levantar la instancia de CouchDB)

---

## Instalación

1. Clona o descarga este repositorio.
2. Entra a la carpeta del servidor (esta carpeta):

```bash
cd server
```

3. Instala las dependencias de Node:

```bash
npm install
```

---

## Configuración de la base de datos (CouchDB)

El proyecto incluye un archivo `docker-compose.yml` que levanta una instancia de **CouchDB** ya configurada:

- Usuario: `admin`
- Password: `password1234`
- Puerto expuesto: `5984`

Para levantar CouchDB:

```bash
docker-compose up -d
```

La URL de conexión que usa el servidor central está definida en `shared/db-config.js`:

```js
url: 'http://admin:password1234@localhost:5984',
mainDb: 'distributed-app'
```

Asegúrate de que CouchDB esté corriendo antes de iniciar el servidor central.

---

## Scripts disponibles

En `package.json` están definidos los siguientes scripts:

- **`npm run start:central`**: Inicia el servidor central (`central_server/server.js`).

Ejemplo:

```bash
npm run start:central
```

Por defecto, el servidor escucha en el puerto **3000** (o en el definido por la variable de entorno `PORT`).

---

## Endpoints del servidor central

Archivo principal: `central_server/server.js`.

El servidor expone los siguientes endpoints:

- **GET `/system/status`**  
  Devuelve el estado del sistema y la información de la base de datos central.

- **GET `/system/docs`**  
  Devuelve todos los documentos almacenados en la base de datos principal.

- **GET `/system/stats`**  
  Devuelve estadísticas agregadas de los documentos, agrupadas por `nodeId`.

> Nota: Asegúrate de que la base de datos `distributed-app` exista en CouchDB. Puedes crearla manualmente desde Fauxton (interfaz web de CouchDB) o mediante una petición HTTP PUT.

---

## Estructura del proyecto

Resumen de carpetas y archivos principales:

- **`central_server/server.js`**: Lógica del servidor central (Express + PouchDB).
- **`shared/db-config.js`**: Configuración común de conexión a CouchDB.
- **`docker-compose.yml`**: Definición del servicio de CouchDB.
- **`package.json`**: Dependencias y scripts de npm.

---

## Notas y recomendaciones

- Revisa y ajusta las credenciales de CouchDB (`COUCHDB_USER`, `COUCHDB_PASSWORD`) en `docker-compose.yml` y en `shared/db-config.js` si lo necesitas.
- Si cambias el nombre de la base de datos (`mainDb`), asegúrate de crearla en CouchDB antes de usar el servidor.
- Para desarrollo, puedes inspeccionar la base de datos y documentos usando la interfaz web de CouchDB (Fauxton) en `http://localhost:5984/_utils`.


