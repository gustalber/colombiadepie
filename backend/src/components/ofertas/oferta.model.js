const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Oferta = sequelize.define(
  'Oferta',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    oferente_nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    oferente_contacto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    municipio_preferido: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    municipios_alternativos: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    /** Rollup: disponible if any item available; entregada if all delivered; else comprometida */
    estado: {
      type: DataTypes.ENUM('disponible', 'comprometida', 'entregada'),
      allowNull: false,
      defaultValue: 'disponible',
    },
  },
  {
    tableName: 'r_ofertas',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Oferta;
