// src/scrapers/institutions/KomparaCoolScraper.js
const BaseScraper = require('../base/BaseScraper');
const scraperConfig = require('../base/ScraperConfig');
const SessionManager = require('../../utils/SessionManager');

class KomparaCoolScraper extends BaseScraper {
  constructor() {
    const config = scraperConfig.getInstitution('komparacool');
    super(config);
    this.institution = 'KomparaCool';
    this.sessionManager = new SessionManager('komparacool-ahorros');
  }

  async scrape() {
    const allData = [];
    
    try {
      await this.initialize();
      
      // Scrapear ahorros en soles usando flujo interactivo
      const ahorrosProducts = await this.scrapeAhorrosInteractivo();
      
      this.logger.info(`Scraping completado. ${ahorrosProducts.length} productos extraídos de KomparaCool`);
      return ahorrosProducts;
      
    } catch (error) {
      this.logger.error('Error en scraping de KomparaCool:', error);
      throw error;
    }
  }

  /**
   * Scraper interactivo para ahorros en soles con soporte de sesión persistente
   * Llena el formulario automáticamente y extrae resultados
   */
  async scrapeAhorrosInteractivo(options = {}) {
    try {
      // Inicializar browser si no está inicializado
      if (!this.browser || !this.page) {
        await this.initialize();
      }

      // Verificar si se debe usar sesión persistente
      const usePersistedSession = options.usePersistedSession !== false; // Por defecto true
      
      if (usePersistedSession) {
        // Intentar usar sesión existente primero
        const hasValidSession = await this.sessionManager.hasValidSession(1); // 1 hora
        
        if (hasValidSession) {
          this.logger.info('🔄 Intentando usar sesión existente...');
          const sessionData = await this.sessionManager.loadSession();
          
          if (await this.sessionManager.restoreSession(this.page, sessionData)) {
            this.logger.info('✅ Sesión restaurada, extrayendo datos directamente...');
            const results = await this.extractResultsData();
            await this.cleanup();
            return results;
          } else {
            this.logger.warn('⚠️ No se pudo restaurar sesión, navegando nuevamente...');
            await this.sessionManager.clearSession();
          }
        }
      }
      
      // Si no hay sesión válida o se forzó navegación fresca, hacer navegación completa
      const results = await this.navigateAndExtract();
      await this.cleanup();
      return results;
      
    } catch (error) {
      this.logger.error('Error en scrapeAhorrosInteractivo:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Scraper interactivo para depósitos a plazo con soporte de sesión persistente
   * Llena el formulario automáticamente y extrae resultados de depósitos a plazo
   */
  async scrapeDepositosPlazoInteractivo(options = {}) {
    try {
      // Inicializar browser si no está inicializado
      if (!this.browser || !this.page) {
        await this.initialize();
      }

      // Verificar si se debe usar sesión persistente
      const usePersistedSession = options.usePersistedSession !== false; // Por defecto true
      const baseUrl = options.baseUrl || 'https://comparabien.com.pe/depositos-plazo'; // URL específica para depósitos a plazo
      
      if (usePersistedSession) {
        // Intentar usar sesión existente primero
        const hasValidSession = await this.sessionManager.hasValidSession(1); // 1 hora
        
        if (hasValidSession) {
          this.logger.info('🔄 Intentando usar sesión existente para depósitos a plazo...');
          const sessionData = await this.sessionManager.loadSession();
          
          if (await this.sessionManager.restoreSession(this.page, sessionData)) {
            this.logger.info('✅ Sesión restaurada, extrayendo datos de depósitos a plazo directamente...');
            const results = await this.extractResultsData();
            await this.cleanup();
            return results;
          } else {
            this.logger.warn('⚠️ No se pudo restaurar sesión, navegando nuevamente...');
            await this.sessionManager.clearSession();
          }
        }
      }
      
      // Si no hay sesión válida o se forzó navegación fresca, hacer navegación completa
      const results = await this.navigateAndExtractPlazo(baseUrl, options.formData);
      await this.cleanup();
      return results;
      
    } catch (error) {
      this.logger.error('Error en scrapeDepositosPlazoInteractivo:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Navegación completa para depósitos a plazo: formulario + extracción + guardar sesión
   */
  async navigateAndExtractPlazo(baseUrl, customFormData = null) {
    try {
      this.logger.info(`Navegando a formulario de depósitos a plazo: ${baseUrl}`);
      
      await this.page.goto(baseUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Esperar a que el formulario se cargue
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generar datos aleatorios para el formulario o usar los personalizados
      const formData = customFormData || this.generateRandomFormData(true); // ⭐ incluirPlazo = true
      this.logger.info('Datos del formulario para depósitos a plazo generados:', formData);

      // Llenar el formulario (mismo método que ahorros)
      await this.fillForm(formData);

      // Enviar formulario y esperar resultados
      await this.submitFormAndWaitForResults();

      // Extraer datos de la página de resultados
      const products = await this.extractResultsData();

      // Guardar sesión para futuros usos
      if (products.length > 0) {
        // Verificar que estamos en una página de resultados real
        const currentUrl = this.page.url();
        const hasValidResults = products.some(p => p.tasa !== null && p.tasa > 0);
        
        if (hasValidResults) {
          await this.sessionManager.saveSession({
            url: currentUrl,
            timestamp: Date.now(),
            productCount: products.length
          });
          this.logger.info('💾 Sesión guardada para futuros usos');
        }
      }

      this.logger.info(`Extraídos ${products.length} productos de depósitos a plazo`);
      return products;
      
    } catch (error) {
      this.logger.error('Error en navegación y extracción de depósitos a plazo:', error);
      throw error;
    }
  }

  /**
   * Navegación completa: formulario + extracción + guardar sesión
   */
  async navigateAndExtract() {
    try {
      // URL específica para ahorros
      const ahorrosUrl = process.env.KOMPARACOOL_AHORROS_URL || 'https://comparabien.com.pe/ahorros';
      this.logger.info(`Navegando a formulario de ahorros: ${ahorrosUrl}`);
      
      await this.page.goto(ahorrosUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Esperar a que el formulario se cargue
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generar datos aleatorios para el formulario
      const formData = this.generateRandomFormData();
      this.logger.info('Datos del formulario generados:', formData);

      // Llenar el formulario
      await this.fillForm(formData);

      // Enviar formulario y esperar resultados
      await this.submitFormAndWaitForResults();

      // Extraer datos de la página de resultados
      const products = await this.extractResultsData();

      // Guardar sesión para futuros usos
      if (products.length > 0) {
        // Verificar que estamos en una página de resultados real
        const currentUrl = this.page.url();
        const hasValidResults = products.some(p => p.tasa !== null && p.tasa > 0);
        
        if (hasValidResults) {
          await this.sessionManager.saveSession(this.page, products);
          this.logger.info('💾 Sesión guardada para futuros usos');
        } else {
          this.logger.warn('⚠️ No se guardó sesión: productos sin tasas válidas');
        }
      } else {
        this.logger.warn('⚠️ No se guardó sesión: no se encontraron productos');
      }
      
      this.logger.info(`Extraídos ${products.length} productos de ahorros`);
      return products;
      
    } catch (error) {
      this.logger.error('Error en scraping interactivo de ahorros:', error);
      throw error;
    }
  }

  /**
   * Generar datos aleatorios para el formulario
   */
  generateRandomFormData(incluirPlazo = false) {
    const emails = ['juana', 'pedro', 'almendra', 'rigoberto', 'mauro'];
    const emailPrefix = emails[Math.floor(Math.random() * emails.length)];
    const emailSuffix = Math.floor(Math.random() * 9999);
    
    const formData = {
      tipoCuenta: "Normal",
      moneda: "Soles",
      saldoPromedio: Math.floor(Math.random() * 500) + 1000, // Entre 1000 y 1500
      tipoInstitucion: "Bancos, Cajas y Financieras",
      ubicacion: "Lima y Callao",
      email: `${emailPrefix}${emailSuffix}@gmail.com`
    };
    
    // Agregar campo plazo para depósitos a plazo
    if (incluirPlazo) {
      formData.plazo = 180; // 180 días por defecto
    }
    
    return formData;
  }

  /**
   * Llenar el formulario con los datos generados
   */
  async fillForm(formData) {
    try {
      this.logger.info('Llenando formulario...');

      // Seleccionar Tipo de Cuenta: Normal (ya está seleccionado por defecto)
      // No necesitamos hacer nada si "Normal" ya está seleccionado

      // Seleccionar Moneda: Soles (ya está seleccionado por defecto)
      // No necesitamos hacer nada si "Soles" ya está seleccionado

      // Configurar Saldo Promedio usando el slider
      await this.setSaldoPromedio(formData.saldoPromedio);

      // Seleccionar Tipo de Institución: Bancos, Cajas y Financieras (ya está seleccionado por defecto)
      // No necesitamos hacer nada si ya está seleccionado

      // Seleccionar Ubicación
      await this.setUbicacion(formData.ubicacion);

      // Llenar Email
      await this.setEmail(formData.email);

      // Llenar campo Plazo si está presente (para depósitos a plazo)
      if (formData.plazo) {
        await this.setPlazo(formData.plazo);
      }

      // Verificar estado completo del formulario antes del submit
      const formState = await this.page.evaluate(() => {
        return {
          geo: document.querySelector('select[name="geo"]')?.value || 'VACÍO',
          email: document.querySelector('input[name="email"]')?.value || 'VACÍO',
          type: document.querySelector('input[name="type"]:checked')?.value || 'VACÍO',
          currency: document.querySelector('input[name="currency"]:checked')?.value || 'VACÍO'
        };
      });
      
      this.logger.info('Estado final del formulario:');
      Object.entries(formState).forEach(([field, value]) => {
        const status = value === 'VACÍO' ? '❌' : '✅';
        this.logger.info(`  ${status} ${field}: ${value}`);
      });
      
      const hasEmptyFields = Object.values(formState).some(value => value === 'VACÍO');
      
      if (hasEmptyFields) {
        throw new Error('Hay campos obligatorios vacíos en el formulario');
      }
      
      this.logger.info('✅ Formulario llenado correctamente - Todos los campos obligatorios completos');

    } catch (error) {
      this.logger.error('Error llenando formulario:', error);
      throw error;
    }
  }

  /**
   * Configurar el saldo promedio usando el slider
   */
  async setSaldoPromedio(saldo) {
    try {
      // Buscar el slider de saldo promedio
      const slider = await this.page.$('input[type="range"]');
      if (slider) {
        // Configurar el valor del slider
        await this.page.evaluate((element, value) => {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }, slider, saldo);
        
        this.logger.info(`Saldo promedio configurado: S/ ${saldo}`);
      } else {
        this.logger.warn('No se encontró el slider de saldo promedio');
      }
    } catch (error) {
      this.logger.error('Error configurando saldo promedio:', error);
    }
  }

  /**
   * Seleccionar ubicación - CORREGIDO
   */
  async setUbicacion(ubicacion) {
    try {
      this.logger.info('🔧 Configurando ubicación...');
      
      // Verificar opciones disponibles en el select de geo
      const geoOptions = await this.page.evaluate(() => {
        const select = document.querySelector('select[name="geo"]');
        if (select) {
          return Array.from(select.options).map(option => ({
            value: option.value,
            text: option.textContent.trim()
          }));
        }
        return [];
      });
      
      this.logger.info(`Opciones de ubicación disponibles: ${geoOptions.length}`);
      
      if (geoOptions.length > 1) {
        // Buscar Lima o usar la primera opción válida
        const limaOption = geoOptions.find(opt => 
          opt.text.toLowerCase().includes('lima') || 
          opt.value === 'LI'
        );
        
        const selectedOption = limaOption || geoOptions[1]; // Primera opción válida
        
        this.logger.info(`Seleccionando ubicación: ${selectedOption.value} - ${selectedOption.text}`);
        
        await this.page.select('select[name="geo"]', selectedOption.value);
        
        // Verificar que se seleccionó correctamente
        const verifyGeo = await this.page.evaluate(() => {
          const select = document.querySelector('select[name="geo"]');
          return select ? select.value : 'ERROR';
        });
        
        this.logger.info(`✅ Ubicación verificada: ${verifyGeo}`);
      } else {
        this.logger.warn('No se encontraron opciones de ubicación');
      }
    } catch (error) {
      this.logger.error('Error seleccionando ubicación:', error);
      throw error;
    }
  }

  /**
   * Llenar campo de email - CORREGIDO
   */
  async setEmail(email) {
    try {
      this.logger.info('🔧 Configurando email...');
      
      // Usar el selector correcto que encontramos en el debugging
      const emailInput = await this.page.$('input[name="email"]');
      if (emailInput) {
        await emailInput.click();
        // Limpiar campo usando selectAll + delete
        await emailInput.focus();
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('KeyA');
        await this.page.keyboard.up('Control');
        await this.page.keyboard.press('Delete');
        await emailInput.type(email);
        
        // Verificar que se llenó correctamente
        const verifyEmail = await this.page.evaluate(() => {
          const input = document.querySelector('input[name="email"]');
          return input ? input.value : 'ERROR';
        });
        
        this.logger.info(`✅ Email verificado: ${verifyEmail}`);
      } else {
        this.logger.warn('No se encontró el campo de email');
        throw new Error('Campo de email no encontrado');
      }
    } catch (error) {
      this.logger.error('Error configurando email:', error);
      throw error;
    }
  }

  /**
   * Enviar formulario y esperar resultados
        }
      } else {
        await submitButton.click();
        this.logger.info('Botón "Compara" clickeado');
      }

      // Esperar a que se cargue la página de resultados
      // Usar waitForSelector en lugar de waitForNavigation para mayor flexibilidad
      try {
        await this.page.waitForNavigation({ 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
      } catch (navError) {
        this.logger.warn('Navegación tardó más de lo esperado, continuando...', navError.message);
        // Continuar aunque la navegación sea lenta
      }

      // Verificar URL actual y esperar resultados dinámicos
      const currentUrl = this.page.url();
      this.logger.info(`URL actual después del submit: ${currentUrl}`);
      
      // En lugar de forzar navegación, esperar a que aparezcan resultados dinámicamente
      this.logger.info('🔍 Esperando a que aparezcan resultados dinámicos...');
      
      try {
        // Esperar a que aparezcan los resultados dinámicos
        this.logger.info('🔍 Esperando a que aparezcan resultados dinámicos...');
        
        // Esperar específicamente por la tabla de resultados
        const tableSelectors = [
          'table tbody tr',
          '.table tbody tr',
          'table tr:not(:first-child)', // Excluir header
          '[class*="table"] tr'
        ];
        
        let resultsFound = false;
        const maxWaitTime = 45000; // 45 segundos
        const checkInterval = 3000; // cada 3 segundos
        let waitedTime = 0;
        
        while (!resultsFound && waitedTime < maxWaitTime) {
          // Verificar si hay filas de datos en la tabla
          const rowCount = await this.page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            let maxRows = 0;
            tables.forEach(table => {
              const rows = table.querySelectorAll('tr');
              if (rows.length > maxRows) {
                maxRows = rows.length;
              }
            });
            return maxRows;
          });
          
          // También verificar si hay porcentajes (tasas) en la página
          const hasRates = await this.page.evaluate(() => {
            const text = document.body.textContent;
            const percentages = text.match(/\d+[.,]\d+\s*%/g) || [];
            return percentages.length > 2; // Más de 2 porcentajes indica datos reales
          });
          
          if (rowCount >= 3 && hasRates) { // Al menos 3 filas (header + 2 productos) y tasas
            resultsFound = true;
            this.logger.info(`✅ Tabla de resultados encontrada: ${rowCount} filas, tasas detectadas`);
            break;
          }
          
          waitedTime += checkInterval;
          this.logger.info(`⏳ Esperando tabla de resultados... ${waitedTime/1000}s (filas: ${rowCount}, tasas: ${hasRates})`);
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        if (!resultsFound) {
          this.logger.warn('⚠️ No se encontró tabla de resultados después de 45s');
          
          // Verificar si estamos en la página correcta
          const currentUrl = this.page.url();
          this.logger.info(`URL actual: ${currentUrl}`);
          
          if (currentUrl.includes('/ahorros') && !currentUrl.includes('/result')) {
            this.logger.error('🚫 Seguimos en la página del formulario, no en resultados');
            throw new Error('No se pudo acceder a la página de resultados');
          }
        }  
        
      } catch (waitError) {
        this.logger.warn('Timeout esperando resultados dinámicos, continuando con extracción');
      }
      
      // Verificar que estamos en la página de resultados antes de extraer
      const finalUrl = this.page.url();
      
      if (!plazoSet) {
        this.logger.warn('⚠️ No se encontró campo de plazo, continuando sin configurar...');
      }
      
    } catch (error) {
      this.logger.error('Error configurando plazo:', error);
      // No lanzar error, ya que el plazo puede ser opcional en algunos formularios
    }
  }

  /**
   * Enviar formulario y esperar navegación a resultados - NUEVO MÉTODO
   */
  async submitFormAndWaitForResults() {
    try {
      this.logger.info('🔘 Enviando formulario...');
      
      const urlBefore = this.page.url();
      this.logger.info(`URL antes del submit: ${urlBefore}`);
      
      // Configurar listener para navegación
      const navigationPromise = this.page.waitForNavigation({ 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Hacer clic en el botón Comparar usando el selector correcto
      await this.page.click('input[name="source"][value="Compara"]');
      this.logger.info('✅ Botón Comparar clickeado');
      
      // Esperar navegación
      await navigationPromise;
      
      const urlAfter = this.page.url();
      this.logger.info(`URL después del submit: ${urlAfter}`);
      
      if (urlAfter !== urlBefore && urlAfter.includes('/result')) {
        this.logger.info('🎉 ¡Navegación exitosa a página de resultados!');
        
        // Esperar a que carguen los resultados
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return true;
      } else {
        throw new Error(`Navegación falló. URL esperada: /result, URL actual: ${urlAfter}`);
      }
      
    } catch (error) {
      this.logger.error('Error en submit del formulario:', error);
      throw error;
    }
  }

  /**
   * Extraer datos de la página de resultados - CORREGIDO PARA ESTRUCTURA DE DIVS
   */
  async extractResultsData() {
    try {
      this.logger.info('🔍 Extrayendo datos de resultados...');
      
      // Verificar que estamos en la página correcta
      const currentUrl = this.page.url();
      this.logger.info(`📍 URL actual: ${currentUrl}`);
      
      if (!currentUrl.includes('/result')) {
        throw new Error('No estamos en la página de resultados');
      }
      
      // Extraer productos usando la estructura de divs que encontramos
      const products = await this.page.evaluate(() => {
        const results = [];
        
        console.log('=== INICIANDO EXTRACCIÓN CON ESTRUCTURA DE DIVS ===');
        
        // Buscar el contenedor principal de resultados
        const resultContainer = document.querySelector('#result');
        if (!resultContainer) {
          console.log('❌ No se encontró contenedor #result');
          return [];
        }
        
        console.log(`✅ Contenedor #result encontrado con ${resultContainer.children.length} elementos`);
        
        // Buscar productos usando la estructura correcta identificada en el debugging
        const productElements = resultContainer.querySelectorAll('div.item');
        console.log(`🔍 Productos encontrados (div.item): ${productElements.length}`);
        
        productElements.forEach((element, index) => {
          console.log(`\n--- PROCESANDO PRODUCTO ${index + 1} ---`);
          
          // Extraer nombre del producto desde el elemento strong dentro de .name
          let productName = '';
          const nameElement = element.querySelector('.name strong');
          if (nameElement) {
            productName = nameElement.textContent.trim();
          } else {
            // Fallback: buscar en el texto general
            const text = element.textContent.trim();
            const productPatterns = [
              /Cuenta\s+[\w\s]+/i,
              /Campaña\s+[\w\s]+/i,
              /Ahorro\s+[\w\s]+/i,
              /Depósito\s+[\w\s]+/i
            ];
            
            for (const pattern of productPatterns) {
              const match = text.match(pattern);
              if (match) {
                productName = match[0].trim();
                break;
              }
            }
          }
          
          console.log(`📦 Producto: ${productName}`);
          
          // Extraer entidad desde el campo comp_name (más preciso)
          let entidadName = '';
          const compNameInput = element.querySelector('input[name="comp_name"]');
          if (compNameInput) {
            entidadName = compNameInput.value || '';
          }
          
          // Fallback: extraer desde la imagen si no hay comp_name
          if (!entidadName) {
            const logoImg = element.querySelector('.logo img');
            if (logoImg) {
              entidadName = logoImg.title || logoImg.alt || '';
              
              // Si no hay title/alt, intentar extraer del src
              if (!entidadName && logoImg.src) {
                const srcMatch = logoImg.src.match(/logos\/(\w+)/i);
                if (srcMatch) {
                  const logoName = srcMatch[1].toLowerCase();
                  // Mapear nombres de logos a nombres de entidades
                  const logoMap = {
                    'compartamos': 'Compartamos Banco',
                    'bcp': 'Banco de Crédito del Perú',
                    'bbva': 'BBVA',
                    'interbank': 'Interbank',
                    'scotiabank': 'Scotiabank',
                    'falabella': 'Banco Falabella',
                    'logo_bcp': 'Banco de Crédito del Perú',
                    'logo_interbank': 'Interbank'
                  };
                  entidadName = logoMap[logoName] || logoName;
                }
              }
            }
          }
          
          // Fallback final: buscar en el enlace de redirección
          if (!entidadName) {
            const linkElement = element.querySelector('.logo a');
            if (linkElement && linkElement.href) {
              if (linkElement.href.includes('compartamos')) entidadName = 'Compartamos Banco';
              else if (linkElement.href.includes('bcp')) entidadName = 'Banco de Crédito del Perú';
              else if (linkElement.href.includes('bbva')) entidadName = 'BBVA';
              else if (linkElement.href.includes('interbank')) entidadName = 'Interbank';
              else if (linkElement.href.includes('cusco')) entidadName = 'Caja Municipal Cusco';
              else if (linkElement.href.includes('ica')) entidadName = 'Caja Municipal Ica';
            }
          }
          
          console.log(`🏦 Entidad: ${entidadName}`);
          
          // Extraer tasa de interés del texto completo
          let rate = null;
          const fullText = element.textContent;
          
          // Buscar patrones de tasas más específicos
          const ratePatterns = [
            /TEA[:\s]*([0-9]+[.,][0-9]+)\s*%/gi,
            /Tasa[^:]*[:\s]*([0-9]+[.,][0-9]+)\s*%/gi,
            /([0-9]+[.,][0-9]+)\s*%/g,
            /([0-9]+)\s*%/g
          ];
          
          for (const pattern of ratePatterns) {
            const matches = [...fullText.matchAll(pattern)];
            if (matches.length > 0) {
              // Tomar la primera tasa encontrada
              const rateStr = matches[0][1].replace(',', '.');
              const parsedRate = parseFloat(rateStr);
              if (!isNaN(parsedRate) && parsedRate >= 0) {
                rate = parsedRate;
                console.log(`✅ Tasa extraída: ${rate}%`);
                break;
              }
            }
          }
          
          // Validación balanceada antes de agregar el producto
          if (productName && (rate !== null || entidadName)) {
            // Validaciones adicionales de calidad - menos estrictas
            if (productName.length < 3) {
              console.log(`⚠️ Producto descartado: nombre muy corto (${productName})`);
              return;
            }
            
            // Solo descartar si el nombre es exactamente igual a la entidad
            if (productName === entidadName && entidadName.length > 0) {
              console.log(`⚠️ Producto descartado: nombre idéntico a la entidad (${productName})`);
              return;
            }
            
            const product = {
              nombre_producto: productName,
              entidad: entidadName || 'No especificado',
              tasa: rate,
              moneda: 'PEN', // Código ISO para soles
              tipo_producto: 'ahorro',
              url_fuente: window.location.href,
              fecha_extraccion: new Date().toISOString()
            };
            
            console.log(`✅ Producto extraído:`, product);
            results.push(product);
          } else {
            const reason = !productName ? 'sin nombre' : 
                          rate === null ? 'sin tasa' : 
                          rate <= 0 ? 'tasa inválida (0%)' : 'información insuficiente';
            console.log(`⚠️ Elemento ${index + 1} descartado: ${reason}`);
          }
        });
        
        console.log(`\n=== EXTRACCIÓN COMPLETADA: ${results.length} productos ===`);
        return results;
      });
      
      this.logger.info(`📦 Productos extraídos: ${products.length}`);
      
      // Log de productos extraídos
      products.forEach((product, index) => {
        this.logger.info(`  ${index + 1}. ${product.nombre_producto} - ${product.tasa}% (${product.entidad})`);
      });
      
      return products;
      
    } catch (error) {
      this.logger.error('❌ Error extrayendo datos:', error);
      return [];
    }
  }

  // Método heredado - mantener para compatibilidad
  async scrapeAhorros() {
    // Redirigir al método interactivo
    return await this.scrapeAhorrosInteractivo();
  }

  /**
   * Extraer datos navegando a páginas individuales de productos
   */
  async extractFromProductPages(productLinks) {
    const allProducts = [];
    
    this.logger.info(`Navegando a ${productLinks.length} páginas de productos...`);
    
    for (let i = 0; i < productLinks.length; i++) {
      const link = productLinks[i];
      
      try {
        this.logger.info(`Navegando a producto ${i + 1}/${productLinks.length}: ${link.href}`);
        
        await this.page.goto(link.href, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        
        // Esperar a que cargue el contenido
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extraer datos de la página del producto
        const productData = await this.page.evaluate((linkInfo) => {
          const data = {
            nombre_producto: linkInfo.title,
            banco: null,
            tasa: null,
            tipo_producto: 'ahorro',
            moneda: 'PEN',
            url_fuente: window.location.href,
            fecha_extraccion: new Date().toISOString(),
            raw_text: ''
          };
          
          // Buscar nombre del banco en diferentes lugares
          const bankSelectors = [
            '.bank-name',
            '.institution-name',
            '[class*="bank"]',
            'h1, h2, h3',
            '.product-header'
          ];
          
          for (const selector of bankSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const text = element.textContent;
              const bankMatch = text.match(/(BCP|BBVA|Interbank|Scotiabank|Banco\s+\w+|Pichincha|Caja\s+\w+|Uno|Falabella|Ripley)/i);
              if (bankMatch) {
                data.banco = bankMatch[1];
                break;
              }
            }
          }
          
          // Buscar tasas en diferentes formatos
          const rateSelectors = [
            '.rate',
            '.tasa',
            '.tea',
            '.trea',
            '[class*="rate"]',
            '[class*="tasa"]',
            '.percentage'
          ];
          
          const allText = document.body.textContent;
          
          // Buscar patrones de tasas en el texto
          const ratePatterns = [
            /TEA[:\s]*(\d+[.,]\d+)\s*%/gi,
            /TREA[:\s]*(\d+[.,]\d+)\s*%/gi,
            /tasa[:\s]*(\d+[.,]\d+)\s*%/gi,
            /(\d+[.,]\d+)\s*%\s*TEA/gi,
            /(\d+[.,]\d+)\s*%/g
          ];
          
          for (const pattern of ratePatterns) {
            const matches = [...allText.matchAll(pattern)];
            if (matches.length > 0) {
              const rateValue = matches[0][1];
              if (rateValue) {
                data.tasa = parseFloat(rateValue.replace(',', '.'));
                break;
              }
            }
          }
          
          // Si no encontramos banco en selectores, extraer del título o URL
          if (!data.banco) {
            const urlMatch = window.location.href.match(/\/(\w+)-/);
            if (urlMatch) {
              data.banco = urlMatch[1];
            }
          }
          
          // Capturar texto para debug
          data.raw_text = allText.substring(0, 200);
          
          return data;
        }, link);
        
        this.logger.info(`Producto extraído: ${productData.banco} - ${productData.nombre_producto} - ${productData.tasa}%`);
        allProducts.push(productData);
        
        // Pausa entre navegaciones para evitar ser detectado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.logger.error(`Error navegando a ${link.href}:`, error.message);
      }
    }
    
    this.logger.info(`Extracción de productos completada: ${allProducts.length} productos`);
    return allProducts;
  }

  /**
   * Extracción independiente - restaura sesión y extrae datos
   * Útil para pruebas cuando ya tienes una sesión guardada
   */
  async extractOnly() {
    try {
      this.logger.info('🔍 Extrayendo datos con restauración de sesión...');
      
      // Intentar restaurar sesión primero
      const hasValidSession = await this.sessionManager.hasValidSession(2); // 2 horas
      
      if (hasValidSession) {
        const sessionData = await this.sessionManager.loadSession();
        const restored = await this.sessionManager.restoreSession(this.page, sessionData);
        
        if (!restored) {
          throw new Error('No se pudo restaurar la sesión guardada');
        }
        
        this.logger.info(`✅ Sesión restaurada: ${sessionData.url}`);
      } else {
        throw new Error('No hay sesión válida para extraer. Usa modo "navigate" primero.');
      }
      
      const currentUrl = this.page.url();
      this.logger.info(`URL actual: ${currentUrl}`);
      
      const products = await this.extractResultsData();
      
      if (products.length > 0) {
        this.logger.info(`✅ Extracción exitosa: ${products.length} productos`);
        
        // Guardar sesión actualizada
        await this.sessionManager.saveSession(this.page, {
          productsFound: products.length,
          extractionSuccessful: true,
          lastExtraction: new Date().toISOString()
        });
      } else {
        this.logger.warn('⚠️ No se encontraron productos en la página actual');
      }
      
      return products;
    } catch (error) {
      this.logger.error('Error en extracción independiente:', error);
      throw error;
    }
  }

  /**
   * Método para obtener información de salud del scraper
   */
  async getHealthInfo() {
    try {
      const testUrl = process.env.KOMPARACOOL_AHORROS_URL || 'https://comparabien.com.pe/ahorros';
      await this.page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      
      const title = await this.page.title();
      const isHealthy = title.toLowerCase().includes('ahorro') || title.toLowerCase().includes('comparabien');
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'KomparaCool scraper funcionando correctamente' : 'No se pudo acceder a KomparaCool',
        lastChecked: new Date().toISOString(),
        testUrl
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Error conectando con KomparaCool: ${error.message}`,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Resto del código original...
  async scrapeOldMethod() {
    try {
      // Esperar a que cargue el contenido
      await new Promise(resolve => setTimeout(resolve, this.config.delays.pageLoad));
      
      // Intentar diferentes selectores comunes para sitios de comparación
      const possibleSelectors = [
        '.product-card',
        '.rate-table tbody tr',
        '.comparison-row',
        '.bank-product',
        '[data-product]'
      ];
      
      let data = [];
      
      for (const selector of possibleSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          
          data = await this.page.evaluate((selector) => {
            const rows = document.querySelectorAll(selector);
            const results = [];
            
            rows.forEach(row => {
              try {
                // Buscar diferentes patrones de nombres de productos
                const nombreElement = row.querySelector('.product-name, .product-title, h3, h4, .name, [data-product-name]');
                const bancoElement = row.querySelector('.bank-name, .institution, .bank, .entity, [data-bank]');
                const tasaElement = row.querySelector('.rate, .interest-rate, .percentage, .tasa, [data-rate]');
                
                if (nombreElement && tasaElement) {
                  const nombre = nombreElement.textContent.trim();
                  const banco = bancoElement ? bancoElement.textContent.trim() : 'No especificado';
                  const tasa = tasaElement.textContent.trim();
                  
                  // Filtrar filas de encabezado o vacías
                  if (nombre && !nombre.toLowerCase().includes('producto') && 
                      !nombre.toLowerCase().includes('banco') && 
                      tasa && tasa.match(/[\d.,]/)) {
                    
                    results.push({
                      nombre_producto: nombre,
                      banco: banco,
                      tasa: tasa,
                      tipo_producto: 'ahorro',
                      moneda: 'PEN' // Asumimos soles por defecto
                    });
                  }
                }
              } catch (error) {
                console.log('Error procesando fila:', error);
              }
            });
            
            return results;
          }, selector);
          
          if (data.length > 0) {
            this.logger.info(`Datos encontrados con selector: ${selector}, cantidad: ${data.length}`);
            break;
          }
        } catch (error) {
          // Continuar con el siguiente selector
          continue;
        }
      }
      
      // Si no encontramos datos con selectores automáticos, intentar método manual
      if (data.length === 0) {
        this.logger.info('Intentando extracción manual de datos');
        data = await this.manualExtraction();
      }
      
      // Normalizar tasas
      data.forEach(item => {
        item.tasa = this.normalizeTasa(item.tasa);
      });
      
      return data.filter(item => item.tasa !== null);
      
    } catch (error) {
      this.logger.error('Error scrapeando ahorros de KomparaCool:', error);
      return [];
    }
  }

  async scrapePlazos() {
    try {
      const url = `${this.config.baseUrl}${this.config.endpoints.plazos}`;
      await this.navigateToUrl(url);
      
      await new Promise(resolve => setTimeout(resolve, this.config.delays.pageLoad));
      
      // Similar lógica que ahorros pero para plazos fijos
      const possibleSelectors = [
        '.product-card',
        '.rate-table tbody tr',
        '.comparison-row',
        '.deposit-product',
        '[data-deposit]'
      ];
      
      let data = [];
      
      for (const selector of possibleSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          
          data = await this.page.evaluate((selector) => {
            const rows = document.querySelectorAll(selector);
            const results = [];
            
            rows.forEach(row => {
              try {
                const nombreElement = row.querySelector('.product-name, .product-title, h3, h4, .name, [data-product-name]');
                const bancoElement = row.querySelector('.bank-name, .institution, .bank, .entity, [data-bank]');
                const tasaElement = row.querySelector('.rate, .interest-rate, .percentage, .tasa, [data-rate]');
                const plazoElement = row.querySelector('.term, .plazo, .period, [data-term]');
                
                if (nombreElement && tasaElement) {
                  const nombre = nombreElement.textContent.trim();
                  const banco = bancoElement ? bancoElement.textContent.trim() : 'No especificado';
                  const tasa = tasaElement.textContent.trim();
                  const plazo = plazoElement ? plazoElement.textContent.trim() : '';
                  
                  if (nombre && !nombre.toLowerCase().includes('producto') && 
                      !nombre.toLowerCase().includes('banco') && 
                      tasa && tasa.match(/[\d.,]/)) {
                    
                    results.push({
                      nombre_producto: `${nombre}${plazo ? ' - ' + plazo : ''}`,
                      banco: banco,
                      tasa: tasa,
                      tipo_producto: 'plazo_fijo',
                      moneda: 'PEN'
                    });
                  }
                }
              } catch (error) {
                console.log('Error procesando fila de plazo:', error);
              }
            });
            
            return results;
          }, selector);
          
          if (data.length > 0) {
            this.logger.info(`Datos de plazos encontrados con selector: ${selector}, cantidad: ${data.length}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Normalizar tasas
      data.forEach(item => {
        item.tasa = this.normalizeTasa(item.tasa);
      });
      
      return data.filter(item => item.tasa !== null);
      
    } catch (error) {
      this.logger.error('Error scrapeando plazos de KomparaCool:', error);
      return [];
    }
  }

  async manualExtraction() {
    try {
      // Método de respaldo para extraer datos cuando los selectores automáticos fallan
      const data = await this.page.evaluate(() => {
        const results = [];
        
        // Buscar tablas que contengan datos de tasas
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          
          rows.forEach((row, index) => {
            if (index === 0) return; // Saltar encabezado
            
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 3) {
              const textos = Array.from(cells).map(cell => cell.textContent.trim());
              
              // Buscar patrones de banco, producto y tasa
              const tasaPattern = /(\d+[.,]?\d*)\s*%?/;
              const tasaIndex = textos.findIndex(text => tasaPattern.test(text));
              
              if (tasaIndex !== -1) {
                const tasa = textos[tasaIndex];
                const banco = textos[0] || 'No especificado';
                const producto = textos[1] || textos[tasaIndex - 1] || 'Producto sin nombre';
                
                if (banco && producto && tasa) {
                  results.push({
                    nombre_producto: producto,
                    banco: banco,
                    tasa: tasa,
                    tipo_producto: 'ahorro',
                    moneda: 'PEN'
                  });
                }
              }
            }
          });
        });
        
        return results;
      });
      
      this.logger.info(`Extracción manual completada: ${data.length} elementos`);
      return data;
      
    } catch (error) {
      this.logger.error('Error en extracción manual:', error);
      return [];
    }
  }

  // Método para verificar si el sitio tiene protección anti-scraping
  async checkAntiScraping() {
    try {
      const url = this.config.baseUrl;
      await this.navigateToUrl(url);
      
      // Verificar indicadores comunes de protección anti-scraping
      const indicators = await this.page.evaluate(() => {
        const checks = {
          cloudflare: !!document.querySelector('[data-cf-beacon]') || document.title.includes('Cloudflare'),
          captcha: !!document.querySelector('.g-recaptcha, .h-captcha, .captcha'),
          blocked: document.body.textContent.includes('blocked') || document.body.textContent.includes('forbidden'),
          jsChallenge: document.body.textContent.includes('JavaScript') && document.body.textContent.includes('enable')
        };
        
        return checks;
      });
      
      const hasProtection = Object.values(indicators).some(indicator => indicator);
      
      if (hasProtection) {
        this.logger.warn('Posible protección anti-scraping detectada en KomparaCool:', indicators);
      } else {
        this.logger.info('No se detectó protección anti-scraping obvia en KomparaCool');
      }
      
      return { hasProtection, indicators };
      
    } catch (error) {
      this.logger.error('Error verificando anti-scraping:', error);
      return { hasProtection: true, indicators: { error: true } };
    }
  }
}

module.exports = KomparaCoolScraper;
