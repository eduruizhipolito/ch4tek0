// verify-env.js
// Script para verificar que las variables de entorno estén configuradas correctamente

require('dotenv').config();

function verifyEnvironmentVariables() {
  console.log('🔍 Verificando variables de entorno...\n');

  const requiredVars = [
    {
      name: 'SUPABASE_URL',
      value: process.env.SUPABASE_URL,
      description: 'URL de tu proyecto Supabase'
    },
    {
      name: 'SUPABASE_KEY',
      value: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY,
      description: 'Clave anónima de Supabase'
    }
  ];

  const optionalVars = [
    {
      name: 'KOMPARACOOL_BASE_URL',
      value: process.env.KOMPARACOOL_BASE_URL,
      description: 'URL base para scraping (por defecto: https://www.comparabien.com.pe)'
    },
    {
      name: 'KOMPARACOOL_AHORROS_URL',
      value: process.env.KOMPARACOOL_AHORROS_URL,
      description: 'URL específica para ahorros (por defecto: https://comparabien.com.pe/ahorros)'
    },
    {
      name: 'KOMPARACOOL_AHORROS_RESULT_URL',
      value: process.env.KOMPARACOOL_AHORROS_RESULT_URL,
      description: 'URL de resultados para ahorros (por defecto: https://comparabien.com.pe/ahorros/result)'
    },
    {
      name: 'KOMPARACOOL_PLAZOS_URL',
      value: process.env.KOMPARACOOL_PLAZOS_URL,
      description: 'URL específica para depósitos a plazo (por defecto: https://comparabien.com.pe/depositos-plazo)'
    },
    {
      name: 'KOMPARACOOL_PLAZOS_RESULT_URL',
      value: process.env.KOMPARACOOL_PLAZOS_RESULT_URL,
      description: 'URL de resultados para depósitos a plazo (por defecto: https://comparabien.com.pe/depositos-plazo/result)'
    },
    {
      name: 'BCP_BASE_URL',
      value: process.env.BCP_BASE_URL,
      description: 'URL base para BCP (por defecto: https://www.viabcp.com)'
    },
    {
      name: 'WHATSAPP_API_KEY',
      value: process.env.WHATSAPP_API_KEY,
      description: 'Clave API de WhatsApp (para el chatbot)'
    },
    {
      name: 'WHATSAPP_PHONE_NUMBER_ID',
      value: process.env.WHATSAPP_PHONE_NUMBER_ID,
      description: 'ID del número de teléfono de WhatsApp'
    }
  ];

  let allRequired = true;

  console.log('📋 Variables requeridas para el scraping:');
  console.log('==========================================');

  requiredVars.forEach(variable => {
    const status = variable.value ? '✅' : '❌';
    const value = variable.value ? 
      (variable.value.length > 50 ? variable.value.substring(0, 50) + '...' : variable.value) : 
      'NO CONFIGURADA';
    
    console.log(`${status} ${variable.name}: ${value}`);
    console.log(`   ${variable.description}`);
    
    if (!variable.value) {
      allRequired = false;
    }
  });

  console.log('\n📋 Variables opcionales:');
  console.log('========================');

  optionalVars.forEach(variable => {
    const status = variable.value ? '✅' : '⚠️';
    const value = variable.value ? 
      (variable.value.length > 50 ? variable.value.substring(0, 50) + '...' : variable.value) : 
      'NO CONFIGURADA';
    
    console.log(`${status} ${variable.name}: ${value}`);
    console.log(`   ${variable.description}`);
  });

  console.log('\n' + '='.repeat(50));

  if (allRequired) {
    console.log('✅ Todas las variables requeridas están configuradas');
    console.log('🚀 El sistema de scraping debería funcionar correctamente');
    return true;
  } else {
    console.log('❌ Faltan variables de entorno requeridas');
    console.log('\n📝 Para configurar las variables faltantes:');
    console.log('1. Copia el archivo .env.example a .env');
    console.log('2. Edita el archivo .env y agrega tus credenciales');
    console.log('3. Obtén las credenciales de Supabase desde tu dashboard');
    console.log('   - SUPABASE_URL: Project Settings > API > Project URL');
    console.log('   - SUPABASE_KEY: Project Settings > API > anon public key');
    return false;
  }
}

// Función para probar conexión a Supabase
async function testSupabaseConnection() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ No se pueden probar las credenciales de Supabase (faltan variables)');
      return false;
    }
    
    console.log('\n🔌 Probando conexión a Supabase...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Intentar una consulta simple
    const { data, error } = await supabase
      .from('productos')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Error conectando a Supabase:', error.message);
      console.log('💡 Verifica que:');
      console.log('   - Las credenciales sean correctas');
      console.log('   - La tabla "productos" exista en tu base de datos');
      console.log('   - Los permisos de la tabla permitan SELECT');
      return false;
    }
    
    console.log('✅ Conexión a Supabase exitosa');
    console.log(`📊 Tabla "productos" accesible`);
    return true;
    
  } catch (error) {
    console.log('❌ Error probando Supabase:', error.message);
    return false;
  }
}

// Ejecutar verificaciones
if (require.main === module) {
  (async () => {
    const envOk = verifyEnvironmentVariables();
    
    if (envOk) {
      await testSupabaseConnection();
    }
    
    console.log('\n🏁 Verificación completada');
  })();
}

module.exports = {
  verifyEnvironmentVariables,
  testSupabaseConnection
};
