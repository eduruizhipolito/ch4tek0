// src/services/tasasAhorroService.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// tipoEntidad: 'tipo_bancos', 'tipo_financieras', 'tipo_cajas', 'tipo_todas'
async function getTasasAhorro(tipoEntidad, moneda) {
  // Mapear a los valores reales de tu tabla
  const tipoMap = {
    tipo_bancos: 'banco',
    tipo_financieras: 'financiera',
    tipo_cajas: 'caja',
    tipo_todas: null
  };
  // Si el usuario selecciona 'todas', enviamos null al procedimiento
  const tipo = (tipoEntidad === 'todas') ? null : tipoMap[tipoEntidad] || null;
  const monedaParam = (!moneda || moneda === 'todas') ? null : moneda;

  const { data, error } = await supabase
    .rpc('get_tasas_pasivos', { tipo_entidad_param: tipo, moneda_param: monedaParam, tipo_producto_param: 'ahorro' });

  if (error) {
    console.error('Error consultando Supabase RPC:', error);
    return [];
  }
  console.log('Datos recibidos de la función RPC:', JSON.stringify(data, null, 2));
  return data || [];
}

module.exports = { getTasasAhorro };
