// src/scrapers/index.js
const SchedulerService = require('../services/schedulerService');
const ScraperManager = require('./ScraperManager');
const DataValidator = require('../services/dataValidator');
const SupabaseSync = require('../services/supabaseSync');

// Punto de entrada principal para el sistema de scraping
class ScrapingSystem {
  constructor() {
    this.scheduler = new SchedulerService();
    this.scraperManager = new ScraperManager();
    this.validator = new DataValidator();
    this.supabaseSync = new SupabaseSync();
  }

  // Inicializar el sistema completo
  async initialize() {
    console.log('🚀 Inicializando sistema de scraping...');
    
    try {
      // Verificar conexión a Supabase
      const connectionTest = await this.supabaseSync.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Error de conexión a Supabase: ${connectionTest.error}`);
      }
      
      // Verificar salud de scrapers
      const healthCheck = await this.scraperManager.healthCheck();
      console.log('✅ Health check completado:', healthCheck.status);
      
      // Programar scraping diario (6:00 AM)
      const dailySchedule = this.scheduler.scheduleDailySync('0 6 * * *');
      if (dailySchedule.success) {
        console.log('⏰ Scraping diario programado para las 6:00 AM');
      }
      
      // Programar health checks (cada 6 horas)
      const healthSchedule = this.scheduler.scheduleHealthCheck('0 */6 * * *');
      if (healthSchedule.success) {
        console.log('🏥 Health checks programados cada 6 horas');
      }
      
      console.log('✅ Sistema de scraping inicializado correctamente');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error inicializando sistema de scraping:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Ejecutar scraping manual
  async runManual(institutions = null) {
    console.log('🔄 Ejecutando scraping manual...');
    return await this.scheduler.runManualSync(institutions);
  }

  // Obtener estado del sistema
  getStatus() {
    return this.scheduler.getStatus();
  }

  // Detener sistema
  stop() {
    console.log('🛑 Deteniendo sistema de scraping...');
    return this.scheduler.stopAllJobs();
  }
}

// Funciones de utilidad para uso directo
const scrapingSystem = new ScrapingSystem();

module.exports = {
  ScrapingSystem,
  scrapingSystem,
  
  // Funciones de conveniencia
  initialize: () => scrapingSystem.initialize(),
  runManual: (institutions) => scrapingSystem.runManual(institutions),
  getStatus: () => scrapingSystem.getStatus(),
  stop: () => scrapingSystem.stop()
};

// Si se ejecuta directamente
if (require.main === module) {
  (async () => {
    try {
      await scrapingSystem.initialize();
      
      // Mantener el proceso vivo
      process.on('SIGINT', () => {
        console.log('\n🛑 Recibida señal de interrupción, deteniendo sistema...');
        scrapingSystem.stop();
        process.exit(0);
      });
      
      console.log('📊 Sistema de scraping activo. Presiona Ctrl+C para detener.');
      
    } catch (error) {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    }
  })();
}
