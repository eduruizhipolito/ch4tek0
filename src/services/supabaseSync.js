// src/services/supabaseSync.js
const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [SUPABASE-${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/supabase-sync.log' })
  ]
});

class SupabaseSync {
  constructor() {
    // Verificar que las credenciales estén disponibles
    if (!process.env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL no está configurada en las variables de entorno');
    }
    
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseKey) {
      throw new Error('SUPABASE_KEY no está configurada en las variables de entorno');
    }
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      supabaseKey
    );
    this.logger = logger;
    this.tableName = 'productos';
  }

  async syncProducts(validatedProducts) {
    if (!Array.isArray(validatedProducts) || validatedProducts.length === 0) {
      this.logger.warn('No hay productos válidos para sincronizar');
      return { success: false, message: 'No hay productos para sincronizar' };
    }

    try {
      this.logger.info(`Iniciando sincronización de ${validatedProducts.length} productos usando función Supabase`);

      // Llamar a la función almacenada en Supabase
      const { data: syncResult, error } = await this.supabase
        .rpc('sync_productos_scraping', {
          productos_data: validatedProducts
        });

      if (error) {
        this.logger.error('Error llamando función sync_productos_scraping:', error);
        throw error;
      }

      if (!syncResult.success) {
        this.logger.error('La función retornó error:', syncResult.error);
        return {
          success: false,
          error: syncResult.error,
          timestamp: new Date().toISOString()
        };
      }

      this.logger.info(`Sincronización completada:`);
      this.logger.info(`  - Procesados: ${syncResult.procesados}`);
      this.logger.info(`  - Insertados: ${syncResult.insertados}`);
      this.logger.info(`  - Actualizados: ${syncResult.actualizados}`);
      this.logger.info(`  - Errores: ${syncResult.errores}`);

      if (syncResult.errores > 0 && syncResult.detalles_errores) {
        this.logger.warn('Errores en sincronización:', syncResult.detalles_errores);
      }

      return {
        success: true,
        procesados: syncResult.procesados,
        insertedCount: syncResult.insertados,
        updatedCount: syncResult.actualizados,
        errorCount: syncResult.errores,
        errors: syncResult.detalles_errores || [],
        timestamp: syncResult.timestamp
      };

    } catch (error) {
      this.logger.error('Error en sincronización con Supabase:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async prepareProductsForInsert(products) {
    const prepared = [];

    for (const product of products) {
      try {
        // Obtener o crear id_entidad usando el campo entidad
        const entidadName = product.entidad || product.banco; // Compatibilidad con ambos campos
        const idEntidad = await this.getOrCreateEntidad(entidadName);

        const preparedProduct = {
          nombre_producto: product.nombre_producto,
          tasa: product.tasa,
          id_entidad: idEntidad, // Solo FK a tabla entidad
          tipo_producto: product.tipo_producto,
          moneda: product.moneda || 'Soles'
        };

        prepared.push(preparedProduct);

      } catch (error) {
        this.logger.error(`Error preparando producto ${product.nombre_producto}:`, error);
      }
    }

    return prepared;
  }

  async getOrCreateEntidad(nombreBanco) {
    try {
      // Primero intentar encontrar la entidad existente
      const { data: existingEntidad, error: selectError } = await this.supabase
        .from('entidad')
        .select('id_entidad')
        .eq('nombre_entidad', nombreBanco)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw selectError;
      }

      if (existingEntidad) {
        return existingEntidad.id_entidad;
      }

      // Si no existe, crear nueva entidad (sin tipo_entidad para gestión manual)
      const { data: newEntidad, error: insertError } = await this.supabase
        .from('entidad')
        .insert([{
          nombre_entidad: nombreBanco
          // tipo_entidad se deja NULL para gestión manual posterior
        }])
        .select('id_entidad')
        .single();

      if (insertError) {
        throw insertError;
      }

      this.logger.info(`Nueva entidad creada: ${nombreBanco} (ID: ${newEntidad.id_entidad})`);
      return newEntidad.id_entidad;

    } catch (error) {
      this.logger.error(`Error obteniendo/creando entidad ${nombreBanco}:`, error);
      // Fallback: usar ID por defecto o lanzar error
      throw error;
    }
  }

  determineEntityType(nombreBanco) {
    const banco = nombreBanco.toLowerCase();
    
    if (banco.includes('caja')) {
      return 'caja';
    } else if (banco.includes('financiera') || banco.includes('crediscotia') || banco.includes('compartamos')) {
      return 'financiera';
    } else {
      return 'banco';
    }
  }

  async fullTableSync(products) {
    const result = {
      insertedCount: 0,
      errors: []
    };

    try {
      // Estrategia 1: Limpiar tabla completamente y reinsertar
      this.logger.info('Limpiando tabla de productos...');
      
      const { error: deleteError } = await this.supabase
        .from(this.tableName)
        .delete()
        .neq('id_producto', 0); // Eliminar todos los registros

      if (deleteError) {
        throw new Error(`Error limpiando tabla: ${deleteError.message}`);
      }

      // Insertar productos en lotes para evitar timeouts
      const batchSize = 100;
      const batches = this.chunkArray(products, batchSize);

      this.logger.info(`Insertando ${products.length} productos en ${batches.length} lotes`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          const { data, error } = await this.supabase
            .from(this.tableName)
            .insert(batch)
            .select('id_producto');

          if (error) {
            this.logger.error(`Error en lote ${i + 1}:`, error);
            result.errors.push({
              batch: i + 1,
              error: error.message,
              products: batch.length
            });
          } else {
            result.insertedCount += data.length;
            this.logger.info(`Lote ${i + 1}/${batches.length} completado: ${data.length} productos`);
          }

        } catch (batchError) {
          this.logger.error(`Error procesando lote ${i + 1}:`, batchError);
          result.errors.push({
            batch: i + 1,
            error: batchError.message,
            products: batch.length
          });
        }

        // Pequeña pausa entre lotes
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } catch (error) {
      this.logger.error('Error en sincronización completa:', error);
      result.errors.push({
        type: 'sync_error',
        error: error.message
      });
    }

    return result;
  }

  async incrementalSync(products) {
    // Alternativa para actualizaciones incrementales
    const result = {
      insertedCount: 0,
      updatedCount: 0,
      errors: []
    };

    try {
      for (const product of products) {
        try {
          // Buscar producto existente
          const { data: existing } = await this.supabase
            .from(this.tableName)
            .select('id_producto, tasa')
            .eq('nombre_producto', product.nombre_producto)
            .eq('banco', product.banco)
            .eq('tipo_producto', product.tipo_producto)
            .single();

          if (existing) {
            // Actualizar si la tasa cambió
            if (existing.tasa !== product.tasa) {
              const { error: updateError } = await this.supabase
                .from(this.tableName)
                .update({
                  tasa: product.tasa,
                  updated_at: new Date().toISOString()
                })
                .eq('id_producto', existing.id_producto);

              if (updateError) {
                result.errors.push({
                  product: product.nombre_producto,
                  error: updateError.message,
                  type: 'update'
                });
              } else {
                result.updatedCount++;
              }
            }
          } else {
            // Insertar nuevo producto
            const { error: insertError } = await this.supabase
              .from(this.tableName)
              .insert([product]);

            if (insertError) {
              result.errors.push({
                product: product.nombre_producto,
                error: insertError.message,
                type: 'insert'
              });
            } else {
              result.insertedCount++;
            }
          }

        } catch (productError) {
          result.errors.push({
            product: product.nombre_producto,
            error: productError.message,
            type: 'processing'
          });
        }
      }

    } catch (error) {
      this.logger.error('Error en sincronización incremental:', error);
      result.errors.push({
        type: 'sync_error',
        error: error.message
      });
    }

    return result;
  }

  async getProductStats() {
    try {
      // Obtener estadísticas con JOIN para nombres de entidades
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          tipo_producto,
          entidad!inner(nombre_entidad)
        `);

      if (error) {
        throw error;
      }

      // Obtener estadísticas adicionales
      const { count: totalCount } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      const stats = {
        totalProducts: totalCount,
        byEntidad: {},
        byProductType: {},
        lastUpdate: new Date().toISOString()
      };

      // Agrupar por entidad y tipo
      if (data) {
        data.forEach(item => {
          const entidadName = item.entidad?.nombre_entidad || 'Sin entidad';
          stats.byEntidad[entidadName] = (stats.byEntidad[entidadName] || 0) + 1;
          stats.byProductType[item.tipo_producto] = (stats.byProductType[item.tipo_producto] || 0) + 1;
        });
      }

      return stats;

    } catch (error) {
      this.logger.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }

  async testConnection() {
    try {
      this.logger.info('Probando conexión a Supabase...');
      
      // Usar una consulta más simple y directa
      const { data, error, count } = await this.supabase
        .from(this.tableName)
        .select('id_producto', { count: 'exact' })
        .limit(1);

      if (error) {
        this.logger.error('Error en consulta Supabase:', {
          message: error.message || 'Sin mensaje',
          details: error.details || 'Sin detalles',
          hint: error.hint || 'Sin hint',
          code: error.code || 'Sin código',
          fullError: JSON.stringify(error)
        });
        
        return { 
          success: false, 
          error: error.message || `Error de Supabase: ${error.code || 'desconocido'}`,
          details: error
        };
      }

      this.logger.info(`Conexión a Supabase exitosa. Registros encontrados: ${count || 0}`);
      return { success: true, message: 'Conexión exitosa', count: count || 0 };

    } catch (error) {
      // Capturar errores de red o de inicialización
      const errorInfo = {
        message: error.message || 'Error desconocido',
        name: error.name || 'UnknownError',
        stack: error.stack || 'Sin stack trace',
        type: typeof error,
        stringified: JSON.stringify(error),
        keys: Object.keys(error)
      };
      
      this.logger.error('Error de conexión a Supabase (catch):', errorInfo);
      
      return { 
        success: false, 
        error: error.message || 'Error de conexión desconocido',
        details: errorInfo
      };
    }
  }

  // Método utilitario para dividir array en chunks
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

module.exports = SupabaseSync;
