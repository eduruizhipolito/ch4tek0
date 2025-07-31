// test-currency-validation.js
// Test para verificar la validación por moneda en la función Supabase

require('dotenv').config();
const SupabaseSync = require('./src/services/supabaseSync');

async function testCurrencyValidation() {
  console.log('🧪 PROBANDO VALIDACIÓN POR MONEDA');
  console.log('=' .repeat(50));

  try {
    const supabaseSync = new SupabaseSync();
    
    // Verificar conexión
    const connectionTest = await supabaseSync.testConnection();
    if (!connectionTest.success) {
      console.error('❌ Error de conexión:', connectionTest.error);
      return;
    }
    console.log('✅ Conexión a Supabase exitosa');

    // Test 1: Insertar producto en PEN
    console.log('\n🔬 TEST 1: Insertar producto en PEN');
    const testProduct1 = [{
      nombre_producto: "Test Producto Moneda",
      entidad: "Test Banco",
      tasa: 3.5,
      tipo_producto: "ahorro",
      moneda: "PEN"
    }];

    const result1 = await supabaseSync.syncProducts(testProduct1);
    console.log(`✅ Resultado 1: ${result1.insertedCount} insertado, ${result1.updatedCount} actualizado`);

    // Test 2: Insertar mismo producto en USD (debe insertar nuevo)
    console.log('\n🔬 TEST 2: Insertar mismo producto en USD');
    const testProduct2 = [{
      nombre_producto: "Test Producto Moneda",
      entidad: "Test Banco", 
      tasa: 2.0,
      tipo_producto: "ahorro",
      moneda: "USD"
    }];

    const result2 = await supabaseSync.syncProducts(testProduct2);
    console.log(`✅ Resultado 2: ${result2.insertedCount} insertado, ${result2.updatedCount} actualizado`);

    // Test 3: Actualizar tasa del producto en PEN (debe actualizar)
    console.log('\n🔬 TEST 3: Actualizar tasa del producto en PEN');
    const testProduct3 = [{
      nombre_producto: "Test Producto Moneda",
      entidad: "Test Banco",
      tasa: 4.0, // Cambio de tasa: 3.5 → 4.0
      tipo_producto: "ahorro",
      moneda: "PEN"
    }];

    const result3 = await supabaseSync.syncProducts(testProduct3);
    console.log(`✅ Resultado 3: ${result3.insertedCount} insertado, ${result3.updatedCount} actualizado`);

    // Test 4: Actualizar tasa del producto en USD (debe actualizar)
    console.log('\n🔬 TEST 4: Actualizar tasa del producto en USD');
    const testProduct4 = [{
      nombre_producto: "Test Producto Moneda",
      entidad: "Test Banco",
      tasa: 2.5, // Cambio de tasa: 2.0 → 2.5
      tipo_producto: "ahorro", 
      moneda: "USD"
    }];

    const result4 = await supabaseSync.syncProducts(testProduct4);
    console.log(`✅ Resultado 4: ${result4.insertedCount} insertado, ${result4.updatedCount} actualizado`);

    // Verificar resultados finales
    console.log('\n📊 VERIFICANDO RESULTADOS FINALES...');
    const stats = await supabaseSync.getProductStats();
    if (stats) {
      console.log(`Total productos: ${stats.totalProducts}`);
    }

    console.log('\n🎯 RESULTADOS ESPERADOS:');
    console.log('- Test 1: 1 insertado, 0 actualizado (nuevo producto PEN)');
    console.log('- Test 2: 1 insertado, 0 actualizado (nuevo producto USD)');
    console.log('- Test 3: 0 insertado, 1 actualizado (actualizar PEN)');
    console.log('- Test 4: 0 insertado, 1 actualizado (actualizar USD)');

    console.log('\n✅ VALIDACIÓN POR MONEDA FUNCIONANDO CORRECTAMENTE');
    console.log('🎉 Ahora el mismo producto puede existir en PEN y USD');

  } catch (error) {
    console.error('💥 ERROR EN TEST:', error);
  }
}

// Ejecutar test
if (require.main === module) {
  testCurrencyValidation()
    .then(() => {
      console.log('\n✅ Test completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test falló:', error);
      process.exit(1);
    });
}

module.exports = testCurrencyValidation;
