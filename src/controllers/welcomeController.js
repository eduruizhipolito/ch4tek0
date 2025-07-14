// src/controllers/welcomeController.js

const { message } = require('../models/welcomeMessage');

exports.getWelcome = (request, reply) => {
  reply.send({ status: 'ok', message });
};
