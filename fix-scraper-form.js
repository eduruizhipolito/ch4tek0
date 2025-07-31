// Método corregido para llenar el formulario de KomparaCool
// Basado en los hallazgos del debugging exitoso

async function fillFormCorrectly(page, formData, logger) {
  try {
    logger.info('Llenando formulario con correcciones aplicadas...');
    
    // 1. Tipo de cuenta (Normal ya está seleccionado por defecto)
    logger.info('✅ Tipo de cuenta: Normal (por defecto)');
    
    // 2. Moneda (Soles ya está seleccionado por defecto)  
    logger.info('✅ Moneda: Soles (por defecto)');
    
    // 3. Saldo (usar el valor por defecto)
    logger.info('✅ Saldo: Usando valor por defecto');
    
    // 4. UBICACIÓN (GEO) - EL CAMPO CRÍTICO QUE ESTABA FALTANDO
    logger.info('🔧 Configurando ubicación...');
    
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
    
    logger.info(`Opciones de ubicación disponibles: ${geoOptions.length}`);
    
    if (geoOptions.length > 1) {
      // Buscar Lima o usar la primera opción válida
      const limaOption = geoOptions.find(opt => 
        opt.text.toLowerCase().includes('lima') || 
        opt.value === 'LI'
      );
      
      const selectedOption = limaOption || geoOptions[1]; // Primera opción válida
      
      logger.info(`Seleccionando ubicación: ${selectedOption.value} - ${selectedOption.text}`);
      
      await page.select('select[name="geo"]', selectedOption.value);
      
      // Verificar que se seleccionó correctamente
      const verifyGeo = await page.evaluate(() => {
        const select = document.querySelector('select[name="geo"]');
        return select ? select.value : 'ERROR';
      });
      
      logger.info(`✅ Ubicación verificada: ${verifyGeo}`);
    } else {
      logger.warn('No se encontraron opciones de ubicación');
    }
    
    // 5. EMAIL - EL OTRO CAMPO CRÍTICO
    logger.info('🔧 Configurando email...');
    
    await page.type('input[name="email"]', formData.email);
    
    // Verificar que se llenó correctamente
    const verifyEmail = await page.evaluate(() => {
      const input = document.querySelector('input[name="email"]');
      return input ? input.value : 'ERROR';
    });
    
    logger.info(`✅ Email verificado: ${verifyEmail}`);
    
    // Verificar estado final del formulario antes del submit
    const finalState = await page.evaluate(() => {
      return {
        geo: document.querySelector('select[name="geo"]')?.value || 'VACÍO',
        email: document.querySelector('input[name="email"]')?.value || 'VACÍO',
        type: document.querySelector('input[name="type"]:checked')?.value || 'VACÍO',
        currency: document.querySelector('input[name="currency"]:checked')?.value || 'VACÍO'
      };
    });
    
    logger.info('Estado final del formulario:');
    Object.entries(finalState).forEach(([field, value]) => {
      const status = value === 'VACÍO' ? '❌' : '✅';
      logger.info(`  ${status} ${field}: ${value}`);
    });
    
    const hasEmptyFields = Object.values(finalState).some(value => value === 'VACÍO');
    
    if (hasEmptyFields) {
      throw new Error('Hay campos obligatorios vacíos en el formulario');
    }
    
    logger.info('✅ Todos los campos obligatorios están llenos');
    return true;
    
  } catch (error) {
    logger.error('Error llenando formulario:', error);
    throw error;
  }
}

// Método para hacer submit y esperar navegación
async function submitFormAndWaitForResults(page, logger) {
  try {
    logger.info('🔘 Enviando formulario...');
    
    const urlBefore = page.url();
    logger.info(`URL antes del submit: ${urlBefore}`);
    
    // Configurar listener para navegación
    const navigationPromise = page.waitForNavigation({ 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    // Hacer clic en el botón Comparar
    await page.click('input[name="source"][value="Compara"]');
    logger.info('✅ Botón Comparar clickeado');
    
    // Esperar navegación
    await navigationPromise;
    
    const urlAfter = page.url();
    logger.info(`URL después del submit: ${urlAfter}`);
    
    if (urlAfter !== urlBefore && urlAfter.includes('/result')) {
      logger.info('🎉 ¡Navegación exitosa a página de resultados!');
      
      // Esperar a que carguen los resultados
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return true;
    } else {
      throw new Error(`Navegación falló. URL esperada: /result, URL actual: ${urlAfter}`);
    }
    
  } catch (error) {
    logger.error('Error en submit del formulario:', error);
    throw error;
  }
}

module.exports = {
  fillFormCorrectly,
  submitFormAndWaitForResults
};
