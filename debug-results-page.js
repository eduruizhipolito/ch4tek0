const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');

async function debugResultsPage() {
  console.log('🔍 DEPURANDO ESTRUCTURA DE LA PÁGINA DE RESULTADOS');
  
  let scraper;
  
  try {
    // Inicializar scraper
    scraper = new KomparaCoolScraper();
    await scraper.initialize();
    console.log('✅ Scraper inicializado');
    
    // Navegar a la página de ahorros
    const ahorrosUrl = process.env.KOMPARACOOL_AHORROS_URL || 'https://comparabien.com.pe/ahorros';
    await scraper.page.goto(ahorrosUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    console.log('✅ Navegación a formulario exitosa');
    
    // Llenar y enviar formulario
    const formData = scraper.generateRandomFormData();
    console.log('📝 Datos del formulario:', formData);
    
    await scraper.fillForm(formData);
    console.log('✅ Formulario llenado');
    
    await scraper.submitFormAndWaitForResults();
    console.log('✅ Formulario enviado y navegación completada');
    
    // Inspeccionar la página de resultados
    const currentUrl = scraper.page.url();
    console.log(`📍 URL actual: ${currentUrl}`);
    
    // Obtener título de la página
    const title = await scraper.page.title();
    console.log(`📄 Título: ${title}`);
    
    // Buscar diferentes selectores posibles para la tabla
    const tableSelectors = [
      'table',
      '.table',
      '#result table',
      '.result-table',
      '.products-table',
      '[class*="table"]',
      '[id*="table"]',
      'tbody',
      '.row',
      '[class*="product"]',
      '[class*="result"]'
    ];
    
    console.log('\n🔍 BUSCANDO SELECTORES DE TABLA:');
    for (const selector of tableSelectors) {
      const elements = await scraper.page.$$(selector);
      if (elements.length > 0) {
        console.log(`✅ ${selector}: ${elements.length} elementos encontrados`);
        
        // Si es una tabla, obtener más detalles
        if (selector.includes('table') || selector === '.table') {
          const tableInfo = await scraper.page.evaluate((sel) => {
            const tables = document.querySelectorAll(sel);
            return Array.from(tables).map((table, index) => ({
              index,
              rows: table.rows ? table.rows.length : 0,
              cells: table.rows && table.rows[0] ? table.rows[0].cells.length : 0,
              innerHTML: table.innerHTML.substring(0, 200) + '...'
            }));
          }, selector);
          console.log(`   Detalles de tablas:`, tableInfo);
        }
      } else {
        console.log(`❌ ${selector}: No encontrado`);
      }
    }
    
    // Buscar texto específico de productos financieros
    console.log('\n🔍 BUSCANDO TEXTO DE PRODUCTOS:');
    const searchTerms = ['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'Banco', 'Tasa', '%', 'TEA', 'TREA'];
    
    for (const term of searchTerms) {
      const found = await scraper.page.evaluate((searchTerm) => {
        return document.body.innerText.includes(searchTerm);
      }, term);
      console.log(`${found ? '✅' : '❌'} "${term}": ${found ? 'Encontrado' : 'No encontrado'}`);
    }
    
    // Obtener estructura HTML de la página
    console.log('\n📋 ESTRUCTURA HTML PRINCIPAL:');
    const mainStructure = await scraper.page.evaluate(() => {
      const main = document.querySelector('main') || document.querySelector('#main') || document.querySelector('.main') || document.body;
      return {
        tagName: main.tagName,
        className: main.className,
        id: main.id,
        childrenCount: main.children.length,
        innerHTML: main.innerHTML.substring(0, 500) + '...'
      };
    });
    console.log('Estructura principal:', mainStructure);
    
    // Buscar contenedores de resultados específicos
    console.log('\n🎯 BUSCANDO CONTENEDORES DE RESULTADOS:');
    const resultContainers = await scraper.page.evaluate(() => {
      const containers = [];
      
      // Buscar por ID y clase que contengan "result"
      const resultElements = document.querySelectorAll('[id*="result"], [class*="result"], [class*="product"], [class*="comparison"]');
      
      resultElements.forEach((el, index) => {
        containers.push({
          index,
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          textContent: el.textContent.substring(0, 100) + '...',
          childrenCount: el.children.length
        });
      });
      
      return containers;
    });
    
    console.log('Contenedores encontrados:', resultContainers);
    
  } catch (error) {
    console.error('❌ Error en debugging:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (scraper && scraper.browser) {
      await scraper.browser.close();
      console.log('✅ Browser cerrado');
    }
  }
}

debugResultsPage().catch(console.error);
