// test-where-clause-debug.js
// Diagnóstico específico para entender por qué la consulta WHERE no funciona

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testWhereClauseDebug() {
  console.log('🔍 DIAGNÓSTICO DE CONSULTA WHERE');
  console.log('=' .repeat(50));

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Paso 1: Insertar un producto de test manualmente
    console.log('\n📝 PASO 1: Insertando producto de test manualmente...');
    
    // Primero crear la entidad
    const { data: entidadData, error: entidadError } = await supabase
      .from('entidad')
      .insert([{ nombre_entidad: 'Debug Test Banco' }])
      .select()
      .single();

    if (entidadError) {
      console.error('❌ Error creando entidad:', entidadError);
      return;
    }

    console.log(`✅ Entidad creada: ID ${entidadData.id_entidad}, Nombre: "${entidadData.nombre_entidad}"`);

    // Insertar producto
    const { data: productoData, error: productoError } = await supabase
      .from('productos')
      .insert([{
        nombre_producto: 'Debug Test Producto',
        tasa: 3.5,
        id_entidad: entidadData.id_entidad,
        tipo_producto: 'ahorro',
        moneda: 'PEN'
      }])
      .select()
      .single();

    if (productoError) {
      console.error('❌ Error creando producto:', productoError);
      return;
    }

    console.log(`✅ Producto creado: ID ${productoData.id_producto}`);
    console.log(`   Nombre: "${productoData.nombre_producto}"`);
    console.log(`   Entidad ID: ${productoData.id_entidad}`);
    console.log(`   Moneda: "${productoData.moneda}"`);
    console.log(`   Tasa: ${productoData.tasa}`);

    // Paso 2: Probar diferentes consultas WHERE para entender el problema
    console.log('\n🔬 PASO 2: Probando consultas WHERE...');

    // Test 2a: Consulta básica por nombre
    console.log('\n🔍 Test 2a: Consulta por nombre solamente');
    const { data: test2a, error: error2a } = await supabase
      .from('productos')
      .select('*')
      .eq('nombre_producto', 'Debug Test Producto');

    if (error2a) {
      console.error('❌ Error en test 2a:', error2a);
    } else {
      console.log(`✅ Encontrados ${test2a.length} productos por nombre`);
    }

    // Test 2b: Consulta por nombre + entidad
    console.log('\n🔍 Test 2b: Consulta por nombre + entidad');
    const { data: test2b, error: error2b } = await supabase
      .from('productos')
      .select('*')
      .eq('nombre_producto', 'Debug Test Producto')
      .eq('id_entidad', entidadData.id_entidad);

    if (error2b) {
      console.error('❌ Error en test 2b:', error2b);
    } else {
      console.log(`✅ Encontrados ${test2b.length} productos por nombre + entidad`);
    }

    // Test 2c: Consulta completa (nombre + entidad + moneda)
    console.log('\n🔍 Test 2c: Consulta completa (nombre + entidad + moneda)');
    const { data: test2c, error: error2c } = await supabase
      .from('productos')
      .select('*')
      .eq('nombre_producto', 'Debug Test Producto')
      .eq('id_entidad', entidadData.id_entidad)
      .eq('moneda', 'PEN');

    if (error2c) {
      console.error('❌ Error en test 2c:', error2c);
    } else {
      console.log(`✅ Encontrados ${test2c.length} productos por consulta completa`);
      if (test2c.length > 0) {
        console.log('   Producto encontrado:', test2c[0]);
      }
    }

    // Test 2d: Consulta con TRIM (como en la función SQL)
    console.log('\n🔍 Test 2d: Simulando lógica de la función SQL');
    const { data: test2d, error: error2d } = await supabase
      .rpc('test_where_logic', {
        p_nombre: 'Debug Test Producto',
        p_entidad_id: entidadData.id_entidad,
        p_moneda: 'PEN'
      });

    if (error2d) {
      console.log('⚠️ Función test_where_logic no existe (normal)');
    }

    // Paso 3: Probar la función sync con el producto existente
    console.log('\n🔬 PASO 3: Probando función sync con producto existente...');
    
    const testProductSync = [{
      "nombre_producto": "Debug Test Producto",
      "entidad": "Debug Test Banco",
      "tasa": 4.0, // Cambio de tasa: 3.5 → 4.0
      "tipo_producto": "ahorro",
      "moneda": "PEN"
    }];

    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_productos_scraping', {
        productos_data: testProductSync
      });

    if (syncError) {
      console.error('❌ Error en sync:', syncError);
    } else {
      console.log('✅ Resultado sync:');
      console.log(`   Procesados: ${syncResult.procesados}`);
      console.log(`   Insertados: ${syncResult.insertados}`);
      console.log(`   Actualizados: ${syncResult.actualizados}`);
      console.log(`   Errores: ${syncResult.errores}`);
      
      if (syncResult.insertados > 0) {
        console.log('❌ PROBLEMA: Se insertó en lugar de actualizar');
      } else if (syncResult.actualizados > 0) {
        console.log('✅ CORRECTO: Se actualizó el producto existente');
      }
    }

    // Verificar estado final
    console.log('\n📊 ESTADO FINAL:');
    const { data: finalProducts, error: finalError } = await supabase
      .from('productos')
      .select('*')
      .eq('nombre_producto', 'Debug Test Producto');

    if (finalError) {
      console.error('❌ Error consultando estado final:', finalError);
    } else {
      console.log(`Total productos con nombre "Debug Test Producto": ${finalProducts.length}`);
      finalProducts.forEach((p, i) => {
        console.log(`  ${i + 1}. ID: ${p.id_producto}, Tasa: ${p.tasa}, Moneda: ${p.moneda}`);
      });
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
    console.error('💥 ERROR EN DIAGNÓSTICO:', error);
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  testWhereClauseDebug()
    .then(() => {
      console.log('\n✅ Diagnóstico WHERE completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Diagnóstico WHERE falló:', error);
      process.exit(1);
    });
}

module.exports = testWhereClauseDebug;
