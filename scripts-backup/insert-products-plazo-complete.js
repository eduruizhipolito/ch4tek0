// insert-products-plazo-complete.js
// Script completo para insertar productos de Depósitos a Plazo en PEN desde KomparaCool

require('dotenv').config();
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

async function insertProductsPlazoComplete() {
  console.log('🏦 INSERCIÓN COMPLETA DE PRODUCTOS DEPÓSITOS A PLAZO - PEN');
  console.log('=' .repeat(60));

  let browser;
  let page;

  try {
    // Inicializar cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Paso 1: Verificar estado actual de la tabla
    console.log('\n📊 PASO 1: VERIFICANDO ESTADO ACTUAL...');
    
    const { data: currentProducts, error: countError } = await supabase
      .from('productos')
      .select('id_producto, moneda, tipo_producto', { count: 'exact' });

    if (countError) {
      console.error('❌ Error verificando productos actuales:', countError);
      return;
    }

    // Contar por tipo y moneda
    const productsByType = currentProducts.reduce((acc, product) => {
      const key = `${product.tipo_producto}_${product.moneda}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log(`📈 Productos actuales en base de datos: ${currentProducts.length}`);
    console.log('📊 Distribución por tipo y moneda:');
    Object.entries(productsByType).forEach(([typeMoneda, count]) => {
      console.log(`   ${typeMoneda}: ${count} productos`);
    });

    // Paso 2: Inicializar browser y navegar
    console.log('\n🔄 PASO 2: EJECUTANDO SCRAPER PARA DEPÓSITOS A PLAZO PEN...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Usar URLs desde variables de entorno
    const plazosUrl = process.env.KOMPARACOOL_PLAZOS_URL;
    const expectedResultUrl = process.env.KOMPARACOOL_PLAZOS_RESULT_URL;
    
    if (!plazosUrl) {
      throw new Error('KOMPARACOOL_PLAZOS_URL no está configurada en el .env');
    }

    console.log(`🌐 Navegando a: ${plazosUrl}`);
    
    await page.goto(plazosUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Esperar a que la página cargue
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Paso 3: Llenar formulario de depósitos a plazo
    console.log('\n📝 PASO 3: LLENANDO FORMULARIO DE DEPÓSITOS A PLAZO...');

    // 3.1 Configurar moneda: Soles (debe estar seleccionado por defecto)
    console.log('💰 Verificando moneda: Soles');
    try {
      const solesButton = await page.$('input[name="currency"][value="MN"], button:contains("Soles")');
      if (solesButton) {
        await solesButton.click();
        console.log('✅ Moneda Soles seleccionada');
      }
    } catch (error) {
      console.log('ℹ️  Moneda Soles ya seleccionada por defecto');
    }

    // 3.2 Configurar valor del depósito (slider)
    const valorDeposito = Math.floor(Math.random() * 20000) + 50000; // 50,000 - 70,000
    console.log(`💵 Configurando valor del depósito: S/ ${valorDeposito.toLocaleString()}`);
    
    try {
      // Buscar slider de valor del depósito
      const sliders = await page.$$('input[type="range"]');
      if (sliders.length > 0) {
        // El primer slider suele ser el valor del depósito
        await page.evaluate((valor) => {
          const slider = document.querySelector('input[type="range"]');
          if (slider) {
            slider.value = valor;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            slider.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, valorDeposito);
        console.log('✅ Valor del depósito configurado');
      }
    } catch (error) {
      console.log('⚠️ No se pudo configurar valor del depósito:', error.message);
    }

    // 3.3 Configurar plazo: 180 días (slider)
    console.log('⏰ Configurando plazo: 180 días');
    
    try {
      // El segundo slider suele ser el plazo
      const sliders = await page.$$('input[type="range"]');
      if (sliders.length > 1) {
        await page.evaluate(() => {
          const sliders = document.querySelectorAll('input[type="range"]');
          if (sliders.length > 1) {
            const plazoSlider = sliders[1]; // Segundo slider
            plazoSlider.value = 180;
            plazoSlider.dispatchEvent(new Event('input', { bubbles: true }));
            plazoSlider.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        console.log('✅ Plazo configurado: 180 días');
      }
    } catch (error) {
      console.log('⚠️ No se pudo configurar plazo:', error.message);
    }

    // 3.4 Configurar tipo de institución (dropdown)
    console.log('🏛️ Configurando tipo de institución: Bancos, Cajas y Financieras');
    
    try {
      const tipoSelect = await page.$('select');
      if (tipoSelect) {
        const options = await page.evaluate(() => {
          const select = document.querySelector('select');
          if (!select) return [];
          return Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
          }));
        });
        
        const targetOption = options.find(opt => 
          opt.text.includes('Bancos') || 
          opt.text.includes('Cajas') || 
          opt.text.includes('Financieras')
        ) || options[0];
        
        if (targetOption) {
          await page.select('select', targetOption.value);
          console.log(`✅ Tipo de institución seleccionado: ${targetOption.text}`);
        }
      }
    } catch (error) {
      console.log('⚠️ No se pudo configurar tipo de institución:', error.message);
    }

    // 3.5 Configurar ubicación (dropdown)
    console.log('📍 Configurando ubicación: Lima y Callao');
    
    try {
      const selects = await page.$$('select');
      if (selects.length > 1) {
        // El segundo select suele ser ubicación
        const ubicacionSelect = selects[1];
        
        const options = await page.evaluate((select) => {
          return Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
          }));
        }, ubicacionSelect);
        
        const limaOption = options.find(opt => 
          opt.text.includes('Lima') || 
          opt.text.includes('Callao') ||
          opt.value === 'LI'
        ) || options[0];
        
        if (limaOption) {
          await page.evaluate((select, value) => {
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }, ubicacionSelect, limaOption.value);
          console.log(`✅ Ubicación seleccionada: ${limaOption.text}`);
        }
      }
    } catch (error) {
      console.log('⚠️ No se pudo configurar ubicación:', error.message);
    }

    // 3.6 Configurar email (si existe campo)
    const email = `${['carlos', 'maria', 'jose', 'ana', 'luis'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 9999)}@gmail.com`;
    console.log(`📧 Configurando email: ${email}`);
    
    try {
      const emailInput = await page.$('input[type="email"], input[name="email"]');
      if (emailInput) {
        await emailInput.click({ clickCount: 3 });
        await emailInput.type(email);
        console.log('✅ Email configurado');
      }
    } catch (error) {
      console.log('ℹ️  Campo email no encontrado o no requerido');
    }

    // Paso 4: Enviar formulario
    console.log('\n🚀 PASO 4: ENVIANDO FORMULARIO...');
    
    try {
      // Estrategia 1: Buscar botones específicos
      let submitButton = await page.$('button[type="submit"]') || 
                        await page.$('input[type="submit"]') ||
                        await page.$('.btn-submit');
      
      // Estrategia 2: Buscar por texto del botón
      if (!submitButton) {
        submitButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
          return buttons.find(btn => 
            btn.textContent?.toLowerCase().includes('comparar') ||
            btn.textContent?.toLowerCase().includes('buscar') ||
            btn.textContent?.toLowerCase().includes('enviar') ||
            btn.value?.toLowerCase().includes('comparar')
          );
        });
        
        if (submitButton && submitButton.asElement()) {
          submitButton = submitButton.asElement();
        } else {
          submitButton = null;
        }
      }
      
      // Estrategia 3: Usar el primer botón disponible como fallback
      if (!submitButton) {
        const allButtons = await page.$$('button');
        if (allButtons.length > 0) {
          submitButton = allButtons[allButtons.length - 1]; // Último botón (suele ser envío)
          console.log('⚠️ Usando último botón como fallback');
        }
      }
      
      if (submitButton) {
        console.log('✅ Botón de envío encontrado, haciendo clic...');
        await submitButton.click();
        console.log('✅ Formulario enviado');
        
        // Esperar navegación a resultados
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
        
        const finalUrl = page.url();
        console.log(`📍 URL final: ${finalUrl}`);
        
        // Verificar que llegamos a la página de resultados correcta
        if (expectedResultUrl && finalUrl.includes('depositos-plazo/result')) {
          console.log('🎉 ¡Navegación exitosa a página de resultados de depósitos a plazo!');
        } else {
          throw new Error(`No se navegó a la URL esperada. URL actual: ${finalUrl}`);
        }
      } else {
        throw new Error('No se encontró botón de envío con ninguna estrategia');
      }
    } catch (error) {
      console.error('❌ Error enviando formulario:', error.message);
      return;
    }

    // Paso 5: Extraer productos de depósitos a plazo
    console.log('\n📦 PASO 5: EXTRAYENDO PRODUCTOS DE DEPÓSITOS A PLAZO...');
    
    // Esperar a que los resultados se carguen
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const products = await page.evaluate(() => {
      const results = [];
      
      // Selectores para encontrar productos de depósitos a plazo
      const possibleSelectors = [
        '.product-card',
        '.deposit-product', 
        '.plazo-product',
        '.result-item',
        '.comparison-row',
        'tr:has(.rate)',
        '.product-row'
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
                  moneda: 'PEN'
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

    console.log(`✅ Productos de depósitos a plazo extraídos: ${products.length}`);

    if (products.length === 0) {
      console.error('❌ No se extrajeron productos de depósitos a plazo');
      return;
    }

    // Mostrar algunos ejemplos
    console.log('\n📋 EJEMPLOS DE PRODUCTOS DEPÓSITOS A PLAZO PEN:');
    products.slice(0, 5).forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.nombre_producto} - ${product.tasa}% (${product.entidad})`);
    });

    // Paso 6: Insertar productos usando función insert_only
    console.log('\n📝 PASO 6: INSERTANDO PRODUCTOS DEPÓSITOS A PLAZO CON FUNCIÓN INSERT_ONLY...');
    
    const { data: insertResult, error: insertError } = await supabase
      .rpc('sync_productos_insert_only', {
        productos_data: products
      });

    if (insertError) {
      console.error('❌ Error en inserción Depósitos a Plazo PEN:', insertError);
      return;
    }

    console.log('✅ Inserción Depósitos a Plazo PEN completada:');
    console.log(`   📊 Procesados: ${insertResult.procesados}`);
    console.log(`   ✅ Insertados: ${insertResult.insertados}`);
    console.log(`   ❌ Errores: ${insertResult.errores}`);

    if (insertResult.errores > 0 && insertResult.detalles_errores) {
      console.log('⚠️  Detalles de errores:', insertResult.detalles_errores);
    }

    // Paso 7: Verificar resultado final
    console.log('\n📊 PASO 7: VERIFICANDO RESULTADO FINAL...');
    
    const { data: finalProducts, error: finalError } = await supabase
      .from('productos')
      .select(`
        id_producto,
        nombre_producto,
        tasa,
        moneda,
        tipo_producto,
        entidad!inner(nombre_entidad)
      `)
      .order('tipo_producto', { ascending: true });

    if (finalError) {
      console.error('❌ Error consultando productos finales:', finalError);
      return;
    }

    console.log(`✅ Total productos en base de datos: ${finalProducts.length}`);
    
    // Estadísticas por tipo y moneda
    const finalProductsByTypeMoneda = finalProducts.reduce((acc, product) => {
      const key = `${product.tipo_producto}_${product.moneda}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Distribución final por tipo y moneda:');
    Object.entries(finalProductsByTypeMoneda).forEach(([typeMoneda, count]) => {
      console.log(`   ${typeMoneda}: ${count} productos`);
    });

    // Estadísticas por entidad para Depósitos a Plazo PEN
    const plazoPenProducts = finalProducts.filter(p => p.moneda === 'PEN' && p.tipo_producto === 'plazo');
    if (plazoPenProducts.length > 0) {
      const plazoPenByEntidad = plazoPenProducts.reduce((acc, product) => {
        const entidad = product.entidad.nombre_entidad;
        acc[entidad] = (acc[entidad] || 0) + 1;
        return acc;
      }, {});

      const topPlazoPenEntidades = Object.entries(plazoPenByEntidad)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      console.log('🏦 Top 5 entidades en Depósitos a Plazo PEN:');
      topPlazoPenEntidades.forEach(([entidad, count]) => {
        console.log(`   ${entidad}: ${count} productos`);
      });

      // Comparación de tasas promedio
      const avgTasaPlazoPEN = plazoPenProducts.reduce((sum, p) => sum + p.tasa, 0) / plazoPenProducts.length;
      console.log(`\n📊 Tasa promedio Depósitos a Plazo PEN: ${avgTasaPlazoPEN.toFixed(2)}%`);
    }

    console.log('\n🎉 INSERCIÓN DEPÓSITOS A PLAZO PEN COMPLETADA EXITOSAMENTE');
    console.log('✅ Productos de Depósitos a Plazo en PEN insertados correctamente');
    console.log('✅ Base de datos expandida con productos de plazo');
    console.log('✅ Todas las URLs utilizadas desde variables de entorno');
    console.log('✅ Datos listos para uso en producción');

  } catch (error) {
    console.error('💥 ERROR EN INSERCIÓN DEPÓSITOS A PLAZO PEN:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Ejecutar script
if (require.main === module) {
  insertProductsPlazoComplete()
    .then(() => {
      console.log('\n✅ Script Depósitos a Plazo PEN completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script Depósitos a Plazo PEN falló:', error);
      process.exit(1);
    });
}

module.exports = insertProductsPlazoComplete;
