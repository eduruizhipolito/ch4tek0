// test-v2-function.js
// Test para probar la nueva función sync_productos_scraping_v2

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testV2Function() {
  console.log('🧪 PROBANDO FUNCIÓN V2 CORREGIDA');
  console.log('=' .repeat(50));

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Test 1: Insertar producto en PEN
    console.log('\n🔬 TEST 1: Insertar producto en PEN');
    const testProduct1 = [{
      nombre_producto: "Test V2 Producto",
      entidad: "Test V2 Banco",
      tasa: 3.5,
      tipo_producto: "ahorro",
      moneda: "PEN"
    }];

    const { data: result1, error: error1 } = await supabase
      .rpc('sync_productos_scraping_v2', {
        productos_data: testProduct1
      });

    if (error1) {
      console.error('❌ Error en Test 1:', error1);
      return;
    }

    console.log(`✅ Resultado 1: ${result1.insertados} insertado, ${result1.actualizados} actualizado`);

    // Test 2: Insertar mismo producto en USD (debe insertar nuevo)
    console.log('\n🔬 TEST 2: Insertar mismo producto en USD');
    const testProduct2 = [{
      nombre_producto: "Test V2 Producto",
      entidad: "Test V2 Banco", 
      tasa: 2.0,
      tipo_producto: "ahorro",
      moneda: "USD"
    }];

    const { data: result2, error: error2 } = await supabase
      .rpc('sync_productos_scraping_v2', {
        productos_data: testProduct2
      });

    if (error2) {
      console.error('❌ Error en Test 2:', error2);
      return;
    }

    console.log(`✅ Resultado 2: ${result2.insertados} insertado, ${result2.actualizados} actualizado`);

    // Test 3: Actualizar tasa del producto en PEN (debe actualizar)
    console.log('\n🔬 TEST 3: Actualizar tasa del producto en PEN');
    const testProduct3 = [{
      nombre_producto: "Test V2 Producto",
      entidad: "Test V2 Banco",
      tasa: 4.0, // Cambio de tasa: 3.5 → 4.0
      tipo_producto: "ahorro",
      moneda: "PEN"
    }];

    const { data: result3, error: error3 } = await supabase
      .rpc('sync_productos_scraping_v2', {
        productos_data: testProduct3
      });

    if (error3) {
      console.error('❌ Error en Test 3:', error3);
      return;
    }

    console.log(`✅ Resultado 3: ${result3.insertados} insertado, ${result3.actualizados} actualizado`);

    // Test 4: Actualizar tasa del producto en USD (debe actualizar)
    console.log('\n🔬 TEST 4: Actualizar tasa del producto en USD');
    const testProduct4 = [{
      nombre_producto: "Test V2 Producto",
      entidad: "Test V2 Banco",
      tasa: 2.5, // Cambio de tasa: 2.0 → 2.5
      tipo_producto: "ahorro", 
      moneda: "USD"
    }];

    const { data: result4, error: error4 } = await supabase
      .rpc('sync_productos_scraping_v2', {
        productos_data: testProduct4
      });

    if (error4) {
      console.error('❌ Error en Test 4:', error4);
      return;
    }

    console.log(`✅ Resultado 4: ${result4.insertados} insertado, ${result4.actualizados} actualizado`);

    // Verificar resultados finales
    console.log('\n📊 VERIFICANDO RESULTADOS FINALES...');
    const { data: finalProducts, error: finalError } = await supabase
      .from('productos')
      .select(`
        id_producto,
        nombre_producto,
        tasa,
        moneda,
        entidad!inner(nombre_entidad)
      `)
      .eq('nombre_producto', 'Test V2 Producto');

    if (finalError) {
      console.error('❌ Error consultando productos finales:', finalError);
      return;
    }

    console.log(`Total productos V2: ${finalProducts.length}`);
    finalProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ID: ${product.id_producto}, Tasa: ${product.tasa}%, Moneda: ${product.moneda}`);
    });

    // Análisis de resultados
    console.log('\n🎯 ANÁLISIS DE RESULTADOS V2:');
    
    const expectedResults = [
      { test: 1, expected: { insertados: 1, actualizados: 0 }, actual: { insertados: result1.insertados, actualizados: result1.actualizados } },
      { test: 2, expected: { insertados: 1, actualizados: 0 }, actual: { insertados: result2.insertados, actualizados: result2.actualizados } },
      { test: 3, expected: { insertados: 0, actualizados: 1 }, actual: { insertados: result3.insertados, actualizados: result3.actualizados } },
      { test: 4, expected: { insertados: 0, actualizados: 1 }, actual: { insertados: result4.insertados, actualizados: result4.actualizados } }
    ];

    let allCorrect = true;
    expectedResults.forEach(({ test, expected, actual }) => {
      const correct = expected.insertados === actual.insertados && expected.actualizados === actual.actualizados;
      const status = correct ? '✅' : '❌';
      console.log(`${status} Test ${test}: Esperado ${expected.insertados}i/${expected.actualizados}a, Obtenido ${actual.insertados}i/${actual.actualizados}a`);
      if (!correct) allCorrect = false;
    });

    if (allCorrect && finalProducts.length === 2) {
      console.log('\n🎉 ¡FUNCIÓN V2 FUNCIONANDO PERFECTAMENTE!');
      console.log('✅ Validación por moneda corregida');
      console.log('✅ No se crean duplicados');
      console.log('✅ Actualizaciones funcionan correctamente');
    } else {
      console.log('\n❌ Función V2 aún tiene problemas');
      console.log(`   Productos esperados: 2, Encontrados: ${finalProducts.length}`);
    }

    // Limpiar datos de test
    console.log('\n🧹 LIMPIANDO DATOS DE TEST V2...');
    
    await supabase
      .from('productos')
      .delete()
      .eq('nombre_producto', 'Test V2 Producto');

    await supabase
      .from('entidad')
      .delete()
      .eq('nombre_entidad', 'Test V2 Banco');

    console.log('✅ Datos de test V2 limpiados');

  } catch (error) {
    console.error('💥 ERROR EN TEST V2:', error);
  }
}

// Ejecutar test
if (require.main === module) {
  testV2Function()
    .then(() => {
      console.log('\n✅ Test V2 completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test V2 falló:', error);
      process.exit(1);
    });
}

module.exports = testV2Function;
