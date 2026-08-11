const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const { CATEGORIAS } = require('../../constants/categorias');

const Necesidad = sequelize.define(
  'Necesidad',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    punto_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    categoria: {
      type: DataTypes.ENUM(...CATEGORIAS),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cantidad_solicitada: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unidad: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    urgencia: {
      type: DataTypes.ENUM('alta', 'media', 'baja'),
      allowNull: false,
      defaultValue: 'media',
    },
    estado: {
      type: DataTypes.ENUM('abierta', 'en_camino', 'cubierta'),
      allowNull: false,
      defaultValue: 'abierta',
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
  },
  {
    tableName: 'r_necesidades',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Necesidad;
