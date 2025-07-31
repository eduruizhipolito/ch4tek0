// test-komparacool-persistent.js
// Script de prueba mejorado con soporte de sesión persistente

const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');
const DataValidator = require('./src/services/dataValidator');
const SessionManager = require('./src/utils/SessionManager');
const winston = require('winston');

// Configurar logger para testing
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [PERSISTENT-TEST-${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

async function testKomparaCoolPersistent(mode = 'auto') {
    let scraper = null;
    
    try {
        logger.info('='.repeat(80));
        logger.info('PRUEBA KOMPARACOOL CON SESIÓN PERSISTENTE');
        logger.info('='.repeat(80));
        logger.info(`Modo: ${mode}`);
        logger.info('Modos disponibles:');
        logger.info('  - auto: Usar sesión si existe, sino navegar');
        logger.info('  - navigate: Forzar navegación completa');
        logger.info('  - extract: Solo extraer de página actual');
        logger.info('  - status: Ver estado de sesiones');

        // 1. Inicializar scraper
        logger.info('1. Inicializando scraper KomparaCool...');
        scraper = new KomparaCoolScraper();
        await scraper.initialize();
        logger.info('✅ Scraper inicializado correctamente');

        // 2. Manejar diferentes modos
        let products = [];
        const startTime = Date.now();

        switch (mode) {
            case 'status':
                await showSessionStatus(scraper.sessionManager);
                return;

            case 'navigate':
                logger.info('2. 🚀 MODO NAVEGACIÓN: Forzando navegación completa...');
                await scraper.sessionManager.clearSession();
                products = await scraper.navigateAndExtract();
                break;

            case 'extract':
                logger.info('2. 🔍 MODO EXTRACCIÓN: Solo extrayendo de página actual...');
                products = await scraper.extractOnly();
                break;

            case 'auto':
            default:
                logger.info('2. 🤖 MODO AUTOMÁTICO: Usando sesión inteligente...');
                products = await scraper.scrapeAhorrosInteractivo();
                break;
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // 3. Mostrar resultados
        logger.info('='.repeat(80));
        logger.info('RESULTADOS DE LA PRUEBA');
        logger.info('='.repeat(80));
        logger.info(`⏱️ Tiempo de ejecución: ${duration}ms (${(duration/1000).toFixed(1)}s)`);
        logger.info(`📊 Productos extraídos: ${products.length}`);

        if (products.length > 0) {
            logger.info('📋 PRODUCTOS ENCONTRADOS:');
            products.forEach((product, index) => {
                logger.info(`   ${index + 1}. ${product.banco} - ${product.nombre_producto}`);
                logger.info(`      💰 Tasa: ${product.tasa}% | 💱 Moneda: ${product.moneda}`);
                logger.info(`      🔗 URL: ${product.url_fuente}`);
                if (product.raw_text) {
                    logger.info(`      📝 Texto: ${product.raw_text.substring(0, 80)}...`);
                }
                logger.info('      ' + '-'.repeat(60));
            });

            // 4. Validar datos
            logger.info('4. 🔍 VALIDANDO DATOS...');
            const validator = new DataValidator();
            const validationResult = validator.validateProducts(products);
            
            logger.info(`✅ Productos válidos: ${validationResult.validProducts.length}`);
            logger.info(`❌ Productos inválidos: ${validationResult.invalidProducts.length}`);
            logger.info(`⚠️ Advertencias: ${validationResult.warnings.length}`);

            if (validationResult.warnings.length > 0) {
                logger.info('⚠️ ADVERTENCIAS:');
                validationResult.warnings.forEach(warning => {
                    logger.warn(`   - ${warning}`);
                });
            }

            if (validationResult.invalidProducts.length > 0) {
                logger.info('❌ PRODUCTOS INVÁLIDOS:');
                validationResult.invalidProducts.forEach(invalid => {
                    logger.error(`   - ${invalid.product.nombre_producto}: ${invalid.errors.join(', ')}`);
                });
            }

            // 5. Mostrar estado de sesión
            await showSessionStatus(scraper.sessionManager);

            // 6. Resumen final
            logger.info('='.repeat(80));
            logger.info('🎉 PRUEBA EXITOSA');
            logger.info('='.repeat(80));
            logger.info('💡 PRÓXIMOS PASOS:');
            logger.info('   - Para probar solo extracción: node test-komparacool-persistent.js extract');
            logger.info('   - Para forzar nueva navegación: node test-komparacool-persistent.js navigate');
            logger.info('   - Para ver estado de sesiones: node test-komparacool-persistent.js status');
            
        } else {
            logger.warn('⚠️ NO SE ENCONTRARON PRODUCTOS');
            logger.warn('🔧 POSIBLES SOLUCIONES:');
            logger.warn('   - Verificar selectores CSS');
            logger.warn('   - Comprobar estructura de página');
            logger.warn('   - Probar navegación completa: node test-komparacool-persistent.js navigate');
        }

    } catch (error) {
        logger.error('❌ ERROR EN LA PRUEBA:', error.message);
        logger.error('Stack trace:', error.stack);
        
        // Mostrar información de sesión en caso de error
        if (scraper && scraper.sessionManager) {
            await showSessionStatus(scraper.sessionManager);
        }
    } finally {
        // Limpiar recursos
        if (scraper) {
            try {
                await scraper.close();
                logger.info('🧹 Recursos del scraper liberados');
            } catch (closeError) {
                logger.error('Error cerrando scraper:', closeError.message);
            }
        }
        
        logger.info('='.repeat(80));
        logger.info('PRUEBA FINALIZADA');
        logger.info('='.repeat(80));
    }
}

async function showSessionStatus(sessionManager) {
    try {
        logger.info('📊 ESTADO DE SESIONES:');
        
        const hasSession = await sessionManager.hasValidSession(2); // 2 horas
        if (hasSession) {
            const sessionData = await sessionManager.loadSession();
            logger.info(`   ✅ Sesión válida encontrada`);
            logger.info(`   📅 Creada: ${sessionData.timestamp}`);
            logger.info(`   🔗 URL: ${sessionData.url}`);
            logger.info(`   📊 Productos: ${sessionData.productsFound || 'N/A'}`);
            
            const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
            logger.info(`   ⏰ Antigüedad: ${Math.round(sessionAge / 1000 / 60)} minutos`);
        } else {
            logger.info(`   ❌ No hay sesión válida`);
        }
        
        const allSessions = await sessionManager.listSessions();
        logger.info(`   📁 Total sesiones guardadas: ${allSessions.length}`);
        if (allSessions.length > 0) {
            logger.info(`   📝 Sesiones: ${allSessions.join(', ')}`);
        }
        
    } catch (error) {
        logger.error('Error mostrando estado de sesión:', error.message);
    }
}

// Ejecutar la prueba
if (require.main === module) {
    const mode = process.argv[2] || 'auto';
    
    testKomparaCoolPersistent(mode)
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Error fatal en la prueba:', error);
            process.exit(1);
        });
}

module.exports = { testKomparaCoolPersistent };
