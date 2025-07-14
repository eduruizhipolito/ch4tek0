import fastify from 'fastify';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = fastify({ logger: true });

// Rutas base (puedes modularizar luego)
app.get('/', async (request, reply) => {
  const welcome = process.env.WELCOME_MESSAGE || '¡Hola! Soy tu asistente de WhatsApp para tasas bancarias.';
  return { status: 'ok', message: welcome };
});

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
    app.log.info(`Servidor iniciado en puerto ${process.env.PORT || 3000}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
