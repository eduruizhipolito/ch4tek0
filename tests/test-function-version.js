// test-function-version.js
// Test para verificar qué versión de la función está en Supabase

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testFunctionVersion() {
  console.log('🔍 VERIFICANDO VERSIÓN DE LA FUNCIÓN EN SUPABASE');
  console.log('=' .repeat(50));

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Crear datos de test específicos para verificar la función
    console.log('\n📝 CREANDO DATOS DE TEST ESPECÍFICOS...');
    
    // Crear entidad
    const { data: entidadData, error: entidadError } = await supabase
      .from('entidad')
      .insert([{ nombre_entidad: 'Version Test Banco' }])
      .select()
      .single();

    if (entidadError) {
      console.error('❌ Error creando entidad:', entidadError);
      return;
    }

    console.log(`✅ Entidad creada: ID ${entidadData.id_entidad}`);

    // Crear producto inicial
    const { data: productoData, error: productoError } = await supabase
      .from('productos')
      .insert([{
        nombre_producto: 'Version Test Producto',
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

    console.log(`✅ Producto inicial creado: ID ${productoData.id_producto}, Tasa: ${productoData.tasa}`);

    // Probar actualización con la función sync
    console.log('\n🔬 PROBANDO ACTUALIZACIÓN CON FUNCIÓN SYNC...');
    
    const testData = [{
      "nombre_producto": "Version Test Producto",
      "entidad": "Version Test Banco",
      "tasa": 4.5, // Cambio de tasa: 3.5 → 4.5
      "tipo_producto": "ahorro",
      "moneda": "PEN"
    }];

    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_productos_scraping', {
        productos_data: testData
      });

    if (syncError) {
      console.error('❌ Error en función sync:', syncError);
      return;
    }

    console.log('📊 Resultado de la función sync:');
    console.log(`   Procesados: ${syncResult.procesados}`);
    console.log(`   Insertados: ${syncResult.insertados}`);
    console.log(`   Actualizados: ${syncResult.actualizados}`);
    console.log(`   Errores: ${syncResult.errores}`);

    // Verificar estado final
    console.log('\n📊 VERIFICANDO ESTADO FINAL...');
    
    const { data: finalProducts, error: finalError } = await supabase
      .from('productos')
      .select('*')
      .eq('nombre_producto', 'Version Test Producto');

    if (finalError) {
      console.error('❌ Error consultando productos finales:', finalError);
      return;
    }

    console.log(`Total productos encontrados: ${finalProducts.length}`);
    finalProducts.forEach((p, i) => {
      console.log(`  ${i + 1}. ID: ${p.id_producto}, Tasa: ${p.tasa}, Moneda: ${p.moneda}`);
    });

    // Análisis de resultados
    console.log('\n🎯 ANÁLISIS DE LA FUNCIÓN:');
    
    if (syncResult.insertados === 0 && syncResult.actualizados === 1) {
      console.log('✅ FUNCIÓN CORREGIDA: La función SÍ está actualizada');
      console.log('   - Se actualizó el producto existente correctamente');
      console.log('   - No se crearon duplicados');
      
      if (finalProducts.length === 1 && finalProducts[0].tasa === 4.5) {
        console.log('✅ TASA ACTUALIZADA: La tasa se actualizó correctamente (3.5 → 4.5)');
      }
    } else if (syncResult.insertados === 1 && syncResult.actualizados === 0) {
      console.log('❌ FUNCIÓN ANTIGUA: La función NO está actualizada');
      console.log('   - Se insertó un duplicado en lugar de actualizar');
      console.log('   - La función sigue usando la versión con bug');
      
      if (finalProducts.length === 2) {
        console.log('❌ DUPLICADO CREADO: Se crearon 2 productos en lugar de actualizar 1');
      }
    } else {
      console.log('⚠️ RESULTADO INESPERADO');
    }

    // Limpiar datos de test
    console.log('\n🧹 LIMPIANDO DATOS DE TEST...');
    
    await supabase
      .from('productos')
      .delete()
      .eq('nombre_producto', 'Version Test Producto');

    await supabase
      .from('entidad')
      .delete()
      .eq('nombre_entidad', 'Version Test Banco');

    console.log('✅ Datos de test limpiados');

    // Conclusión
    console.log('\n🎯 CONCLUSIÓN:');
    if (syncResult.actualizados > 0) {
      console.log('✅ La función corregida ESTÁ funcionando en Supabase');
      console.log('   El problema debe estar en otro lugar');
    } else {
      console.log('❌ La función corregida NO está en Supabase');
      console.log('   Necesitas ejecutar el SQL corregido nuevamente');
    }

  } catch (error) {
    console.error('💥 ERROR EN TEST DE VERSIÓN:', error);
  }
}

// Ejecutar test
if (require.main === module) {
  testFunctionVersion()
    .then(() => {
      console.log('\n✅ Test de versión completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test de versión falló:', error);
      process.exit(1);
    });
}

module.exports = testFunctionVersion;
