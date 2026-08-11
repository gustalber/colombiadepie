export type RolUsuario =
  | 'coordinador'
  | 'responsable_albergue'
  | 'verificador'
  | 'oferente';

export type TipoPunto = 'oficial' | 'autogestionado' | 'punto_comunitario';
export type EstadoPunto = 'activo' | 'lleno' | 'cerrado';
export type CategoriaFamilia = 'humanitaria' | 'reconstruccion' | 'transporte';
export type CategoriaNecesidad =
  | 'agua'
  | 'alimentos'
  | 'medicamentos'
  | 'aseo'
  | 'higiene_femenina'
  | 'cobijas'
  | 'colchonetas'
  | 'sabanas'
  | 'toallas'
  | 'panales'
  | 'formula_infantil'
  | 'ropa'
  | 'calzado'
  | 'toldillos'
  | 'linternas'
  | 'baterias'
  | 'utensilios_cocina'
  | 'carpas'
  | 'cemento'
  | 'ladrillos_bloques'
  | 'arena_grava'
  | 'zinc_tejas'
  | 'madera'
  | 'herramientas_construccion'
  | 'tuberias_electricidad'
  | 'pintura_impermeabilizante'
  | 'transporte_carga_liviana'
  | 'transporte_carga_pesada'
  | 'transporte_volqueta'
  | 'transporte_maquinaria'
  | 'transporte_pasajeros';
export type Urgencia = 'alta' | 'media' | 'baja';
export type EstadoNecesidad = 'abierta' | 'en_camino' | 'cubierta';
export type EstadoOferta = 'disponible' | 'comprometida' | 'entregada';
export type EstadoEmparejamiento =
  | 'propuesto'
  | 'confirmado'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  punto_id: string | null;
  temporary_password?: string;
}

export interface AuthResponse {
  token: string;
  user: Usuario;
}

export interface PuntoDemanda {
  id: string;
  nombre: string;
  tipo: TipoPunto;
  municipio: string;
  lat: number | string | null;
  lng: number | string | null;
  direccion?: string | null;
  responsable_nombre?: string | null;
  responsable_contacto?: string | null;
  capacidad: number | null;
  ocupacion_actual: number | null;
  estado: EstadoPunto;
  verificado: boolean;
  verificado_por?: string | null;
  verificado_en?: string | null;
  actualizado_por?: string | null;
  censo_afectados_habilitado?: boolean;
  created_at: string;
  updated_at: string;
  sin_confirmar?: boolean;
  necesidades?: Necesidad[];
}

export interface Necesidad {
  id: string;
  punto_id: string;
  categoria: CategoriaNecesidad;
  descripcion?: string | null;
  cantidad?: number | null;
  cantidad_solicitada?: number | null;
  unidad?: string | null;
  urgencia: Urgencia;
  estado: EstadoNecesidad;
  verificado: boolean;
  verificado_por?: string | null;
  verificado_en?: string | null;
  created_at: string;
  updated_at: string;
  sin_confirmar?: boolean;
  punto?: Pick<
    PuntoDemanda,
    | 'id'
    | 'nombre'
    | 'municipio'
    | 'estado'
    | 'verificado'
    | 'responsable_nombre'
    | 'responsable_contacto'
  >;
}

export interface OfertaItem {
  id: string;
  oferta_id: string;
  categoria: CategoriaNecesidad;
  cantidad?: number | null;
  unidad?: string | null;
  descripcion?: string | null;
  estado: EstadoOferta;
  created_at: string;
  updated_at: string;
}

export interface Oferta {
  id: string;
  oferente_nombre: string;
  oferente_contacto?: string | null;
  municipio_preferido?: string | null;
  municipios_alternativos?: string[];
  estado: EstadoOferta;
  created_at: string;
  updated_at: string;
  sin_confirmar?: boolean;
  items?: OfertaItem[];
}

export interface Emparejamiento {
  id: string;
  necesidad_id: string;
  oferta_id: string;
  oferta_item_id: string;
  cantidad?: number | null;
  estado: EstadoEmparejamiento;
  transportista?: string | null;
  eta?: string | null;
  evidencias?: EmparejamientoEvidencia[];
  created_at: string;
  updated_at: string;
  sin_confirmar?: boolean;
  necesidad?: Necesidad;
  oferta?: Oferta;
  oferta_item?: OfertaItem;
}

export interface EmparejamientoEvidencia {
  url: string;
  filename: string;
  original_name?: string;
  mime?: string;
  size?: number;
  uploaded_at?: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface DataResponse<T> {
  data: T;
}

export type ModoRegistroCenso = 'agregado' | 'detallado';
export type TipoRegistroCenso = 'hogar' | 'persona_sola';
export type ViviendaEstadoCenso =
  | 'destruida'
  | 'inhabitable'
  | 'danada_habitada'
  | 'sin_dano'
  | 'no_sabe';
export type SituacionActualCenso =
  | 'en_albergue'
  | 'vivienda_propia_danada'
  | 'casa_familiar_amigo'
  | 'arrendamiento'
  | 'carpa_improvisada'
  | 'otro_municipio'
  | 'no_ubicado'
  | 'otro';
export type EstadoRegistroCenso =
  | 'activo'
  | 'actualizado'
  | 'reubicado'
  | 'atendido'
  | 'cerrado';

export interface AfectadoIntegrante {
  id?: string;
  afectado_id?: string;
  rol_en_hogar: 'jefe_hogar' | 'conyuge' | 'hijo' | 'otro_familiar' | 'otro';
  rango_edad: '0_5' | '6_17' | '18_59' | '60_mas';
  sexo?: 'masculino' | 'femenino' | 'otro' | 'no_indica' | null;
  condicion_especial:
    | 'ninguna'
    | 'embarazo'
    | 'discapacidad'
    | 'enfermedad_cronica'
    | 'menor_no_acompanado';
  nombre?: string | null;
  observaciones?: string | null;
  orden?: number;
}

export interface Afectado {
  id: string;
  registrado_por_punto_id: string;
  registrado_por_usuario_id?: string | null;
  tipo_registro: TipoRegistroCenso;
  modo_registro: ModoRegistroCenso;
  nombre_referencia?: string | null;
  telefono_contacto?: string | null;
  municipio: string;
  vereda_barrio?: string | null;
  direccion_aproximada?: string | null;
  total_personas: number;
  ninos_0_5: number;
  ninos_6_17: number;
  adultos_hombres: number;
  adultos_mujeres: number;
  adultos_mayores_60: number;
  embarazadas: number;
  personas_discapacidad: number;
  personas_enfermedad_cronica: number;
  vivienda_estado: ViviendaEstadoCenso;
  desplazado: boolean;
  motivo_principal: 'terremoto' | 'replica' | 'precaucion' | 'otro';
  situacion_actual: SituacionActualCenso;
  punto_acogida_id?: string | null;
  municipio_ubicacion_actual?: string | null;
  ubicacion_texto?: string | null;
  necesidades: string[];
  prioridad: 'alta' | 'media' | 'baja';
  observaciones?: string | null;
  estado_registro: EstadoRegistroCenso;
  fuente: 'visita_campo' | 'autoreporte' | 'llamada' | 'referido' | 'otro';
  ultima_verificacion?: string | null;
  consentimiento_registro: boolean;
  consentimiento_en?: string | null;
  created_at: string;
  updated_at: string;
  sin_confirmar?: boolean;
  integrantes?: AfectadoIntegrante[];
  captado_por?: Pick<PuntoDemanda, 'id' | 'nombre' | 'municipio'>;
  punto_acogida?: Pick<PuntoDemanda, 'id' | 'nombre' | 'municipio'>;
}

export interface CensoReporteBucket {
  clave?: string;
  etiqueta?: string;
  registros: number;
  personas: number;
}

export interface CensoReporteCaptador {
  punto_id: string;
  nombre: string;
  municipio: string;
  registros: number;
  personas: number;
}

export interface CensoReporteNecesidad {
  nombre: string;
  menciones: number;
}

export interface CensoReporteDia {
  fecha: string;
  registros: number;
  personas: number;
}

export interface CensoReporte {
  resumen: {
    total_registros: number;
    total_personas: number;
    en_albergue_personas: number;
    fuera_albergue_personas: number;
    hogares: number;
    personas_solas: number;
    puntos_captadores: number;
    embarazadas: number;
    personas_discapacidad: number;
    personas_enfermedad_cronica: number;
  };
  por_municipio: CensoReporteBucket[];
  por_situacion: CensoReporteBucket[];
  por_vivienda: CensoReporteBucket[];
  por_edad: {
    ninos_0_5: number;
    ninos_6_17: number;
    adultos_hombres: number;
    adultos_mujeres: number;
    adultos_mayores_60: number;
  };
  por_captador: CensoReporteCaptador[];
  necesidades_top: CensoReporteNecesidad[];
  registros_por_dia: CensoReporteDia[];
  generado_en: string;
}
