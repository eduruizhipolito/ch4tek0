// src/services/schedulerService.js
const cron = require('node-cron');
const ScraperManager = require('../scrapers/ScraperManager');
const DataValidator = require('./dataValidator');
const SupabaseSync = require('./supabaseSync');
const winston = require('winston');

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [SCHEDULER-${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/scheduler.log' })
  ]
});

class SchedulerService {
  constructor() {
    this.scraperManager = new ScraperManager();
    this.dataValidator = new DataValidator();
    this.supabaseSync = new SupabaseSync();
    this.logger = logger;
    
    this.jobs = new Map();
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
  }

  // Programar scraping diario
  scheduleDailySync(cronExpression = '0 6 * * *') { // 6:00 AM todos los días
    try {
      if (this.jobs.has('dailySync')) {
        this.logger.info('Cancelando job diario existente');
        this.jobs.get('dailySync').stop();
      }

      const job = cron.schedule(cronExpression, async () => {
        await this.runDailySync();
      }, {
        scheduled: false,
        timezone: 'America/Lima'
      });

      this.jobs.set('dailySync', job);
      job.start();

      this.logger.info(`Scraping diario programado: ${cronExpression} (timezone: America/Lima)`);
      this.nextRun = this.getNextRunTime(cronExpression);

      return {
        success: true,
        message: `Scraping diario programado para: ${cronExpression}`,
        nextRun: this.nextRun
      };

    } catch (error) {
      this.logger.error('Error programando scraping diario:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Ejecutar sincronización completa
  async runDailySync() {
    if (this.isRunning) {
      this.logger.warn('Scraping ya está en ejecución, saltando...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.info('=== INICIANDO SCRAPING DIARIO ===');

      // Paso 1: Ejecutar todos los scrapers
      this.logger.info('Paso 1: Ejecutando scrapers...');
      const scrapingResult = await this.scraperManager.runAllScrapers();

      if (scrapingResult.data.length === 0) {
        throw new Error('No se obtuvieron datos de ningún scraper');
      }

      this.logger.info(`Scraping completado: ${scrapingResult.data.length} productos obtenidos`);

      // Paso 2: Validar datos
      this.logger.info('Paso 2: Validando datos...');
      const validationResult = await this.dataValidator.validateProducts(scrapingResult.data);

      if (validationResult.valid.length === 0) {
        throw new Error('No hay productos válidos después de la validación');
      }

      this.logger.info(`Validación completada: ${validationResult.valid.length} productos válidos`);

      // Paso 3: Sincronizar con Supabase
      this.logger.info('Paso 3: Sincronizando con Supabase...');
      const syncResult = await this.supabaseSync.syncProducts(validationResult.valid);

      if (!syncResult.success) {
        throw new Error(`Error en sincronización: ${syncResult.error}`);
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Generar reporte final
      const report = {
        timestamp: new Date().toISOString(),
        duration: `${duration}s`,
        scraped: scrapingResult.data.length,
        valid: validationResult.valid.length,
        invalid: validationResult.invalid.length,
        warnings: validationResult.warnings.length,
        inserted: syncResult.insertedCount,
        errors: [
          ...scrapingResult.errors,
          ...(syncResult.errors || [])
        ]
      };

      this.lastRun = report;
      this.logger.info('=== SCRAPING DIARIO COMPLETADO ===', report);

      return report;

    } catch (error) {
      const errorReport = {
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
        duration: `${(Date.now() - startTime) / 1000}s`
      };

      this.lastRun = errorReport;
      this.logger.error('=== ERROR EN SCRAPING DIARIO ===', errorReport);

      return errorReport;

    } finally {
      this.isRunning = false;
    }
  }

  // Ejecutar scraping manual
  async runManualSync(institutions = null) {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Ya hay un scraping en ejecución'
      };
    }

    try {
      this.logger.info('Iniciando scraping manual...');
      
      let scrapingResult;
      if (institutions && institutions.length > 0) {
        scrapingResult = await this.scraperManager.runSpecificInstitutions(institutions);
      } else {
        scrapingResult = await this.scraperManager.runAllScrapers();
      }

      const validationResult = await this.dataValidator.validateProducts(scrapingResult.data);
      const syncResult = await this.supabaseSync.syncProducts(validationResult.valid);

      return {
        success: true,
        scraped: scrapingResult.data.length,
        valid: validationResult.valid.length,
        inserted: syncResult.insertedCount,
        errors: scrapingResult.errors
      };

    } catch (error) {
      this.logger.error('Error en scraping manual:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Programar health checks
  scheduleHealthCheck(cronExpression = '0 */6 * * *') { // Cada 6 horas
    try {
      if (this.jobs.has('healthCheck')) {
        this.jobs.get('healthCheck').stop();
      }

      const job = cron.schedule(cronExpression, async () => {
        await this.runHealthCheck();
      }, {
        scheduled: false,
        timezone: 'America/Lima'
      });

      this.jobs.set('healthCheck', job);
      job.start();

      this.logger.info(`Health check programado: ${cronExpression}`);

      return {
        success: true,
        message: `Health check programado para: ${cronExpression}`
      };

    } catch (error) {
      this.logger.error('Error programando health check:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runHealthCheck() {
    try {
      this.logger.info('Ejecutando health check...');

      // Verificar scrapers
      const scraperHealth = await this.scraperManager.healthCheck();
      
      // Verificar conexión a Supabase
      const supabaseHealth = await this.supabaseSync.testConnection();

      const healthReport = {
        timestamp: new Date().toISOString(),
        scrapers: scraperHealth,
        supabase: supabaseHealth,
        lastRun: this.lastRun,
        nextRun: this.nextRun,
        isRunning: this.isRunning
      };

      this.logger.info('Health check completado', healthReport);
      return healthReport;

    } catch (error) {
      this.logger.error('Error en health check:', error);
      return {
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      };
    }
  }

  // Obtener estado del scheduler
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      activeJobs: Array.from(this.jobs.keys()),
      timestamp: new Date().toISOString()
    };
  }

  // Detener todos los jobs
  stopAllJobs() {
    this.logger.info('Deteniendo todos los jobs programados...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      this.logger.info(`Job detenido: ${name}`);
    }
    
    this.jobs.clear();
    
    return {
      success: true,
      message: 'Todos los jobs han sido detenidos'
    };
  }

  // Reiniciar jobs
  restartJobs() {
    this.stopAllJobs();
    
    // Reiniciar con configuración por defecto
    this.scheduleDailySync();
    this.scheduleHealthCheck();
    
    return {
      success: true,
      message: 'Jobs reiniciados con configuración por defecto'
    };
  }

  // Método utilitario para calcular próxima ejecución
  getNextRunTime(cronExpression) {
    try {
      // Esto es una aproximación, en producción usar una librería como cron-parser
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0); // Asumiendo 6:00 AM por defecto
      
      return tomorrow.toISOString();
    } catch (error) {
      return null;
    }
  }
}

module.exports = SchedulerService;
