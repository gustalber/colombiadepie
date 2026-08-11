/** Términos objetivo para SEO / AEO (ayuda humanitaria, albergues, última milla). */
export const SEO_PRIMARY_KEYWORDS = [
  'albergues Colombia',
  'ayuda humanitaria',
  'ayuda de última milla',
  'donar ayuda desastre',
  'puntos de acogida',
  'refugios temporales',
  'necesidades albergue',
  'donaciones inundaciones',
  'albergues cerca de mí',
] as const;

export const SEO_SUPPORT_KEYWORDS = [
  'mapa de albergues',
  'cupos albergue',
  'agua alimentos cobijas',
  'pañales medicamentos aseo',
  'emparejar ayuda',
  'respuesta a desastre Colombia',
  'Valle del Cauca albergues',
  'Chocó ayuda humanitaria',
  'Risaralda Quindío Caldas albergues',
  'Colombia de Pie',
] as const;

export const DEFAULT_SEO_KEYWORDS = [
  ...SEO_PRIMARY_KEYWORDS,
  ...SEO_SUPPORT_KEYWORDS,
];
