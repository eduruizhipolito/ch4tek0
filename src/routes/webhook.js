// src/routes/webhook.js
const fastifyPlugin = require('fastify-plugin');

module.exports = fastifyPlugin(async function webhookRoute(fastify, opts) {
  // GET para verificación de webhook con Meta
  fastify.get('/webhook', (request, reply) => {
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
      reply.code(200).send(challenge);
    } else {
      reply.code(403).send('Forbidden');
    }
  });

  // POST para recibir mensajes
  const { sendMessage, sendWelcomeWithButtons, sendTasasMenuWithButtons } = require('../services/whatsappService');
  const { message: welcomeMessage } = require('../models/welcomeMessage');

  fastify.post('/webhook', async (request, reply) => {
    console.log('Mensaje recibido:', JSON.stringify(request.body, null, 2));
    // Extraer datos del mensaje entrante
    try {
      const entry = request.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;
      if (messages && messages.length > 0) {
        const msg = messages[0];
        // Delegar la lógica de conversación al controlador
        const { handleConversation } = require('../controllers/conversationController');
        await handleConversation(msg);
      }
    } catch (err) {
      console.error('Error procesando el mensaje entrante:', err);
    }
    reply.code(200).send('EVENT_RECEIVED');
  });
});
