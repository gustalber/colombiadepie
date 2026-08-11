'use strict';

const { CATEGORIAS } = require('../constants/categorias');

const ENUM_SPECS = [
  { table: 'r_necesidades', typeName: 'enum_r_necesidades_categoria' },
  { table: 'r_oferta_items', typeName: 'enum_r_oferta_items_categoria' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    for (const { table, typeName } of ENUM_SPECS) {
      await sequelize.query(
        `ALTER TABLE "${table}"
         ALTER COLUMN categoria TYPE text
         USING categoria::text`
      );
      await sequelize.query(`DROP TYPE IF EXISTS "${typeName}"`);
      await sequelize.query(
        `CREATE TYPE "${typeName}" AS ENUM (${CATEGORIAS.map((c) => `'${c}'`).join(', ')})`
      );
      await sequelize.query(
        `ALTER TABLE "${table}"
         ALTER COLUMN categoria TYPE "${typeName}"
         USING categoria::"${typeName}"`
      );
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const kept = [
      'agua',
      'alimentos',
      'medicamentos',
      'aseo',
      'higiene_femenina',
      'cobijas',
      'colchonetas',
      'sabanas',
      'toallas',
      'panales',
      'formula_infantil',
      'ropa',
      'calzado',
      'toldillos',
      'linternas',
      'baterias',
      'utensilios_cocina',
      'carpas',
    ];

    for (const { table, typeName } of ENUM_SPECS) {
      await sequelize.query(
        `ALTER TABLE "${table}"
         ALTER COLUMN categoria TYPE text
         USING categoria::text`
      );
      await sequelize.query(
        `UPDATE "${table}"
         SET categoria = 'aseo'
         WHERE categoria NOT IN (${kept.map((c) => `'${c}'`).join(', ')})`
      );
      await sequelize.query(`DROP TYPE IF EXISTS "${typeName}"`);
      await sequelize.query(
        `CREATE TYPE "${typeName}" AS ENUM (${kept.map((c) => `'${c}'`).join(', ')})`
      );
      await sequelize.query(
        `ALTER TABLE "${table}"
         ALTER COLUMN categoria TYPE "${typeName}"
         USING categoria::"${typeName}"`
      );
    }
  },
};
