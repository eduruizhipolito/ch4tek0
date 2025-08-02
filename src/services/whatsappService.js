const apiUrl = `https://graph.facebook.com/${process.env.API_VERSION || 'v17.0'}`;
const token = process.env.WHATSAPP_API_KEY;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function sendCurrencyButtons(to) {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: '¿En qué moneda deseas ahorrar?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'moneda_pen', title: 'Soles' } },
          { type: 'reply', reply: { id: 'moneda_usd', title: 'Dólares' } }
        ]
      }
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.text();
    console.error('Error enviando botones de moneda:', error);
  }
  return res.ok;
}
async function sendMessage(to, message) {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    text: { body: message }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.text();
    console.error('Error enviando mensaje:', error);
  }
  return res.ok;
}

async function sendWelcomeWithButtons(to, welcomeText) {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: welcomeText },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'op_tasas', title: 'Consultar Tasas' } },
          { type: 'reply', reply: { id: 'op_feedback', title: 'Enviar Comentarios' } }
        ]
      }
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.text();
    console.error('Error enviando mensaje interactivo:', error);
  }
  return res.ok;
}

async function sendTasasMenuWithButtons(to) {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: '¿Qué tipo de tasas deseas consultar?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'op_ahorros', title: 'Ahorros' } },
          { type: 'reply', reply: { id: 'op_plazo', title: 'Plazo' } }
        ]
      }
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.text();
    console.error('Error enviando menú de tasas:', error);
  }
  return res.ok;
}

async function sendImage(to, imageUrl, caption = '') {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      caption
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Error enviando imagen:', data);
  }
  return data;
}

const institutionTypes = require('../models/institutionTypes');

async function sendInstitutionTypeList(to) {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Selecciona el tipo de institución' },
      body: { text: '¿Sobre qué tipo de institución quieres consultar tasas de ahorro?' },
      footer: { text: 'Elige una opción para continuar' },
      action: {
        button: 'Ver opciones',
        sections: [
          {
            title: 'Instituciones',
            rows: institutionTypes
          }
        ]
      }
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.text();
    console.error('Error enviando lista de instituciones:', error);
  }
  return res.ok;
}

const plazosAhorro = require('../models/plazosAhorro');

async function sendTermList(to) {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Selecciona el plazo del depósito' },
      body: { text: '¿Por cuánto tiempo deseas depositar tu ahorro?' },
      footer: { text: 'Elige un plazo para continuar' },
      action: {
        button: 'Ver plazos',
        sections: [
          {
            title: 'Plazos disponibles',
            rows: plazosAhorro
          }
        ]
      }
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.text();
    console.error('Error enviando lista de plazos:', error);
  }
  return res.ok;
}

const axios = require('axios');
const FormData = require('form-data');

/**
 * Sube una imagen al endpoint /media de WhatsApp y retorna el media_id
 * @param {Buffer} buffer - Imagen PNG en buffer
 * @param {string} filename - Nombre del archivo (ej: ranking.png)
 * @returns {Promise<string|null>} media_id o null si error
 */
async function uploadImageToWhatsApp(buffer, filename = 'ranking.png') {
  const url = `${apiUrl}/${phoneNumberId}/media`;
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: 'image/png' });
  form.append('type', 'image/png');
  form.append('messaging_product', 'whatsapp');

  try {
    const res = await axios.post(url, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });
    return res.data.id || null;
  } catch (err) {
    console.error('Error subiendo imagen a WhatsApp /media:', err.response ? err.response.data : err);
    return null;
  }
}

async function sendDepositoPlazoQuestion(to) {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: '¿Deseas consultar las tasas de Depósitos a Plazo?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'deposito_si', title: 'Sí' } },
          { type: 'reply', reply: { id: 'deposito_no', title: 'No' } }
        ]
      }
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.text();
    console.error('Error enviando pregunta de depósito a plazo:', error);
  }
  return res.ok;
}

async function sendEndOfFlowMenuWithButtons(to, productoActual = 'ahorros') {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  let otroProductoId, otroProductoTitulo;
  if (productoActual === 'ahorros') {
    otroProductoId = 'op_plazo';
    otroProductoTitulo = 'Tasas Dep. Plazo';
  } else {
    otroProductoId = 'op_ahorros';
    otroProductoTitulo = 'Tasa de ahorros';
  }
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: '¿Qué más deseas hacer?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: otroProductoId, title: otroProductoTitulo } },
          { type: 'reply', reply: { id: 'op_premium_alertas', title: 'Recibir Alertas' } },
          { type: 'reply', reply: { id: 'op_feedback', title: 'Comentarios' } }
        ]
      }
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.text();
    console.error('Error enviando menú de fin de flujo:', error);
  }
  return res.ok;
}

module.exports = {
  sendMessage,
  sendWelcomeWithButtons,
  sendTasasMenuWithButtons,
  sendImage,
  sendInstitutionTypeList,
  sendTermList,
  uploadImageToWhatsApp,
  sendCurrencyButtons,
  sendDepositoPlazoQuestion
};
