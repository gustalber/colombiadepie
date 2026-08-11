export type CategoriaFamilia = 'humanitaria' | 'reconstruccion' | 'transporte';
export type CategoriaFlujo = 'material' | 'servicio';

export interface CategoriaFieldHints {
  cantidadLabel: string;
  unidadLabel: string;
  cantidadPlaceholder: string;
  unidadPlaceholder: string;
  descripcionPlaceholder: string;
  hint: string;
}

export interface CategoriaMeta {
  label: string;
  familia: CategoriaFamilia;
  flujo: CategoriaFlujo;
  icon: string;
  need: CategoriaFieldHints;
  offer: CategoriaFieldHints;
}

const materialNeed: CategoriaFieldHints = {
  cantidadLabel: 'Cantidad',
  unidadLabel: 'Unidad',
  cantidadPlaceholder: 'Ej. 50',
  unidadPlaceholder: 'kits, paquetes, unidades…',
  descripcionPlaceholder: 'Ej. Botellones de 20L sellados',
  hint: 'Indica cantidad y detalles para que quien dona sepa exactamente qué llevar.',
};

const materialOffer: CategoriaFieldHints = {
  cantidadLabel: 'Cantidad disponible',
  unidadLabel: 'Unidad',
  cantidadPlaceholder: 'Ej. 30',
  unidadPlaceholder: 'kits, paquetes, unidades…',
  descripcionPlaceholder: 'Marca, estado, fecha de vencimiento si aplica…',
  hint: 'Coordinación puede repartir tu aporte entre varios albergues del municipio.',
};

const construccionNeed: CategoriaFieldHints = {
  cantidadLabel: 'Cantidad estimada',
  unidadLabel: 'Unidad',
  cantidadPlaceholder: 'Ej. 100',
  unidadPlaceholder: 'bultos, m², planchas, sacos…',
  descripcionPlaceholder: 'Ej. Cemento gris 50 kg, entrega en obra del barrio…',
  hint: 'Describe el material, medidas y si hay acceso para camión o volqueta.',
};

const construccionOffer: CategoriaFieldHints = {
  cantidadLabel: 'Cantidad disponible',
  unidadLabel: 'Unidad',
  cantidadPlaceholder: 'Ej. 80',
  unidadPlaceholder: 'bultos, m², planchas…',
  descripcionPlaceholder: 'Marca, estado del material, si puedes llevarlo o solo retiro…',
  hint: 'La reconstrucción suele requerir acordar punto de entrega y descarga con coordinación.',
};

const transporteNeed: CategoriaFieldHints = {
  cantidadLabel: 'Viajes o cargas estimadas',
  unidadLabel: 'Tipo de vehículo requerido',
  cantidadPlaceholder: 'Ej. 2',
  unidadPlaceholder: 'Camión 10 ton, volqueta, camioneta…',
  descripcionPlaceholder: 'Origen, destino, horario, qué se transporta, si hay grúa o montacargas…',
  hint: 'Coordinación contactará al transportista para confirmar ruta, horario y acceso.',
};

const transporteOffer: CategoriaFieldHints = {
  cantidadLabel: 'Capacidad aproximada',
  unidadLabel: 'Unidad de capacidad',
  cantidadPlaceholder: 'Ej. 8',
  unidadPlaceholder: 'toneladas, m³, pasajeros…',
  descripcionPlaceholder: 'Tipo de vehículo, placas si aplica, días/horarios disponibles, municipios que cubres…',
  hint: 'No es una reserva automática: coordinación te llama para confirmar ruta y horario.',
};

export const CATEGORIA_FAMILIA_LABELS: Record<CategoriaFamilia, string> = {
  humanitaria: 'Ayuda humanitaria',
  reconstruccion: 'Reconstrucción',
  transporte: 'Transporte y logística',
};

export const CATEGORIA_FAMILIA_ORDER: CategoriaFamilia[] = [
  'humanitaria',
  'reconstruccion',
  'transporte',
];

export const CATEGORIA_META: Record<string, CategoriaMeta> = {
  agua: {
    label: 'Agua',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '💧',
    need: materialNeed,
    offer: materialOffer,
  },
  alimentos: {
    label: 'Alimentos',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🍲',
    need: materialNeed,
    offer: materialOffer,
  },
  medicamentos: {
    label: 'Medicamentos',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '💊',
    need: materialNeed,
    offer: materialOffer,
  },
  aseo: {
    label: 'Aseo e higiene',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🧴',
    need: materialNeed,
    offer: materialOffer,
  },
  higiene_femenina: {
    label: 'Higiene femenina',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🩸',
    need: materialNeed,
    offer: materialOffer,
  },
  cobijas: {
    label: 'Cobijas',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🛏️',
    need: materialNeed,
    offer: materialOffer,
  },
  colchonetas: {
    label: 'Colchonetas',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🛌',
    need: materialNeed,
    offer: materialOffer,
  },
  sabanas: {
    label: 'Sábanas',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🛏️',
    need: materialNeed,
    offer: materialOffer,
  },
  toallas: {
    label: 'Toallas',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🧺',
    need: materialNeed,
    offer: materialOffer,
  },
  panales: {
    label: 'Pañales',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '👶',
    need: materialNeed,
    offer: materialOffer,
  },
  formula_infantil: {
    label: 'Fórmula infantil',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🍼',
    need: materialNeed,
    offer: materialOffer,
  },
  ropa: {
    label: 'Ropa',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '👕',
    need: materialNeed,
    offer: materialOffer,
  },
  calzado: {
    label: 'Calzado',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '👟',
    need: materialNeed,
    offer: materialOffer,
  },
  toldillos: {
    label: 'Toldillos',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '⛺',
    need: materialNeed,
    offer: materialOffer,
  },
  linternas: {
    label: 'Linternas',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🔦',
    need: materialNeed,
    offer: materialOffer,
  },
  baterias: {
    label: 'Baterías / pilas',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🔋',
    need: materialNeed,
    offer: materialOffer,
  },
  utensilios_cocina: {
    label: 'Utensilios de cocina',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '🍳',
    need: materialNeed,
    offer: materialOffer,
  },
  carpas: {
    label: 'Carpas',
    familia: 'humanitaria',
    flujo: 'material',
    icon: '⛺',
    need: materialNeed,
    offer: materialOffer,
  },
  cemento: {
    label: 'Cemento',
    familia: 'reconstruccion',
    flujo: 'material',
    icon: '🏗️',
    need: construccionNeed,
    offer: construccionOffer,
  },
  ladrillos_bloques: {
    label: 'Ladrillos / bloques',
    familia: 'reconstruccion',
    flujo: 'material',
    icon: '🧱',
    need: construccionNeed,
    offer: construccionOffer,
  },
  arena_grava: {
    label: 'Arena / grava',
    familia: 'reconstruccion',
    flujo: 'material',
    icon: '🪨',
    need: construccionNeed,
    offer: construccionOffer,
  },
  zinc_tejas: {
    label: 'Zinc / tejas',
    familia: 'reconstruccion',
    flujo: 'material',
    icon: '🏠',
    need: construccionNeed,
    offer: construccionOffer,
  },
  madera: {
    label: 'Madera',
    familia: 'reconstruccion',
    flujo: 'material',
    icon: '🪵',
    need: construccionNeed,
    offer: construccionOffer,
  },
  herramientas_construccion: {
    label: 'Herramientas de obra',
    familia: 'reconstruccion',
    flujo: 'material',
    icon: '🔧',
    need: construccionNeed,
    offer: construccionOffer,
  },
  tuberias_electricidad: {
    label: 'Tuberías / electricidad',
    familia: 'reconstruccion',
    flujo: 'material',
    icon: '⚡',
    need: construccionNeed,
    offer: construccionOffer,
  },
  pintura_impermeabilizante: {
    label: 'Pintura / impermeabilizante',
    familia: 'reconstruccion',
    flujo: 'material',
    icon: '🪣',
    need: construccionNeed,
    offer: construccionOffer,
  },
  transporte_carga_liviana: {
    label: 'Transporte carga liviana',
    familia: 'transporte',
    flujo: 'servicio',
    icon: '🛻',
    need: transporteNeed,
    offer: transporteOffer,
  },
  transporte_carga_pesada: {
    label: 'Transporte carga pesada',
    familia: 'transporte',
    flujo: 'servicio',
    icon: '🚛',
    need: transporteNeed,
    offer: transporteOffer,
  },
  transporte_volqueta: {
    label: 'Volqueta / escombros',
    familia: 'transporte',
    flujo: 'servicio',
    icon: '🚜',
    need: transporteNeed,
    offer: transporteOffer,
  },
  transporte_maquinaria: {
    label: 'Transporte de maquinaria',
    familia: 'transporte',
    flujo: 'servicio',
    icon: '🏗️',
    need: transporteNeed,
    offer: transporteOffer,
  },
  transporte_pasajeros: {
    label: 'Transporte de personas',
    familia: 'transporte',
    flujo: 'servicio',
    icon: '🚌',
    need: transporteNeed,
    offer: transporteOffer,
  },
};

export const CATEGORIA_OPTIONS = Object.keys(CATEGORIA_META);

export const CATEGORIA_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORIA_META).map(([key, meta]) => [key, meta.label])
);

export function getCategoriaMeta(categoria: string): CategoriaMeta | null {
  return CATEGORIA_META[categoria] ?? null;
}

export function getCategoriaFlujo(categoria: string): CategoriaFlujo {
  return getCategoriaMeta(categoria)?.flujo ?? 'material';
}

export function getCategoriaFamilia(categoria: string): CategoriaFamilia {
  return getCategoriaMeta(categoria)?.familia ?? 'humanitaria';
}

export function getCategoriasByFamilia(familia: CategoriaFamilia): string[] {
  return CATEGORIA_OPTIONS.filter((key) => CATEGORIA_META[key].familia === familia);
}

export function categoriaIcon(categoria: string): string {
  return getCategoriaMeta(categoria)?.icon ?? '📦';
}

export function familiaFlowHint(familia: CategoriaFamilia): string {
  switch (familia) {
    case 'reconstruccion':
      return 'Materiales de obra: coordinación acuerda entrega en sitio, descarga y acceso vehicular.';
    case 'transporte':
      return 'Servicio de transporte: coordinación confirma ruta, horario y contacto antes de asignar el viaje.';
    default:
      return 'Insumos humanitarios: se emparejan por cantidad y municipio como donación directa.';
  }
}
