const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const PuntoDemanda = sequelize.define(
  'PuntoDemanda',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.ENUM('oficial', 'autogestionado', 'punto_comunitario'),
      allowNull: false,
    },
    municipio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lat: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
    },
    lng: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    responsable_nombre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    responsable_contacto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    capacidad: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ocupacion_actual: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    estado: {
      type: DataTypes.ENUM('activo', 'lleno', 'cerrado'),
      allowNull: false,
      defaultValue: 'activo',
    },
    verificado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verificado_por: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    verificado_en: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actualizado_por: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    censo_afectados_habilitado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'r_puntos_demanda',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = PuntoDemanda;
