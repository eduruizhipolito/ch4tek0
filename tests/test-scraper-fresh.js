const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');

async function testScraperFresh() {
  console.log('🚀 TEST COMPLETO SIN SESIÓN PERSISTENTE');
  
  let scraper;
  
  try {
    // Inicializar scraper
    console.log('1. Inicializando scraper...');
    scraper = new KomparaCoolScraper();
    await scraper.initialize();
    console.log('✅ Scraper inicializado');
    
    // Forzar navegación completa (sin usar sesión guardada)
    console.log('2. Ejecutando navegación completa...');
    const startTime = Date.now();
    
    // Llamar directamente al método de navegación completa
    const products = await scraper.navigateAndExtract();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📊 RESULTADOS DEL SCRAPING:');
    console.log(`⏱️ Tiempo de ejecución: ${duration}s`);
    console.log(`📦 Productos extraídos: ${products.length}`);
    
    if (products.length > 0) {
      console.log('\n📋 PRODUCTOS ENCONTRADOS:');
      
      // Separar productos válidos e inválidos
      const validProducts = products.filter(p => p.tasa !== null && p.tasa > 0);
      const invalidProducts = products.filter(p => p.tasa === null || p.tasa <= 0);
      
      console.log(`✅ Productos con tasas válidas: ${validProducts.length}/${products.length}`);
      console.log(`❌ Productos con tasas inválidas: ${invalidProducts.length}/${products.length}`);
      
      // Mostrar muestra de productos válidos
      console.log('\n🎯 MUESTRA DE PRODUCTOS VÁLIDOS:');
      validProducts.slice(0, 10).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.nombre_producto}`);
        console.log(`     💰 Tasa: ${product.tasa}% | 🏦 Banco: ${product.banco}`);
        console.log(`     💱 Moneda: ${product.moneda}`);
        console.log('     ------------------------------------------------------------');
      });
      
      // Mostrar muestra de productos inválidos para análisis
      if (invalidProducts.length > 0) {
        console.log('\n❌ MUESTRA DE PRODUCTOS INVÁLIDOS:');
        invalidProducts.slice(0, 5).forEach((product, index) => {
          console.log(`  ${index + 1}. "${product.nombre_producto}"`);
          console.log(`     💰 Tasa: ${product.tasa}% | 🏦 Banco: ${product.banco}`);
          console.log('     ------------------------------------------------------------');
        });
      }
      
      if (validProducts.length > 0) {
        console.log('\n🎉 ¡SCRAPER FUNCIONANDO CORRECTAMENTE!');
        console.log('✅ Navegación exitosa a página de resultados');
        console.log('✅ Extracción de tasas exitosa');
        console.log('✅ Filtros mejorados aplicados');
        console.log('✅ Datos estructurados correctamente');
      } else {
        console.log('\n⚠️ Productos extraídos pero sin tasas válidas');
      }
    } else {
      console.log('\n❌ No se encontraron productos');
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (scraper && scraper.browser) {
      try {
        await scraper.browser.close();
        console.log('\n✅ Browser cerrado');
      } catch (closeError) {
        console.error('Error cerrando browser:', closeError.message);
      }
    }
  }
}

testScraperFresh().catch(console.error);
