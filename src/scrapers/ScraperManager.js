// src/scrapers/ScraperManager.js
const KomparaCoolScraper = require('./institutions/KomparaCoolScraper');
const BCPScraper = require('./institutions/BCPScraper');
const scraperConfig = require('./base/ScraperConfig');
const winston = require('winston');

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [MANAGER-${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/scraper-manager.log' })
  ]
});

class ScraperManager {
  constructor() {
    this.scrapers = new Map();
    this.results = new Map();
    this.errors = new Map();
    this.logger = logger;
    this.config = scraperConfig.getGlobalConfig();
    
    // Inicializar scrapers disponibles
    this.initializeScrapers();
  }

  initializeScrapers() {
    // Registrar scrapers disponibles
    this.scrapers.set('komparacool', KomparaCoolScraper);
    this.scrapers.set('bcp', BCPScraper);
    
    // TODO: Agregar más scrapers cuando estén implementados
    // this.scrapers.set('bbva', BBVAScraper);
    
    this.logger.info(`Scrapers inicializados: ${Array.from(this.scrapers.keys()).join(', ')}`);
  }

  async runScraper(institutionKey) {
    if (!this.scrapers.has(institutionKey)) {
      throw new Error(`Scraper no encontrado para: ${institutionKey}`);
    }

    const ScraperClass = this.scrapers.get(institutionKey);
    const scraper = new ScraperClass();

    try {
      this.logger.info(`Iniciando scraper para: ${institutionKey}`);
      const startTime = Date.now();
      
      const data = await scraper.scrape();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      this.results.set(institutionKey, {
        data,
        timestamp: new Date().toISOString(),
        duration,
        count: data.length
      });

      this.logger.info(`Scraper completado para ${institutionKey}: ${data.length} productos en ${duration}s`);
      return data;

    } catch (error) {
      this.errors.set(institutionKey, {
        error: error.message,
        timestamp: new Date().toISOString(),
        stack: error.stack
      });

      this.logger.error(`Error en scraper ${institutionKey}:`, error);
      throw error;
    }
  }

  async runAllScrapers() {
    const institutionKeys = Array.from(this.scrapers.keys());
    const allResults = [];
    const allErrors = [];

    this.logger.info(`Iniciando scraping para ${institutionKeys.length} instituciones`);

    // Ejecutar scrapers con límite de concurrencia
    const maxConcurrent = this.config.maxConcurrentScrapers;
    const chunks = this.chunkArray(institutionKeys, maxConcurrent);

    for (const chunk of chunks) {
      const promises = chunk.map(async (institutionKey) => {
        try {
          const data = await this.runScraper(institutionKey);
          return { institution: institutionKey, data, success: true };
        } catch (error) {
          allErrors.push({ institution: institutionKey, error });
          return { institution: institutionKey, data: [], success: false, error };
        }
      });

      const chunkResults = await Promise.all(promises);
      
      // Agregar resultados exitosos
      chunkResults
        .filter(result => result.success)
        .forEach(result => {
          allResults.push(...result.data);
        });

      // Esperar entre chunks para no sobrecargar
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    this.logger.info(`Scraping completado. Total productos: ${allResults.length}, Errores: ${allErrors.length}`);

    return {
      data: allResults,
      errors: allErrors,
      summary: this.getSummary()
    };
  }

  async runSpecificInstitutions(institutionKeys) {
    const validKeys = institutionKeys.filter(key => this.scrapers.has(key));
    const invalidKeys = institutionKeys.filter(key => !this.scrapers.has(key));

    if (invalidKeys.length > 0) {
      this.logger.warn(`Scrapers no encontrados para: ${invalidKeys.join(', ')}`);
    }

    const allResults = [];
    const allErrors = [];

    for (const institutionKey of validKeys) {
      try {
        const data = await this.runScraper(institutionKey);
        allResults.push(...data);
      } catch (error) {
        allErrors.push({ institution: institutionKey, error });
      }

      // Esperar entre scrapers
      if (validKeys.indexOf(institutionKey) < validKeys.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      data: allResults,
      errors: allErrors,
      summary: this.getSummary()
    };
  }

  getSummary() {
    const summary = {
      totalInstitutions: this.scrapers.size,
      successfulRuns: this.results.size,
      failedRuns: this.errors.size,
      totalProducts: 0,
      institutionResults: {},
      lastRun: new Date().toISOString()
    };

    // Calcular totales por institución
    for (const [institution, result] of this.results) {
      summary.totalProducts += result.count;
      summary.institutionResults[institution] = {
        count: result.count,
        duration: result.duration,
        timestamp: result.timestamp
      };
    }

    // Agregar errores
    for (const [institution, error] of this.errors) {
      summary.institutionResults[institution] = {
        error: error.error,
        timestamp: error.timestamp
      };
    }

    return summary;
  }

  getResults(institutionKey = null) {
    if (institutionKey) {
      return this.results.get(institutionKey);
    }
    return Object.fromEntries(this.results);
  }

  getErrors(institutionKey = null) {
    if (institutionKey) {
      return this.errors.get(institutionKey);
    }
    return Object.fromEntries(this.errors);
  }

  clearResults() {
    this.results.clear();
    this.errors.clear();
    this.logger.info('Resultados y errores limpiados');
  }

  // Método utilitario para dividir array en chunks
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Método para verificar el estado de los scrapers
  async healthCheck() {
    const health = {
      status: 'healthy',
      scrapers: {},
      timestamp: new Date().toISOString()
    };

    for (const [institutionKey, ScraperClass] of this.scrapers) {
      try {
        const scraper = new ScraperClass();
        
        // Verificar si el scraper puede inicializarse
        await scraper.initialize();
        await scraper.cleanup();
        
        health.scrapers[institutionKey] = { status: 'healthy' };
      } catch (error) {
        health.scrapers[institutionKey] = { 
          status: 'unhealthy', 
          error: error.message 
        };
        health.status = 'degraded';
      }
    }

    this.logger.info('Health check completado:', health);
    return health;
  }
}

module.exports = ScraperManager;
