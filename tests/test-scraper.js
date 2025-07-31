// test-scraper.js
// Script para probar el sistema de scraping

require('dotenv').config();
const { scrapingSystem } = require('./src/scrapers');

async function testScraping() {
  console.log('🧪 Iniciando prueba del sistema de scraping...\n');

  try {
    // 1. Inicializar sistema
    console.log('1️⃣ Inicializando sistema...');
    const initResult = await scrapingSystem.initialize();
    
    if (!initResult.success) {
      throw new Error(`Error de inicialización: ${initResult.error}`);
    }
    
    console.log('✅ Sistema inicializado correctamente\n');

    // 2. Ejecutar scraping manual de KomparaCool
    console.log('2️⃣ Ejecutando scraping manual de KomparaCool...');
    const manualResult = await scrapingSystem.runManual(['komparacool']);
    
    console.log('📊 Resultados del scraping:');
    console.log(`   - Productos scrapeados: ${manualResult.scraped || 0}`);
    console.log(`   - Productos válidos: ${manualResult.valid || 0}`);
    console.log(`   - Productos insertados: ${manualResult.inserted || 0}`);
    
    if (manualResult.errors && manualResult.errors.length > 0) {
      console.log(`   - Errores: ${manualResult.errors.length}`);
      manualResult.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error.institution}: ${error.error}`);
      });
    }

    // 3. Mostrar estado del sistema
    console.log('\n3️⃣ Estado del sistema:');
    const status = scrapingSystem.getStatus();
    console.log(`   - Última ejecución: ${status.lastRun ? new Date(status.lastRun.timestamp).toLocaleString() : 'Nunca'}`);
    console.log(`   - Próxima ejecución: ${status.nextRun ? new Date(status.nextRun).toLocaleString() : 'No programada'}`);
    console.log(`   - Jobs activos: ${status.activeJobs.join(', ')}`);

    console.log('\n✅ Prueba completada exitosamente!');
    
    // Detener el sistema para que termine el script
    scrapingSystem.stop();

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    process.exit(1);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testScraping();
}

module.exports = { testScraping };
