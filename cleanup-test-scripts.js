// cleanup-test-scripts.js
// Script para limpiar archivos de prueba y organizar el proyecto

const fs = require('fs');
const path = require('path');

console.log('🧹 LIMPIEZA DE SCRIPTS DE PRUEBA');
console.log('=' .repeat(40));

// Scripts de prueba que deben eliminarse (fallidos o redundantes)
const scriptsToDelete = [
  'insert-plazo-fresh.js',           // Falló - problema de sesiones
  'insert-plazo-simple.js',          // Falló - problema de browser
  'insert-plazo-usd-simple.js',      // Falló - mezcla lógica ahorros/plazos
  'insert-plazo-usd.js',             // Falló - complejo e innecesario
  'insert-products-plazo-complete.js', // Falló - selector CSS inválido
  'insert-products-plazo-pen.js',    // Redundante - ya tenemos exitoso
  'scrape-plazo-manual.js'           // Script de debugging manual
];

// Scripts exitosos que deben mantenerse
const scriptsToKeep = [
  'insert-plazo-initialized.js',     // ✅ EXITOSO para depósitos a plazo PEN
  'insert-products-usd.js',          // ✅ EXITOSO para ahorros USD
  'clean-insert-products.js'         // ✅ EXITOSO para ahorros PEN
];

// Crear directorio de backup
const backupDir = './scripts-backup';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log('📁 Directorio de backup creado:', backupDir);
}

console.log('\n🗑️  ELIMINANDO SCRIPTS DE PRUEBA FALLIDOS:');

scriptsToDelete.forEach(script => {
  const scriptPath = `./${script}`;
  
  if (fs.existsSync(scriptPath)) {
    try {
      // Hacer backup antes de eliminar
      const backupPath = path.join(backupDir, script);
      fs.copyFileSync(scriptPath, backupPath);
      
      // Eliminar script original
      fs.unlinkSync(scriptPath);
      
      console.log(`   ❌ Eliminado: ${script} (backup en ${backupPath})`);
    } catch (error) {
      console.log(`   ⚠️  Error eliminando ${script}:`, error.message);
    }
  } else {
    console.log(`   ℹ️  No encontrado: ${script}`);
  }
});

console.log('\n✅ SCRIPTS EXITOSOS MANTENIDOS:');
scriptsToKeep.forEach(script => {
  const scriptPath = `./${script}`;
  if (fs.existsSync(scriptPath)) {
    console.log(`   ✅ Mantenido: ${script}`);
  } else {
    console.log(`   ⚠️  No encontrado: ${script}`);
  }
});

console.log('\n📋 RESUMEN DE LIMPIEZA:');
console.log(`   🗑️  Scripts eliminados: ${scriptsToDelete.length}`);
console.log(`   ✅ Scripts mantenidos: ${scriptsToKeep.length}`);
console.log(`   📁 Backups en: ${backupDir}`);

console.log('\n🎯 SCRIPTS FINALES RECOMENDADOS:');
console.log('   • clean-insert-products.js - Para ahorros PEN');
console.log('   • insert-products-usd.js - Para ahorros USD');
console.log('   • insert-plazo-initialized.js - Para depósitos a plazo PEN');
console.log('   • [Crear] insert-plazo-usd-final.js - Para depósitos a plazo USD');

console.log('\n✅ LIMPIEZA COMPLETADA');
