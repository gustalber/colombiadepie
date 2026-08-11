'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('r_puntos_demanda', {
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
      tipo: {
        type: Sequelize.ENUM('oficial', 'autogestionado', 'punto_comunitario'),
        allowNull: false,
      },
      municipio: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lat: {
        type: Sequelize.DECIMAL(9, 6),
        allowNull: true,
      },
      lng: {
        type: Sequelize.DECIMAL(9, 6),
        allowNull: true,
      },
      direccion: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      responsable_nombre: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      responsable_contacto: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      capacidad: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ocupacion_actual: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      estado: {
        type: Sequelize.ENUM('activo', 'lleno', 'cerrado'),
        allowNull: false,
        defaultValue: 'activo',
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
      actualizado_por: {
        type: Sequelize.UUID,
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

    await queryInterface.addIndex('r_puntos_demanda', ['municipio'], {
      name: 'r_puntos_demanda_municipio_idx',
    });
    await queryInterface.addIndex('r_puntos_demanda', ['estado'], {
      name: 'r_puntos_demanda_estado_idx',
    });
    await queryInterface.addIndex('r_puntos_demanda', ['municipio', 'nombre'], {
      name: 'r_puntos_demanda_municipio_nombre_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('r_puntos_demanda');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_puntos_demanda_tipo";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_puntos_demanda_estado";'
    );
  },
};
