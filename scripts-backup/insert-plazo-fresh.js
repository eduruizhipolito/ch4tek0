// insert-plazo-fresh.js
// Script para insertar productos de Depósitos a Plazo con navegación fresca (sin sesión guardada)

require('dotenv').config();
const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');
const { createClient } = require('@supabase/supabase-js');

async function insertPlazoFresh() {
  console.log('🏦 INSERCIÓN FRESCA DE DEPÓSITOS A PLAZO - PEN');
  console.log('=' .repeat(50));

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
      console.log(`   ${type}: ${count} productos`);
    });

    // Inicializar scraper
    console.log('\n🔄 Inicializando scraper KomparaCool...');
    const scraper = new KomparaCoolScraper();

    // Limpiar cualquier sesión guardada
    console.log('🧹 Limpiando sesiones guardadas...');
    try {
      // Forzar limpieza de sesión
      if (scraper.clearSession) {
        await scraper.clearSession();
      }
      console.log('✅ Sesiones limpiadas');
    } catch (error) {
      console.log('ℹ️  No hay sesiones que limpiar');
    }

    // Configurar para depósitos a plazo
    const plazosUrl = process.env.KOMPARACOOL_PLAZOS_URL;
    if (!plazosUrl) {
      throw new Error('KOMPARACOOL_PLAZOS_URL no está configurada en el .env');
    }

    console.log(`🌐 URL de depósitos a plazo: ${plazosUrl}`);

    // Forzar navegación fresca usando el método de ahorros pero con URL de plazos
    console.log('🔄 Ejecutando scraping fresco para depósitos a plazo...');
    
    // Temporalmente cambiar la URL base del scraper
    const originalUrl = scraper.baseUrl;
    scraper.baseUrl = plazosUrl;
    
    // Generar datos de formulario específicos para depósitos a plazo
    const formData = {
      tipo_cuenta: 'Normal',
      moneda: 'Soles', 
      saldo_promedio: Math.floor(Math.random() * 20000) + 50000, // 50k-70k
      tipo_institucion: 'Bancos, Cajas y Financieras',
      ubicacion: 'Lima y Callao',
      email: `${['carlos', 'maria', 'jose', 'ana', 'luis'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 9999)}@gmail.com`,
      plazo: 180 // Campo específico para depósitos a plazo
    };

    console.log('📝 Datos del formulario para depósitos a plazo:');
    console.log(`   Moneda: ${formData.moneda}`);
    console.log(`   Saldo: S/ ${formData.saldo_promedio.toLocaleString()}`);
    console.log(`   Plazo: ${formData.plazo} días`);
    console.log(`   Email: ${formData.email}`);

    // Ejecutar scraping con navegación completa
    let products = [];
    
    try {
      // Usar navigateAndExtract directamente para forzar navegación fresca
      products = await scraper.navigateAndExtract(formData);
      
      console.log(`📦 Productos extraídos: ${products.length}`);
      
    } catch (error) {
      console.error('❌ Error en navegación fresca:', error.message);
      
      // Fallback: intentar con método estático
      console.log('🔄 Intentando método estático como fallback...');
      try {
        if (typeof scraper.scrapePlazos === 'function') {
          products = await scraper.scrapePlazos();
        } else {
          throw new Error('No hay método de fallback disponible');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback también falló:', fallbackError.message);
        throw error; // Re-lanzar el error original
      }
    } finally {
      // Restaurar URL original
      scraper.baseUrl = originalUrl;
    }

    if (products.length === 0) {
      console.error('❌ No se extrajeron productos de depósitos a plazo');
      return;
    }

    // Normalizar productos para depósitos a plazo
    const normalizedProducts = products.map(product => ({
      nombre_producto: product.nombre_producto || product.name || '',
      entidad: product.entidad || product.banco || product.entity || '',
      tasa: parseFloat(product.tasa || product.rate || 0),
      tipo_producto: 'plazo', // Forzar tipo plazo
      moneda: 'PEN' // Forzar moneda PEN para esta ejecución
    })).filter(p => 
      p.nombre_producto && 
      p.entidad && 
      p.tasa > 0
    );

    console.log(`✅ Productos normalizados: ${normalizedProducts.length}`);

    // Mostrar ejemplos
    console.log('\n📋 EJEMPLOS DE PRODUCTOS DEPÓSITOS A PLAZO PEN:');
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

    // Verificar específicamente los depósitos a plazo insertados
    const { data: insertedPlazos } = await supabase
      .from('productos')
      .select('nombre_producto, tasa, entidad!inner(nombre_entidad)')
      .eq('tipo_producto', 'plazo')
      .eq('moneda', 'PEN')
      .limit(3);

    if (insertedPlazos && insertedPlazos.length > 0) {
      console.log('\n🎉 DEPÓSITOS A PLAZO PEN INSERTADOS EXITOSAMENTE:');
      insertedPlazos.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.nombre_producto} - ${p.tasa}% (${p.entidad.nombre_entidad})`);
      });
      
      console.log('\n✅ INSERCIÓN DE DEPÓSITOS A PLAZO PEN COMPLETADA EXITOSAMENTE');
      console.log('🎯 Próximo paso: Poblar depósitos a plazo en USD');
    } else {
      console.log('\n❌ No se encontraron depósitos a plazo insertados');
    }

  } catch (error) {
    console.error('💥 ERROR EN INSERCIÓN FRESCA:', error);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar script
if (require.main === module) {
  insertPlazoFresh()
    .then(() => {
      console.log('\n✅ Script fresco completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script fresco falló:', error);
      process.exit(1);
    });
}

module.exports = insertPlazoFresh;
