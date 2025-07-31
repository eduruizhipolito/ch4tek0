// src/scrapers/base/ScraperConfig.js
const path = require('path');

class ScraperConfig {
  constructor() {
    this.institutions = {
      komparacool: {
        name: 'KomparaCool',
        baseUrl: process.env.KOMPARACOOL_BASE_URL || 'https://www.comparabien.com.pe',
        enabled: true,
        priority: 2,
        endpoints: {
          ahorros: '/depositos-ahorros',
          plazos: '/depositos-plazo-fijo',
          prestamos: '/prestamos-personales'
        },
        selectors: {
          ahorros: {
            container: '.product-card, .rate-table tr',
            fields: {
              nombre_producto: '.product-name, .product-title',
              banco: '.bank-name, .institution-name',
              tasa: '.rate, .interest-rate',
              tipo_producto: 'ahorro'
            }
          },
          plazos: {
            container: '.product-card, .rate-table tr',
            fields: {
              nombre_producto: '.product-name, .product-title',
              banco: '.bank-name, .institution-name',
              tasa: '.rate, .interest-rate',
              tipo_producto: 'plazo_fijo'
            }
          }
        },
        delays: {
          pageLoad: 3000,
          betweenRequests: 2000
        },
        retries: 3
      },
      
      bcp: {
        name: 'BCP',
        baseUrl: process.env.BCP_BASE_URL || 'https://www.viabcp.com',
        enabled: true,
        priority: 1,
        endpoints: {
          cuentaPremio: '/cuentas/cuenta-ahorro/cuenta-premio-bcp',
          cuentaDigital: '/cuentas/cuenta-ahorro/cuenta-digital-bcp',
          cuentaIlimitada: '/cuentas/cuenta-ahorro/cuenta-ilimitada-bcp',
          cuentaSueldo: '/cuenta-sueldo-bcp'
        },
        selectors: {
          tasas: {
            teaSection: '*:contains("TEA referencial")',
            treaSection: '*:contains("TREA")',
            solesPattern: /Soles[:\s]*de\s+(\d+\.?\d*)\s*%\s+a\s+(\d+\.?\d*)\s*%/i,
            dolaresPattern: /Dólares[:\s]*de\s+(\d+\.?\d*)\s*%\s+a\s+(\d+\.?\d*)\s*%/i,
            solesTreaPattern: /Soles[:\s]*(\d+\.?\d*)\s*%/i,
            dolaresTreaPattern: /Dólares[:\s]*(\d+\.?\d*)\s*%/i
          }
        },
        delays: {
          pageLoad: 4000,
          betweenRequests: 3000
        },
        retries: 3
      },

      bbva: {
        name: 'BBVA',
        baseUrl: 'https://www.bbva.pe',
        endpoints: {
          ahorros: '/personas/cuentas/cuentas-de-ahorro.html',
          plazos: '/personas/cuentas/depositos-a-plazo.html'
        },
        selectors: {
          ahorros: {
            container: '.product-card, .rate-item',
            fields: {
              nombre_producto: '.product-title, h3',
              banco: 'BBVA',
              tasa: '.rate, .interest',
              tipo_producto: 'ahorro'
            }
          }
        },
        delays: {
          pageLoad: 3000,
          betweenRequests: 2500
        },
        retries: 3
      },

      interbank: {
        name: 'Interbank',
        baseUrl: 'https://interbank.pe',
        endpoints: {
          ahorros: '/personas/cuentas-y-depositos/cuentas-de-ahorro',
          plazos: '/personas/cuentas-y-depositos/depositos-a-plazo'
        },
        selectors: {
          ahorros: {
            container: '.product-box, .rate-container',
            fields: {
              nombre_producto: '.product-name, h3',
              banco: 'Interbank',
              tasa: '.rate, .percentage',
              tipo_producto: 'ahorro'
            }
          }
        },
        delays: {
          pageLoad: 3500,
          betweenRequests: 2000
        },
        retries: 3
      },

      scotiabank: {
        name: 'Scotiabank',
        baseUrl: 'https://www.scotiabank.com.pe',
        endpoints: {
          ahorros: '/personas/cuentas/cuentas-de-ahorro',
          plazos: '/personas/cuentas/depositos-a-plazo'
        },
        selectors: {
          ahorros: {
            container: '.product-item, .rate-box',
            fields: {
              nombre_producto: '.product-title, h3',
              banco: 'Scotiabank',
              tasa: '.rate, .interest-rate',
              tipo_producto: 'ahorro'
            }
          }
        },
        delays: {
          pageLoad: 4000,
          betweenRequests: 3000
        },
        retries: 3
      }
    };

    // Configuración global
    this.globalConfig = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      timeout: 30000,
      maxConcurrentScrapers: 3,
      logLevel: 'info',
      retryDelay: 5000
    };
  }

  getInstitution(institutionKey) {
    return this.institutions[institutionKey];
  }

  getAllInstitutions() {
    return Object.keys(this.institutions);
  }

  getGlobalConfig() {
    return this.globalConfig;
  }

  // Método para actualizar configuración dinámicamente
  updateInstitutionConfig(institutionKey, updates) {
    if (this.institutions[institutionKey]) {
      this.institutions[institutionKey] = {
        ...this.institutions[institutionKey],
        ...updates
      };
    }
  }

  // Método para agregar nueva institución
  addInstitution(key, config) {
    this.institutions[key] = config;
  }
}

module.exports = new ScraperConfig();
