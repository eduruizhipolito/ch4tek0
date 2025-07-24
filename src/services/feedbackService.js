// src/services/feedbackService.js
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Guarda un feedback del usuario en la tabla feedback
 * @param {string} nro_usuario - número de WhatsApp
 * @param {string} comentario - texto largo
 * @returns {Promise<boolean>} true si ok
 */
async function guardarFeedback(nro_usuario, comentario) {
  const fecha_comentario = new Date().toISOString();
  const { error } = await supabase
    .from('feedback')
    .insert([{ nro_usuario, comentario, fecha_comentario }]);
  if (error) {
    console.error('Error guardando feedback:', error);
    return false;
  }
  return true;
}

module.exports = { guardarFeedback };
