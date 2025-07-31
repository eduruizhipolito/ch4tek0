// insert-plazo-usd-simple.js
// Script simple para insertar productos de Depósitos a Plazo en USD (copia exacta del PEN que funcionó)

require('dotenv').config();
const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');
const { createClient } = require('@supabase/supabase-js');

async function insertPlazoUSDSimple() {
  console.log('🏦 INSERCIÓN SIMPLE DE DEPÓSITOS A PLAZO - USD');
  console.log('=' .repeat(50));

  let scraper;

  try {
    // Inicializar cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Verificar estado actual
    const { data: currentProducts } = await supabase
      .from('productos')
      .select('tipo_producto, moneda', { count: 'exact' });

    const stats = currentProducts.reduce((acc, p) => {
      const key = `${p.tipo_producto}_${p.moneda}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Estado inicial:');
    console.log(`   Total productos: ${currentProducts.length}`);
    Object.entries(stats).forEach(([type, count]) => {
      const emoji = type.includes('ahorro') ? '💰' : '⏰';
      console.log(`   ${emoji} ${type}: ${count} productos`);
    });

    // Inicializar scraper con browser explícito
    console.log('\n🔄 Inicializando scraper KomparaCool...');
    scraper = new KomparaCoolScraper();

    // PASO CRÍTICO: Inicializar browser explícitamente
    console.log('🌐 Inicializando browser explícitamente...');
    await scraper.initialize();
    console.log('✅ Browser inicializado correctamente');

    // Verificar que el browser está funcionando
    if (!scraper.page) {
      throw new Error('El browser no se inicializó correctamente - page es null');
    }

    console.log('✅ Página del browser disponible');

    // Configurar para depósitos a plazo
    const plazosUrl = process.env.KOMPARACOOL_PLAZOS_URL;
    if (!plazosUrl) {
      throw new Error('KOMPARACOOL_PLAZOS_URL no está configurada en el .env');
    }

    console.log(`🌐 URL de depósitos a plazo: ${plazosUrl}`);

    // Generar datos de formulario específicos para depósitos a plazo USD
    // CAMBIO CLAVE: Solo cambiar la moneda a "Dólares"
    const formData = {
      tipo_cuenta: 'Normal',
      moneda: 'Dólares', // ← ÚNICO CAMBIO: USD en lugar de Soles
      saldo_promedio: Math.floor(Math.random() * 500) + 1500, // 1.5k-2k USD
      tipo_institucion: 'Bancos, Cajas y Financieras',
      ubicacion: 'Lima y Callao',
      email: `${['carlos', 'maria', 'jose', 'ana', 'luis'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 9999)}@gmail.com`,
      plazo: 180 // Campo específico para depósitos a plazo
    };

    console.log('📝 Datos del formulario para depósitos a plazo USD:');
    console.log(`   💵 Moneda: ${formData.moneda} (USD)`);
    console.log(`   💰 Saldo: $ ${formData.saldo_promedio.toLocaleString()}`);
    console.log(`   ⏰ Plazo: ${formData.plazo} días`);
    console.log(`   📧 Email: ${formData.email}`);

    // Temporalmente cambiar la URL base del scraper
    const originalUrl = scraper.baseUrl;
    scraper.baseUrl = plazosUrl;

    console.log('\n🔄 Ejecutando scraping con browser inicializado...');

    // Ejecutar scraping con navegación completa - MISMA LÓGICA QUE FUNCIONÓ PARA PEN
    let products = [];
    
    try {
      // Usar navigateAndExtract con browser ya inicializado
      products = await scraper.navigateAndExtract(formData);
      
      console.log(`📦 Productos extraídos: ${products.length}`);
      
    } catch (error) {
      console.error('❌ Error en navegación con browser inicializado:', error.message);
      throw error; // No usar fallback, queremos ver el error real
    } finally {
      // Restaurar URL original
      scraper.baseUrl = originalUrl;
    }

    if (products.length === 0) {
      console.error('❌ No se extrajeron productos de depósitos a plazo USD');
      return;
    }

    // Normalizar productos para depósitos a plazo USD
    const normalizedProducts = products.map(product => ({
      nombre_producto: product.nombre_producto || product.name || '',
      entidad: product.entidad || product.banco || product.entity || '',
      tasa: parseFloat(product.tasa || product.rate || 0),
      tipo_producto: 'plazo', // Forzar tipo plazo
      moneda: 'USD' // Forzar moneda USD para esta ejecución
    })).filter(p => 
      p.nombre_producto && 
      p.entidad && 
      p.tasa > 0
    );

    console.log(`✅ Productos normalizados: ${normalizedProducts.length}`);

    // Mostrar ejemplos
    console.log('\n📋 EJEMPLOS DE PRODUCTOS DEPÓSITOS A PLAZO USD:');
    normalizedProducts.slice(0, 5).forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.nombre_producto} - ${product.tasa}% (${product.entidad})`);
    });

    // Insertar usando función insert_only
    console.log('\n📝 Insertando productos con función sync_productos_insert_only...');
    
    const { data: insertResult, error: insertError } = await supabase
      .rpc('sync_productos_insert_only', {
        productos_data: normalizedProducts
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

    // Verificar resultado final
    console.log('\n📊 VERIFICACIÓN FINAL...');
    
    const { data: finalProducts } = await supabase
      .from('productos')
      .select('tipo_producto, moneda', { count: 'exact' });

    const finalStats = finalProducts.reduce((acc, p) => {
      const key = `${p.tipo_producto}_${p.moneda}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log(`✅ Total productos final: ${finalProducts.length}`);
    console.log('📈 Distribución final:');
    Object.entries(finalStats).forEach(([type, count]) => {
      const emoji = type.includes('ahorro') ? '💰' : '⏰';
      console.log(`   ${emoji} ${type}: ${count} productos`);
    });

    // Verificar específicamente los depósitos a plazo USD insertados
    const { data: insertedPlazosUSD } = await supabase
      .from('productos')
      .select('nombre_producto, tasa, entidad!inner(nombre_entidad)')
      .eq('tipo_producto', 'plazo')
      .eq('moneda', 'USD')
      .limit(3);

    if (insertedPlazosUSD && insertedPlazosUSD.length > 0) {
      console.log('\n🎉 DEPÓSITOS A PLAZO USD INSERTADOS EXITOSAMENTE:');
      insertedPlazosUSD.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.nombre_producto} - ${p.tasa}% (${p.entidad.nombre_entidad})`);
      });
      
      console.log('\n✅ INSERCIÓN DE DEPÓSITOS A PLAZO USD COMPLETADA EXITOSAMENTE');
      console.log('🎯 ¡TODOS LOS PRODUCTOS DE KOMPARACOOL POBLADOS!');
      console.log('   💰 Ahorros PEN ✅');
      console.log('   💰 Ahorros USD ✅');
      console.log('   ⏰ Depósitos a Plazo PEN ✅');
      console.log('   ⏰ Depósitos a Plazo USD ✅');
    } else {
      console.log('\n❌ No se encontraron depósitos a plazo USD insertados');
    }

  } catch (error) {
    console.error('💥 ERROR EN INSERCIÓN SIMPLE USD:', error);
    console.error('Stack:', error.stack);
  } finally {
    // Limpiar recursos
    if (scraper) {
      try {
        await scraper.cleanup();
        console.log('🧹 Cleanup del scraper completado');
      } catch (cleanupError) {
        console.error('⚠️  Error en cleanup:', cleanupError.message);
      }
    }
  }
}

// Ejecutar script
if (require.main === module) {
  insertPlazoUSDSimple()
    .then(() => {
      console.log('\n✅ Script simple USD completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script simple USD falló:', error);
      process.exit(1);
    });
}

module.exports = insertPlazoUSDSimple;
