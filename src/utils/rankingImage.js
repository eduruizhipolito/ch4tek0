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
  const productoColX = 330;
  const productoColMaxWidth = 310
  const productoLineHeight = 28;
  // Precalcular alturas por wrapping
  const rowHeights = tasas.map(t => {
    // Medir cuántas líneas requiere el producto
    const canvas = createCanvas(1,1);
    const ctx = canvas.getContext('2d');
    ctx.font = '24px Arial';
    const words = t.nombre_producto.split(' ');
    let line = '';
    let lines = 1;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > productoColMaxWidth && n > 0) {
        lines++;
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    return Math.max(baseRowHeight, lines * productoLineHeight + 20);
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
    ctx.fillText(t.nombre_entidad || t.banco, 110, rowY); // Usar nombre_entidad si existe, si no banco
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
