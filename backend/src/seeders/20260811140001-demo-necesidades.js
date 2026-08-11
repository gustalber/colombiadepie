'use strict';

const { randomUUID } = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM r_necesidades
       WHERE descripcion = 'Botellones de 20L' LIMIT 1`
    );
    if (existing.length > 0) {
      return;
    }

    const now = new Date();
    const stale = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const [puntos] = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM r_puntos_demanda
       WHERE nombre IN (
         'Albergue Coliseo Municipal',
         'Refugio Comunidad El Pondaje',
         'Punto Comunitario La Flora'
       )`
    );

    const byName = Object.fromEntries(puntos.map((p) => [p.nombre, p.id]));
    if (!byName['Albergue Coliseo Municipal']) {
      return;
    }

    await queryInterface.bulkInsert('r_necesidades', [
      {
        id: randomUUID(),
        punto_id: byName['Albergue Coliseo Municipal'],
        categoria: 'agua',
        descripcion: 'Botellones de 20L',
        cantidad: 50,
        unidad: 'botellones',
        urgencia: 'alta',
        estado: 'abierta',
        verificado: true,
        verificado_por: null,
        verificado_en: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        punto_id: byName['Albergue Coliseo Municipal'],
        categoria: 'alimentos',
        descripcion: 'Mercados familiares',
        cantidad: 30,
        unidad: 'kits',
        urgencia: 'media',
        estado: 'abierta',
        verificado: false,
        verificado_por: null,
        verificado_en: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        punto_id: byName['Refugio Comunidad El Pondaje'],
        categoria: 'cobijas',
        descripcion: 'Cobijas para noche',
        cantidad: 40,
        unidad: 'unidades',
        urgencia: 'alta',
        estado: 'abierta',
        verificado: false,
        verificado_por: null,
        verificado_en: null,
        created_at: now,
        updated_at: stale,
      },
      {
        id: randomUUID(),
        punto_id: byName['Punto Comunitario La Flora'],
        categoria: 'panales',
        descripcion: 'Pañales talla M',
        cantidad: 20,
        unidad: 'paquetes',
        urgencia: 'baja',
        estado: 'cubierta',
        verificado: true,
        verificado_por: null,
        verificado_en: now,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('r_necesidades', {
      descripcion: [
        'Botellones de 20L',
        'Mercados familiares',
        'Cobijas para noche',
        'Pañales talla M',
      ],
    });
  },
};
