// Configuración común para todos los nodos
const DB_CONFIG = {
    couchdb: {
        url: 'http://admin:password1234@localhost:5984',
        mainDb: 'distributed-app'
    },
    sync: {
        live: true,
        retry: true,
        heartbeat: 10000
    }
};

// Validar la configuración
if (!DB_CONFIG.couchdb.url) {
    console.warn('Url de CouchDB no configurada, Asegúrate de que CouchDB esté ejecutándose.');
}

module.exports = DB_CONFIG;