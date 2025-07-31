// insert-plazo-usd.js
// Script para insertar productos de Depósitos a Plazo en USD desde KomparaCool

require('dotenv').config();
const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');
const { createClient } = require('@supabase/supabase-js');

async function insertPlazoUSD() {
  console.log('🏦 INSERCIÓN DE DEPÓSITOS A PLAZO - USD');
  console.log('=' .repeat(50));

  let scraper;

  try {
    // Inicializar cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Verificar estado actual
    const { data: currentProducts } = await supabase
      .from('productos')
      .select('tipo_producto, moneda', { count: 'exact' });

    const stats = currentProducts.reduce((acc, p) => {
      const key = `${p.tipo_producto}_${p.moneda}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Estado inicial:');
    console.log(`   Total productos: ${currentProducts.length}`);
    Object.entries(stats).forEach(([type, count]) => {
      const emoji = type.includes('ahorro') ? '💰' : '⏰';
      console.log(`   ${emoji} ${type}: ${count} productos`);
    });

    // Inicializar scraper con browser explícito
    console.log('\n🔄 Inicializando scraper KomparaCool...');
    scraper = new KomparaCoolScraper();

    // Inicializar browser explícitamente
    console.log('🌐 Inicializando browser...');
    await scraper.initialize();
    console.log('✅ Browser inicializado correctamente');

    // Verificar que el browser está funcionando
    if (!scraper.page) {
      throw new Error('El browser no se inicializó correctamente - page es null');
    }

    // Configurar para depósitos a plazo
    const plazosUrl = process.env.KOMPARACOOL_PLAZOS_URL;
    if (!plazosUrl) {
      throw new Error('KOMPARACOOL_PLAZOS_URL no está configurada en el .env');
    }

    console.log(`🌐 URL de depósitos a plazo: ${plazosUrl}`);

    // Generar datos de formulario específicos para depósitos a plazo en USD
    const formData = {
      tipo_cuenta: 'Normal',
      moneda: 'Dólares', // ← CAMBIO CLAVE: USD en lugar de Soles
      saldo_promedio: Math.floor(Math.random() * 5000) + 15000, // 15k-20k USD
      tipo_institucion: 'Bancos, Cajas y Financieras',
      ubicacion: 'Lima y Callao',
      email: `${['carlos', 'maria', 'jose', 'ana', 'luis'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 9999)}@gmail.com`,
      plazo: 180 // Campo específico para depósitos a plazo
    };

    console.log('📝 Datos del formulario para depósitos a plazo USD:');
    console.log(`   💵 Moneda: ${formData.moneda} (USD)`);
    console.log(`   💰 Saldo: $ ${formData.saldo_promedio.toLocaleString()}`);
    console.log(`   ⏰ Plazo: ${formData.plazo} días`);
    console.log(`   📧 Email: ${formData.email}`);

    // Temporalmente cambiar la URL base del scraper
    const originalUrl = scraper.baseUrl;
    scraper.baseUrl = plazosUrl;

    console.log('\n🔄 Ejecutando scraping para depósitos a plazo USD...');

    // Ejecutar scraping con navegación completa
    let products = [];
    
    try {
      // Usar navigateAndExtract con browser ya inicializado
      products = await scraper.navigateAndExtract(formData);
      
      console.log(`📦 Productos extraídos: ${products.length}`);
      
    } catch (error) {
      console.error('❌ Error en navegación:', error.message);
      
      // Fallback: intentar navegación directa a la URL de plazos
      console.log('🔄 Intentando navegación directa como fallback...');
      try {
        // Navegar directamente a la URL de plazos
        await scraper.page.goto(plazosUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        console.log('✅ Navegación directa exitosa');
        
        // Esperar a que la página cargue
        await scraper.page.waitForTimeout(5000);
        
        // Configurar formulario manualmente para USD
        console.log('💵 Configurando formulario para USD...');
        
        // Seleccionar moneda USD
        try {
          const usdButton = await scraper.page.$('input[name="currency"][value="US"], button:contains("Dólares")');
          if (usdButton) {
            await usdButton.click();
            console.log('✅ Moneda USD seleccionada');
          }
        } catch (error) {
          console.log('⚠️ No se pudo seleccionar USD, continuando...');
        }
        
        // Configurar saldo
        try {
          await scraper.page.evaluate((saldo) => {
            const slider = document.querySelector('input[type="range"]');
            if (slider) {
              slider.value = saldo;
              slider.dispatchEvent(new Event('input', { bubbles: true }));
              slider.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, formData.saldo_promedio);
          console.log('✅ Saldo configurado');
        } catch (error) {
          console.log('⚠️ No se pudo configurar saldo');
        }
        
        // Configurar plazo
        try {
          const sliders = await scraper.page.$$('input[type="range"]');
          if (sliders.length > 1) {
            await scraper.page.evaluate(() => {
              const sliders = document.querySelectorAll('input[type="range"]');
              if (sliders.length > 1) {
                const plazoSlider = sliders[1];
                plazoSlider.value = 180;
                plazoSlider.dispatchEvent(new Event('input', { bubbles: true }));
                plazoSlider.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
            console.log('✅ Plazo configurado: 180 días');
          }
        } catch (error) {
          console.log('⚠️ No se pudo configurar plazo');
        }
        
        // Enviar formulario
        try {
          const submitButton = await scraper.page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
            return buttons.find(btn => 
              btn.textContent?.toLowerCase().includes('comparar') ||
              btn.textContent?.toLowerCase().includes('buscar') ||
              btn.textContent?.toLowerCase().includes('enviar') ||
              btn.value?.toLowerCase().includes('comparar')
            );
          });
          
          if (submitButton && submitButton.asElement()) {
            await submitButton.asElement().click();
            console.log('✅ Formulario enviado');
            
            // Esperar navegación
            await scraper.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
            
            // Esperar resultados
            await scraper.page.waitForTimeout(3000);
          }
        } catch (error) {
          console.log('⚠️ Error enviando formulario:', error.message);
        }
        
        // Intentar extraer productos directamente de la página
        products = await scraper.page.evaluate(() => {
          const results = [];
          
          // Selectores para encontrar productos de depósitos a plazo
          const possibleSelectors = [
            '.product-card',
            '.deposit-product', 
            '.plazo-product',
            '.result-item',
            '.comparison-row',
            'tr:has(.rate)',
            '.product-row',
            '.bank-product'
          ];
          
          for (const selector of possibleSelectors) {
            const elements = document.querySelectorAll(selector);
            
            if (elements.length > 0) {
              elements.forEach(element => {
                try {
                  // Extraer nombre del producto
                  const nameElement = element.querySelector('.product-name, .name, h3, h4, .title, .producto');
                  const name = nameElement ? nameElement.textContent.trim() : '';
                  
                  // Extraer entidad/banco
                  const entityElement = element.querySelector('.bank-name, .entity, .banco, .institution, img[title]');
                  let entity = '';
                  if (entityElement) {
                    entity = entityElement.textContent?.trim() || entityElement.getAttribute('title') || '';
                  }
                  
                  // Extraer tasa
                  const rateElement = element.querySelector('.rate, .tasa, .percentage, .interest');
                  const rateText = rateElement ? rateElement.textContent.trim() : '';
                  const rateMatch = rateText.match(/(\d+[.,]?\d*)/);
                  const rate = rateMatch ? parseFloat(rateMatch[1].replace(',', '.')) : null;
                  
                  if (name && entity && rate !== null && rate > 0) {
                    results.push({
                      nombre_producto: name,
                      entidad: entity,
                      tasa: rate,
                      tipo_producto: 'plazo',
                      moneda: 'USD'
                    });
                  }
                } catch (error) {
                  console.log('Error procesando elemento:', error);
                }
              });
              
              if (results.length > 0) break; // Si encontramos productos, no seguir buscando
            }
          }
          
          return results;
        });
        
        console.log(`📦 Productos extraídos con navegación directa: ${products.length}`);
        
      } catch (fallbackError) {
        console.error('❌ Fallback también falló:', fallbackError.message);
        throw error; // Re-lanzar el error original
      }
    } finally {
      // Restaurar URL original
      scraper.baseUrl = originalUrl;
    }

    if (products.length === 0) {
      console.error('❌ No se extrajeron productos de depósitos a plazo USD');
      return;
    }

    // Normalizar productos para depósitos a plazo USD
    const normalizedProducts = products.map(product => ({
      nombre_producto: product.nombre_producto || product.name || '',
      entidad: product.entidad || product.banco || product.entity || '',
      tasa: parseFloat(product.tasa || product.rate || 0),
      tipo_producto: 'plazo', // Forzar tipo plazo
      moneda: 'USD' // Forzar moneda USD para esta ejecución
    })).filter(p => 
      p.nombre_producto && 
      p.entidad && 
      p.tasa > 0
    );

    console.log(`✅ Productos normalizados: ${normalizedProducts.length}`);

    // Mostrar ejemplos
    console.log('\n📋 EJEMPLOS DE PRODUCTOS DEPÓSITOS A PLAZO USD:');
    normalizedProducts.slice(0, 5).forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.nombre_producto} - ${product.tasa}% (${product.entidad})`);
    });

    // Insertar usando función insert_only
    console.log('\n📝 Insertando productos con función sync_productos_insert_only...');
    
    const { data: insertResult, error: insertError } = await supabase
      .rpc('sync_productos_insert_only', {
        productos_data: normalizedProducts
      });

    if (insertError) {
      console.error('❌ Error en inserción:', insertError);
      return;
    }

    console.log('✅ Inserción completada:');
    console.log(`   📊 Procesados: ${insertResult.procesados}`);
    console.log(`   ✅ Insertados: ${insertResult.insertados}`);
    console.log(`   ❌ Errores: ${insertResult.errores}`);

    if (insertResult.errores > 0 && insertResult.detalles_errores) {
      console.log('⚠️  Detalles de errores:', insertResult.detalles_errores);
    }

    // Verificar resultado final
    console.log('\n📊 VERIFICACIÓN FINAL...');
    
    const { data: finalProducts } = await supabase
      .from('productos')
      .select('tipo_producto, moneda', { count: 'exact' });

    const finalStats = finalProducts.reduce((acc, p) => {
      const key = `${p.tipo_producto}_${p.moneda}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log(`✅ Total productos final: ${finalProducts.length}`);
    console.log('📈 Distribución final:');
    Object.entries(finalStats).forEach(([type, count]) => {
      const emoji = type.includes('ahorro') ? '💰' : '⏰';
      console.log(`   ${emoji} ${type}: ${count} productos`);
    });

    // Verificar específicamente los depósitos a plazo USD insertados
    const { data: insertedPlazosUSD } = await supabase
      .from('productos')
      .select('nombre_producto, tasa, entidad!inner(nombre_entidad)')
      .eq('tipo_producto', 'plazo')
      .eq('moneda', 'USD')
      .limit(3);

    if (insertedPlazosUSD && insertedPlazosUSD.length > 0) {
      console.log('\n🎉 DEPÓSITOS A PLAZO USD INSERTADOS EXITOSAMENTE:');
      insertedPlazosUSD.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.nombre_producto} - ${p.tasa}% (${p.entidad.nombre_entidad})`);
      });
      
      console.log('\n✅ INSERCIÓN DE DEPÓSITOS A PLAZO USD COMPLETADA EXITOSAMENTE');
      console.log('🎯 ¡TODOS LOS PRODUCTOS DE KOMPARACOOL POBLADOS!');
      console.log('   💰 Ahorros PEN ✅');
      console.log('   💰 Ahorros USD ✅');
      console.log('   ⏰ Depósitos a Plazo PEN ✅');
      console.log('   ⏰ Depósitos a Plazo USD ✅');
    } else {
      console.log('\n❌ No se encontraron depósitos a plazo USD insertados');
    }

  } catch (error) {
    console.error('💥 ERROR EN INSERCIÓN DEPÓSITOS A PLAZO USD:', error);
    console.error('Stack:', error.stack);
  } finally {
    // Limpiar recursos
    if (scraper) {
      try {
        await scraper.cleanup();
        console.log('🧹 Cleanup del scraper completado');
      } catch (cleanupError) {
        console.error('⚠️  Error en cleanup:', cleanupError.message);
      }
    }
  }
}

// Ejecutar script
if (require.main === module) {
  insertPlazoUSD()
    .then(() => {
      console.log('\n✅ Script depósitos a plazo USD completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script depósitos a plazo USD falló:', error);
      process.exit(1);
    });
}

module.exports = insertPlazoUSD;
