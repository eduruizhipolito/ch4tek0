// src/services/premiumService.js
const apiUrl = `https://graph.facebook.com/${process.env.API_VERSION || 'v17.0'}`;
const token = process.env.WHATSAPP_API_KEY;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function sendPremiumOfferWithPaymentButtons(to) {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  
  // URLs de pago desde variables de entorno
  const urlPagoAnual = process.env.MERCADOPAGO_URL_ANUAL || 'https://mercadopago.com/anual';
  const urlPagoMensual = process.env.MERCADOPAGO_URL_MENSUAL || 'https://mercadopago.com/mensual';
  
  const offerText = `🚀 *¡Upgrade a Chateko Premium!*

Con Chateko Premium recibirás:
✅ Alertas personalizadas cuando las tasas cambien
✅ Notificaciones de nuevos productos bancarios
✅ Soporte prioritario

*Planes disponibles SOLO para nuestros primeros usuarios:*
📅 Plan Anual: S/50 (ahorra +15%)
📅 Plan Mensual: S/5

¿Qué plan prefieres?`;

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: offerText },
      action: {
        buttons: [
          { 
            type: 'url', 
            url: { 
              url: urlPagoAnual,
              title: 'Plan Anual S/50' 
            } 
          },
          { 
            type: 'url', 
            url: { 
              url: urlPagoMensual,
              title: 'Plan Mensual S/5' 
            } 
          },
          { 
            type: 'reply', 
            reply: { 
              id: 'cancelar_premium', 
              title: 'Cancelar' 
            } 
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
    console.error('Error enviando oferta premium:', error);
  }
  return res.ok;
}

async function sendPaymentLink(to, planType) {
  const url = `${apiUrl}/${phoneNumberId}/messages`;
  
  let paymentUrl, planName, price;
  if (planType === 'anual') {
    paymentUrl = process.env.MERCADOPAGO_URL_ANUAL || 'https://mercadopago.com/anual';
    planName = 'Plan Anual';
    price = 'S/50';
  } else {
    paymentUrl = process.env.MERCADOPAGO_URL_MENSUAL || 'https://mercadopago.com/mensual';
    planName = 'Plan Mensual';
    price = 'S/5';
  }

  const messageText = `💳 *${planName} - ${price}*

Para completar tu suscripción a Chateko Premium, haz clic en el siguiente enlace:

${paymentUrl}

Una vez completado el pago, envía el mensaje "pago_confirmado" para activar tu cuenta premium.

¡Gracias por elegir Chateko Premium! 🚀`;

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: messageText }
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
    console.error('Error enviando enlace de pago:', error);
  }
  return res.ok;
}

module.exports = {
  sendPremiumOfferWithPaymentButtons,
  sendPaymentLink
};
