'use strict';

const { randomUUID } = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM r_ofertas
       WHERE oferente_nombre = 'Fundación Ayuda Valle' LIMIT 1`
    );
    if (existing.length > 0) {
      return;
    }

    const now = new Date();
    const oferta1 = randomUUID();
    const oferta2 = randomUUID();

    await queryInterface.bulkInsert('r_ofertas', [
      {
        id: oferta1,
        oferente_nombre: 'Fundación Ayuda Valle',
        oferente_contacto: '3201112233',
        municipio_preferido: 'Cali',
        municipios_alternativos: ['Palmira', 'Yumbo'],
        estado: 'disponible',
        created_at: now,
        updated_at: now,
      },
      {
        id: oferta2,
        oferente_nombre: 'Comercio La 15',
        oferente_contacto: '3184445566',
        municipio_preferido: 'Palmira',
        municipios_alternativos: ['Cali'],
        estado: 'disponible',
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('r_oferta_items', [
      {
        id: randomUUID(),
        oferta_id: oferta1,
        categoria: 'agua',
        cantidad: 100,
        unidad: 'botellones',
        descripcion: 'Botellones de 20L sellados',
        estado: 'disponible',
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        oferta_id: oferta1,
        categoria: 'alimentos',
        cantidad: 40,
        unidad: 'mercados',
        descripcion: 'Mercados familiares secos',
        estado: 'disponible',
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        oferta_id: oferta2,
        categoria: 'cobijas',
        cantidad: 25,
        unidad: 'unidades',
        descripcion: 'Cobijas nuevas',
        estado: 'disponible',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('r_ofertas', {
      oferente_nombre: ['Fundación Ayuda Valle', 'Comercio La 15'],
    });
  },
};
