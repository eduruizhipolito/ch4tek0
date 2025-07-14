// src/controllers/conversationController.js
const { sendWelcomeWithButtons, sendTasasMenuWithButtons, sendMessage } = require('../services/whatsappService');
const { message: welcomeMessage } = require('../models/welcomeMessage');
const { getTasasAhorro } = require('../services/tasasAhorroService');

/**
 * Maneja la lógica de conversación principal del bot
 * @param {object} msg - El mensaje recibido de WhatsApp
 * @returns {Promise<void>}
 */
async function handleConversation(msg) {
  const from = msg.from;

  // Detectar si es un mensaje de tipo botón y extraer el id del botón
  let buttonId = null;
  // Variante antigua (msg.button)
  if (msg.type === 'button' && msg.button) {
    if (msg.button.payload) {
      buttonId = msg.button.payload;
    } else if (msg.button.reply && msg.button.reply.id) {
      buttonId = msg.button.reply.id;
    }
  }
  // Variante oficial WhatsApp Cloud API (msg.interactive.button_reply)
  if (msg.type === 'interactive' && msg.interactive && msg.interactive.type === 'button_reply') {
    buttonId = msg.interactive.button_reply.id;
  }

  // Flujo de conversación por botón
  if (buttonId === 'op_tasas') {
    await sendTasasMenuWithButtons(from);
    console.log('Menú de tasas enviado a', from);
    return;
  }

  if (buttonId === 'op_ahorros') {
    // URL pública directa de Google Drive
    const imageUrl = 'https://drive.google.com/uc?export=view&id=1Q1is-iE2fScQKaqVDGu62M_Ec65pdq4D';
    const { sendImage } = require('../services/whatsappService');
    await sendImage(from, imageUrl, 'Top 10 tasas de ahorro del sistema');
    console.log('Imagen de ranking enviada a', from);
    return;
  }

  // Primer mensaje o mensaje de texto
  await sendWelcomeWithButtons(from, welcomeMessage + '\n\n¿Qué deseas consultar?');
  console.log('Mensaje de bienvenida interactivo enviado a', from);
}

module.exports = { handleConversation };
