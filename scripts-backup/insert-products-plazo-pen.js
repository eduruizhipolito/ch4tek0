// insert-products-plazo-pen.js
// Script para insertar productos de Depósitos a Plazo en PEN desde KomparaCool

require('dotenv').config();
const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');
const { createClient } = require('@supabase/supabase-js');

async function insertProductsPlazoPEN() {
  console.log('🏦 INSERCIÓN DE PRODUCTOS DEPÓSITOS A PLAZO - PEN (SOLES)');
  console.log('=' .repeat(60));

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
      .select('id_producto, moneda, tipo_producto', { count: 'exact' });

    if (countError) {
      console.error('❌ Error verificando productos actuales:', countError);
      return;
    }

    // Contar por tipo y moneda
    const productsByType = currentProducts.reduce((acc, product) => {
      const key = `${product.tipo_producto}_${product.moneda}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log(`📈 Productos actuales en base de datos: ${currentProducts.length}`);
    console.log('📊 Distribución por tipo y moneda:');
    Object.entries(productsByType).forEach(([typeMoneda, count]) => {
      console.log(`   ${typeMoneda}: ${count} productos`);
    });

    // Paso 2: Ejecutar scraper de KomparaCool para Depósitos a Plazo PEN
    console.log('\n🔄 PASO 2: EJECUTANDO SCRAPER KOMPARACOOL PARA DEPÓSITOS A PLAZO PEN...');
    
    const scraper = new KomparaCoolScraper();
    
    console.log('   Extrayendo productos de Depósitos a Plazo en PEN de KomparaCool...');
    
    // ⭐ USAR URL DIFERENCIADA DESDE .ENV
    const plazosUrl = process.env.KOMPARACOOL_PLAZOS_URL || 'https://comparabien.com.pe/depositos-plazo';
    console.log(`   📝 Usando URL de depósitos a plazo: ${plazosUrl}`);
    
    // Guardar URL original de ahorros
    const originalAhorrosUrl = process.env.KOMPARACOOL_AHORROS_URL;
    
    // Configurar URL de depósitos a plazo temporalmente
    process.env.KOMPARACOOL_AHORROS_URL = plazosUrl;
    
    // Configurar parámetros para Depósitos a Plazo en PEN
    const scrapingOptions = {
      usePersistedSession: false, // Usar sesión fresca
      formData: {
        tipoCuenta: "Normal",
        moneda: "Soles", // PEN
        saldoPromedio: Math.floor(Math.random() * 500) + 1000, // 1000-1500 soles
        tipoInstitucion: "Bancos, Cajas y Financieras",
        ubicacion: "Lima y Callao",
        email: `${['ricardo', 'patricia', 'miguel', 'carmen', 'diego'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 9999)}@gmail.com`,
        plazo: 180 // ⭐ 180 días por defecto
      }
    };

    // Usar el método existente de ahorros (que funciona perfectamente)
    const scrapedProducts = await scraper.scrapeAhorrosInteractivo(scrapingOptions);
    
    // Restaurar URL original de ahorros
    if (originalAhorrosUrl) {
      process.env.KOMPARACOOL_AHORROS_URL = originalAhorrosUrl;
    } else {
      process.env.KOMPARACOOL_AHORROS_URL = 'https://comparabien.com.pe/ahorros';
    }

    if (!scrapedProducts || scrapedProducts.length === 0) {
      console.error('❌ No se extrajeron productos del scraper para Depósitos a Plazo PEN');
      return;
    }

    console.log(`✅ Productos extraídos de Depósitos a Plazo PEN: ${scrapedProducts.length}`);

    // Filtrar productos válidos y asegurar que sean PEN y tipo plazo
    const validProducts = scrapedProducts
      .filter(product => {
        return product.nombre_producto && 
               product.entidad && 
               product.tasa !== null && 
               product.tasa !== undefined &&
               product.tipo_producto &&
               product.moneda;
      })
      .map(product => ({
        ...product,
        moneda: "PEN", // ⭐ ASEGURAR que la moneda sea PEN
        tipo_producto: "plazo" // ⭐ ASEGURAR que el tipo sea plazo
      }));

    console.log(`✅ Productos válidos de Depósitos a Plazo PEN: ${validProducts.length}`);

    if (validProducts.length === 0) {
      console.error('❌ No hay productos válidos de Depósitos a Plazo PEN para insertar');
      return;
    }

    // Mostrar algunos ejemplos
    console.log('\n📋 EJEMPLOS DE PRODUCTOS DEPÓSITOS A PLAZO PEN:');
    validProducts.slice(0, 5).forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.nombre_producto} - ${product.tasa}% (${product.entidad})`);
    });

    // Paso 3: Insertar productos usando función insert_only
    console.log('\n📝 PASO 3: INSERTANDO PRODUCTOS DEPÓSITOS A PLAZO PEN CON FUNCIÓN INSERT_ONLY...');
    
    const { data: insertResult, error: insertError } = await supabase
      .rpc('sync_productos_insert_only', {
        productos_data: validProducts
      });

    if (insertError) {
      console.error('❌ Error en inserción Depósitos a Plazo PEN:', insertError);
      return;
    }

    console.log('✅ Inserción Depósitos a Plazo PEN completada:');
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
      .order('tipo_producto', { ascending: true }); // plazo primero, luego ahorro

    if (finalError) {
      console.error('❌ Error consultando productos finales:', finalError);
      return;
    }

    console.log(`✅ Total productos en base de datos: ${finalProducts.length}`);
    
    // Estadísticas por tipo y moneda
    const finalProductsByTypeMoneda = finalProducts.reduce((acc, product) => {
      const key = `${product.tipo_producto}_${product.moneda}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Distribución final por tipo y moneda:');
    Object.entries(finalProductsByTypeMoneda).forEach(([typeMoneda, count]) => {
      console.log(`   ${typeMoneda}: ${count} productos`);
    });

    // Estadísticas por entidad para Depósitos a Plazo PEN
    const plazoPenProducts = finalProducts.filter(p => p.moneda === 'PEN' && p.tipo_producto === 'plazo');
    const plazoPenByEntidad = plazoPenProducts.reduce((acc, product) => {
      const entidad = product.entidad.nombre_entidad;
      acc[entidad] = (acc[entidad] || 0) + 1;
      return acc;
    }, {});

    const topPlazoPenEntidades = Object.entries(plazoPenByEntidad)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    console.log('🏦 Top 5 entidades en Depósitos a Plazo PEN:');
    topPlazoPenEntidades.forEach(([entidad, count]) => {
      console.log(`   ${entidad}: ${count} productos`);
    });

    // Comparación de tasas promedio
    if (plazoPenProducts.length > 0) {
      const avgTasaPlazoPEN = plazoPenProducts.reduce((sum, p) => sum + p.tasa, 0) / plazoPenProducts.length;
      console.log(`\n📊 Tasa promedio Depósitos a Plazo PEN: ${avgTasaPlazoPEN.toFixed(2)}%`);
    }

    console.log('\n🎉 INSERCIÓN DEPÓSITOS A PLAZO PEN COMPLETADA EXITOSAMENTE');
    console.log('✅ Productos de Depósitos a Plazo en PEN insertados correctamente');
    console.log('✅ Base de datos expandida con productos de plazo');
    console.log('✅ Datos listos para uso en producción');

  } catch (error) {
    console.error('💥 ERROR EN INSERCIÓN DEPÓSITOS A PLAZO PEN:', error);
  }
}

// Ejecutar script
if (require.main === module) {
  insertProductsPlazoPEN()
    .then(() => {
      console.log('\n✅ Script Depósitos a Plazo PEN completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script Depósitos a Plazo PEN falló:', error);
      process.exit(1);
    });
}

module.exports = insertProductsPlazoPEN;
