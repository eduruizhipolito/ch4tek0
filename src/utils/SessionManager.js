// SessionManager.js
// Utilidad para persistir sesiones de scraping entre reinicios

const fs = require('fs').promises;
const path = require('path');

class SessionManager {
    constructor(sessionName = 'default') {
        this.sessionName = sessionName;
        this.sessionDir = path.join(__dirname, '../../.sessions');
        this.sessionFile = path.join(this.sessionDir, `${sessionName}.json`);
    }

    /**
     * Guardar estado actual de la sesión
     */
    async saveSession(page, additionalData = {}) {
        try {
            // Crear directorio si no existe
            await fs.mkdir(this.sessionDir, { recursive: true });

            // Obtener cookies y estado actual
            const cookies = await page.cookies();
            const url = page.url();
            const title = await page.title();

            const sessionData = {
                timestamp: new Date().toISOString(),
                url,
                title,
                cookies,
                userAgent: await page.evaluate(() => navigator.userAgent),
                viewport: await page.viewport(),
                ...additionalData
            };

            await fs.writeFile(this.sessionFile, JSON.stringify(sessionData, null, 2));
            console.log(`✅ Sesión guardada: ${this.sessionFile}`);
            
            return sessionData;
        } catch (error) {
            console.error('❌ Error guardando sesión:', error);
            throw error;
        }
    }

    /**
     * Cargar sesión existente
     */
    async loadSession() {
        try {
            const data = await fs.readFile(this.sessionFile, 'utf8');
            const sessionData = JSON.parse(data);
            
            console.log(`✅ Sesión cargada: ${sessionData.url} (${sessionData.timestamp})`);
            return sessionData;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('ℹ️ No hay sesión previa guardada');
                return null;
            }
            console.error('❌ Error cargando sesión:', error);
            throw error;
        }
    }

    /**
     * Restaurar sesión en una página de Puppeteer
     */
    async restoreSession(page, sessionData) {
        try {
            console.log(`🔄 Restaurando sesión: ${sessionData.url}`);

            // Configurar viewport si existe
            if (sessionData.viewport) {
                await page.setViewport(sessionData.viewport);
            }

            // Configurar User Agent si existe
            if (sessionData.userAgent) {
                await page.setUserAgent(sessionData.userAgent);
            }

            // Navegar a la URL guardada
            await page.goto(sessionData.url, { 
                waitUntil: 'domcontentloaded',
                timeout: 15000 
            });

            // Restaurar cookies
            if (sessionData.cookies && sessionData.cookies.length > 0) {
                await page.setCookie(...sessionData.cookies);
                
                // Recargar página para aplicar cookies
                await page.reload({ waitUntil: 'domcontentloaded' });
            }

            console.log('✅ Sesión restaurada exitosamente');
            return true;
        } catch (error) {
            console.error('❌ Error restaurando sesión:', error);
            return false;
        }
    }

    /**
     * Verificar si existe una sesión válida
     */
    async hasValidSession(maxAgeHours = 2) {
        try {
            const sessionData = await this.loadSession();
            if (!sessionData) return false;

            const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
            const maxAge = maxAgeHours * 60 * 60 * 1000; // Convertir a milisegundos

            const isValid = sessionAge < maxAge;
            
            if (!isValid) {
                console.log(`⚠️ Sesión expirada (${Math.round(sessionAge / 1000 / 60)} minutos)`);
            }

            return isValid;
        } catch (error) {
            return false;
        }
    }

    /**
     * Limpiar sesión guardada
     */
    async clearSession() {
        try {
            await fs.unlink(this.sessionFile);
            console.log('🗑️ Sesión limpiada');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('❌ Error limpiando sesión:', error);
            }
        }
    }

    /**
     * Listar todas las sesiones guardadas
     */
    async listSessions() {
        try {
            const files = await fs.readdir(this.sessionDir);
            const sessions = files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
            
            return sessions;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
}

module.exports = SessionManager;
