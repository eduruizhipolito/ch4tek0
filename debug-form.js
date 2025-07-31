const puppeteer = require('puppeteer');

async function debugForm() {
  console.log('🔍 INICIANDO DEBUG DEL FORMULARIO KOMPARACOOL');
  
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
    
    // DEBUGGING: Capturar información del formulario
    const formDebugInfo = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const debugInfo = {
        formsFound: forms.length,
        forms: []
      };
      
      forms.forEach((form, index) => {
        const formInfo = {
          index: index,
          action: form.action || 'No action',
          method: form.method || 'No method',
          id: form.id || 'No ID',
          className: form.className || 'No class'
        };
        
        // Buscar campos del formulario
        const inputs = form.querySelectorAll('input, select, textarea');
        formInfo.fields = [];
        inputs.forEach(input => {
          formInfo.fields.push({
            name: input.name || 'No name',
            type: input.type || 'No type',
            value: input.value || 'No value',
            required: input.required || false,
            id: input.id || 'No ID',
            placeholder: input.placeholder || 'No placeholder'
          });
        });
        
        debugInfo.forms.push(formInfo);
      });
      
      return debugInfo;
    });
    
    console.log('\n=== INFORMACIÓN DEL FORMULARIO ===');
    console.log(`Formularios encontrados: ${formDebugInfo.formsFound}`);
    formDebugInfo.forms.forEach((form, index) => {
      console.log(`\nFormulario ${index + 1}:`);
      console.log(`  Action: ${form.action}`);
      console.log(`  Method: ${form.method}`);
      console.log(`  ID: ${form.id}`);
      console.log(`  Class: ${form.className}`);
      console.log(`  Campos: ${form.fields.length}`);
      form.fields.forEach(field => {
        console.log(`    - ${field.name} (${field.type}): "${field.value}" ${field.required ? '[REQUERIDO]' : ''}`);
        if (field.placeholder) console.log(`      Placeholder: "${field.placeholder}"`);
      });
    });
    
    // Buscar botones
    const buttonInfo = await page.evaluate(() => {
      const buttons = [
        ...document.querySelectorAll('input[type="submit"]'),
        ...document.querySelectorAll('button[type="submit"]'),
        ...document.querySelectorAll('button'),
        ...document.querySelectorAll('.btn'),
        ...document.querySelectorAll('[onclick]')
      ];
      
      return buttons.map(btn => ({
        tagName: btn.tagName,
        type: btn.type || 'No type',
        value: btn.value || 'No value',
        textContent: btn.textContent.trim(),
        className: btn.className,
        id: btn.id || 'No ID',
        onclick: btn.onclick ? btn.onclick.toString().substring(0, 100) : 'No onclick'
      }));
    });
    
    console.log('\n=== BOTONES ENCONTRADOS ===');
    console.log(`Botones encontrados: ${buttonInfo.length}`);
    buttonInfo.forEach((btn, index) => {
      console.log(`  Botón ${index + 1}: ${btn.tagName} - "${btn.textContent}" - ${btn.className}`);
      if (btn.onclick !== 'No onclick') {
        console.log(`    OnClick: ${btn.onclick}`);
      }
    });
    
    // Llenar el formulario paso a paso
    console.log('\n=== LLENANDO FORMULARIO ===');
    
    // Datos de prueba
    const formData = {
      tipoCuenta: 'Normal',
      moneda: 'Soles',
      saldoPromedio: 1200,
      tipoInstitucion: 'Bancos, Cajas y Financieras',
      ubicacion: 'Lima y Callao',
      email: 'test@gmail.com'
    };
    
    console.log('Datos a llenar:', formData);
    
    // Intentar llenar cada campo
    try {
      // Tipo de cuenta
      const tipoCuentaSelect = await page.$('select[name*="tipo"], select[id*="tipo"], select[name*="cuenta"]');
      if (tipoCuentaSelect) {
        await page.select('select[name*="tipo"], select[id*="tipo"], select[name*="cuenta"]', 'Normal');
        console.log('✅ Tipo de cuenta seleccionado');
      }
      
      // Moneda
      const monedaSelect = await page.$('select[name*="moneda"], select[id*="moneda"]');
      if (monedaSelect) {
        await page.select('select[name*="moneda"], select[id*="moneda"]', 'Soles');
        console.log('✅ Moneda seleccionada');
      }
      
      // Saldo promedio
      const saldoInput = await page.$('input[name*="saldo"], input[id*="saldo"], input[type="number"]');
      if (saldoInput) {
        await page.fill('input[name*="saldo"], input[id*="saldo"], input[type="number"]', formData.saldoPromedio.toString());
        console.log('✅ Saldo promedio ingresado');
      }
      
      // Email
      const emailInput = await page.$('input[type="email"], input[name*="email"], input[id*="email"]');
      if (emailInput) {
        await page.fill('input[type="email"], input[name*="email"], input[id*="email"]', formData.email);
        console.log('✅ Email ingresado');
      }
      
    } catch (fillError) {
      console.log('❌ Error llenando formulario:', fillError.message);
    }
    
    // Verificar estado del formulario después de llenarlo
    const formStateAfter = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      const state = [];
      inputs.forEach(input => {
        if (input.name || input.id) {
          state.push({
            name: input.name || input.id,
            type: input.type || input.tagName,
            value: input.value
          });
        }
      });
      return state;
    });
    
    console.log('\n=== ESTADO DEL FORMULARIO DESPUÉS DE LLENAR ===');
    formStateAfter.forEach(field => {
      console.log(`  ${field.name} (${field.type}): "${field.value}"`);
    });
    
    // Intentar hacer clic en el botón de comparar
    console.log('\n=== INTENTANDO HACER CLIC EN COMPARAR ===');
    
    const urlBefore = page.url();
    console.log(`URL antes del clic: ${urlBefore}`);
    
    try {
      const compareButton = await page.$('input[type="submit"][value*="omparar"], button[type="submit"], .btn-primary, input[value="Comparar"]');
      if (compareButton) {
        await compareButton.click();
        console.log('✅ Botón Comparar clickeado');
        
        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const urlAfter = page.url();
        console.log(`URL después del clic: ${urlAfter}`);
        
        if (urlBefore === urlAfter) {
          console.log('❌ La URL no cambió después del clic');
          
          // Buscar errores de validación
          const errors = await page.evaluate(() => {
            const errorElements = document.querySelectorAll('.error, .alert-danger, .validation-error, [class*="error"]');
            return Array.from(errorElements).map(el => el.textContent.trim()).filter(text => text);
          });
          
          if (errors.length > 0) {
            console.log('🚨 Errores de validación encontrados:');
            errors.forEach(error => console.log(`  - ${error}`));
          } else {
            console.log('🤔 No se encontraron errores de validación visibles');
          }
        } else {
          console.log('✅ La URL cambió correctamente');
        }
      } else {
        console.log('❌ No se encontró el botón de comparar');
      }
    } catch (clickError) {
      console.log('❌ Error haciendo clic:', clickError.message);
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

debugForm().catch(console.error);
