const puppeteer = require('puppeteer');

async function testFormFixed() {
  console.log('🚀 PROBANDO FORMULARIO CON CORRECCIONES');
  
  const browser = await puppeteer.launch({ 
    headless: false,
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
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n=== LLENANDO FORMULARIO CORRECTAMENTE ===');
    
    // Generar datos realistas
    const formData = {
      email: 'rigoberto' + Math.floor(Math.random() * 10000) + '@gmail.com',
      saldoPromedio: Math.floor(Math.random() * 500) + 1000
    };
    
    console.log('Datos generados:', formData);
    
    // 1. Tipo de cuenta (Normal ya está seleccionado por defecto)
    console.log('✅ Tipo de cuenta: Normal (por defecto)');
    
    // 2. Moneda (Soles ya está seleccionado por defecto)  
    console.log('✅ Moneda: Soles (por defecto)');
    
    // 3. Saldo (usar el valor por defecto o ajustar si es necesario)
    console.log('✅ Saldo: Usando valor por defecto');
    
    // 4. UBICACIÓN (GEO) - EL CAMPO CRÍTICO
    console.log('🔧 Configurando ubicación...');
    
    // Verificar opciones disponibles
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
    
    console.log('Opciones de ubicación:', geoOptions.map(opt => `${opt.value}: ${opt.text}`));
    
    if (geoOptions.length > 1) {
      // Buscar Lima o usar la primera opción válida
      const limaOption = geoOptions.find(opt => 
        opt.text.toLowerCase().includes('lima') || 
        opt.value.toLowerCase().includes('lima')
      );
      
      const selectedOption = limaOption || geoOptions[1]; // Primera opción válida
      
      console.log(`Seleccionando: ${selectedOption.value} - ${selectedOption.text}`);
      
      await page.select('select[name="geo"]', selectedOption.value);
      
      // Verificar que se seleccionó
      const verifyGeo = await page.evaluate(() => {
        const select = document.querySelector('select[name="geo"]');
        return select ? select.value : 'ERROR';
      });
      
      console.log(`✅ Ubicación verificada: ${verifyGeo}`);
    }
    
    // 5. EMAIL - EL OTRO CAMPO CRÍTICO
    console.log('🔧 Configurando email...');
    
    await page.type('input[name="email"]', formData.email);
    
    // Verificar que se llenó
    const verifyEmail = await page.evaluate(() => {
      const input = document.querySelector('input[name="email"]');
      return input ? input.value : 'ERROR';
    });
    
    console.log(`✅ Email verificado: ${verifyEmail}`);
    
    // Verificar estado final del formulario
    const finalState = await page.evaluate(() => {
      return {
        geo: document.querySelector('select[name="geo"]')?.value || 'VACÍO',
        email: document.querySelector('input[name="email"]')?.value || 'VACÍO',
        type: document.querySelector('input[name="type"]:checked')?.value || 'VACÍO',
        currency: document.querySelector('input[name="currency"]:checked')?.value || 'VACÍO'
      };
    });
    
    console.log('\n=== ESTADO FINAL DEL FORMULARIO ===');
    Object.entries(finalState).forEach(([field, value]) => {
      const status = value === 'VACÍO' ? '❌' : '✅';
      console.log(`  ${status} ${field}: ${value}`);
    });
    
    const hasEmptyFields = Object.values(finalState).some(value => value === 'VACÍO');
    
    if (hasEmptyFields) {
      console.log('\n❌ HAY CAMPOS VACÍOS - El formulario no se enviará');
    } else {
      console.log('\n✅ TODOS LOS CAMPOS ESTÁN LLENOS - Procediendo con submit');
      
      // HACER CLIC EN COMPARAR
      console.log('\n🔘 Haciendo clic en Comparar...');
      
      const urlBefore = page.url();
      console.log(`URL antes: ${urlBefore}`);
      
      // Escuchar navegación
      let navigationPromise = page.waitForNavigation({ 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      }).catch(() => console.log('Timeout en navegación'));
      
      // Hacer clic
      await page.click('input[name="source"][value="Compara"]');
      
      // Esperar navegación
      await navigationPromise;
      
      const urlAfter = page.url();
      console.log(`URL después: ${urlAfter}`);
      
      if (urlAfter !== urlBefore) {
        console.log('🎉 ¡ÉXITO! Navegación a página de resultados');
        
        // Esperar a que carguen los resultados
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verificar resultados
        const results = await page.evaluate(() => {
          const tables = document.querySelectorAll('table');
          const rows = document.querySelectorAll('table tr');
          const percentages = document.body.textContent.match(/\d+[.,]\d+\s*%/g) || [];
          
          return {
            url: window.location.href,
            title: document.title,
            tables: tables.length,
            rows: rows.length,
            percentages: percentages.slice(0, 10)
          };
        });
        
        console.log('\n📊 RESULTADOS ENCONTRADOS:');
        console.log(`  URL: ${results.url}`);
        console.log(`  Título: ${results.title}`);
        console.log(`  Tablas: ${results.tables}`);
        console.log(`  Filas: ${results.rows}`);
        console.log(`  Tasas encontradas: ${results.percentages.join(', ')}`);
        
        if (results.percentages.length > 0) {
          console.log('\n🎯 ¡PROBLEMA RESUELTO! Se encontraron tasas de interés');
        }
        
      } else {
        console.log('❌ La URL no cambió - Formulario no se envió');
      }
    }
    
    console.log('\n✅ Test completado. Presiona Enter para cerrar...');
    
    // Esperar input para cerrar
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFormFixed().catch(console.error);
