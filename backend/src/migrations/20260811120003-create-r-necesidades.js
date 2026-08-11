'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('r_necesidades', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      punto_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'r_puntos_demanda',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cantidad: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      unidad: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      urgencia: {
        type: Sequelize.ENUM('alta', 'media', 'baja'),
        allowNull: false,
        defaultValue: 'media',
      },
      estado: {
        type: Sequelize.ENUM('abierta', 'en_camino', 'cubierta'),
        allowNull: false,
        defaultValue: 'abierta',
      },
      verificado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      verificado_por: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      verificado_en: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('r_necesidades', ['punto_id'], {
      name: 'r_necesidades_punto_id_idx',
    });
    await queryInterface.addIndex('r_necesidades', ['estado'], {
      name: 'r_necesidades_estado_idx',
    });
    await queryInterface.addIndex('r_necesidades', ['categoria'], {
      name: 'r_necesidades_categoria_idx',
    });
    await queryInterface.addIndex('r_necesidades', ['urgencia'], {
      name: 'r_necesidades_urgencia_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('r_necesidades');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_necesidades_categoria";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_necesidades_urgencia";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_necesidades_estado";'
    );
  },
};
