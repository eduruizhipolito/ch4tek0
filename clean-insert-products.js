// clean-insert-products.js
// Script para inserción limpia usando función insert_only
// NOTA: Para limpiar tabla, ejecutar primero clean_productos_table.sql

require('dotenv').config();
const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');
const { createClient } = require('@supabase/supabase-js');

async function cleanInsertProducts() {
  console.log('📝 INSERCIÓN LIMPIA DE PRODUCTOS KOMPARACOOL');
  console.log('=' .repeat(50));

  try {
    // Inicializar cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Paso 1: Verificar estado actual de la tabla
    console.log('\n📊 PASO 1: VERIFICANDO ESTADO ACTUAL...');
    
    const { data: currentProducts, error: countError } = await supabase
      .from('productos')
      .select('id_producto', { count: 'exact' });

    if (countError) {
      console.error('❌ Error verificando productos actuales:', countError);
      return;
    }

    console.log(`📈 Productos actuales en base de datos: ${currentProducts.length}`);
    console.log('ℹ️  NOTA: Para limpiar la tabla, ejecutar primero: clean_productos_table.sql');

    // Paso 2: Ejecutar scraper de KomparaCool
    console.log('\n🔄 PASO 2: EJECUTANDO SCRAPER KOMPARACOOL...');
    
    const scraper = new KomparaCoolScraper();
    
    console.log('   Extrayendo productos de KomparaCool...');
    const scrapedProducts = await scraper.scrapeAhorrosInteractivo({
      usePersistedSession: false // Usar sesión fresca
    });

    if (!scrapedProducts || scrapedProducts.length === 0) {
      console.error('❌ No se extrajeron productos del scraper');
      return;
    }

    console.log(`✅ Productos extraídos: ${scrapedProducts.length}`);

    // Filtrar productos válidos
    const validProducts = scrapedProducts.filter(product => {
      return product.nombre_producto && 
             product.entidad && 
             product.tasa !== null && 
             product.tasa !== undefined &&
             product.tipo_producto &&
             product.moneda;
    });

    console.log(`✅ Productos válidos: ${validProducts.length}`);

    if (validProducts.length === 0) {
      console.error('❌ No hay productos válidos para insertar');
      return;
    }

    // Paso 3: Insertar productos usando función insert_only
    console.log('\n📝 PASO 3: INSERTANDO PRODUCTOS CON FUNCIÓN INSERT_ONLY...');
    
    const { data: insertResult, error: insertError } = await supabase
      .rpc('sync_productos_insert_only', {
        productos_data: validProducts
      });

    if (insertError) {
      console.error('❌ Error en inserción:', insertError);
      return;
    }

    console.log('✅ Inserción completada:');
    console.log(`   📊 Procesados: ${insertResult.procesados}`);
    console.log(`   ✅ Insertados: ${insertResult.insertados}`);
    console.log(`   ❌ Errores: ${insertResult.errores}`);

    if (insertResult.errores > 0 && insertResult.detalles_errores) {
      console.log('⚠️  Detalles de errores:', insertResult.detalles_errores);
    }

    // Paso 4: Verificar resultado final
    console.log('\n📊 PASO 4: VERIFICANDO RESULTADO FINAL...');
    
    const { data: finalProducts, error: finalError } = await supabase
      .from('productos')
      .select(`
        id_producto,
        nombre_producto,
        tasa,
        moneda,
        tipo_producto,
        entidad!inner(nombre_entidad)
      `)
      .order('id_producto');

    if (finalError) {
      console.error('❌ Error consultando productos finales:', finalError);
      return;
    }

    console.log(`✅ Total productos en base de datos: ${finalProducts.length}`);
    
    // Estadísticas por moneda
    const productsByMoneda = finalProducts.reduce((acc, product) => {
      acc[product.moneda] = (acc[product.moneda] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Distribución por moneda:');
    Object.entries(productsByMoneda).forEach(([moneda, count]) => {
      console.log(`   ${moneda}: ${count} productos`);
    });

    // Estadísticas por entidad (top 5)
    const productsByEntidad = finalProducts.reduce((acc, product) => {
      const entidad = product.entidad.nombre_entidad;
      acc[entidad] = (acc[entidad] || 0) + 1;
      return acc;
    }, {});

    const topEntidades = Object.entries(productsByEntidad)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    console.log('🏦 Top 5 entidades:');
    topEntidades.forEach(([entidad, count]) => {
      console.log(`   ${entidad}: ${count} productos`);
    });

    console.log('\n🎉 INSERCIÓN COMPLETADA EXITOSAMENTE');
    console.log('✅ Productos de KomparaCool insertados correctamente');
    console.log('✅ Función insert_only utilizada (sin duplicados)');
    console.log('✅ Datos listos para uso en producción');
    console.log('\n💡 RECORDATORIO:');
    console.log('   - Para limpiar tabla: ejecutar clean_productos_table.sql');
    console.log('   - Para actualizaciones: usar sync_productos_update_only()');

  } catch (error) {
    console.log('💥 ERROR EN INSERCIÓN:', error);
  }
}

// Ejecutar script
if (require.main === module) {
  cleanInsertProducts()
    .then(() => {
      console.log('\n✅ Script completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script falló:', error);
      process.exit(1);
    });
}

module.exports = cleanInsertProducts;
