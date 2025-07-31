const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');

async function analyzeInvalidProducts() {
  console.log('🔍 ANALIZANDO PRODUCTOS CON TASAS NO VÁLIDAS');
  
  let scraper;
  
  try {
    // Inicializar scraper
    scraper = new KomparaCoolScraper();
    await scraper.initialize();
    console.log('✅ Scraper inicializado');
    
    // Ejecutar scraping
    const products = await scraper.scrapeAhorrosInteractivo();
    
    console.log(`\n📊 ANÁLISIS DE ${products.length} PRODUCTOS EXTRAÍDOS:`);
    
    // Separar productos válidos e inválidos
    const validProducts = products.filter(p => p.tasa !== null && p.tasa > 0);
    const invalidProducts = products.filter(p => p.tasa === null || p.tasa <= 0);
    
    console.log(`✅ Productos válidos: ${validProducts.length}`);
    console.log(`❌ Productos inválidos: ${invalidProducts.length}`);
    
    // Analizar productos inválidos
    console.log('\n❌ PRODUCTOS CON TASAS NO VÁLIDAS:');
    console.log('=' .repeat(80));
    
    invalidProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. "${product.nombre_producto}"`);
      console.log(`   💰 Tasa: ${product.tasa}%`);
      console.log(`   🏦 Banco: ${product.banco}`);
      console.log(`   📝 Longitud del nombre: ${product.nombre_producto.length} caracteres`);
      
      // Analizar patrones problemáticos
      const problemas = [];
      
      if (product.nombre_producto.includes('Tasa Interés')) {
        problemas.push('Contiene texto de header');
      }
      
      if (product.nombre_producto.includes('Mant:Num')) {
        problemas.push('Contiene texto de columnas');
      }
      
      if (product.nombre_producto.length < 10) {
        problemas.push('Nombre muy corto');
      }
      
      if (product.nombre_producto.includes('Tasa de Inter') && !product.nombre_producto.includes('Tasa de Interés')) {
        problemas.push('Texto cortado/incompleto');
      }
      
      if (product.nombre_producto === product.banco) {
        problemas.push('Nombre duplicado con banco');
      }
      
      if (problemas.length > 0) {
        console.log(`   ⚠️  Problemas detectados: ${problemas.join(', ')}`);
      }
    });
    
    // Analizar productos válidos para comparación
    console.log('\n✅ MUESTRA DE PRODUCTOS VÁLIDOS:');
    console.log('=' .repeat(80));
    
    validProducts.slice(0, 5).forEach((product, index) => {
      console.log(`\n${index + 1}. "${product.nombre_producto}"`);
      console.log(`   💰 Tasa: ${product.tasa}%`);
      console.log(`   🏦 Banco: ${product.banco}`);
    });
    
    // Sugerencias de mejora
    console.log('\n💡 SUGERENCIAS DE MEJORA:');
    console.log('=' .repeat(80));
    
    const headerElements = invalidProducts.filter(p => 
      p.nombre_producto.includes('Tasa Interés') || 
      p.nombre_producto.includes('Mant:Num')
    ).length;
    
    const shortNames = invalidProducts.filter(p => p.nombre_producto.length < 10).length;
    const incompleteText = invalidProducts.filter(p => 
      p.nombre_producto.includes('Tasa de Inter') && 
      !p.nombre_producto.includes('Tasa de Interés')
    ).length;
    
    console.log(`1. Filtrar elementos de header: ${headerElements} casos`);
    console.log(`2. Filtrar nombres muy cortos: ${shortNames} casos`);
    console.log(`3. Mejorar parsing de texto incompleto: ${incompleteText} casos`);
    
    console.log('\n🎯 FILTROS RECOMENDADOS:');
    console.log('- Excluir elementos que contengan "Tasa Interés Mant"');
    console.log('- Excluir nombres con menos de 15 caracteres');
    console.log('- Mejorar regex para capturar tasas completas');
    console.log('- Validar que el nombre del producto sea diferente al banco');
    
  } catch (error) {
    console.error('❌ Error en análisis:', error.message);
  } finally {
    if (scraper && scraper.browser) {
      await scraper.browser.close();
      console.log('\n✅ Browser cerrado');
    }
  }
}

analyzeInvalidProducts().catch(console.error);
