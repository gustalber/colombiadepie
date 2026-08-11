const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const AfectadoIntegrante = sequelize.define(
  'AfectadoIntegrante',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    afectado_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rol_en_hogar: {
      type: DataTypes.ENUM('jefe_hogar', 'conyuge', 'hijo', 'otro_familiar', 'otro'),
      allowNull: false,
      defaultValue: 'otro',
    },
    rango_edad: {
      type: DataTypes.ENUM('0_5', '6_17', '18_59', '60_mas'),
      allowNull: false,
    },
    sexo: {
      type: DataTypes.ENUM('masculino', 'femenino', 'otro', 'no_indica'),
      allowNull: true,
    },
    condicion_especial: {
      type: DataTypes.ENUM(
        'ninguna',
        'embarazo',
        'discapacidad',
        'enfermedad_cronica',
        'menor_no_acompanado'
      ),
      allowNull: false,
      defaultValue: 'ninguna',
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'r_afectado_integrantes',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = AfectadoIntegrante;
