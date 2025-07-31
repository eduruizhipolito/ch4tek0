// insert-products-usd.js
// Script para insertar productos de ahorros en USD desde KomparaCool

require('dotenv').config();
const KomparaCoolScraper = require('./src/scrapers/institutions/KomparaCoolScraper');
const { createClient } = require('@supabase/supabase-js');

async function insertProductsUSD() {
  console.log('💵 INSERCIÓN DE PRODUCTOS EN USD (DÓLARES)');
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
      .select('id_producto, moneda', { count: 'exact' });

    if (countError) {
      console.error('❌ Error verificando productos actuales:', countError);
      return;
    }

    // Contar por moneda
    const productsByMoneda = currentProducts.reduce((acc, product) => {
      acc[product.moneda] = (acc[product.moneda] || 0) + 1;
      return acc;
    }, {});

    console.log(`📈 Productos actuales en base de datos: ${currentProducts.length}`);
    console.log('📊 Distribución por moneda:');
    Object.entries(productsByMoneda).forEach(([moneda, count]) => {
      console.log(`   ${moneda}: ${count} productos`);
    });

    // Paso 2: Ejecutar scraper de KomparaCool para USD
    console.log('\n🔄 PASO 2: EJECUTANDO SCRAPER KOMPARACOOL PARA USD...');
    
    const scraper = new KomparaCoolScraper();
    
    console.log('   Extrayendo productos en USD de KomparaCool...');
    
    // Configurar parámetros para USD
    const scrapingOptions = {
      usePersistedSession: false, // Usar sesión fresca
      formData: {
        tipoCuenta: "Normal",
        moneda: "Dólares", // ⭐ CAMBIO CLAVE: Dólares en lugar de Soles
        saldoPromedio: Math.floor(Math.random() * 500) + 500, // 500-1000 USD
        tipoInstitucion: "Bancos, Cajas y Financieras",
        ubicacion: "Lima y Callao",
        email: `${['maria', 'carlos', 'ana', 'luis', 'sofia'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 9999)}@gmail.com`
      }
    };

    const scrapedProducts = await scraper.scrapeAhorrosInteractivo(scrapingOptions);

    if (!scrapedProducts || scrapedProducts.length === 0) {
      console.error('❌ No se extrajeron productos del scraper para USD');
      return;
    }

    console.log(`✅ Productos extraídos en USD: ${scrapedProducts.length}`);

    // Filtrar productos válidos y asegurar que sean USD
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
        moneda: "USD" // ⭐ ASEGURAR que la moneda sea USD
      }));

    console.log(`✅ Productos válidos en USD: ${validProducts.length}`);

    if (validProducts.length === 0) {
      console.error('❌ No hay productos válidos en USD para insertar');
      return;
    }

    // Mostrar algunos ejemplos
    console.log('\n📋 EJEMPLOS DE PRODUCTOS USD:');
    validProducts.slice(0, 5).forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.nombre_producto} - ${product.tasa}% (${product.entidad})`);
    });

    // Paso 3: Insertar productos usando función insert_only
    console.log('\n📝 PASO 3: INSERTANDO PRODUCTOS USD CON FUNCIÓN INSERT_ONLY...');
    
    const { data: insertResult, error: insertError } = await supabase
      .rpc('sync_productos_insert_only', {
        productos_data: validProducts
      });

    if (insertError) {
      console.error('❌ Error en inserción USD:', insertError);
      return;
    }

    console.log('✅ Inserción USD completada:');
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
      .order('moneda', { ascending: false }); // USD primero, luego PEN

    if (finalError) {
      console.error('❌ Error consultando productos finales:', finalError);
      return;
    }

    console.log(`✅ Total productos en base de datos: ${finalProducts.length}`);
    
    // Estadísticas por moneda
    const finalProductsByMoneda = finalProducts.reduce((acc, product) => {
      acc[product.moneda] = (acc[product.moneda] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Distribución final por moneda:');
    Object.entries(finalProductsByMoneda).forEach(([moneda, count]) => {
      console.log(`   ${moneda}: ${count} productos`);
    });

    // Estadísticas por entidad para USD
    const usdProducts = finalProducts.filter(p => p.moneda === 'USD');
    const usdByEntidad = usdProducts.reduce((acc, product) => {
      const entidad = product.entidad.nombre_entidad;
      acc[entidad] = (acc[entidad] || 0) + 1;
      return acc;
    }, {});

    const topUsdEntidades = Object.entries(usdByEntidad)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    console.log('🏦 Top 5 entidades en USD:');
    topUsdEntidades.forEach(([entidad, count]) => {
      console.log(`   ${entidad}: ${count} productos`);
    });

    // Comparación de tasas USD vs PEN
    const avgTasaUSD = usdProducts.reduce((sum, p) => sum + p.tasa, 0) / usdProducts.length;
    const penProducts = finalProducts.filter(p => p.moneda === 'PEN');
    const avgTasaPEN = penProducts.reduce((sum, p) => sum + p.tasa, 0) / penProducts.length;

    console.log('\n📊 COMPARACIÓN DE TASAS:');
    console.log(`   USD promedio: ${avgTasaUSD.toFixed(2)}%`);
    console.log(`   PEN promedio: ${avgTasaPEN.toFixed(2)}%`);

    console.log('\n🎉 INSERCIÓN USD COMPLETADA EXITOSAMENTE');
    console.log('✅ Productos en USD insertados correctamente');
    console.log('✅ Base de datos ahora tiene productos en PEN y USD');
    console.log('✅ Datos listos para uso en producción');

  } catch (error) {
    console.error('💥 ERROR EN INSERCIÓN USD:', error);
  }
}

// Ejecutar script
if (require.main === module) {
  insertProductsUSD()
    .then(() => {
      console.log('\n✅ Script USD completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script USD falló:', error);
      process.exit(1);
    });
}

module.exports = insertProductsUSD;
