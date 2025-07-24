// src/services/tasasPlazoService.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Consulta los top 10 depósitos a plazo según filtros
 * @param {string} tipoEntidad - banco, financiera, caja, null
 * @param {string} moneda - PEN, USD, null
 * @param {number} plazo - plazo en días
 * @returns {Promise<Array>} - Lista de productos
 */
async function getTasasPlazo(tipoEntidad, moneda, plazo) {
  // Mapear a los valores reales de tu tabla
  const tipoMap = {
    tipo_bancos: 'banco',
    tipo_financieras: 'financiera',
    tipo_cajas: 'caja',
    tipo_todas: null
  };
  const tipo = (tipoEntidad === 'todas') ? null : tipoMap[tipoEntidad] || null;
  const monedaParam = (!moneda || moneda === 'todas') ? null : moneda;
  const plazoParam = plazo || null;

  const { data, error } = await supabase
    .rpc('get_tasas_pasivos', { tipo_entidad_param: tipo, moneda_param: monedaParam, tipo_producto_param: 'plazo' });

  if (error) {
    console.error('Error consultando Supabase RPC (plazo):', error);
    return [];
  }
  console.log('Datos recibidos de la función RPC (plazo):', JSON.stringify(data, null, 2));
  return data || [];
}

module.exports = { getTasasPlazo };
