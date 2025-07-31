// testRankingImage.js
const fs = require('fs');
const { generarImagenRanking } = require('../src/utils/rankingImage');

// Datos simulados de ejemplo con nombres largos para probar autoajuste
tasas = [
  { nombre_entidad: 'Banco de Crédito del Perú', nombre_producto: 'Campaña Haz Crecer tus Ahorros Digital Premium', tasa: 5.25, montoGanar: 2625 },
  { nombre_entidad: 'Caja Municipal de Ahorro y Crédito de Cusco', nombre_producto: 'AhorraMás Súper Beneficios', tasa: 5.00, montoGanar: 2500 },
  { nombre_entidad: 'Banco Bilbao Vizcaya Argentaria', nombre_producto: 'Cuenta Flexitotal Premium Plus', tasa: 5.00, montoGanar: 2500 },
  { nombre_entidad: 'Caja Rural de Ahorro y Crédito Los Andes', nombre_producto: 'Cuenta Soñada Especial', tasa: 5.00, montoGanar: 2500 },
  { nombre_entidad: 'Banco Financiero del Perú', nombre_producto: 'Campaña Haz Crecer tus Ahorros Agencias', tasa: 5.00, montoGanar: 2500 },
  { nombre_entidad: 'Banco AlFin', nombre_producto: 'Ahorro Meta Digital Exclusivo', tasa: 5.00, montoGanar: 2500 },
  { nombre_entidad: 'Banco Pichincha Perú', nombre_producto: 'Cuenta de Ahorros Preferente VIP', tasa: 4.00, montoGanar: 2000 },
  { nombre_entidad: 'Mi Banco del Grupo ACP', nombre_producto: 'Cuenta Full Ahorro Premium', tasa: 4.00, montoGanar: 2000 },
  { nombre_entidad: 'Scotiabank Perú', nombre_producto: 'Cuenta Power Súper Tasa', tasa: 1.75, montoGanar: 875 },
  { nombre_entidad: 'Interbank Corporación Financiera', nombre_producto: 'Cuenta de Ahorros Súper Tasa Especial', tasa: 1.50, montoGanar: 750 }
];

const buffer = generarImagenRanking(tasas);
fs.writeFileSync('top10_tasas.png', buffer);
console.log('Imagen generada: top10_tasas.png');
