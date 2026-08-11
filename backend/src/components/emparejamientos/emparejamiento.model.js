const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Emparejamiento = sequelize.define(
  'Emparejamiento',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    necesidad_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    oferta_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    oferta_item_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM(
        'propuesto',
        'confirmado',
        'en_camino',
        'entregado',
        'cancelado'
      ),
      allowNull: false,
      defaultValue: 'propuesto',
    },
    transportista: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    eta: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    evidencias: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    tableName: 'r_emparejamientos',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Emparejamiento;
