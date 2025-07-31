const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');

async function testCompleteScraper() {
  console.log('🚀 INICIANDO TEST COMPLETO DEL SCRAPER CORREGIDO');
  
  let scraper;
  
  try {
    // Inicializar scraper
    console.log('1. Inicializando scraper...');
    scraper = new KomparaCoolScraper();
    await scraper.initialize();
    console.log('✅ Scraper inicializado');
    
    // Ejecutar scraping completo
    console.log('2. Ejecutando scraping completo...');
    const startTime = Date.now();
    
    const products = await scraper.scrapeAhorrosInteractivo();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📊 RESULTADOS DEL SCRAPING:');
    console.log(`⏱️ Tiempo de ejecución: ${duration}s`);
    console.log(`📦 Productos extraídos: ${products.length}`);
    
    if (products.length > 0) {
      console.log('\n📋 PRODUCTOS ENCONTRADOS:');
      products.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.nombre_producto}`);
        console.log(`     💰 Tasa: ${product.tasa}% | 🏦 Banco: ${product.banco}`);
        console.log(`     💱 Moneda: ${product.moneda} | 🔗 URL: ${product.url_fuente}`);
        console.log('     ------------------------------------------------------------');
      });
      
      // Verificar que las tasas no son null
      const validProducts = products.filter(p => p.tasa !== null && p.tasa > 0);
      console.log(`\n✅ Productos con tasas válidas: ${validProducts.length}/${products.length}`);
      
      if (validProducts.length > 0) {
        console.log('🎉 ¡SCRAPER FUNCIONANDO CORRECTAMENTE!');
        console.log('✅ Navegación exitosa a página de resultados');
        console.log('✅ Extracción de tasas exitosa');
        console.log('✅ Datos estructurados correctamente');
      } else {
        console.log('⚠️ Productos extraídos pero sin tasas válidas');
      }
    } else {
      console.log('❌ No se encontraron productos');
    }
    
  } catch (error) {
    console.error('❌ Error en test completo:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (scraper && scraper.browser) {
      try {
        await scraper.browser.close();
        console.log('✅ Browser cerrado');
      } catch (closeError) {
        console.error('Error cerrando browser:', closeError.message);
      }
    }
  }
}

testCompleteScraper().catch(console.error);
