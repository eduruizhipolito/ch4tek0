const BaseScraper = require('../base/BaseScraper');

/**
 * Scraper específico para BCP (Banco de Crédito del Perú)
 * Extrae tasas de productos de ahorro, separando por moneda
 */
class BCPScraper extends BaseScraper {
    constructor() {
        super('BCP');
        this.baseUrl = process.env.BCP_BASE_URL || 'https://www.viabcp.com';
        
        // URLs de productos específicos
        this.productUrls = {
            cuentaPremio: '/cuentas/cuenta-ahorro/cuenta-premio-bcp',
            cuentaDigital: '/cuentas/cuenta-ahorro/cuenta-digital-bcp',
            cuentaIlimitada: '/cuentas/cuenta-ahorro/cuenta-ilimitada-bcp',
            cuentaSueldo: '/cuenta-sueldo-bcp'
        };
    }

    /**
     * Método principal para extraer datos de BCP
     */
    async scrapeData() {
        try {
            this.logger.info('Iniciando scraping de BCP...');
            
            const allProducts = [];
            
            // Empezar con Cuenta Premio como caso de prueba
            const cuentaPremioProducts = await this.scrapeCuentaPremio();
            allProducts.push(...cuentaPremioProducts);
            
            this.logger.info(`Scraping completado. ${allProducts.length} productos extraídos de BCP`);
            return allProducts;
            
        } catch (error) {
            this.logger.error('Error en scraping de BCP:', error);
            throw error;
        }
    }

    /**
     * Scraper específico para Cuenta Premio BCP
     */
    async scrapeCuentaPremio() {
        const url = `${this.baseUrl}${this.productUrls.cuentaPremio}`;
        this.logger.info(`Navegando a Cuenta Premio BCP: ${url}`);
        
        try {
            await this.page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Esperar a que el contenido se cargue
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Extraer datos de tasas
            const productData = await this.page.evaluate(() => {
                const products = [];
                
                // Función auxiliar para extraer texto limpio
                const cleanText = (text) => {
                    return text ? text.trim().replace(/\s+/g, ' ') : '';
                };

                // Función para extraer porcentajes
                const extractPercentage = (text) => {
                    if (!text) return null;
                    const match = text.match(/(\d+\.?\d*)\s*%/);
                    return match ? parseFloat(match[1]) : null;
                };

                // Función para extraer rangos de porcentajes
                const extractPercentageRange = (text) => {
                    if (!text) return { min: null, max: null };
                    
                    // Buscar patrón "de X% a Y%"
                    const rangeMatch = text.match(/de\s+(\d+\.?\d*)\s*%\s+a\s+(\d+\.?\d*)\s*%/);
                    if (rangeMatch) {
                        return {
                            min: parseFloat(rangeMatch[1]),
                            max: parseFloat(rangeMatch[2])
                        };
                    }
                    
                    // Si no es rango, buscar porcentaje único
                    const singleMatch = text.match(/(\d+\.?\d*)\s*%/);
                    if (singleMatch) {
                        const value = parseFloat(singleMatch[1]);
                        return { min: value, max: value };
                    }
                    
                    return { min: null, max: null };
                };

                try {
                    // Buscar secciones de TEA y TREA
                    const teaSection = document.querySelector('*:contains("TEA referencial")') || 
                                     Array.from(document.querySelectorAll('*')).find(el => 
                                         el.textContent && el.textContent.includes('TEA referencial'));
                    
                    const treaSection = document.querySelector('*:contains("TREA")') || 
                                      Array.from(document.querySelectorAll('*')).find(el => 
                                          el.textContent && el.textContent.includes('TREA'));

                    if (teaSection || treaSection) {
                        // Buscar información de soles y dólares
                        const allText = document.body.textContent || '';
                        
                        // Extraer tasas para soles
                        const solesTeaMatch = allText.match(/Soles[:\s]*de\s+(\d+\.?\d*)\s*%\s+a\s+(\d+\.?\d*)\s*%/i);
                        const solesTreaMatch = allText.match(/Soles[:\s]*(\d+\.?\d*)\s*%/i);
                        
                        // Extraer tasas para dólares
                        const dolaresTeaMatch = allText.match(/Dólares[:\s]*de\s+(\d+\.?\d*)\s*%\s+a\s+(\d+\.?\d*)\s*%/i);
                        const dolaresTreaMatch = allText.match(/Dólares[:\s]*(\d+\.?\d*)\s*%/i);

                        // Producto en Soles
                        if (solesTeaMatch || solesTreaMatch) {
                            products.push({
                                nombre_producto: 'Cuenta Premio',
                                banco: 'BCP',
                                id_entidad: null, // Se asignará durante la sincronización
                                tipo_producto: 'ahorro',
                                moneda: 'PEN',
                                tasa: solesTeaMatch ? parseFloat(solesTeaMatch[2]) : null, // Tasa principal (máxima)
                                tasa_tea: solesTeaMatch ? parseFloat(solesTeaMatch[2]) : null,
                                tasa_tea_min: solesTeaMatch ? parseFloat(solesTeaMatch[1]) : null,
                                tasa_tea_max: solesTeaMatch ? parseFloat(solesTeaMatch[2]) : null,
                                tasa_trea: solesTreaMatch ? parseFloat(solesTreaMatch[1]) : null,
                                url_fuente: window.location.href,
                                fecha_extraccion: new Date().toISOString()
                            });
                        }

                        // Producto en Dólares
                        if (dolaresTeaMatch || dolaresTreaMatch) {
                            products.push({
                                nombre_producto: 'Cuenta Premio',
                                banco: 'BCP',
                                id_entidad: null, // Se asignará durante la sincronización
                                tipo_producto: 'ahorro',
                                moneda: 'USD',
                                tasa: dolaresTeaMatch ? parseFloat(dolaresTeaMatch[2]) : null, // Tasa principal (máxima)
                                tasa_tea: dolaresTeaMatch ? parseFloat(dolaresTeaMatch[2]) : null,
                                tasa_tea_min: dolaresTeaMatch ? parseFloat(dolaresTeaMatch[1]) : null,
                                tasa_tea_max: dolaresTeaMatch ? parseFloat(dolaresTeaMatch[2]) : null,
                                tasa_trea: dolaresTreaMatch ? parseFloat(dolaresTreaMatch[1]) : null,
                                url_fuente: window.location.href,
                                fecha_extraccion: new Date().toISOString()
                            });
                        }
                    }

                    // Si no encontramos con el método anterior, intentar método alternativo
                    if (products.length === 0) {
                        // Buscar todos los elementos que contengan porcentajes
                        const percentageElements = Array.from(document.querySelectorAll('*')).filter(el => {
                            const text = el.textContent || '';
                            return text.match(/\d+\.?\d*\s*%/) && 
                                   (text.includes('Soles') || text.includes('Dólares') || 
                                    text.includes('TEA') || text.includes('TREA'));
                        });

                        // Log para debugging
                        console.log('Elementos con porcentajes encontrados:', percentageElements.length);
                        
                        // Crear productos por defecto si encontramos la página pero no los datos específicos
                        if (document.title.includes('Cuenta Premio BCP')) {
                            products.push({
                                nombre_producto: 'Cuenta Premio',
                                banco: 'BCP',
                                id_entidad: null, // Se asignará durante la sincronización
                                tipo_producto: 'ahorro',
                                moneda: 'PEN',
                                tasa: null,
                                tasa_tea: null,
                                tasa_tea_min: null,
                                tasa_tea_max: null,
                                tasa_trea: null,
                                url_fuente: window.location.href,
                                fecha_extraccion: new Date().toISOString(),
                                nota: 'Datos no encontrados con selectores automáticos'
                            });

                            products.push({
                                nombre_producto: 'Cuenta Premio',
                                banco: 'BCP',
                                id_entidad: null, // Se asignará durante la sincronización
                                tipo_producto: 'ahorro',
                                moneda: 'USD',
                                tasa: null,
                                tasa_tea: null,
                                tasa_tea_min: null,
                                tasa_tea_max: null,
                                tasa_trea: null,
                                url_fuente: window.location.href,
                                fecha_extraccion: new Date().toISOString(),
                                nota: 'Datos no encontrados con selectores automáticos'
                            });
                        }
                    }

                } catch (error) {
                    console.error('Error extrayendo datos de Cuenta Premio:', error);
                }

                return products;
            });

            this.logger.info(`Extraídos ${productData.length} productos de Cuenta Premio BCP`);
            
            // Log de los datos extraídos para debugging
            productData.forEach((product, index) => {
                this.logger.info(`Producto ${index + 1}: ${product.nombre_producto} (${product.moneda}) - TEA: ${product.tasa_tea}%, TREA: ${product.tasa_trea}%`);
            });

            return productData;

        } catch (error) {
            this.logger.error('Error scrapeando Cuenta Premio BCP:', error);
            throw error;
        }
    }

    /**
     * Método para scrapear otros productos de BCP (para implementar después)
     */
    async scrapeOtherProducts() {
        // TODO: Implementar scrapers para otros productos BCP
        // - Cuenta Digital BCP
        // - Cuenta Ilimitada BCP
        // - Cuenta Sueldo BCP
        return [];
    }

    /**
     * Preparar productos con información de entidad
     */
    prepareProductsWithEntity(products) {
        return products.map(product => ({
            ...product,
            // Información de entidad que será procesada por SupabaseSync
            entidad_info: {
                nombre_entidad: 'BCP',
                tipo_entidad: 'banco'
            }
        }));
    }

    /**
     * Validación específica para datos de BCP
     */
    validateData(products) {
        const validProducts = [];
        
        for (const product of products) {
            const errors = [];
            
            // Validaciones básicas
            if (!product.nombre_producto) errors.push('Nombre de producto requerido');
            if (!product.banco) errors.push('Banco requerido');
            if (!product.moneda || !['PEN', 'USD'].includes(product.moneda)) {
                errors.push('Moneda debe ser PEN o USD');
            }
            
            // Validaciones de tasas
            if (product.tasa_tea !== null && (product.tasa_tea < 0 || product.tasa_tea > 50)) {
                errors.push('TEA fuera de rango válido (0-50%)');
            }
            
            if (product.tasa_trea !== null && (product.tasa_trea < 0 || product.tasa_trea > 50)) {
                errors.push('TREA fuera de rango válido (0-50%)');
            }

            if (errors.length === 0) {
                validProducts.push(product);
            } else {
                this.logger.warn(`Producto inválido: ${product.nombre_producto} (${product.moneda}) - Errores: ${errors.join(', ')}`);
            }
        }
        
        return validProducts;
    }

    /**
     * Método para obtener información de salud del scraper
     */
    async getHealthInfo() {
        try {
            const testUrl = `${this.baseUrl}${this.productUrls.cuentaPremio}`;
            await this.page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            
            const title = await this.page.title();
            const isHealthy = title.includes('BCP') || title.includes('Cuenta Premio');
            
            return {
                status: isHealthy ? 'healthy' : 'unhealthy',
                message: isHealthy ? 'BCP scraper funcionando correctamente' : 'No se pudo acceder a BCP',
                lastChecked: new Date().toISOString(),
                testUrl
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Error conectando con BCP: ${error.message}`,
                lastChecked: new Date().toISOString(),
                error: error.message
            };
        }
    }
}

module.exports = BCPScraper;
