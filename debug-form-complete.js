const puppeteer = require('puppeteer');

async function debugFormComplete() {
  console.log('🔍 INICIANDO DEBUG COMPLETO DEL FORMULARIO');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  try {
    // Navegar a la página
    console.log('📍 Navegando a https://comparabien.com.pe/ahorros');
    await page.goto('https://comparabien.com.pe/ahorros', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Esperar a que cargue completamente
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n=== LLENANDO FORMULARIO COMPLETO ===');
    
    // 1. Seleccionar tipo de cuenta (Normal ya está seleccionado)
    console.log('✅ Tipo de cuenta: Normal (ya seleccionado)');
    
    // 2. Seleccionar moneda (Soles ya está seleccionado)
    console.log('✅ Moneda: Soles (ya seleccionado)');
    
    // 3. Configurar saldo (ya tiene valor por defecto)
    console.log('✅ Saldo: S/ 30,000 (valor por defecto)');
    
    // 4. Seleccionar ubicación (GEO) - ESTE ES EL CAMPO FALTANTE
    console.log('🔧 Seleccionando ubicación...');
    try {
      await page.select('select[name="geo"]', 'lima'); // Intentar con 'lima'
      console.log('✅ Ubicación seleccionada: Lima');
    } catch (geoError) {
      // Si no funciona 'lima', ver qué opciones hay
      const geoOptions = await page.evaluate(() => {
        const select = document.querySelector('select[name="geo"]');
        if (select) {
          return Array.from(select.options).map(option => ({
            value: option.value,
            text: option.textContent.trim()
          }));
        }
        return [];
      });
      
      console.log('Opciones de ubicación disponibles:', geoOptions);
      
      // Intentar con la primera opción válida
      if (geoOptions.length > 1) {
        const firstOption = geoOptions[1]; // Saltar la primera que suele ser vacía
        await page.select('select[name="geo"]', firstOption.value);
        console.log(`✅ Ubicación seleccionada: ${firstOption.text}`);
      }
    }
    
    // 5. Llenar email - ESTE ES EL OTRO CAMPO FALTANTE
    console.log('🔧 Llenando email...');
    await page.type('input[name="email"]', 'test@gmail.com');
    console.log('✅ Email ingresado: test@gmail.com');
    
    // Verificar estado del formulario después de llenar TODO
    const formStateComplete = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      const state = [];
      inputs.forEach(input => {
        if (input.name) {
          state.push({
            name: input.name,
            type: input.type || input.tagName,
            value: input.value,
            required: input.required || false
          });
        }
      });
      return state;
    });
    
    console.log('\n=== ESTADO COMPLETO DEL FORMULARIO ===');
    formStateComplete.forEach(field => {
      const status = field.value ? '✅' : '❌';
      console.log(`  ${status} ${field.name} (${field.type}): "${field.value}" ${field.required ? '[REQUERIDO]' : ''}`);
    });
    
    // Verificar si hay campos vacíos requeridos
    const emptyRequired = formStateComplete.filter(field => field.required && !field.value);
    if (emptyRequired.length > 0) {
      console.log('\n🚨 CAMPOS REQUERIDOS VACÍOS:');
      emptyRequired.forEach(field => {
        console.log(`  - ${field.name} (${field.type})`);
      });
    } else {
      console.log('\n✅ TODOS LOS CAMPOS REQUERIDOS ESTÁN LLENOS');
    }
    
    // Ahora intentar hacer clic en Comparar
    console.log('\n=== INTENTANDO SUBMIT CON FORMULARIO COMPLETO ===');
    
    const urlBefore = page.url();
    console.log(`URL antes del clic: ${urlBefore}`);
    
    // Escuchar eventos de navegación
    let navigationOccurred = false;
    page.on('framenavigated', () => {
      navigationOccurred = true;
      console.log('🚀 Navegación detectada!');
    });
    
    // Hacer clic en el botón
    const compareButton = await page.$('input[name="source"][value="Compara"]');
    if (compareButton) {
      console.log('🔘 Haciendo clic en botón Compara...');
      await compareButton.click();
      
      // Esperar navegación o timeout
      try {
        await page.waitForNavigation({ 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        console.log('✅ Navegación completada');
      } catch (navError) {
        console.log('⏰ Timeout esperando navegación');
      }
      
      const urlAfter = page.url();
      console.log(`URL después del clic: ${urlAfter}`);
      
      if (urlBefore !== urlAfter) {
        console.log('🎉 ¡ÉXITO! La URL cambió correctamente');
        console.log('🔍 Verificando si llegamos a la página de resultados...');
        
        // Esperar a que cargue la página de resultados
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verificar si hay tabla de resultados
        const hasResults = await page.evaluate(() => {
          const tables = document.querySelectorAll('table');
          const rows = document.querySelectorAll('table tr');
          const percentages = document.body.textContent.match(/\d+[.,]\d+\s*%/g) || [];
          
          return {
            tables: tables.length,
            rows: rows.length,
            percentages: percentages.length,
            samplePercentages: percentages.slice(0, 5)
          };
        });
        
        console.log('📊 Resultados encontrados:');
        console.log(`  - Tablas: ${hasResults.tables}`);
        console.log(`  - Filas: ${hasResults.rows}`);
        console.log(`  - Porcentajes: ${hasResults.percentages}`);
        console.log(`  - Ejemplos: ${hasResults.samplePercentages.join(', ')}`);
        
      } else {
        console.log('❌ La URL no cambió - formulario no se envió');
        
        // Buscar errores de validación
        const errors = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('.error, .alert-danger, .validation-error, [class*="error"], .invalid-feedback');
          return Array.from(errorElements).map(el => el.textContent.trim()).filter(text => text);
        });
        
        if (errors.length > 0) {
          console.log('🚨 Errores de validación:');
          errors.forEach(error => console.log(`  - ${error}`));
        }
      }
    } else {
      console.log('❌ No se encontró el botón de comparar');
    }
    
    console.log('\n🔍 Debug completado. Presiona Enter para cerrar...');
    
    // Esperar input del usuario para cerrar
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

debugFormComplete().catch(console.error);
