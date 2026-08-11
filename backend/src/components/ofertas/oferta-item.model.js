const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const { CATEGORIAS } = require('../../constants/categorias');

const OfertaItem = sequelize.define(
  'OfertaItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    oferta_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    categoria: {
      type: DataTypes.ENUM(...CATEGORIAS),
      allowNull: false,
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unidad: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('disponible', 'comprometida', 'entregada'),
      allowNull: false,
      defaultValue: 'disponible',
    },
  },
  {
    tableName: 'r_oferta_items',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = OfertaItem;
