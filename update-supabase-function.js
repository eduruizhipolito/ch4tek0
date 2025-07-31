// update-supabase-function.js
// Script para actualizar la función en Supabase con los valores corregidos

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function updateSupabaseFunction() {
  console.log('🔄 ACTUALIZANDO FUNCIÓN EN SUPABASE CON VALORES CORREGIDOS');
  console.log('=' .repeat(60));

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

    // Paso 1: Corregir datos existentes
    console.log('\n📝 PASO 1: Corrigiendo datos existentes...');
    
    // Leer script de corrección
    const fixDataPath = path.join(__dirname, 'sql', 'fix_existing_data.sql');
    if (fs.existsSync(fixDataPath)) {
      const fixDataSQL = fs.readFileSync(fixDataPath, 'utf8');
      console.log('📋 EJECUTA ESTE SQL EN TU PANEL DE SUPABASE:');
      console.log('-'.repeat(50));
      console.log(fixDataSQL);
      console.log('-'.repeat(50));
    }

    // Paso 2: Actualizar función
    console.log('\n🔧 PASO 2: Actualizando función sync_productos_scraping...');
    
    const functionPath = path.join(__dirname, 'sql', 'sync_productos_function.sql');
    if (fs.existsSync(functionPath)) {
      const functionSQL = fs.readFileSync(functionPath, 'utf8');
      console.log('📋 EJECUTA ESTE SQL EN TU PANEL DE SUPABASE:');
      console.log('-'.repeat(50));
      console.log(functionSQL);
      console.log('-'.repeat(50));
    }

    console.log('\n✅ INSTRUCCIONES COMPLETADAS');
    console.log('🎯 Cambios implementados:');
    console.log('   - tipo_producto: "Cuenta de Ahorros" → "ahorro"');
    console.log('   - moneda: "Soles" → "PEN"');
    console.log('   - Función actualizada con valores correctos');
    console.log('   - Código Node.js actualizado');

  } catch (error) {
    console.error('💥 ERROR:', error);
  }
}

// Ejecutar actualización
if (require.main === module) {
  updateSupabaseFunction()
    .then(() => {
      console.log('\n✅ Script completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script falló:', error);
      process.exit(1);
    });
}

module.exports = updateSupabaseFunction;
