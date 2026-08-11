'use strict';

/** Necesidades en albergues ya verificados quedan visibles al público. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE r_necesidades AS n
      SET
        verificado = true,
        verificado_en = COALESCE(n.verificado_en, NOW())
      FROM r_puntos_demanda AS p
      WHERE n.punto_id = p.id
        AND p.verificado = true
        AND n.verificado = false
        AND n.estado = 'abierta'
    `);
  },

  async down() {
    // No revert — datos corregidos intencionalmente.
  },
};
