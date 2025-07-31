// debug-currency-validation.js
// Script para diagnosticar el estado de la base de datos después del test

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function debugCurrencyValidation() {
  console.log('🔍 DIAGNÓSTICO DE VALIDACIÓN POR MONEDA');
  console.log('=' .repeat(50));

  try {
    // Crear cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // 1. Verificar productos de test creados
    console.log('\n📊 PRODUCTOS DE TEST EN LA BASE DE DATOS:');
    
    const { data: testProducts, error: testError } = await supabase
      .from('productos')
      .select(`
        id_producto,
        nombre_producto,
        tasa,
        moneda,
        tipo_producto,
        entidad!inner(nombre_entidad)
      `)
      .eq('nombre_producto', 'Test Producto Moneda')
      .order('moneda');

    if (testError) {
      console.error('❌ Error consultando productos:', testError);
      return;
    }

    if (testProducts && testProducts.length > 0) {
      console.log(`Encontrados ${testProducts.length} productos de test:`);
      testProducts.forEach((product, index) => {
        console.log(`  ${index + 1}. ID: ${product.id_producto}`);
        console.log(`     Nombre: ${product.nombre_producto}`);
        console.log(`     Entidad: ${product.entidad.nombre_entidad}`);
        console.log(`     Moneda: ${product.moneda}`);
        console.log(`     Tasa: ${product.tasa}%`);
        console.log(`     Tipo: ${product.tipo_producto}`);
        console.log('     ' + '-'.repeat(40));
      });
    } else {
      console.log('❌ No se encontraron productos de test');
    }

    // 2. Verificar entidad de test
    console.log('\n🏦 ENTIDAD DE TEST:');
    
    const { data: testEntity, error: entityError } = await supabase
      .from('entidad')
      .select('*')
      .eq('nombre_entidad', 'Test Banco');

    if (entityError) {
      console.error('❌ Error consultando entidad:', entityError);
      return;
    }

    if (testEntity && testEntity.length > 0) {
      console.log(`Entidad encontrada:`);
      testEntity.forEach(entity => {
        console.log(`  ID: ${entity.id_entidad}`);
        console.log(`  Nombre: ${entity.nombre_entidad}`);
        console.log(`  Tipo: ${entity.tipo_entidad || 'NULL'}`);
      });
    } else {
      console.log('❌ No se encontró la entidad de test');
    }

    // 3. Análisis de duplicados
    console.log('\n🔍 ANÁLISIS DE DUPLICADOS:');
    
    const duplicateAnalysis = testProducts.reduce((acc, product) => {
      const key = `${product.nombre_producto}-${product.entidad.nombre_entidad}-${product.moneda}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(product);
      return acc;
    }, {});

    Object.entries(duplicateAnalysis).forEach(([key, products]) => {
      if (products.length > 1) {
        console.log(`⚠️ DUPLICADO ENCONTRADO: ${key}`);
        console.log(`   Registros: ${products.length}`);
        products.forEach(p => {
          console.log(`   - ID: ${p.id_producto}, Tasa: ${p.tasa}%`);
        });
      } else {
        console.log(`✅ ÚNICO: ${key} (Tasa: ${products[0].tasa}%)`);
      }
    });

    // 4. Verificar si la función está funcionando correctamente
    console.log('\n🧪 DIAGNÓSTICO DE LA FUNCIÓN:');
    
    if (testProducts.length === 4) {
      console.log('❌ PROBLEMA: Se crearon 4 registros en lugar de 2');
      console.log('   Esto indica que la función no está actualizando correctamente');
      console.log('   Posibles causas:');
      console.log('   1. La validación WHERE no está funcionando');
      console.log('   2. Los valores de comparación no coinciden exactamente');
      console.log('   3. Problema con tipos de datos en la comparación');
    } else if (testProducts.length === 2) {
      console.log('✅ CORRECTO: Se crearon 2 registros (PEN y USD)');
      console.log('   La función está actualizando correctamente');
    } else {
      console.log(`⚠️ INESPERADO: Se encontraron ${testProducts.length} registros`);
    }

    // 5. Limpiar datos de test
    console.log('\n🧹 LIMPIANDO DATOS DE TEST...');
    
    const { error: deleteProductsError } = await supabase
      .from('productos')
      .delete()
      .eq('nombre_producto', 'Test Producto Moneda');

    if (deleteProductsError) {
      console.error('❌ Error eliminando productos:', deleteProductsError);
    } else {
      console.log('✅ Productos de test eliminados');
    }

    const { error: deleteEntityError } = await supabase
      .from('entidad')
      .delete()
      .eq('nombre_entidad', 'Test Banco');

    if (deleteEntityError) {
      console.error('❌ Error eliminando entidad:', deleteEntityError);
    } else {
      console.log('✅ Entidad de test eliminada');
    }

    console.log('\n✅ DIAGNÓSTICO COMPLETADO');

  } catch (error) {
    console.error('💥 ERROR EN DIAGNÓSTICO:', error);
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  debugCurrencyValidation()
    .then(() => {
      console.log('\n✅ Script completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script falló:', error);
      process.exit(1);
    });
}

module.exports = debugCurrencyValidation;
