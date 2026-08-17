/** Human-friendly relative time in Spanish. */
export function timeAgo(isoDate: string | null | undefined): string {
  if (!isoDate) return 'sin fecha';

  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return 'sin fecha';

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'hace un momento';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'hace 1 día';
  return `hace ${days} días`;
}

/** Absolute date/time for audit-style labels (es-CO). */
export function formatDateTime(isoDate: string | null | undefined): string {
  if (!isoDate) return 'sin fecha';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'sin fecha';

  return date.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function cupoLabel(
  ocupacion: number | null | undefined,
  capacidad: number | null | undefined
): string {
  if (capacidad == null) {
    return ocupacion != null ? `${ocupacion} personas` : 'Cupo sin reportar';
  }
  const occ = ocupacion ?? 0;
  return `${occ} de ${capacidad} personas`;
}

export {
  CATEGORIA_FAMILIA_LABELS,
  CATEGORIA_FAMILIA_ORDER,
  CATEGORIA_LABELS,
  CATEGORIA_OPTIONS,
  categoriaIcon,
  familiaFlowHint,
  getCategoriaFamilia,
  getCategoriaFlujo,
  getCategoriaMeta,
  getCategoriasByFamilia,
} from './categoria-meta';
export type {
  CategoriaFamilia,
  CategoriaFieldHints,
  CategoriaFlujo,
  CategoriaMeta,
} from './categoria-meta';

export const ESTADO_PUNTO_LABELS: Record<string, string> = {
  activo: 'Activo',
  lleno: 'Lleno',
  cerrado: 'Cerrado',
};

export const URGENCIA_LABELS: Record<string, string> = {
  alta: 'Urgente',
  media: 'Media',
  baja: 'Baja',
};

export const ESTADO_EMPAREJAMIENTO_LABELS: Record<string, string> = {
  propuesto: 'Propuesto',
  confirmado: 'Confirmado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const TIPO_PUNTO_LABELS: Record<string, string> = {
  oficial: 'Oficial',
  autogestionado: 'Autogestionado',
  punto_comunitario: 'Punto comunitario',
};
