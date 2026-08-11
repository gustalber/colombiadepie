'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('r_usuarios', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      rol: {
        type: Sequelize.ENUM(
          'coordinador',
          'responsable_albergue',
          'verificador',
          'oferente'
        ),
        allowNull: false,
      },
      punto_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'r_puntos_demanda',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('r_usuarios', ['email'], {
      name: 'r_usuarios_email_idx',
      unique: true,
    });
    await queryInterface.addIndex('r_usuarios', ['punto_id'], {
      name: 'r_usuarios_punto_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('r_usuarios');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_usuarios_rol";'
    );
  },
};
