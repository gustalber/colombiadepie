import { Necesidad, PuntoDemanda } from '../models';
import { CATEGORIA_LABELS } from './labels';

export interface ShareNeedBlock {
  headline: string;
  description?: string;
}

function formatNeedHeadline(n: Necesidad): string {
  const cat = CATEGORIA_LABELS[n.categoria] || n.categoria;
  let qty = '';

  if (n.cantidad != null) {
    if (n.cantidad_solicitada != null && n.cantidad_solicitada !== n.cantidad) {
      qty = ` — faltan ${n.cantidad} de ${n.cantidad_solicitada} ${n.unidad || ''}`.trimEnd();
    } else {
      qty = ` — ${n.cantidad} ${n.unidad || ''}`.trimEnd();
    }
  }

  const urgent = n.urgencia === 'alta' ? ' ⚡' : '';
  return `• ${cat}${qty}${urgent}`;
}

export function buildShareNeedBlocks(necesidades: Necesidad[]): ShareNeedBlock[] {
  return necesidades.map((n) => ({
    headline: formatNeedHeadline(n),
    description: n.descripcion?.trim() || undefined,
  }));
}

/** Flat lines for plain-text contexts (caption, clipboard). */
export function buildNeedLines(necesidades: Necesidad[]): string[] {
  const lines: string[] = [];
  for (const block of buildShareNeedBlocks(necesidades)) {
    lines.push(block.headline);
    if (block.description) {
      lines.push(`  ↳ ${block.description}`);
    }
  }
  return lines;
}

export function buildShelterInstagramCaption(
  punto: PuntoDemanda,
  necesidades: Necesidad[],
  pageUrl: string
): string {
  const lines = [
    `🆘 ${punto.nombre} (${punto.municipio}) necesita ayuda`,
    '',
    'Nos falta:',
    ...buildNeedLines(necesidades),
    '',
    '👉 Dona o coordina tu aporte aquí:',
    pageUrl,
    '',
    '#ColombiaDePie #AyudaHumanitaria',
  ];

  return lines.join('\n');
}

export async function copyShareText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
