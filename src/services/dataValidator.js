// src/services/dataValidator.js
const Joi = require('joi');
const winston = require('winston');

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [VALIDATOR-${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/data-validator.log' })
  ]
});

class DataValidator {
  constructor() {
    this.logger = logger;
    
    // Schema para validar productos financieros
    this.productSchema = Joi.object({
      nombre_producto: Joi.string().min(3).max(200).required(),
      banco: Joi.string().min(2).max(100).required(),
      tasa: Joi.number().min(0).max(100).precision(4).required(),
      tipo_producto: Joi.string().valid('ahorro', 'plazo_fijo', 'prestamo', 'tarjeta_credito').required(),
      moneda: Joi.string().valid('PEN', 'USD', 'EUR').default('PEN'),
      id_entidad: Joi.number().integer().optional()
    });

    // Configuración de validaciones específicas
    this.validationRules = {
      tasaMinima: 0.1,    // Tasa mínima aceptable (0.1%)
      tasaMaxima: 50,     // Tasa máxima aceptable (50%)
      nombreMinLength: 3,
      bancoMinLength: 2
    };

    // Lista de bancos conocidos para normalización
    this.bancosConocidos = [
      'BCP', 'Banco de Crédito del Perú',
      'BBVA', 'BBVA Continental',
      'Interbank',
      'Scotiabank', 'Scotia',
      'Banco de la Nación',
      'Banco Pichincha',
      'Citibank',
      'Banco Santander',
      'Mi Banco',
      'Banco Falabella',
      'Banco Ripley',
      'Banco Azteca',
      'Crediscotia',
      'Compartamos Financiera',
      'Financiera Confianza',
      'Financiera Credinka',
      'Financiera Oh!',
      'Caja Arequipa',
      'Caja Cusco',
      'Caja Huancayo',
      'Caja Ica',
      'Caja Lima',
      'Caja Piura',
      'Caja Sullana',
      'Caja Tacna',
      'Caja Trujillo'
    ];
  }

  async validateProducts(products) {
    if (!Array.isArray(products)) {
      throw new Error('Los productos deben ser un array');
    }

    const results = {
      valid: [],
      invalid: [],
      warnings: [],
      summary: {
        total: products.length,
        validCount: 0,
        invalidCount: 0,
        warningCount: 0
      }
    };

    this.logger.info(`Iniciando validación de ${products.length} productos`);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const validationResult = await this.validateSingleProduct(product, i);

      if (validationResult.isValid) {
        results.valid.push(validationResult.product);
        results.summary.validCount++;
      } else {
        results.invalid.push({
          originalProduct: product,
          errors: validationResult.errors,
          index: i
        });
        results.summary.invalidCount++;
      }

      // Agregar warnings si existen
      if (validationResult.warnings.length > 0) {
        results.warnings.push({
          product: validationResult.product,
          warnings: validationResult.warnings,
          index: i
        });
        results.summary.warningCount++;
      }
    }

    this.logger.info(`Validación completada: ${results.summary.validCount} válidos, ${results.summary.invalidCount} inválidos, ${results.summary.warningCount} con warnings`);

    return results;
  }

  async validateSingleProduct(product, index = 0) {
    const result = {
      isValid: false,
      product: null,
      errors: [],
      warnings: []
    };

    try {
      // Normalizar el producto antes de validar
      const normalizedProduct = this.normalizeProduct(product);

      // Validar con Joi schema
      const { error, value } = this.productSchema.validate(normalizedProduct, { 
        abortEarly: false,
        stripUnknown: true 
      });

      if (error) {
        result.errors = error.details.map(detail => detail.message);
        this.logger.warn(`Producto ${index} falló validación Joi:`, result.errors);
        return result;
      }

      // Validaciones adicionales de negocio
      const businessValidation = this.validateBusinessRules(value);
      
      if (!businessValidation.isValid) {
        result.errors = businessValidation.errors;
        this.logger.warn(`Producto ${index} falló validación de negocio:`, result.errors);
        return result;
      }

      // Agregar warnings si es necesario
      result.warnings = this.generateWarnings(value);

      result.isValid = true;
      result.product = value;

    } catch (error) {
      result.errors.push(`Error inesperado en validación: ${error.message}`);
      this.logger.error(`Error validando producto ${index}:`, error);
    }

    return result;
  }

  normalizeProduct(product) {
    const normalized = { ...product };

    // Normalizar nombre del producto
    if (normalized.nombre_producto) {
      normalized.nombre_producto = normalized.nombre_producto.trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s\-áéíóúñü]/gi, '');
    }

    // Normalizar banco
    if (normalized.banco) {
      normalized.banco = this.normalizeBanco(normalized.banco.trim());
    }

    // Normalizar tasa
    if (normalized.tasa !== undefined) {
      normalized.tasa = this.normalizeTasa(normalized.tasa);
    }

    // Normalizar tipo de producto
    if (normalized.tipo_producto) {
      normalized.tipo_producto = normalized.tipo_producto.toLowerCase().trim();
    }

    // Normalizar moneda
    if (normalized.moneda) {
      normalized.moneda = normalized.moneda.toUpperCase().trim();
    } else {
      normalized.moneda = 'PEN'; // Default a soles
    }

    return normalized;
  }

  normalizeBanco(bancoOriginal) {
    const banco = bancoOriginal.trim();
    
    // Buscar coincidencias exactas
    const exactMatch = this.bancosConocidos.find(b => 
      b.toLowerCase() === banco.toLowerCase()
    );
    
    if (exactMatch) {
      return exactMatch;
    }

    // Buscar coincidencias parciales
    const partialMatch = this.bancosConocidos.find(b => 
      b.toLowerCase().includes(banco.toLowerCase()) || 
      banco.toLowerCase().includes(b.toLowerCase())
    );

    if (partialMatch) {
      return partialMatch;
    }

    // Normalizaciones específicas comunes
    const normalizationMap = {
      'bcp': 'BCP',
      'banco de credito': 'Banco de Crédito del Perú',
      'bbva continental': 'BBVA',
      'scotia': 'Scotiabank',
      'interbank': 'Interbank'
    };

    const normalizedKey = banco.toLowerCase();
    if (normalizationMap[normalizedKey]) {
      return normalizationMap[normalizedKey];
    }

    // Si no se encuentra, devolver el original capitalizado
    return banco.charAt(0).toUpperCase() + banco.slice(1).toLowerCase();
  }

  normalizeTasa(tasaOriginal) {
    if (typeof tasaOriginal === 'number') {
      return tasaOriginal;
    }

    if (typeof tasaOriginal === 'string') {
      // Remover caracteres no numéricos excepto punto y coma
      const cleanTasa = tasaOriginal.replace(/[^\d.,]/g, '');
      
      // Convertir coma a punto
      const normalizedTasa = cleanTasa.replace(',', '.');
      
      const tasa = parseFloat(normalizedTasa);
      return isNaN(tasa) ? null : tasa;
    }

    return null;
  }

  validateBusinessRules(product) {
    const result = {
      isValid: true,
      errors: []
    };

    // Validar rango de tasa
    if (product.tasa < this.validationRules.tasaMinima) {
      result.errors.push(`Tasa muy baja: ${product.tasa}% (mínimo: ${this.validationRules.tasaMinima}%)`);
      result.isValid = false;
    }

    if (product.tasa > this.validationRules.tasaMaxima) {
      result.errors.push(`Tasa muy alta: ${product.tasa}% (máximo: ${this.validationRules.tasaMaxima}%)`);
      result.isValid = false;
    }

    // Validar longitud mínima de campos
    if (product.nombre_producto.length < this.validationRules.nombreMinLength) {
      result.errors.push(`Nombre de producto muy corto: "${product.nombre_producto}"`);
      result.isValid = false;
    }

    if (product.banco.length < this.validationRules.bancoMinLength) {
      result.errors.push(`Nombre de banco muy corto: "${product.banco}"`);
      result.isValid = false;
    }

    // Validar que no sean valores genéricos
    const genericNames = ['producto', 'cuenta', 'deposito', 'ahorro', 'plazo'];
    if (genericNames.some(generic => 
      product.nombre_producto.toLowerCase().trim() === generic)) {
      result.errors.push(`Nombre de producto muy genérico: "${product.nombre_producto}"`);
      result.isValid = false;
    }

    return result;
  }

  generateWarnings(product) {
    const warnings = [];

    // Warning para tasas inusualmente altas
    if (product.tasa > 20) {
      warnings.push(`Tasa inusualmente alta: ${product.tasa}%`);
    }

    // Warning para bancos no reconocidos
    if (!this.bancosConocidos.some(b => 
      b.toLowerCase() === product.banco.toLowerCase())) {
      warnings.push(`Banco no reconocido: "${product.banco}"`);
    }

    // Warning para nombres de productos muy largos
    if (product.nombre_producto.length > 100) {
      warnings.push(`Nombre de producto muy largo: ${product.nombre_producto.length} caracteres`);
    }

    return warnings;
  }

  // Método para obtener estadísticas de validación
  getValidationStats(validationResults) {
    const stats = {
      totalProducts: validationResults.summary.total,
      validProducts: validationResults.summary.validCount,
      invalidProducts: validationResults.summary.invalidCount,
      productsWithWarnings: validationResults.summary.warningCount,
      validationRate: (validationResults.summary.validCount / validationResults.summary.total * 100).toFixed(2),
      commonErrors: {},
      bankDistribution: {},
      productTypeDistribution: {}
    };

    // Analizar errores comunes
    validationResults.invalid.forEach(item => {
      item.errors.forEach(error => {
        stats.commonErrors[error] = (stats.commonErrors[error] || 0) + 1;
      });
    });

    // Analizar distribución por banco
    validationResults.valid.forEach(product => {
      stats.bankDistribution[product.banco] = (stats.bankDistribution[product.banco] || 0) + 1;
    });

    // Analizar distribución por tipo de producto
    validationResults.valid.forEach(product => {
      stats.productTypeDistribution[product.tipo_producto] = (stats.productTypeDistribution[product.tipo_producto] || 0) + 1;
    });

    return stats;
  }
}

module.exports = DataValidator;
