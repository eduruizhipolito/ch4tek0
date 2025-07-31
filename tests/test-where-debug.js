// test-where-debug.js
// Test para usar la función de debug ultra-específica de WHERE

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testWhereDebug() {
  console.log('🔍 DIAGNÓSTICO ULTRA-ESPECÍFICO DE WHERE');
  console.log('=' .repeat(50));

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Paso 1: Crear producto de test manualmente
    console.log('\n📝 CREANDO PRODUCTO DE TEST...');
    
    // Crear entidad
    const { data: entidadData, error: entidadError } = await supabase
      .from('entidad')
      .insert([{ nombre_entidad: 'Where Debug Banco' }])
      .select()
      .single();

    if (entidadError) {
      console.error('❌ Error creando entidad:', entidadError);
      return;
    }

    console.log(`✅ Entidad creada: ID ${entidadData.id_entidad}, Nombre: "${entidadData.nombre_entidad}"`);

    // Crear producto
    const { data: productoData, error: productoError } = await supabase
      .from('productos')
      .insert([{
        nombre_producto: 'Where Debug Producto',
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

    // Paso 2: Probar función de debug WHERE
    console.log('\n🔬 PROBANDO FUNCIÓN DE DEBUG WHERE...');
    
    const testData = [{
      "nombre_producto": "Where Debug Producto",
      "entidad": "Where Debug Banco",
      "tasa": 4.0,
      "tipo_producto": "ahorro",
      "moneda": "PEN"
    }];

    const { data: debugResult, error: debugError } = await supabase
      .rpc('sync_productos_where_debug', {
        productos_data: testData
      });

    if (debugError) {
      console.error('❌ Error en función debug WHERE:', debugError);
      return;
    }

    console.log('✅ Resultado de debug WHERE:');
    console.log(`📊 Debug Info Completo:`);
    console.log(`   ${debugResult.debug_info}`);
    
    console.log('\n📋 Análisis por condición:');
    console.log(`🔍 Input Nombre: "${debugResult.input_nombre}"`);
    console.log(`🔍 Input Entidad: "${debugResult.input_entidad}"`);
    console.log(`🔍 Input Moneda: "${debugResult.input_moneda}"`);
    console.log(`🏦 Entidad ID encontrado: ${debugResult.entidad_id}`);
    
    console.log('\n🧪 Tests individuales:');
    console.log(`   📝 Por NOMBRE: ${debugResult.test_nombre} productos encontrados`);
    console.log(`   🏦 Por ENTIDAD: ${debugResult.test_entidad} productos encontrados`);
    console.log(`   💰 Por MONEDA: ${debugResult.test_moneda} productos encontrados`);
    console.log(`   🎯 CONSULTA COMPLETA: ${debugResult.test_completo} productos encontrados`);

    // Análisis detallado
    console.log('\n🎯 ANÁLISIS DETALLADO:');
    
    if (debugResult.test_nombre > 0) {
      console.log('✅ NOMBRE: La condición por nombre SÍ funciona');
    } else {
      console.log('❌ NOMBRE: La condición por nombre NO funciona');
    }
    
    if (debugResult.test_entidad > 0) {
      console.log('✅ ENTIDAD: La condición por entidad SÍ funciona');
    } else {
      console.log('❌ ENTIDAD: La condición por entidad NO funciona');
    }
    
    if (debugResult.test_moneda > 0) {
      console.log('✅ MONEDA: La condición por moneda SÍ funciona');
    } else {
      console.log('❌ MONEDA: La condición por moneda NO funciona');
    }
    
    if (debugResult.test_completo > 0) {
      console.log('✅ CONSULTA COMPLETA: Todas las condiciones juntas SÍ funcionan');
      console.log('   🤔 Esto es extraño - debería haber encontrado el producto');
    } else {
      console.log('❌ CONSULTA COMPLETA: Las condiciones juntas NO funcionan');
      console.log('   🔍 Una de las condiciones individuales debe estar fallando');
    }

    // Verificación esperada
    console.log('\n📊 VERIFICACIÓN ESPERADA:');
    console.log(`   Entidad esperada: ${entidadData.id_entidad}, Obtenida: ${debugResult.entidad_id}`);
    
    if (debugResult.entidad_id === entidadData.id_entidad) {
      console.log('✅ ENTIDAD ID CORRECTO');
    } else {
      console.log('❌ ENTIDAD ID INCORRECTO');
    }

    // Limpiar datos de test
    console.log('\n🧹 LIMPIANDO DATOS DE TEST...');
    
    await supabase
      .from('productos')
      .delete()
      .eq('nombre_producto', 'Where Debug Producto');

    await supabase
      .from('entidad')
      .delete()
      .eq('nombre_entidad', 'Where Debug Banco');

    console.log('✅ Datos de test limpiados');

  } catch (error) {
    console.error('💥 ERROR EN TEST WHERE DEBUG:', error);
  }
}

// Ejecutar test
if (require.main === module) {
  testWhereDebug()
    .then(() => {
      console.log('\n✅ Test de debug WHERE completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test de debug WHERE falló:', error);
      process.exit(1);
    });
}

module.exports = testWhereDebug;
