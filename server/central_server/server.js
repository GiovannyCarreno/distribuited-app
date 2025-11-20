const express = require('express');
const PouchDB = require('pouchdb');
const DB_CONFIG = require('../shared/db-config');

class CentralServer {
    constructor() {
        this.app = express();
        this.centralDB = new PouchDB(`${DB_CONFIG.couchdb.url}/${DB_CONFIG.couchdb.mainDb}`);
        this.setupMiddleware();
        this.setupRoutes();
        this.start();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    setupRoutes() {
        // Estado del sistema
        this.app.get('/system/status', async (req, res) => {
            try {
                const info = await this.centralDB.info();
                res.json({
                    status: 'healthy',
                    database: info,
                    nodes: ['node1:3001', 'node2:3002', 'node3:3003'],
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Todos los documentos del sistema
        this.app.get('system/docs', async (req, res) => {
            try {
                const result = await this.centralDB.allDocs({
                    include_docs: true,
                    descending: true
                });
                res.json(result.rows.map(row => row.doc));
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Estadísticas por nodo
        this.app.get('system/stats', async (req, res) => {
            try {
                const result = await this.centralDB.allDocs({ include_docs: true });
                const docs = result.rows.map(row => row.doc);

                const stats = docs.reduce((acc, doc) => {
                    const nodeId = doc.nodeId || 'unknown';
                    acc[nodeId] = (acc[nodeId] || 0) + 1;
                }, {});

                res.json({
                    totalDocuments: docs.length,
                    documentsByNode: stats,
                    nodes: Object.keys(stats)
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    start() {
        const PORT = process.env.PORT || 3000;
        this.app.listen(PORT, () => {
            console.log(`Servidor central ejecutandose en http://localhost:${PORT}`);
            console.log(` - Estado del sistema: http://localhost:${PORT}/system/status`);
            console.log(` - Documentos: http://localhost:${PORT}/system/docs`);
            console.log(` - Estadisticas: http://localhost:${PORT}/system/stats`);
        });
    }
}

new CentralServer();