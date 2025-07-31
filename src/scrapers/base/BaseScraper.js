// src/scrapers/base/BaseScraper.js
const puppeteer = require('puppeteer');
const winston = require('winston');

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/scraper.log' })
  ]
});

class BaseScraper {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.logger = logger;
  }

  async initialize() {
    try {
      this.logger.info(`Inicializando scraper para ${this.config.name || this.institution || 'institución desconocida'}`);
      
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--ignore-certificate-errors-spki-list',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Configurar user agent para evitar detección
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Configurar viewport
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // Configurar timeouts
      await this.page.setDefaultNavigationTimeout(30000);
      await this.page.setDefaultTimeout(10000);

      this.logger.info(`Scraper inicializado correctamente para ${this.config.name || this.institution || 'institución desconocida'}`);
    } catch (error) {
      this.logger.error(`Error inicializando scraper para ${this.config.institution}:`, error);
      throw error;
    }
  }

  async navigateToUrl(url) {
    try {
      this.logger.info(`Navegando a: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Esperar un poco para asegurar que la página cargue completamente
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.logger.info(`Navegación exitosa a: ${url}`);
    } catch (error) {
      this.logger.error(`Error navegando a ${url}:`, error);
      throw error;
    }
  }

  async waitForSelector(selector, timeout = 10000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      this.logger.info(`Selector encontrado: ${selector}`);
    } catch (error) {
      this.logger.error(`Selector no encontrado: ${selector}`, error);
      throw error;
    }
  }

  async extractData(selectors) {
    try {
      this.logger.info('Iniciando extracción de datos');
      
      const data = await this.page.evaluate((selectors) => {
        const results = [];
        
        // Implementación base para extraer datos usando los selectores
        selectors.forEach(selectorConfig => {
          const elements = document.querySelectorAll(selectorConfig.selector);
          elements.forEach(element => {
            const item = {};
            
            // Extraer datos según la configuración
            Object.keys(selectorConfig.fields).forEach(field => {
              const fieldSelector = selectorConfig.fields[field];
              const fieldElement = element.querySelector(fieldSelector) || element;
              
              if (fieldElement) {
                item[field] = fieldElement.textContent.trim();
              }
            });
            
            if (Object.keys(item).length > 0) {
              results.push(item);
            }
          });
        });
        
        return results;
      }, selectors);

      this.logger.info(`Datos extraídos: ${data.length} elementos`);
      return data;
    } catch (error) {
      this.logger.error('Error extrayendo datos:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.logger.info(`Cleanup completado para ${this.config.name || this.institution || 'institución desconocida'}`);
    } catch (error) {
      this.logger.error(`Error en cleanup para ${this.config.name || this.institution || 'institución desconocida'}:`, error);
    }
  }

  // Método abstracto que debe ser implementado por cada scraper específico
  async scrape() {
    throw new Error('El método scrape() debe ser implementado por la clase hija');
  }

  // Método para validar datos básicos
  validateData(data) {
    const validData = data.filter(item => {
      return item.nombre_producto && 
             item.tasa && 
             item.banco && 
             !isNaN(parseFloat(item.tasa.replace('%', '').replace(',', '.')));
    });

    this.logger.info(`Datos válidos: ${validData.length}/${data.length}`);
    return validData;
  }

  // Método para normalizar tasas
  normalizeTasa(tasaString) {
    if (!tasaString) return null;
    
    // Remover caracteres no numéricos excepto punto y coma
    const cleanTasa = tasaString.replace(/[^\d.,]/g, '');
    
    // Convertir coma a punto para decimales
    const normalizedTasa = cleanTasa.replace(',', '.');
    
    const tasa = parseFloat(normalizedTasa);
    return isNaN(tasa) ? null : tasa;
  }
}

module.exports = BaseScraper;
