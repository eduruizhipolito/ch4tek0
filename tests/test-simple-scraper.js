const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');

async function testSimpleScraper() {
  console.log('🧪 INICIANDO TEST SIMPLE DEL SCRAPER');
  
  let scraper;
  
  try {
    // Inicializar scraper
    console.log('1. Inicializando scraper...');
    scraper = new KomparaCoolScraper();
    console.log('✅ Scraper creado exitosamente');
    
    // Inicializar browser
    console.log('2. Inicializando browser...');
    await scraper.initialize();
    console.log('✅ Browser inicializado');
    
    // Probar navegación simple
    console.log('3. Navegando a página de ahorros...');
    await scraper.page.goto('https://comparabien.com.pe/ahorros', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    console.log('✅ Navegación exitosa');
    
    // Verificar que la página cargó
    const title = await scraper.page.title();
    console.log(`📄 Título de la página: ${title}`);
    
    // Probar generación de datos
    console.log('4. Generando datos del formulario...');
    const formData = scraper.generateRandomFormData();
    console.log('✅ Datos generados:', formData);
    
    console.log('🎉 Test simple completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en test simple:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (scraper) {
      try {
        await scraper.close();
        console.log('✅ Scraper cerrado');
      } catch (closeError) {
        console.error('Error cerrando scraper:', closeError.message);
      }
    }
  }
}

testSimpleScraper().catch(console.error);
