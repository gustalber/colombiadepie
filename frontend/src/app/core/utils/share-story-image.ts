import { ShareNeedBlock } from './instagram-share';

export interface StoryCardInput {
  shelterName: string;
  municipio: string;
  needLines: ShareNeedBlock[];
  donateUrl: string;
}

const STORY_W = 1080;
const STORY_H = 1920;

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

export async function renderStoryCard(input: StoryCardInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas no disponible');
  }

  const bg = ctx.createLinearGradient(0, 0, STORY_W, STORY_H);
  bg.addColorStop(0, '#d7ebe1');
  bg.addColorStop(0.45, '#f7faf8');
  bg.addColorStop(1, '#d9e7ef');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  ctx.fillStyle = '#1f3f33';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('Colombia de Pie', 80, 120);

  try {
    const logo = await loadImage('/logo.png');
    ctx.drawImage(logo, STORY_W - 180, 60, 100, 100);
  } catch {
    // logo opcional
  }

  ctx.fillStyle = '#b4473c';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('Necesitamos ayuda', 80, 220);

  ctx.fillStyle = '#1f3f33';
  ctx.font = 'bold 64px Georgia, serif';
  let y = wrapText(ctx, input.shelterName, 80, 310, STORY_W - 160, 72);

  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillStyle = '#3d5248';
  ctx.fillText(input.municipio, 80, y + 20);
  y += 80;

  ctx.fillStyle = '#1f3f33';
  ctx.font = 'bold 38px system-ui, sans-serif';
  ctx.fillText('Nos falta:', 80, y);
  y += 56;

  ctx.font = '500 36px system-ui, sans-serif';
  ctx.fillStyle = '#1c2b24';
  const maxNeeds = 6;
  for (const need of input.needLines.slice(0, maxNeeds)) {
    y = wrapText(ctx, need.headline, 80, y, STORY_W - 160, 48);
    y += 8;

    if (need.description) {
      ctx.font = 'italic 30px system-ui, sans-serif';
      ctx.fillStyle = '#3d5248';
      y = wrapText(ctx, need.description, 96, y, STORY_W - 176, 40);
      y += 10;
      ctx.font = '500 36px system-ui, sans-serif';
      ctx.fillStyle = '#1c2b24';
    }
  }

  if (input.needLines.length > maxNeeds) {
    ctx.fillText(`… y ${input.needLines.length - maxNeeds} más`, 80, y);
    y += 48;
  }

  const boxY = STORY_H - 340;
  ctx.fillStyle = '#2f5d4a';
  ctx.beginPath();
  ctx.roundRect(60, boxY, STORY_W - 120, 240, 28);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('Dona o coordina tu aporte', 100, boxY + 70);

  ctx.font = '500 32px system-ui, sans-serif';
  wrapText(ctx, input.donateUrl, 100, boxY + 130, STORY_W - 200, 42);

  ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText('#ColombiaDePie', 100, boxY + 210);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
      'image/png'
    );
  });
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function openWhatsAppShare(text: string): void {
  window.open(buildWhatsAppShareUrl(text), '_blank', 'noopener,noreferrer');
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const probe = new File([''], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function shareStoryImage(blob: Blob, caption: string): Promise<boolean> {
  if (!canShareFiles()) return false;

  const file = new File([blob], 'colombiadepie-necesidades.png', { type: 'image/png' });

  try {
    await navigator.share({
      files: [file],
      title: 'Colombia de Pie',
      text: caption,
    });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false;
    return false;
  }
}

export function downloadStoryImage(blob: Blob, shelterName: string): void {
  const safe = shelterName.replace(/[^\w\s-]/g, '').trim().slice(0, 40) || 'albergue';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `colombiadepie-${safe}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
