const TIPOS_REGISTRO = ['hogar', 'persona_sola'];
const MODOS_REGISTRO = ['agregado', 'detallado'];
const VIVIENDA_ESTADOS = [
  'destruida',
  'inhabitable',
  'danada_habitada',
  'sin_dano',
  'no_sabe',
];
const MOTIVOS_PRINCIPALES = ['terremoto', 'replica', 'precaucion', 'otro'];
const SITUACIONES_ACTUALES = [
  'en_albergue',
  'vivienda_propia_danada',
  'casa_familiar_amigo',
  'arrendamiento',
  'carpa_improvisada',
  'otro_municipio',
  'no_ubicado',
  'otro',
];
const PRIORIDADES = ['alta', 'media', 'baja'];
const ESTADOS_REGISTRO = [
  'activo',
  'actualizado',
  'reubicado',
  'atendido',
  'cerrado',
];
const FUENTES = ['visita_campo', 'autoreporte', 'llamada', 'referido', 'otro'];
const ROLES_EN_HOGAR = ['jefe_hogar', 'conyuge', 'hijo', 'otro_familiar', 'otro'];
const RANGOS_EDAD = ['0_5', '6_17', '18_59', '60_mas'];
const SEXOS = ['masculino', 'femenino', 'otro', 'no_indica'];
const CONDICIONES_ESPECIALES = [
  'ninguna',
  'embarazo',
  'discapacidad',
  'enfermedad_cronica',
  'menor_no_acompanado',
];

module.exports = {
  TIPOS_REGISTRO,
  MODOS_REGISTRO,
  VIVIENDA_ESTADOS,
  MOTIVOS_PRINCIPALES,
  SITUACIONES_ACTUALES,
  PRIORIDADES,
  ESTADOS_REGISTRO,
  FUENTES,
  ROLES_EN_HOGAR,
  RANGOS_EDAD,
  SEXOS,
  CONDICIONES_ESPECIALES,
};
