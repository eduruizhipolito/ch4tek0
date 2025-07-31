// test-bcp-scraper.js
// Script para probar específicamente el scraper de BCP

const BCPScraper = require('./src/scrapers/institutions/BCPScraper');
const DataValidator = require('./src/services/dataValidator');
const SupabaseSync = require('./src/services/supabaseSync');
const winston = require('winston');

// Configurar logger para testing
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [BCP-TEST-${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

async function testBCPScraper() {
    let scraper = null;
    
    try {
        logger.info('='.repeat(60));
        logger.info('INICIANDO PRUEBA DEL SCRAPER BCP');
        logger.info('='.repeat(60));

        // 1. Inicializar scraper BCP
        logger.info('1. Inicializando scraper BCP...');
        scraper = new BCPScraper();
        await scraper.initialize();
        logger.info('✅ Scraper BCP inicializado correctamente');

        // 2. Verificar salud del scraper
        logger.info('2. Verificando salud del scraper...');
        const healthInfo = await scraper.getHealthInfo();
        logger.info(`Estado de salud: ${healthInfo.status}`);
        logger.info(`Mensaje: ${healthInfo.message}`);
        
        if (healthInfo.status !== 'healthy') {
            logger.warn('⚠️ El scraper no está completamente saludable, pero continuamos...');
        }

        // 3. Ejecutar scraping
        logger.info('3. Ejecutando scraping de BCP...');
        const startTime = Date.now();
        const products = await scraper.scrapeData();
        const endTime = Date.now();
        
        logger.info(`✅ Scraping completado en ${endTime - startTime}ms`);
        logger.info(`📊 Productos extraídos: ${products.length}`);

        // 4. Mostrar productos extraídos
        if (products.length > 0) {
            logger.info('4. Productos extraídos:');
            products.forEach((product, index) => {
                logger.info(`   Producto ${index + 1}:`);
                logger.info(`   - Nombre: ${product.nombre_producto}`);
                logger.info(`   - Banco: ${product.banco}`);
                logger.info(`   - Moneda: ${product.moneda}`);
                logger.info(`   - TEA: ${product.tasa_tea}% (Min: ${product.tasa_tea_min}%, Max: ${product.tasa_tea_max}%)`);
                logger.info(`   - TREA: ${product.tasa_trea}%`);
                logger.info(`   - Tipo: ${product.tipo_producto}`);
                logger.info(`   - URL: ${product.url_fuente}`);
                if (product.nota) {
                    logger.info(`   - Nota: ${product.nota}`);
                }
                logger.info('   ---');
            });
        } else {
            logger.warn('⚠️ No se extrajeron productos. Verificar selectores o estructura de página.');
        }

        // 5. Validar datos
        logger.info('5. Validando datos extraídos...');
        const validator = new DataValidator();
        const validationResult = validator.validateProducts(products);
        
        logger.info(`✅ Productos válidos: ${validationResult.validProducts.length}`);
        logger.info(`❌ Productos inválidos: ${validationResult.invalidProducts.length}`);
        logger.info(`⚠️ Advertencias: ${validationResult.warnings.length}`);

        if (validationResult.warnings.length > 0) {
            logger.info('Advertencias encontradas:');
            validationResult.warnings.forEach(warning => {
                logger.warn(`   - ${warning}`);
            });
        }

        if (validationResult.invalidProducts.length > 0) {
            logger.info('Productos inválidos:');
            validationResult.invalidProducts.forEach(invalid => {
                logger.error(`   - ${invalid.product.nombre_producto}: ${invalid.errors.join(', ')}`);
            });
        }

        // 6. Probar sincronización con Supabase (opcional)
        if (validationResult.validProducts.length > 0) {
            logger.info('6. Probando sincronización con Supabase...');
            try {
                const supabaseSync = new SupabaseSync();
                
                // Solo hacer una prueba de conexión, no insertar datos reales
                const connectionTest = await supabaseSync.testConnection();
                if (connectionTest.success) {
                    logger.info('✅ Conexión con Supabase exitosa');
                    logger.info('ℹ️ Datos listos para sincronización (no se insertaron en esta prueba)');
                } else {
                    logger.warn('⚠️ No se pudo conectar con Supabase:', connectionTest.error);
                }
            } catch (error) {
                logger.error('❌ Error probando Supabase:', error.message);
            }
        }

        // 7. Resumen final
        logger.info('='.repeat(60));
        logger.info('RESUMEN DE LA PRUEBA BCP');
        logger.info('='.repeat(60));
        logger.info(`📊 Total productos extraídos: ${products.length}`);
        logger.info(`✅ Productos válidos: ${validationResult.validProducts.length}`);
        logger.info(`❌ Productos inválidos: ${validationResult.invalidProducts.length}`);
        logger.info(`⏱️ Tiempo de ejecución: ${endTime - startTime}ms`);
        logger.info(`🏥 Estado de salud: ${healthInfo.status}`);
        
        if (validationResult.validProducts.length > 0) {
            logger.info('🎉 PRUEBA EXITOSA: El scraper BCP está funcionando correctamente');
        } else {
            logger.warn('⚠️ PRUEBA PARCIAL: El scraper se ejecutó pero no extrajo datos válidos');
        }

    } catch (error) {
        logger.error('❌ ERROR EN LA PRUEBA:', error);
        logger.error('Stack trace:', error.stack);
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
        
        logger.info('='.repeat(60));
        logger.info('PRUEBA BCP FINALIZADA');
        logger.info('='.repeat(60));
    }
}

// Ejecutar la prueba
if (require.main === module) {
    testBCPScraper()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Error fatal en la prueba:', error);
            process.exit(1);
        });
}

module.exports = { testBCPScraper };
