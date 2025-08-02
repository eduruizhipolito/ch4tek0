// src/services/premiumDatabaseService.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

// Verificar que las variables de entorno existan
if (!supabaseUrl || !supabaseKey) {
  console.error('ADVERTENCIA: Variables de Supabase no configuradas. Las funciones premium no funcionarán.');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Registra la intención de pago premium en Supabase
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} planType - Tipo de plan ('anual' o 'mensual')
 * @param {number} price - Precio del plan (50 o 5)
 * @returns {Promise<Object>} Resultado de la operación
 */
async function registrarIntencionPremium(phoneNumber, planType, price) {
  try {
    if (!supabase) {
      console.log('Supabase no configurado, simulando registro de intención premium:', { phoneNumber, planType, price });
      return { success: true, id: 'mock_id', status: 'pendiente' };
    }

    const { data, error } = await supabase.rpc('registrar_intencion_premium', {
      p_phone_number: phoneNumber,
      p_plan_type: planType,
      p_price: price
    });

    if (error) {
      console.error('Error registrando intención premium:', error);
      return { success: false, error: error.message };
    }

    console.log('Intención premium registrada:', data);
    return data;
  } catch (error) {
    console.error('Error en registrarIntencionPremium:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Confirma el pago premium (cambia status a 'validar')
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {Promise<Object>} Resultado de la operación
 */
async function confirmarPagoPremium(phoneNumber) {
  try {
    if (!supabase) {
      console.log('Supabase no configurado, simulando confirmación de pago premium:', phoneNumber);
      return { success: true, plan_type: 'anual', price: 50 };
    }

    const { data, error } = await supabase.rpc('confirmar_pago_premium', {
      p_phone_number: phoneNumber
    });

    if (error) {
      console.error('Error confirmando pago premium:', error);
      return { success: false, error: error.message };
    }

    console.log('Pago premium confirmado:', data);
    return data;
  } catch (error) {
    console.error('Error en confirmarPagoPremium:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene el estado premium de un usuario
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {Promise<Object>} Estado premium del usuario
 */
async function obtenerEstadoPremium(phoneNumber) {
  try {
    const { data, error } = await supabase
      .from('premium_intentions')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error obteniendo estado premium:', error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      data: data.length > 0 ? data[0] : null 
    };
  } catch (error) {
    console.error('Error en obtenerEstadoPremium:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  registrarIntencionPremium,
  confirmarPagoPremium,
  obtenerEstadoPremium
};
