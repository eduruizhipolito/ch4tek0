// src/utils/rankingImage.js
// Genera una imagen tipo tabla con el ranking Top 10 usando node-canvas
const { createCanvas } = require('canvas');

// Función para ajustar texto a una columna de ancho máximo
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  lines.forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineHeight);
  });
  return lines.length;
}

/**
 * Genera una imagen de ranking Top Depósitos a Plazos a partir de los datos :)
 * @param {Array} tasas - Array de objetos { banco, nombre_producto, tasa }
 * @returns {Buffer} - Imagen PNG en buffer
 */
function generarImagenRanking(tasas, moneda = 'PEN') {
  // Parámetros de imagen
  const width = 900;
  const baseRowHeight = 60;
  const headerHeight = 80;
  const entidadColX = 110;
  const entidadColMaxWidth = 200;
  const entidadLineHeight = 28;
  const productoColX = 330;
  const productoColMaxWidth = 310
  const productoLineHeight = 28;
  // Precalcular alturas por wrapping
  const rowHeights = tasas.map(t => {
    const canvas = createCanvas(1,1);
    const ctx = canvas.getContext('2d');
    ctx.font = '24px Arial';
    
    // Medir cuántas líneas requiere la entidad
    const entidadText = t.nombre_entidad || t.banco;
    const entidadWords = entidadText.split(' ');
    let entidadLine = '';
    let entidadLines = 1;
    for (let n = 0; n < entidadWords.length; n++) {
      const testLine = entidadLine + entidadWords[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > entidadColMaxWidth && n > 0) {
        entidadLines++;
        entidadLine = entidadWords[n] + ' ';
      } else {
        entidadLine = testLine;
      }
    }
    
    // Medir cuántas líneas requiere el producto
    const productoWords = t.nombre_producto.split(' ');
    let productoLine = '';
    let productoLines = 1;
    for (let n = 0; n < productoWords.length; n++) {
      const testLine = productoLine + productoWords[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > productoColMaxWidth && n > 0) {
        productoLines++;
        productoLine = productoWords[n] + ' ';
      } else {
        productoLine = testLine;
      }
    }
    
    // Usar el máximo entre entidad y producto
    const maxLines = Math.max(entidadLines, productoLines);
    return Math.max(baseRowHeight, maxLines * Math.max(entidadLineHeight, productoLineHeight) + 20);
  });
  const height = headerHeight + rowHeights.reduce((a,b) => a+b, 0) + 40;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fondo
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Título
  ctx.font = 'bold 36px Arial';
  ctx.fillStyle = '#1e293b';
  let monedaTxt = '';
  if (moneda === 'PEN') monedaTxt = ' (Soles)';
  else if (moneda === 'USD') monedaTxt = ' (Dólares)';
  ctx.fillText('Top Tasas de Ahorro' + monedaTxt, 40, 55);

  // Encabezados
  ctx.font = 'bold 26px Arial';
  ctx.fillStyle = '#334155';
  ctx.fillText('N°', 40, headerHeight);
  ctx.fillText('Entidad', 110, headerHeight);
  ctx.fillText('Producto', productoColX, headerHeight);
  ctx.fillText('TEA', 660, headerHeight);
  const ahorrasColRight = 860;
ctx.fillText('Ahorras', ahorrasColRight - ctx.measureText('Ahorras').width, headerHeight);

  // Filas de datos
  let y = headerHeight;
  ctx.font = '24px Arial';
  tasas.forEach((t, idx) => {
    y += rowHeights[idx];
    const rowY = y - rowHeights[idx] + 40;
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${idx + 1}.`, 40, rowY);
    // Entidad con wrapping
    const entidadLines = wrapText(ctx, t.nombre_entidad || t.banco, entidadColX, rowY, entidadColMaxWidth, entidadLineHeight);
    // Producto con wrapping
    ctx.fillStyle = '#64748b';
    const productoLines = wrapText(ctx, t.nombre_producto, productoColX, rowY, productoColMaxWidth, productoLineHeight);
    // Tasa alineada arriba de la fila
    const tasaFormateada = (typeof t.tasa === 'number' ? t.tasa.toFixed(2) : t.tasa) + '%';
    ctx.fillStyle = '#0ea5e9';
    ctx.fillText(tasaFormateada, 660, rowY);
    // Monto a Ganar
    ctx.fillStyle = '#059669';
    const montoGanarStr = t.montoGanar !== undefined ? t.montoGanar.toLocaleString('es-MX', {minimumFractionDigits: 0}) : '-';
    const textWidth = ctx.measureText(montoGanarStr).width;
    ctx.fillText(montoGanarStr, ahorrasColRight - textWidth, rowY);
  });

  // Borde inferior
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, height - 20);
  ctx.lineTo(width - 40, height - 20);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

module.exports = { generarImagenRanking };
