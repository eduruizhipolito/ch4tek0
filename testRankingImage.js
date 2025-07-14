// testRankingImage.js
const fs = require('fs');
const { generarImagenRanking } = require('./src/utils/rankingImage');

// Datos simulados de ejemplo
tasas = [
  { banco: 'Caja Cusco', nombre_producto: 'Campaña Haz Crecer tus Ahorros Digital', tasa: 5.25 },
  { banco: 'Financiera Oh!', nombre_producto: 'AhorraMás', tasa: 5.00 },
  { banco: 'Caja Ica', nombre_producto: 'Cuenta Flexitotal', tasa: 5.00 },
  { banco: 'Caja Maynas', nombre_producto: 'Cuenta Soñada', tasa: 5.00 },
  { banco: 'Caja Cusco', nombre_producto: 'Campaña Haz Crecer tus Ahorros Agencias', tasa: 5.00 },
  { banco: 'Banco AlFin', nombre_producto: 'Ahorro Meta Digital', tasa: 5.00 },
  { banco: 'Banco Pichincha', nombre_producto: 'Cuenta de Ahorros Preferente', tasa: 4.00 },
  { banco: 'Mi Banco', nombre_producto: 'Cuenta Full Ahorro', tasa: 4.00 },
  { banco: 'Scotiabank', nombre_producto: 'Cuenta Power', tasa: 1.75 },
  { banco: 'Interbank', nombre_producto: 'Cuenta de Ahorros Súper Tasa', tasa: 1.50 }
];

const buffer = generarImagenRanking(tasas);
fs.writeFileSync('top10_tasas.png', buffer);
console.log('Imagen generada: top10_tasas.png');
