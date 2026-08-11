'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('r_puntos_demanda', 'censo_afectados_habilitado', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addIndex('r_puntos_demanda', ['censo_afectados_habilitado'], {
      name: 'r_puntos_demanda_censo_afectados_habilitado_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'r_puntos_demanda',
      'r_puntos_demanda_censo_afectados_habilitado_idx'
    );
    await queryInterface.removeColumn('r_puntos_demanda', 'censo_afectados_habilitado');
  },
};
