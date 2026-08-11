'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('r_ofertas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      oferente_nombre: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      oferente_contacto: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      categoria: {
        type: Sequelize.ENUM(
          'agua',
          'alimentos',
          'medicamentos',
          'aseo',
          'cobijas',
          'colchonetas',
          'panales',
          'otros'
        ),
        allowNull: false,
      },
      cantidad: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      unidad: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      origen: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      estado: {
        type: Sequelize.ENUM('disponible', 'comprometida', 'entregada'),
        allowNull: false,
        defaultValue: 'disponible',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('r_ofertas', ['categoria'], {
      name: 'r_ofertas_categoria_idx',
    });
    await queryInterface.addIndex('r_ofertas', ['estado'], {
      name: 'r_ofertas_estado_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('r_ofertas');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_ofertas_categoria";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_ofertas_estado";'
    );
  },
};
