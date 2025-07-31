// install-supabase-function.js
// Script para instalar la función sync_productos_scraping en Supabase

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function installSupabaseFunction() {
  console.log('🚀 INSTALANDO FUNCIÓN EN SUPABASE');
  console.log('=' .repeat(50));

  try {
    // Verificar credenciales
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.error('❌ Error: Variables de entorno SUPABASE_URL y SUPABASE_KEY requeridas');
      return;
    }

    // Crear cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    console.log('✅ Cliente Supabase inicializado');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'sql', 'sync_productos_function.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Error: No se encontró el archivo SQL en ${sqlPath}`);
      return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ Archivo SQL leído correctamente');

    // Ejecutar la función SQL
    console.log('📝 Ejecutando función SQL en Supabase...');
    
    const { data, error } = await supabase.rpc('exec', {
      sql: sqlContent
    });

    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      
      // Intentar método alternativo usando query directo
      console.log('🔄 Intentando método alternativo...');
      
      // Nota: Este método puede no estar disponible según la configuración de Supabase
      console.log('⚠️  INSTRUCCIONES MANUALES:');
      console.log('1. Ve a tu panel de Supabase');
      console.log('2. Navega a SQL Editor');
      console.log('3. Copia y pega el contenido del archivo:');
      console.log(`   ${sqlPath}`);
      console.log('4. Ejecuta el SQL manualmente');
      console.log('');
      console.log('📋 CONTENIDO SQL A EJECUTAR:');
      console.log('-'.repeat(50));
      console.log(sqlContent);
      console.log('-'.repeat(50));
      return;
    }

    console.log('✅ Función instalada exitosamente en Supabase');
    
    // Probar la función con datos de ejemplo
    console.log('🧪 Probando función con datos de ejemplo...');
    
    const testData = [
      {
        nombre_producto: "Test Producto",
        entidad: "Test Banco",
        tasa: 1.5,
        tipo_producto: "Cuenta de Ahorros",
        moneda: "Soles"
      }
    ];

    const { data: testResult, error: testError } = await supabase
      .rpc('sync_productos_scraping', {
        productos_data: testData
      });

    if (testError) {
      console.error('❌ Error probando función:', testError);
      return;
    }

    console.log('✅ Función probada exitosamente:');
    console.log(`   - Procesados: ${testResult.procesados}`);
    console.log(`   - Insertados: ${testResult.insertados}`);
    console.log(`   - Actualizados: ${testResult.actualizados}`);
    console.log(`   - Errores: ${testResult.errores}`);

    // Limpiar datos de prueba
    console.log('🧹 Limpiando datos de prueba...');
    await supabase
      .from('productos')
      .delete()
      .eq('nombre_producto', 'Test Producto');
    
    await supabase
      .from('entidad')
      .delete()
      .eq('nombre_entidad', 'Test Banco');

    console.log('✅ Datos de prueba eliminados');
    console.log('');
    console.log('🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('La función sync_productos_scraping está lista para usar');

  } catch (error) {
    console.error('💥 ERROR EN INSTALACIÓN:', error);
    console.log('');
    console.log('📋 INSTRUCCIONES MANUALES:');
    console.log('1. Ve a tu panel de Supabase');
    console.log('2. Navega a SQL Editor');
    console.log('3. Copia y pega el contenido del archivo:');
    console.log(`   ${path.join(__dirname, 'sql', 'sync_productos_function.sql')}`);
    console.log('4. Ejecuta el SQL manualmente');
  }
}

// Ejecutar instalación
if (require.main === module) {
  installSupabaseFunction()
    .then(() => {
      console.log('\n✅ Script completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script falló:', error);
      process.exit(1);
    });
}

module.exports = installSupabaseFunction;
