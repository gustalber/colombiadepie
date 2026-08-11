'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('r_emparejamientos', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      necesidad_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'r_necesidades',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      oferta_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'r_ofertas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      estado: {
        type: Sequelize.ENUM(
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
        type: Sequelize.STRING,
        allowNull: true,
      },
      eta: {
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

    await queryInterface.addIndex('r_emparejamientos', ['necesidad_id'], {
      name: 'r_emparejamientos_necesidad_id_idx',
    });
    await queryInterface.addIndex('r_emparejamientos', ['oferta_id'], {
      name: 'r_emparejamientos_oferta_id_idx',
    });
    await queryInterface.addIndex('r_emparejamientos', ['estado'], {
      name: 'r_emparejamientos_estado_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('r_emparejamientos');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_emparejamientos_estado";'
    );
  },
};
