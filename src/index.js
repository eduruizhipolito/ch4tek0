const fastify = require('fastify');
const dotenv = require('dotenv');

dotenv.config();

const app = fastify({ logger: true });

const { getWelcome } = require('./controllers/welcomeController');

// Registrar la ruta webhook
app.register(require('./routes/webhook'));

app.get('/', getWelcome);

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
