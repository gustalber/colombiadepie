'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'r_ofertas',
      'origen',
      'municipio_preferido'
    );

    await queryInterface.addColumn('r_ofertas', 'municipios_alternativos', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('r_ofertas', 'municipios_alternativos');
    await queryInterface.renameColumn(
      'r_ofertas',
      'municipio_preferido',
      'origen'
    );
  },
};
