// diagnose-supabase.js
// Script para diagnosticar problemas de conexión con Supabase

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function diagnoseSupabase() {
  console.log('🔍 Diagnosticando conexión a Supabase...\n');

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Credenciales faltantes');
      return;
    }

    console.log('📋 Configuración:');
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Key: ${supabaseKey.substring(0, 50)}...`);
    console.log('');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Paso 1: Probar conexión básica
    console.log('1️⃣ Probando conexión básica...');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && error.message !== 'Auth session missing!') {
        throw error;
      }
      console.log('✅ Conexión básica exitosa');
    } catch (error) {
      console.log('❌ Error en conexión básica:', error.message);
      return;
    }

    // Paso 2: Listar todas las tablas disponibles
    console.log('\n2️⃣ Listando tablas disponibles...');
    try {
      // Intentar obtener información del esquema público
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (error) {
        console.log('⚠️ No se pueden listar tablas automáticamente');
        console.log('   Esto es normal con permisos limitados');
      } else if (tables && tables.length > 0) {
        console.log('✅ Tablas encontradas:');
        tables.forEach(table => {
          console.log(`   - ${table.table_name}`);
        });
      }
    } catch (error) {
      console.log('⚠️ No se pueden listar tablas:', error.message);
    }

    // Paso 3: Probar acceso específico a tabla "productos"
    console.log('\n3️⃣ Probando acceso a tabla "productos"...');
    try {
      const { data, error, count } = await supabase
        .from('productos')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log('❌ Error accediendo a tabla "productos":', error.message);
        console.log('💡 Posibles causas:');
        console.log('   - La tabla no existe');
        console.log('   - No tienes permisos de SELECT');
        console.log('   - El nombre de la tabla es incorrecto');
        
        // Sugerir crear la tabla
        console.log('\n📝 SQL para crear la tabla:');
        console.log('```sql');
        console.log('CREATE TABLE public.productos (');
        console.log('  id_producto integer GENERATED ALWAYS AS IDENTITY NOT NULL,');
        console.log('  nombre_producto text NOT NULL,');
        console.log('  banco text NOT NULL,');
        console.log('  tasa numeric NOT NULL,');
        console.log('  id_entidad integer NOT NULL,');
        console.log('  tipo_producto text NOT NULL,');
        console.log('  moneda text NULL,');
        console.log('  created_at timestamp with time zone DEFAULT now(),');
        console.log('  updated_at timestamp with time zone DEFAULT now(),');
        console.log('  CONSTRAINT productos_pkey PRIMARY KEY (id_producto)');
        console.log(');');
        console.log('```');
        
      } else {
        console.log('✅ Tabla "productos" accesible');
        console.log(`📊 Registros actuales: ${count || 0}`);
      }
    } catch (error) {
      console.log('❌ Error inesperado:', error.message);
    }

    // Paso 4: Probar acceso a tabla "entidad"
    console.log('\n4️⃣ Probando acceso a tabla "entidad"...');
    try {
      const { data, error, count } = await supabase
        .from('entidad')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log('❌ Error accediendo a tabla "entidad":', error.message);
        
        // Sugerir crear la tabla entidad
        console.log('\n📝 SQL para crear la tabla entidad:');
        console.log('```sql');
        console.log('CREATE TABLE public.entidad (');
        console.log('  id_entidad integer GENERATED ALWAYS AS IDENTITY NOT NULL,');
        console.log('  nombre_entidad text NOT NULL,');
        console.log('  tipo_entidad text NOT NULL,');
        console.log('  created_at timestamp with time zone DEFAULT now(),');
        console.log('  CONSTRAINT entidad_pkey PRIMARY KEY (id_entidad)');
        console.log(');');
        console.log('```');
        
      } else {
        console.log('✅ Tabla "entidad" accesible');
        console.log(`📊 Registros actuales: ${count || 0}`);
      }
    } catch (error) {
      console.log('⚠️ Tabla "entidad" no accesible:', error.message);
    }

    // Paso 5: Verificar permisos RLS
    console.log('\n5️⃣ Verificando configuración de seguridad...');
    console.log('💡 Si las tablas existen pero no puedes acceder:');
    console.log('   1. Ve a Supabase Dashboard > Authentication > Policies');
    console.log('   2. Asegúrate de que las tablas tengan políticas de acceso');
    console.log('   3. O desactiva RLS temporalmente para pruebas');
    console.log('   4. Comando SQL: ALTER TABLE productos DISABLE ROW LEVEL SECURITY;');

  } catch (error) {
    console.log('❌ Error general:', error.message);
  }

  console.log('\n🏁 Diagnóstico completado');
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnoseSupabase();
}

module.exports = { diagnoseSupabase };
