const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');

async function debugTableStructure() {
  console.log('🔍 INSPECCIONANDO ESTRUCTURA DE LA TABLA DE RESULTADOS');
  
  let scraper;
  
  try {
    // Inicializar scraper
    scraper = new KomparaCoolScraper();
    await scraper.initialize();
    console.log('✅ Scraper inicializado');
    
    // Ejecutar navegación completa
    await scraper.navigateAndExtract();
    console.log('✅ Navegación completada');
    
    // Inspeccionar estructura detallada de la tabla
    const tableStructure = await scraper.page.evaluate(() => {
      console.log('=== INICIANDO INSPECCIÓN DETALLADA DE LA TABLA ===');
      
      const resultContainer = document.querySelector('#result');
      if (!resultContainer) {
        return { error: 'No se encontró contenedor #result' };
      }
      
      console.log(`Contenedor #result encontrado con ${resultContainer.children.length} elementos`);
      
      // Analizar los primeros 10 elementos para entender la estructura
      const analysis = [];
      
      for (let i = 0; i < Math.min(10, resultContainer.children.length); i++) {
        const element = resultContainer.children[i];
        const text = element.textContent.trim();
        
        console.log(`\\n--- ELEMENTO ${i + 1} ---`);
        console.log(`Texto: ${text.substring(0, 150)}...`);
        console.log(`Tag: ${element.tagName}`);
        console.log(`Clases: ${element.className}`);
        console.log(`ID: ${element.id}`);
        console.log(`Hijos: ${element.children.length}`);
        
        // Buscar información específica
        const bankInfo = {
          hasImage: !!element.querySelector('img'),
          imageAlt: element.querySelector('img')?.alt || '',
          imageTitle: element.querySelector('img')?.title || '',
          imageSrc: element.querySelector('img')?.src || ''
        };
        
        // Buscar texto de bancos conocidos
        const bankPatterns = [
          { pattern: /compartamos/i, name: 'Compartamos Banco' },
          { pattern: /cusco/i, name: 'Caja Municipal Cusco' },
          { pattern: /bcp/i, name: 'BCP' },
          { pattern: /bbva/i, name: 'BBVA' },
          { pattern: /interbank/i, name: 'Interbank' },
          { pattern: /scotiabank/i, name: 'Scotiabank' },
          { pattern: /falabella/i, name: 'Banco Falabella' }
        ];
        
        let detectedBank = 'No detectado';
        for (const { pattern, name } of bankPatterns) {
          if (pattern.test(text) || pattern.test(bankInfo.imageAlt) || pattern.test(bankInfo.imageTitle)) {
            detectedBank = name;
            break;
          }
        }
        
        // Buscar tasas
        const rateMatches = text.match(/([0-9]+[.,]?[0-9]*)\s*%/g) || [];
        
        // Buscar nombres de productos
        const productPatterns = [
          /Cuenta\\s+[\\w\\s]+/i,
          /Campaña\\s+[\\w\\s]+/i,
          /Ahorro\\s+[\\w\\s]+/i
        ];
        
        let detectedProduct = 'No detectado';
        for (const pattern of productPatterns) {
          const match = text.match(pattern);
          if (match) {
            detectedProduct = match[0].trim();
            break;
          }
        }
        
        analysis.push({
          index: i + 1,
          text: text.substring(0, 100) + '...',
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          childrenCount: element.children.length,
          bankInfo,
          detectedBank,
          detectedProduct,
          rateMatches,
          innerHTML: element.innerHTML.substring(0, 300) + '...'
        });
      }
      
      return {
        totalElements: resultContainer.children.length,
        analysis
      };
    });
    
    console.log('\n📊 ANÁLISIS DE ESTRUCTURA:');
    console.log(`Total de elementos: ${tableStructure.totalElements}`);
    
    console.log('\n🔍 ANÁLISIS DETALLADO DE LOS PRIMEROS 10 ELEMENTOS:');
    tableStructure.analysis.forEach(item => {
      console.log(`\\n--- ELEMENTO ${item.index} ---`);
      console.log(`Texto: ${item.text}`);
      console.log(`Tag: ${item.tagName} | Clase: ${item.className} | ID: ${item.id}`);
      console.log(`Hijos: ${item.childrenCount}`);
      console.log(`🏦 Banco detectado: ${item.detectedBank}`);
      console.log(`📦 Producto detectado: ${item.detectedProduct}`);
      console.log(`💰 Tasas encontradas: [${item.rateMatches.join(', ')}]`);
      
      if (item.bankInfo.hasImage) {
        console.log(`🖼️ Imagen: alt="${item.bankInfo.imageAlt}" title="${item.bankInfo.imageTitle}"`);
        console.log(`   src="${item.bankInfo.imageSrc.substring(0, 50)}..."`);
      }
      
      console.log(`📄 HTML: ${item.innerHTML}`);
      console.log('=' .repeat(80));
    });
    
    // Buscar patrones específicos mencionados por el usuario
    console.log('\\n🎯 BUSCANDO EJEMPLOS ESPECÍFICOS:');
    
    const specificExamples = await scraper.page.evaluate(() => {
      const examples = [];
      const allElements = document.querySelectorAll('#result *');
      
      // Buscar "Cuenta WOW" y "Compartamos"
      for (const element of allElements) {
        const text = element.textContent;
        if (text.includes('WOW') && text.includes('Digital')) {
          examples.push({
            type: 'Cuenta WOW',
            text: text.substring(0, 200),
            hasCompartamos: text.includes('Compartamos') || text.includes('compartamos'),
            innerHTML: element.innerHTML.substring(0, 300)
          });
        }
        
        if (text.includes('Cusco') || text.includes('cusco')) {
          examples.push({
            type: 'Caja Cusco',
            text: text.substring(0, 200),
            innerHTML: element.innerHTML.substring(0, 300)
          });
        }
      }
      
      return examples;
    });
    
    console.log('Ejemplos específicos encontrados:');
    specificExamples.forEach((example, index) => {
      console.log(`\\n${index + 1}. ${example.type}:`);
      console.log(`   Texto: ${example.text}`);
      if (example.hasCompartamos !== undefined) {
        console.log(`   ¿Tiene Compartamos?: ${example.hasCompartamos}`);
      }
      console.log(`   HTML: ${example.innerHTML}`);
    });
    
  } catch (error) {
    console.error('❌ Error en inspección:', error.message);
  } finally {
    if (scraper && scraper.browser) {
      await scraper.browser.close();
      console.log('\\n✅ Browser cerrado');
    }
  }
}

debugTableStructure().catch(console.error);
