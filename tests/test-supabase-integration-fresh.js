// test-supabase-integration-fresh.js
// Script para probar la integración completa sin sesión persistente

require('dotenv').config();
const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');
const SupabaseSync = require('./src/services/supabaseSync');

async function testFullIntegrationFresh() {
  console.log('🚀 INICIANDO INTEGRACIÓN COMPLETA: SCRAPER → SUPABASE (FRESH)');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Paso 1: Verificar conexión a Supabase
    console.log('\n📡 PASO 1: Verificando conexión a Supabase...');
    const supabaseSync = new SupabaseSync();
    const connectionTest = await supabaseSync.testConnection();
    
    if (!connectionTest.success) {
      console.error('❌ Error de conexión a Supabase:', connectionTest.error);
      return;
    }
    console.log('✅ Conexión a Supabase exitosa');
    
    // Paso 2: Ejecutar scraper SIN sesión persistente
    console.log('\n🔍 PASO 2: Ejecutando scraper de KomparaCool (navegación fresca)...');
    const scraper = new KomparaCoolScraper();
    
    // Forzar navegación fresca
    const products = await scraper.scrapeAhorrosInteractivo({
      usePersistedSession: false  // ✅ Forzar navegación fresca
    });
    
    if (!products || products.length === 0) {
      console.error('❌ No se extrajeron productos del scraper');
      return;
    }
    
    console.log(`✅ Scraper completado: ${products.length} productos extraídos`);
    
    // Mostrar muestra de productos
    console.log('\n📋 MUESTRA DE PRODUCTOS EXTRAÍDOS:');
    products.slice(0, 5).forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.nombre_producto}`);
      console.log(`     🏦 Entidad: ${product.entidad}`);
      console.log(`     💰 Tasa: ${product.tasa}%`);
      console.log(`     💱 Moneda: ${product.moneda}`);
      console.log('     ' + '-'.repeat(50));
    });
    
    // Paso 3: Filtrar productos válidos para Supabase
    console.log('\n🔧 PASO 3: Preparando productos para Supabase...');
    const validProducts = products.filter(product => {
      return product.nombre_producto && 
             product.entidad && 
             product.tasa !== null && 
             product.nombre_producto.length > 3;
    });
    
    console.log(`✅ Productos válidos para inserción: ${validProducts.length}/${products.length}`);
    
    if (validProducts.length === 0) {
      console.error('❌ No hay productos válidos para insertar');
      return;
    }
    
    // Paso 4: Sincronizar con Supabase usando función almacenada
    console.log('\n💾 PASO 4: Sincronizando con Supabase usando función almacenada...');
    const syncResult = await supabaseSync.syncProducts(validProducts);
    
    if (!syncResult.success) {
      console.error('❌ Error en sincronización:', syncResult.error);
      return;
    }
    
    console.log('✅ Sincronización exitosa!');
    console.log(`   📊 Productos procesados: ${syncResult.procesados}`);
    console.log(`   ➕ Productos insertados: ${syncResult.insertedCount}`);
    console.log(`   🔄 Productos actualizados: ${syncResult.updatedCount}`);
    console.log(`   ⚠️ Errores: ${syncResult.errorCount || 0}`);
    
    if (syncResult.errors && syncResult.errors.length > 0) {
      console.log(`   📝 Detalles de errores:`);
      syncResult.errors.slice(0, 3).forEach(error => {
        console.log(`      - ${error.producto}: ${error.error}`);
      });
    }
    
    // Paso 5: Verificar estadísticas finales
    console.log('\n📈 PASO 5: Verificando estadísticas finales...');
    const stats = await supabaseSync.getProductStats();
    
    if (stats) {
      console.log(`✅ Total productos en BD: ${stats.totalProducts}`);
      console.log('✅ Productos por entidad:');
      Object.entries(stats.byEntidad).slice(0, 8).forEach(([entidad, count]) => {
        console.log(`   - ${entidad}: ${count} productos`);
      });
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 INTEGRACIÓN COMPLETA EXITOSA!');
    console.log('=' .repeat(60));
    console.log(`⏱️ Tiempo total: ${duration}s`);
    console.log(`📦 Productos procesados: ${products.length}`);
    console.log(`💾 Productos guardados: ${syncResult.insertedCount + syncResult.updatedCount}`);
    console.log(`🎯 Tasa de éxito: ${(((syncResult.insertedCount + syncResult.updatedCount) / products.length) * 100).toFixed(1)}%`);
    console.log(`🏦 Función Supabase: sync_productos_scraping ✅`);
    
  } catch (error) {
    console.error('💥 ERROR EN INTEGRACIÓN:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Ejecutar integración
if (require.main === module) {
  testFullIntegrationFresh()
    .then(() => {
      console.log('\n✅ Script completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script falló:', error);
      process.exit(1);
    });
}

module.exports = testFullIntegrationFresh;
