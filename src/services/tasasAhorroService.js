// src/services/tasasAhorroService.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getTasasAhorro() {
  const { data, error } = await supabase
    .from('productos')
    .select('id_producto, nombre_producto, tasa, banco')
    .order('tasa', { ascending: false })
    .limit(10);
  if (error) {
    console.error('Error consultando Supabase:', error);
    return [];
  }
  return data;
}

module.exports = { getTasasAhorro };
