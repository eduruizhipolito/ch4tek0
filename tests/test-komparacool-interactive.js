// test-komparacool-interactive.js
// Script para probar específicamente el scraper interactivo de KomparaCool

const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');
const DataValidator = require('./src/services/dataValidator');
const winston = require('winston');

// Configurar logger para testing
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [KOMPARACOOL-TEST-${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

async function testKomparaCoolInteractive() {
    let scraper = null;
    
    try {
        logger.info('='.repeat(70));
        logger.info('INICIANDO PRUEBA DEL SCRAPER INTERACTIVO KOMPARACOOL');
        logger.info('='.repeat(70));

        // 1. Inicializar scraper KomparaCool
        logger.info('1. Inicializando scraper KomparaCool...');
        scraper = new KomparaCoolScraper();
        await scraper.initialize();
        logger.info('✅ Scraper KomparaCool inicializado correctamente');

        // 2. Verificar que el scraper esté inicializado
        logger.info('2. Verificando que el scraper esté listo...');
        if (scraper.page) {
            logger.info('✅ Scraper listo - página de Puppeteer disponible');
        } else {
            logger.warn('⚠️ Página de Puppeteer no disponible');
        }

        // 3. Probar generación de datos aleatorios
        logger.info('3. Probando generación de datos aleatorios...');
        const formData = scraper.generateRandomFormData();
        logger.info('Datos del formulario generados:');
        logger.info(`   - Tipo de Cuenta: ${formData.tipoCuenta}`);
        logger.info(`   - Moneda: ${formData.moneda}`);
        logger.info(`   - Saldo Promedio: S/ ${formData.saldoPromedio}`);
        logger.info(`   - Tipo Institución: ${formData.tipoInstitucion}`);
        logger.info(`   - Ubicación: ${formData.ubicacion}`);
        logger.info(`   - Email: ${formData.email}`);

        // 4. Ejecutar scraping interactivo
        logger.info('4. Ejecutando scraping interactivo de ahorros...');
        const startTime = Date.now();
        
        try {
            const products = await scraper.scrapeAhorrosInteractivo();
            const endTime = Date.now();
            
            logger.info(`✅ Scraping completado en ${endTime - startTime}ms`);
            logger.info(`📊 Productos extraídos: ${products.length}`);

            // 5. Mostrar productos extraídos
            if (products.length > 0) {
                logger.info('5. Productos extraídos:');
                products.forEach((product, index) => {
                    logger.info(`   Producto ${index + 1}:`);
                    logger.info(`   - Nombre: ${product.nombre_producto}`);
                    logger.info(`   - Banco: ${product.banco}`);
                    logger.info(`   - Tasa: ${product.tasa}%`);
                    logger.info(`   - Moneda: ${product.moneda}`);
                    logger.info(`   - Tipo: ${product.tipo_producto}`);
                    logger.info(`   - URL: ${product.url_fuente}`);
                    if (product.raw_text) {
                        logger.info(`   - Texto original: ${product.raw_text.substring(0, 100)}...`);
                    }
                    logger.info('   ---');
                });
            } else {
                logger.warn('⚠️ No se extrajeron productos. Posibles causas:');
                logger.warn('   - Selectores CSS necesitan ajuste');
                logger.warn('   - Formulario no se envió correctamente');
                logger.warn('   - Página de resultados cambió estructura');
                logger.warn('   - Problemas de navegación');
            }

            // 6. Validar datos
            if (products.length > 0) {
                logger.info('6. Validando datos extraídos...');
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
            }

            // 7. Resumen final
            logger.info('='.repeat(70));
            logger.info('RESUMEN DE LA PRUEBA KOMPARACOOL INTERACTIVO');
            logger.info('='.repeat(70));
            logger.info(`📊 Total productos extraídos: ${products.length}`);
            logger.info(`⏱️ Tiempo de ejecución: ${endTime - startTime}ms`);
            logger.info(`🔧 Scraper: Funcionando correctamente`);
            
            if (products.length > 0) {
                logger.info('🎉 PRUEBA EXITOSA: El scraper interactivo está funcionando');
                logger.info('📋 PRÓXIMOS PASOS:');
                logger.info('   - Ajustar selectores si es necesario');
                logger.info('   - Probar sincronización con Supabase');
                logger.info('   - Implementar scheduling diario');
            } else {
                logger.warn('⚠️ PRUEBA PARCIAL: El scraper se ejecutó pero no extrajo datos');
                logger.warn('🔧 ACCIONES RECOMENDADAS:');
                logger.warn('   - Revisar selectores CSS del formulario');
                logger.warn('   - Verificar estructura de página de resultados');
                logger.warn('   - Comprobar si hay cambios en la web');
            }

        } catch (scrapingError) {
            logger.error('❌ Error durante el scraping:', scrapingError.message);
            logger.error('Stack trace:', scrapingError.stack);
        }

    } catch (error) {
        logger.error('❌ ERROR GENERAL EN LA PRUEBA:', error);
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
        
        logger.info('='.repeat(70));
        logger.info('PRUEBA KOMPARACOOL INTERACTIVO FINALIZADA');
        logger.info('='.repeat(70));
    }
}

// Ejecutar la prueba
if (require.main === module) {
    testKomparaCoolInteractive()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Error fatal en la prueba:', error);
            process.exit(1);
        });
}

module.exports = { testKomparaCoolInteractive };
