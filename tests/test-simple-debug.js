// test-simple-debug.js
// Test para usar la función de debug simplificada y diagnosticar el problema WHERE

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSimpleDebug() {
  console.log('🔍 PROBANDO FUNCIÓN DE DEBUG SIMPLIFICADA');
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
      .insert([{ nombre_entidad: 'Simple Debug Banco' }])
      .select()
      .single();

    if (entidadError) {
      console.error('❌ Error creando entidad:', entidadError);
      return;
    }

    console.log(`✅ Entidad creada: ID ${entidadData.id_entidad}`);

    // Crear producto
    const { data: productoData, error: productoError } = await supabase
      .from('productos')
      .insert([{
        nombre_producto: 'Simple Debug Producto',
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

    // Paso 2: Probar función de debug con producto existente
    console.log('\n🔬 PROBANDO FUNCIÓN DE DEBUG...');
    
    const testData = [{
      "nombre_producto": "Simple Debug Producto",
      "entidad": "Simple Debug Banco",
      "tasa": 4.0, // Cambio de tasa
      "tipo_producto": "ahorro",
      "moneda": "PEN"
    }];

    const { data: debugResult, error: debugError } = await supabase
      .rpc('sync_productos_simple_debug', {
        productos_data: testData
      });

    if (debugError) {
      console.error('❌ Error en función debug:', debugError);
      return;
    }

    console.log('✅ Resultado de debug:');
    console.log(`📊 Debug Info: ${debugResult.debug_info}`);
    console.log(`🔍 Producto encontrado: ${debugResult.producto_encontrado}`);
    console.log(`🏦 Entidad ID: ${debugResult.entidad_id}`);
    console.log(`📝 Producto existente ID: ${debugResult.producto_existente_id}`);

    // Análisis de resultados
    console.log('\n🎯 ANÁLISIS:');
    if (debugResult.producto_encontrado) {
      console.log('✅ CORRECTO: La función SQL SÍ encontró el producto existente');
      console.log('   Esto significa que el problema está en otra parte de la función principal');
    } else {
      console.log('❌ PROBLEMA: La función SQL NO encontró el producto existente');
      console.log('   Esto confirma que el problema está en la consulta WHERE');
    }

    // Verificar si la entidad_id coincide
    if (debugResult.entidad_id === entidadData.id_entidad) {
      console.log('✅ ENTIDAD ID CORRECTO: La función encontró la entidad correcta');
    } else {
      console.log('❌ ENTIDAD ID INCORRECTO: La función no encontró la entidad');
      console.log(`   Esperado: ${entidadData.id_entidad}, Obtenido: ${debugResult.entidad_id}`);
    }

    // Limpiar datos de test
    console.log('\n🧹 LIMPIANDO DATOS DE TEST...');
    
    await supabase
      .from('productos')
      .delete()
      .eq('nombre_producto', 'Simple Debug Producto');

    await supabase
      .from('entidad')
      .delete()
      .eq('nombre_entidad', 'Simple Debug Banco');

    console.log('✅ Datos de test limpiados');

  } catch (error) {
    console.error('💥 ERROR EN TEST:', error);
  }
}

// Ejecutar test
if (require.main === module) {
  testSimpleDebug()
    .then(() => {
      console.log('\n✅ Test de debug simple completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test de debug simple falló:', error);
      process.exit(1);
    });
}

module.exports = testSimpleDebug;
