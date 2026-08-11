'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('r_necesidades', 'cantidad_solicitada', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE r_necesidades
      SET cantidad_solicitada = cantidad
      WHERE cantidad_solicitada IS NULL
    `);

    await queryInterface.addColumn('r_emparejamientos', 'cantidad', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('r_emparejamientos', 'cantidad');
    await queryInterface.removeColumn('r_necesidades', 'cantidad_solicitada');
  },
};
