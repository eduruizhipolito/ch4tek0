// test-simple.js
// Script de prueba simple para identificar el problema

require('dotenv').config();

async function testSimple() {
  console.log('🧪 Prueba simple del sistema...\n');

  try {
    // Paso 1: Verificar variables de entorno
    console.log('1️⃣ Verificando variables de entorno...');
    console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Configurada' : '❌ Faltante'}`);
    console.log(`SUPABASE_KEY: ${process.env.SUPABASE_KEY ? '✅ Configurada' : '❌ Faltante'}`);
    console.log('');

    // Paso 2: Probar SupabaseSync directamente
    console.log('2️⃣ Probando SupabaseSync directamente...');
    const SupabaseSync = require('./src/services/supabaseSync');
    
    console.log('   Creando instancia de SupabaseSync...');
    const supabaseSync = new SupabaseSync();
    console.log('   ✅ Instancia creada correctamente');

    console.log('   Probando conexión...');
    const connectionResult = await supabaseSync.testConnection();
    
    if (connectionResult.success) {
      console.log('   ✅ Conexión exitosa');
    } else {
      console.log('   ❌ Error en conexión:', connectionResult.error);
      console.log('   Detalles:', connectionResult.details);
    }

    // Paso 3: Probar ScraperManager
    console.log('\n3️⃣ Probando ScraperManager...');
    const ScraperManager = require('./src/scrapers/ScraperManager');
    
    console.log('   Creando instancia de ScraperManager...');
    const scraperManager = new ScraperManager();
    console.log('   ✅ ScraperManager creado correctamente');

    // Paso 4: Probar DataValidator
    console.log('\n4️⃣ Probando DataValidator...');
    const DataValidator = require('./src/services/dataValidator');
    
    console.log('   Creando instancia de DataValidator...');
    const dataValidator = new DataValidator();
    console.log('   ✅ DataValidator creado correctamente');

    // Paso 5: Probar SchedulerService
    console.log('\n5️⃣ Probando SchedulerService...');
    const SchedulerService = require('./src/services/schedulerService');
    
    console.log('   Creando instancia de SchedulerService...');
    const schedulerService = new SchedulerService();
    console.log('   ✅ SchedulerService creado correctamente');

    console.log('\n✅ Todas las pruebas básicas pasaron correctamente');
    console.log('🎯 El problema podría estar en la inicialización del sistema completo');

  } catch (error) {
    console.log('\n❌ Error en prueba simple:');
    console.log('   Mensaje:', error.message);
    console.log('   Nombre:', error.name);
    console.log('   Stack:', error.stack);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testSimple();
}

module.exports = { testSimple };
