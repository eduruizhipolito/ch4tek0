// src/controllers/conversationController.js
const { sendWelcomeWithButtons, sendTasasMenuWithButtons, sendMessage, sendDepositoPlazoQuestion } = require('../services/whatsappService');
const { message: welcomeMessage } = require('../models/welcomeMessage');
const { getTasasAhorro } = require('../services/tasasAhorroService');

/**
 * Maneja la lógica de conversación principal del bot
 * @param {object} msg - El mensaje recibido de WhatsApp
 * @returns {Promise<void>}
 */
async function handleConversation(msg) {
  const { getUserState, setUserState, resetUserState } = require('../services/userState');
  const { sendInstitutionTypeList, sendMessage } = require('../services/whatsappService');
  const institutionTypes = require('../models/institutionTypes');

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

  // --- NUEVO FLUJO FEEDBACK ---
  if (buttonId === 'op_feedback') {
    setUserState(from, { flujo: 'feedback', step: 1 });
    await sendMessage(from, 'Nos encantaría que nos des tu feedback para mejorar el servicio. Por favor, escribe tu comentario:');
    return;
  }

  if (buttonId === 'op_ahorros') {
    // Iniciar flujo conversacional para Tasas de Ahorro
    const { setUserState } = require('../services/userState');
    const { sendCurrencyButtons } = require('../services/whatsappService');
    setUserState(from, { flujo: 'ahorros', step: 1 });
    await sendCurrencyButtons(from);
    console.log('Flujo de ahorros iniciado y botones de moneda enviados a', from);
    return;
  }

  if (buttonId === 'op_plazo') {
    // Iniciar flujo conversacional para Depósitos a Plazo
    const { setUserState } = require('../services/userState');
    const { sendCurrencyButtons } = require('../services/whatsappService');
    setUserState(from, { flujo: 'plazo', step: 1 });
    await sendCurrencyButtons(from);
    console.log('Flujo de depósitos a plazo iniciado y botones de moneda enviados a', from);
    return;
  }

  // Manejo de botones de la pregunta de Depósitos a Plazo
  if (buttonId === 'deposito_si') {
    const { setUserState } = require('../services/userState');
    const { sendCurrencyButtons } = require('../services/whatsappService');
    setUserState(from, { flujo: 'plazo', step: 1 });
    await sendCurrencyButtons(from);
    console.log('Usuario eligió consultar depósitos a plazo, iniciando flujo');
    return;
  }

  if (buttonId === 'deposito_no') {
    await sendWelcomeWithButtons(from, welcomeMessage + '\n\n¿Qué deseas hacer?');
    console.log('Usuario eligió no consultar depósitos a plazo, volviendo al menú principal');
    return;
  }

  // --- FLUJO AHORROS: paso a paso ---
  const userState = getUserState(from);

  // --- PASO FEEDBACK: recibir comentario largo y guardar en Supabase ---
  if (userState.flujo === 'feedback' && userState.step === 1) {
    if (msg.type === 'text' && msg.text && msg.text.body) {
      const comentario = msg.text.body;
      const { guardarFeedback } = require('../services/feedbackService');
      await guardarFeedback(from, comentario);
      await sendMessage(from, '¡Muchas gracias por tus comentarios! Valoramos mucho tu opinión y esperamos poder ser mejores cada día.');
      resetUserState(from);
      await sendWelcomeWithButtons(from, welcomeMessage + '\n\n¿Qué deseas consultar?');
      return;
    }
  }
  if (userState.flujo === 'ahorros') {
    // Paso 1: Selección de moneda
    if (userState.step === 1) {
      if (msg.type === 'interactive' && msg.interactive && msg.interactive.type === 'button_reply') {
        if (msg.interactive.button_reply.id === 'moneda_pen' || msg.interactive.button_reply.id === 'moneda_usd') {
          const moneda = msg.interactive.button_reply.id === 'moneda_pen' ? 'PEN' : 'USD';
          setUserState(from, { moneda, step: 2 });
          await sendMessage(from, '¿Cuánto planeas ahorrar? (por ejemplo: 15000)');
          return;
        }
      }
    }
    // Paso 2: Recibir monto
    if (userState.step === 2) {
      if (msg.type === 'text' && msg.text && msg.text.body) {
        const monto = parseFloat(msg.text.body.replace(/[^\d.]/g, ''));
        if (!isNaN(monto) && monto > 0) {
          setUserState(from, { monto, step: 3 });
          const { sendTermList } = require('../services/whatsappService');
          await sendTermList(from);
          return;
        } else {
          await sendMessage(from, 'Por favor ingresa un monto válido (solo números, por ejemplo: 15000).');
          return;
        }
      }
    }
    // Paso 3: Recibir plazo
    if (userState.step === 3) {
      if (msg.type === 'interactive' && msg.interactive && msg.interactive.type === 'list_reply') {
        const selectedId = msg.interactive.list_reply.id;
        const plazosAhorro = require('../models/plazosAhorro');
        const selected = plazosAhorro.find(opt => opt.id === selectedId);
        if (selected) {
          const plazoDias = parseInt(selectedId.replace('plazo_', ''));
          setUserState(from, { plazo: plazoDias, step: 4 });
          const { sendInstitutionTypeList } = require('../services/whatsappService');
          await sendInstitutionTypeList(from);
          return;
        }
      }
    }
    // Paso 4: Recibir tipo de institución seleccionado y generar imagen
    if (userState.step === 4) {
      if (msg.type === 'interactive' && msg.interactive && msg.interactive.type === 'list_reply') {
        const selectedId = msg.interactive.list_reply.id;
        const selected = institutionTypes.find(opt => opt.id === selectedId);
        if (selected) {
          setUserState(from, { institutionType: selectedId, step: 5 });
          // --- FILTRADO, CÁLCULO Y GENERACIÓN DE IMAGEN ---
          const { getTasasAhorro } = require('../services/tasasAhorroService');
          const { generarImagenRanking } = require('../utils/rankingImage');
          const { sendImage } = require('../services/whatsappService');

          const userStateFinal = getUserState(from);
          // Si el usuario selecciona 'tipo_todas', pasamos null para obtener todas las instituciones
const tipoEntidad = userStateFinal.institutionType === 'tipo_todas' ? null : userStateFinal.institutionType;
          const monto = userStateFinal.monto;
          const plazo = userStateFinal.plazo;
          const moneda = userStateFinal.moneda;

          console.log('Tipo de institución y moneda recibidos para filtrado:', tipoEntidad, moneda);

          // Consultar tasas filtradas
          const tasas = await getTasasAhorro(tipoEntidad, moneda);

          // Calcular monto a ganar para cada producto
          const tasasConMonto = tasas.map(t => {
            const tasaNum = typeof t.tasa === 'string' ? parseFloat(t.tasa) : t.tasa;
            const montoGanar = Math.round(monto * (tasaNum / 100) * (plazo / 360));
            return {
              ...t,
              banco: t.nombre_entidad || t.banco || '',
              montoGanar
            };
          });

          // Generar imagen
          const top10 = tasasConMonto.slice(0, 10);
          const imagenBuffer = generarImagenRanking(top10, moneda);

          // Subir imagen a WhatsApp y obtener media_id
          const { uploadImageToWhatsApp } = require('../services/whatsappService');
          const mediaId = await uploadImageToWhatsApp(imagenBuffer, `ranking_${from}_${Date.now()}.png`);
          if (mediaId) {
            const url = `${process.env.API_VERSION ? `https://graph.facebook.com/${process.env.API_VERSION}` : 'https://graph.facebook.com/v17.0'}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
            const body = {
              messaging_product: 'whatsapp',
              to: from,
              type: 'image',
              image: {
                id: mediaId,
                caption: 'Top tasas de ahorro personalizadas'
              }
            };
            await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(body)
            });
            await sendMessage(from, '¡Listo! Aquí tienes el ranking de cuentas de ahorro personalizado según tu perfil.');
            // Preguntar si desea consultar depósitos a plazo
            await sendDepositoPlazoQuestion(from);
          } else {
            await sendMessage(from, 'Ocurrió un error al generar la imagen. Intenta de nuevo más tarde.');
            resetUserState(from);
          }
          return;
        }
      }
    }
  }

  // --- FLUJO PLAZO: paso a paso ---
  if (buttonId === 'op_plazo') {
    const { setUserState } = require('../services/userState');
    const { sendCurrencyButtons } = require('../services/whatsappService');
    setUserState(from, { flujo: 'plazo', step: 1 });
    await sendCurrencyButtons(from);
    console.log('Flujo de plazo iniciado y botones de moneda enviados a', from);
    return;
  }

  if (userState.flujo === 'plazo') {
    // Paso 1: Selección de moneda
    if (userState.step === 1) {
      if (msg.type === 'interactive' && msg.interactive && msg.interactive.type === 'button_reply') {
        if (msg.interactive.button_reply.id === 'moneda_pen' || msg.interactive.button_reply.id === 'moneda_usd') {
          const moneda = msg.interactive.button_reply.id === 'moneda_pen' ? 'PEN' : 'USD';
          setUserState(from, { moneda, step: 2 });
          await sendMessage(from, '¿Cuánto planeas depositar? (por ejemplo: 15000)');
          return;
        }
      }
    }
    // Paso 2: Recibir monto
    if (userState.step === 2) {
      if (msg.type === 'text' && msg.text && msg.text.body) {
        const monto = parseFloat(msg.text.body.replace(/[^\d.]/g, ''));
        if (!isNaN(monto) && monto > 0) {
          setUserState(from, { monto, step: 3 });
          const { sendTermList } = require('../services/whatsappService');
          await sendTermList(from);
          return;
        } else {
          await sendMessage(from, 'Por favor ingresa un monto válido (solo números, por ejemplo: 15000).');
          return;
        }
      }
    }
    // Paso 3: Recibir plazo
    if (userState.step === 3) {
      if (msg.type === 'interactive' && msg.interactive && msg.interactive.type === 'list_reply') {
        const selectedId = msg.interactive.list_reply.id;
        const plazosAhorro = require('../models/plazosAhorro');
        const selected = plazosAhorro.find(opt => opt.id === selectedId);
        if (selected) {
          const plazoDias = parseInt(selectedId.replace('plazo_', ''));
          setUserState(from, { plazo: plazoDias, step: 4 });
          const { sendInstitutionTypeList } = require('../services/whatsappService');
          await sendInstitutionTypeList(from);
          return;
        }
      }
    }
    // Paso 4: Recibir tipo de institución seleccionado y generar imagen
    if (userState.step === 4) {
      if (msg.type === 'interactive' && msg.interactive && msg.interactive.type === 'list_reply') {
        const selectedId = msg.interactive.list_reply.id;
        const institutionTypes = require('../models/institutionTypes');
        const selected = institutionTypes.find(opt => opt.id === selectedId);
        if (selected) {
          setUserState(from, { institutionType: selectedId, step: 5 });
          // --- FILTRADO, CÁLCULO Y GENERACIÓN DE IMAGEN ---
          const { getTasasPlazo } = require('../services/tasasPlazoService');
          const { generarImagenRanking } = require('../utils/rankingImage');
          const { sendImage } = require('../services/whatsappService');

          const userStateFinal = getUserState(from);
          const tipoEntidad = userStateFinal.institutionType;
          const monto = userStateFinal.monto;
          const plazo = userStateFinal.plazo;
          const moneda = userStateFinal.moneda;

          console.log('Tipo de institución, moneda y plazo recibidos para filtrado (plazo):', tipoEntidad, moneda, plazo);

          // Consultar tasas filtradas
          const tasas = await getTasasPlazo(tipoEntidad, moneda, plazo);

          // Calcular monto a ganar para cada producto
          const tasasConMonto = tasas.map(t => {
            const tasaNum = typeof t.tasa === 'string' ? parseFloat(t.tasa) : t.tasa;
            const montoGanar = Math.round(monto * (tasaNum / 100) * (plazo / 360));
            return {
              ...t,
              banco: t.nombre_entidad || t.banco || '',
              montoGanar
            };
          });

          // Generar imagen
          const top10 = tasasConMonto.slice(0, 10);
          const imagenBuffer = generarImagenRanking(top10, moneda);

          // Subir imagen a WhatsApp y obtener media_id
          const { uploadImageToWhatsApp } = require('../services/whatsappService');
          const mediaId = await uploadImageToWhatsApp(imagenBuffer, `ranking_plazo_${from}_${Date.now()}.png`);
          if (mediaId) {
            const url = `${process.env.API_VERSION ? `https://graph.facebook.com/${process.env.API_VERSION}` : 'https://graph.facebook.com/v17.0'}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
            const body = {
              messaging_product: 'whatsapp',
              to: from,
              type: 'image',
              image: {
                id: mediaId,
                caption: 'Top depósitos a plazo personalizados'
              }
            };
            await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(body)
            });
            await sendMessage(from, '¡Listo! Aquí tienes el ranking de cuentas de ahorro personalizado según tu perfil.');
            // Preguntar si desea consultar depósitos a plazo
            await sendDepositoPlazoQuestion(from);
          } else {
            await sendMessage(from, 'Ocurrió un error al generar la imagen. Intenta de nuevo más tarde.');
            resetUserState(from);
          }
          return;
        }
      }
    }
  }

  // Primer mensaje o mensaje de texto
  await sendWelcomeWithButtons(from, welcomeMessage + '\n\n¿Qué deseas hacer?');
  console.log('Mensaje de bienvenida interactivo enviado a', from);
}

module.exports = { handleConversation };
