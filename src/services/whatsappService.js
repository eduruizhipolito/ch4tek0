// src/services/whatsappService.js
const apiUrl = `https://graph.facebook.com/${process.env.API_VERSION || 'v17.0'}`;
const token = process.env.WHATSAPP_API_KEY;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

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
          { type: 'reply', reply: { id: 'op_tasas', title: 'Tasas' } },
          { type: 'reply', reply: { id: 'op_cambio', title: 'Tipo de Cambio' } },
          { type: 'reply', reply: { id: 'op_juego', title: 'Juego' } }
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

module.exports = {
  sendMessage,
  sendWelcomeWithButtons,
  sendTasasMenuWithButtons,
  sendImage
};
