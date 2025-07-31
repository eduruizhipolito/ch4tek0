// test-debug-function.js
// Test para usar la función de debug y diagnosticar el problema de validación

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testDebugFunction() {
  console.log('🔍 PROBANDO FUNCIÓN DE DEBUG');
  console.log('=' .repeat(50));

  try {
    // Crear cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Test 1: Insertar producto inicial en PEN
    console.log('\n🔬 TEST 1: Insertar producto inicial en PEN');
    const testProduct1 = [
      {
        "nombre_producto": "Debug Test Producto",
        "entidad": "Debug Test Banco",
        "tasa": 3.5,
        "tipo_producto": "ahorro",
        "moneda": "PEN"
      }
    ];

    const { data: result1, error: error1 } = await supabase
      .rpc('sync_productos_scraping_debug', {
        productos_data: testProduct1
      });

    if (error1) {
      console.error('❌ Error en Test 1:', error1);
      return;
    }

    console.log('✅ Test 1 completado:');
    console.log(`   Procesados: ${result1.procesados}`);
    console.log(`   Insertados: ${result1.insertados}`);
    console.log(`   Actualizados: ${result1.actualizados}`);

    // Esperar un momento para que se procese
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Actualizar tasa del mismo producto (debe actualizar, no insertar)
    console.log('\n🔬 TEST 2: Actualizar tasa del mismo producto');
    const testProduct2 = [
      {
        "nombre_producto": "Debug Test Producto",
        "entidad": "Debug Test Banco",
        "tasa": 4.0, // Cambio de tasa: 3.5 → 4.0
        "tipo_producto": "ahorro",
        "moneda": "PEN"
      }
    ];

    const { data: result2, error: error2 } = await supabase
      .rpc('sync_productos_scraping_debug', {
        productos_data: testProduct2
      });

    if (error2) {
      console.error('❌ Error en Test 2:', error2);
      return;
    }

    console.log('✅ Test 2 completado:');
    console.log(`   Procesados: ${result2.procesados}`);
    console.log(`   Insertados: ${result2.insertados}`);
    console.log(`   Actualizados: ${result2.actualizados}`);

    // Verificar estado final
    console.log('\n📊 VERIFICANDO ESTADO FINAL...');
    
    const { data: finalProducts, error: finalError } = await supabase
      .from('productos')
      .select(`
        id_producto,
        nombre_producto,
        tasa,
        moneda,
        entidad!inner(nombre_entidad)
      `)
      .eq('nombre_producto', 'Debug Test Producto');

    if (finalError) {
      console.error('❌ Error consultando productos finales:', finalError);
      return;
    }

    console.log(`Productos encontrados: ${finalProducts.length}`);
    finalProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ID: ${product.id_producto}, Tasa: ${product.tasa}%, Moneda: ${product.moneda}`);
    });

    // Análisis de resultados
    console.log('\n🎯 ANÁLISIS DE RESULTADOS:');
    if (result1.insertados === 1 && result1.actualizados === 0) {
      console.log('✅ Test 1 correcto: 1 producto insertado');
    } else {
      console.log('❌ Test 1 incorrecto');
    }

    if (result2.insertados === 0 && result2.actualizados === 1) {
      console.log('✅ Test 2 correcto: 1 producto actualizado');
    } else {
      console.log('❌ Test 2 incorrecto: Debería actualizar, no insertar');
    }

    if (finalProducts.length === 1) {
      console.log('✅ Estado final correcto: 1 producto total');
      console.log(`   Tasa final: ${finalProducts[0].tasa}% (debería ser 4.0%)`);
    } else {
      console.log(`❌ Estado final incorrecto: ${finalProducts.length} productos (debería ser 1)`);
    }

    // Limpiar datos de test
    console.log('\n🧹 LIMPIANDO DATOS DE TEST...');
    
    await supabase
      .from('productos')
      .delete()
      .eq('nombre_producto', 'Debug Test Producto');

    await supabase
      .from('entidad')
      .delete()
      .eq('nombre_entidad', 'Debug Test Banco');

    console.log('✅ Datos de test limpiados');

  } catch (error) {
    console.error('💥 ERROR EN TEST:', error);
  }
}

// Ejecutar test
if (require.main === module) {
  testDebugFunction()
    .then(() => {
      console.log('\n✅ Test de debug completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test de debug falló:', error);
      process.exit(1);
    });
}

module.exports = testDebugFunction;
