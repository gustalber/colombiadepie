import {
  ModoRegistroCenso,
  SituacionActualCenso,
  ViviendaEstadoCenso,
} from '../models';

export const SITUACION_ACTUAL_LABELS: Record<SituacionActualCenso, string> = {
  en_albergue: 'En un albergue',
  vivienda_propia_danada: 'En vivienda propia dañada',
  casa_familiar_amigo: 'Con familia o amigos',
  arrendamiento: 'Arrendamiento',
  carpa_improvisada: 'Carpa / refugio improvisado',
  otro_municipio: 'En otro municipio',
  no_ubicado: 'Ubicación no confirmada',
  otro: 'Otra situación',
};

export const VIVIENDA_ESTADO_LABELS: Record<ViviendaEstadoCenso, string> = {
  destruida: 'Destruida',
  inhabitable: 'Inhabitable',
  danada_habitada: 'Dañada pero habitada',
  sin_dano: 'Sin daño reportado',
  no_sabe: 'No sabe / no aplica',
};

export const MODO_REGISTRO_LABELS: Record<ModoRegistroCenso, string> = {
  agregado: 'Conteos rápidos',
  detallado: 'Integrantes uno a uno',
};

export const RANGO_EDAD_LABELS = {
  '0_5': '0–5 años',
  '6_17': '6–17 años',
  '18_59': '18–59 años',
  '60_mas': '60 años o más',
} as const;

export const CONDICION_ESPECIAL_LABELS = {
  ninguna: 'Ninguna',
  embarazo: 'Embarazo',
  discapacidad: 'Discapacidad',
  enfermedad_cronica: 'Enfermedad crónica',
  menor_no_acompanado: 'Menor no acompañado',
} as const;

export const NECESIDADES_CENSO_SUGERIDAS = [
  'Agua',
  'Alimentos',
  'Techado / carpas',
  'Medicamentos',
  'Pañales',
  'Ropa',
  'Psicosocial',
  'Transporte',
  'Reconstrucción',
];
