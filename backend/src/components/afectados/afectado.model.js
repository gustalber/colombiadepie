const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Afectado = sequelize.define(
  'Afectado',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    registrado_por_punto_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    registrado_por_usuario_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    tipo_registro: {
      type: DataTypes.ENUM('hogar', 'persona_sola'),
      allowNull: false,
      defaultValue: 'hogar',
    },
    modo_registro: {
      type: DataTypes.ENUM('agregado', 'detallado'),
      allowNull: false,
      defaultValue: 'agregado',
    },
    nombre_referencia: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telefono_contacto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    municipio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vereda_barrio: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    direccion_aproximada: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    total_personas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    ninos_0_5: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    ninos_6_17: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    adultos_hombres: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    adultos_mujeres: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    adultos_mayores_60: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    embarazadas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    personas_discapacidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    personas_enfermedad_cronica: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    vivienda_estado: {
      type: DataTypes.ENUM(
        'destruida',
        'inhabitable',
        'danada_habitada',
        'sin_dano',
        'no_sabe'
      ),
      allowNull: false,
      defaultValue: 'no_sabe',
    },
    desplazado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    motivo_principal: {
      type: DataTypes.ENUM('terremoto', 'replica', 'precaucion', 'otro'),
      allowNull: false,
      defaultValue: 'terremoto',
    },
    situacion_actual: {
      type: DataTypes.ENUM(
        'en_albergue',
        'vivienda_propia_danada',
        'casa_familiar_amigo',
        'arrendamiento',
        'carpa_improvisada',
        'otro_municipio',
        'no_ubicado',
        'otro'
      ),
      allowNull: false,
      defaultValue: 'no_ubicado',
    },
    punto_acogida_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    municipio_ubicacion_actual: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ubicacion_texto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    necesidades: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    prioridad: {
      type: DataTypes.ENUM('alta', 'media', 'baja'),
      allowNull: false,
      defaultValue: 'media',
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado_registro: {
      type: DataTypes.ENUM(
        'activo',
        'actualizado',
        'reubicado',
        'atendido',
        'cerrado'
      ),
      allowNull: false,
      defaultValue: 'activo',
    },
    fuente: {
      type: DataTypes.ENUM(
        'visita_campo',
        'autoreporte',
        'llamada',
        'referido',
        'otro'
      ),
      allowNull: false,
      defaultValue: 'visita_campo',
    },
    ultima_verificacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    consentimiento_registro: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    consentimiento_en: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'r_afectados',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Afectado;
