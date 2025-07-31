// scrape-plazo-manual.js
// Script manual para extraer productos de Depósitos a Plazo con manejo específico del formulario

require('dotenv').config();
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

async function scrapePlazoManual() {
  console.log('🏦 SCRAPING MANUAL DE DEPÓSITOS A PLAZO - PEN');
  console.log('=' .repeat(50));

  let browser;
  let page;

  try {
    // Inicializar cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Inicializar browser
    browser = await puppeteer.launch({
      headless: false, // Visible para debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navegar a la página de depósitos a plazo
    const plazosUrl = process.env.KOMPARACOOL_PLAZOS_URL || 'https://comparabien.com.pe/depositos-plazo';
    console.log(`🔄 Navegando a: ${plazosUrl}`);
    
    await page.goto(plazosUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Esperar a que la página cargue
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📋 Analizando formulario de depósitos a plazo...');

    // Inspeccionar todos los campos del formulario
    const formFields = await page.evaluate(() => {
      const fields = {};
      
      // Buscar todos los inputs, selects, y elementos de formulario
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((input, index) => {
        const name = input.name || input.id || `field_${index}`;
        const type = input.type || input.tagName.toLowerCase();
        const value = input.value;
        const placeholder = input.placeholder;
        const required = input.required;
        
        fields[name] = {
          type,
          value,
          placeholder,
          required,
          tagName: input.tagName.toLowerCase()
        };
      });
      
      return fields;
    });

    console.log('🔍 Campos encontrados en el formulario:');
    Object.entries(formFields).forEach(([name, info]) => {
      const requiredFlag = info.required ? '⚠️ REQUERIDO' : '📝 Opcional';
      console.log(`   ${name}: ${info.type} (${info.tagName}) ${requiredFlag}`);
      if (info.placeholder) console.log(`      Placeholder: "${info.placeholder}"`);
    });

    // Llenar formulario paso a paso
    console.log('\n📝 Llenando formulario de depósitos a plazo...');

    // 1. Configurar saldo promedio
    const saldoPromedio = 1200;
    console.log(`💰 Configurando saldo promedio: S/ ${saldoPromedio}`);
    
    try {
      const slider = await page.$('input[type="range"]');
      if (slider) {
        await page.evaluate((saldo) => {
          const sliderEl = document.querySelector('input[type="range"]');
          if (sliderEl) {
            sliderEl.value = saldo;
            sliderEl.dispatchEvent(new Event('input', { bubbles: true }));
            sliderEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, saldoPromedio);
        console.log('✅ Saldo configurado');
      }
    } catch (error) {
      console.log('⚠️ No se pudo configurar saldo:', error.message);
    }

    // 2. Configurar plazo (180 días)
    console.log('⏰ Configurando plazo: 180 días');
    
    const plazoSelectors = [
      'select[name="plazo"]',
      'select[name="term"]', 
      'input[name="plazo"]',
      'input[name="term"]',
      '.plazo-select',
      '.term-select'
    ];

    let plazoConfigured = false;
    for (const selector of plazoSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          
          if (tagName === 'select') {
            // Obtener opciones disponibles
            const options = await page.evaluate((sel) => {
              const selectEl = document.querySelector(sel);
              if (!selectEl) return [];
              return Array.from(selectEl.options).map(opt => ({
                value: opt.value,
                text: opt.text
              }));
            }, selector);
            
            console.log('📋 Opciones de plazo disponibles:');
            options.forEach(opt => console.log(`   - ${opt.text} (${opt.value})`));
            
            // Buscar opción de 180 días o 6 meses
            const targetOption = options.find(opt => 
              opt.text.includes('180') || 
              opt.value === '180' ||
              opt.text.includes('6 meses') ||
              opt.text.includes('6m')
            ) || options[Math.floor(options.length / 2)]; // Opción del medio como fallback
            
            if (targetOption) {
              await page.select(selector, targetOption.value);
              console.log(`✅ Plazo seleccionado: ${targetOption.text}`);
              plazoConfigured = true;
              break;
            }
          } else {
            // Input de texto o número
            await element.click({ clickCount: 3 });
            await element.type('180');
            console.log('✅ Plazo ingresado: 180 días');
            plazoConfigured = true;
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    if (!plazoConfigured) {
      console.log('⚠️ No se pudo configurar el plazo, continuando...');
    }

    // 3. Configurar ubicación
    console.log('📍 Configurando ubicación: Lima y Callao');
    try {
      const geoSelect = await page.$('select[name="geo"]');
      if (geoSelect) {
        const options = await page.evaluate(() => {
          const select = document.querySelector('select[name="geo"]');
          if (!select) return [];
          return Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
          }));
        });
        
        const limaOption = options.find(opt => 
          opt.text.includes('Lima') || opt.value === 'LI'
        );
        
        if (limaOption) {
          await page.select('select[name="geo"]', limaOption.value);
          console.log(`✅ Ubicación seleccionada: ${limaOption.text}`);
        }
      }
    } catch (error) {
      console.log('⚠️ No se pudo configurar ubicación:', error.message);
    }

    // 4. Configurar email
    console.log('📧 Configurando email');
    const email = `carlos${Math.floor(Math.random() * 9999)}@gmail.com`;
    try {
      const emailInput = await page.$('input[name="email"]');
      if (emailInput) {
        await emailInput.click({ clickCount: 3 });
        await emailInput.type(email);
        console.log(`✅ Email configurado: ${email}`);
      }
    } catch (error) {
      console.log('⚠️ No se pudo configurar email:', error.message);
    }

    // 5. Verificar estado del formulario
    console.log('\n🔍 Verificando estado final del formulario...');
    const finalFormState = await page.evaluate(() => {
      return {
        geo: document.querySelector('select[name="geo"]')?.value || 'VACÍO',
        email: document.querySelector('input[name="email"]')?.value || 'VACÍO',
        type: document.querySelector('input[name="type"]:checked')?.value || 'VACÍO',
        currency: document.querySelector('input[name="currency"]:checked')?.value || 'VACÍO',
        plazo: document.querySelector('select[name="plazo"], input[name="plazo"]')?.value || 'NO ENCONTRADO'
      };
    });

    console.log('📊 Estado final del formulario:');
    Object.entries(finalFormState).forEach(([field, value]) => {
      const status = value === 'VACÍO' || value === 'NO ENCONTRADO' ? '❌' : '✅';
      console.log(`   ${status} ${field}: ${value}`);
    });

    // 6. Enviar formulario
    console.log('\n🚀 Enviando formulario...');
    try {
      const submitButton = await page.$('button[type="submit"], input[type="submit"], .btn-submit, .submit-btn');
      if (submitButton) {
        await submitButton.click();
        console.log('✅ Formulario enviado');
        
        // Esperar navegación a resultados
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
        
        const finalUrl = page.url();
        console.log(`📍 URL final: ${finalUrl}`);
        
        if (finalUrl.includes('result') || finalUrl.includes('resultado')) {
          console.log('🎉 ¡Navegación exitosa a página de resultados!');
          
          // Aquí podríamos extraer los datos, pero por ahora solo verificamos que funciona
          console.log('✅ Formulario de depósitos a plazo funciona correctamente');
          console.log('💡 El scraper puede ser adaptado para usar esta lógica');
          
        } else {
          console.log('⚠️ No se navegó a página de resultados');
        }
      }
    } catch (error) {
      console.log('❌ Error enviando formulario:', error.message);
    }

    // Mantener browser abierto para inspección manual
    console.log('\n🔍 Browser mantenido abierto para inspección manual...');
    console.log('   Presiona Ctrl+C para cerrar cuando termines de inspeccionar');
    
    // Esperar indefinidamente
    await new Promise(() => {});

  } catch (error) {
    console.error('💥 ERROR EN SCRAPING MANUAL:', error);
  } finally {
    // No cerrar browser automáticamente para permitir inspección
    // if (browser) await browser.close();
  }
}

// Ejecutar script
if (require.main === module) {
  scrapePlazoManual()
    .then(() => {
      console.log('\n✅ Script manual completado');
    })
    .catch(error => {
      console.error('\n❌ Script manual falló:', error);
      process.exit(1);
    });
}

module.exports = scrapePlazoManual;
