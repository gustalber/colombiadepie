import QRCode from 'qrcode';

import { ShareNeedBlock } from './instagram-share';

export interface QrPosterInput {
  shelterName: string;
  municipio: string;
  needLines: ShareNeedBlock[];
  donateUrl: string;
}

const POSTER_W = 1200;
const POSTER_H = 1700;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }

  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }

  return cursorY;
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export async function renderQrPoster(input: QrPosterInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas no disponible');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.fillStyle = '#2f5d4a';
  ctx.fillRect(0, 0, POSTER_W, 12);

  ctx.fillStyle = '#1f3f33';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText('Colombia de Pie', 72, 88);

  try {
    const logo = await loadImage('/logo.png');
    ctx.drawImage(logo, POSTER_W - 152, 36, 80, 80);
  } catch {
    // logo opcional
  }

  ctx.fillStyle = '#b4473c';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText('Escanea y ayuda', 72, 150);

  ctx.fillStyle = '#1f3f33';
  ctx.font = 'bold 52px Georgia, serif';
  let y = wrapText(ctx, input.shelterName, 72, 230, POSTER_W - 144, 58);

  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillStyle = '#3d5248';
  ctx.fillText(input.municipio, 72, y + 24);
  y += 72;

  if (input.needLines.length > 0) {
    ctx.fillStyle = '#1f3f33';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('Les falta:', 72, y);
    y += 44;

    ctx.font = '500 28px system-ui, sans-serif';
    ctx.fillStyle = '#1c2b24';
    const maxNeeds = 4;
    for (const need of input.needLines.slice(0, maxNeeds)) {
      y = wrapText(ctx, need.headline, 72, y, POSTER_W - 144, 38);
      y += 6;

      if (need.description) {
        ctx.font = 'italic 24px system-ui, sans-serif';
        ctx.fillStyle = '#3d5248';
        y = wrapText(ctx, need.description, 88, y, POSTER_W - 160, 32);
        y += 8;
        ctx.font = '500 28px system-ui, sans-serif';
        ctx.fillStyle = '#1c2b24';
      }
    }
    if (input.needLines.length > maxNeeds) {
      ctx.fillText(`… y ${input.needLines.length - maxNeeds} más`, 72, y);
      y += 36;
    }
    y += 16;
  }

  const qrSize = 420;
  const qrX = (POSTER_W - qrSize) / 2;
  const qrY = Math.max(y + 24, POSTER_H - qrSize - 320);

  ctx.fillStyle = '#f7faf8';
  ctx.strokeStyle = '#c9d6cf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(qrX - 28, qrY - 28, qrSize + 56, qrSize + 56, 24);
  ctx.fill();
  ctx.stroke();

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, input.donateUrl, {
    width: qrSize,
    margin: 2,
    color: {
      dark: '#1f3f33',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  const footerY = qrY + qrSize + 72;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1f3f33';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText('Escanea para ver qué necesitan', POSTER_W / 2, footerY);

  ctx.font = '500 26px system-ui, sans-serif';
  ctx.fillStyle = '#3d5248';
  ctx.fillText('y cómo coordinar tu aporte', POSTER_W / 2, footerY + 40);

  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillStyle = '#2f5d4a';
  wrapText(ctx, shortUrl(input.donateUrl), POSTER_W / 2, footerY + 88, POSTER_W - 144, 32);

  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillStyle = '#3d5248';
  ctx.fillText('#ColombiaDePie · Ayuda humanitaria', POSTER_W / 2, POSTER_H - 56);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar el QR'))),
      'image/png'
    );
  });
}

export function downloadQrPoster(blob: Blob, shelterName: string): void {
  const safe = shelterName.replace(/[^\w\s-]/g, '').trim().slice(0, 40) || 'albergue';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `colombiadepie-qr-${safe}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
