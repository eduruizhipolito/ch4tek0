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
 * Genera una imagen de ranking Top 10 a partir de los datos
 * @param {Array} tasas - Array de objetos { banco, nombre_producto, tasa }
 * @returns {Buffer} - Imagen PNG en buffer
 */
function generarImagenRanking(tasas) {
  // Parámetros de imagen
  const width = 900;
  const baseRowHeight = 60;
  const headerHeight = 80;
  const productoColX = 400;
  const productoColMaxWidth = 340;
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
  ctx.fillText('Top 10 Tasas de Ahorro', 40, 55);

  // Encabezados
  ctx.font = 'bold 26px Arial';
  ctx.fillStyle = '#334155';
  ctx.fillText('Ranking', 40, headerHeight);
  ctx.fillText('Banco', 160, headerHeight);
  ctx.fillText('Producto', productoColX, headerHeight);
  ctx.fillText('Tasa', 760, headerHeight);

  // Filas de datos
  let y = headerHeight;
  ctx.font = '24px Arial';
  tasas.forEach((t, idx) => {
    y += rowHeights[idx];
    const rowY = y - rowHeights[idx] + 40;
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${idx + 1}.`, 40, rowY);
    ctx.fillText(t.banco, 160, rowY);
    // Producto con wrapping
    ctx.fillStyle = '#64748b';
    const productoLines = wrapText(ctx, t.nombre_producto, productoColX, rowY, productoColMaxWidth, productoLineHeight);
    // Tasa alineada arriba de la fila
    const tasaFormateada = (typeof t.tasa === 'number' ? t.tasa.toFixed(2) : t.tasa) + '%';
    ctx.fillStyle = '#0ea5e9';
    ctx.fillText(tasaFormateada, 760, rowY);
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
