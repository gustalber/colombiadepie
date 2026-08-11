'use strict';

const { randomUUID } = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM r_puntos_demanda
       WHERE nombre = 'Albergue Coliseo Municipal' LIMIT 1`
    );
    if (existing.length > 0) {
      return;
    }

    const now = new Date();

    await queryInterface.bulkInsert('r_puntos_demanda', [
      {
        id: randomUUID(),
        nombre: 'Albergue Coliseo Municipal',
        tipo: 'oficial',
        municipio: 'Cali',
        lat: 3.451600,
        lng: -76.532000,
        direccion: 'Calle 5 #36-10',
        responsable_nombre: 'María López',
        responsable_contacto: '3001112233',
        capacidad: 200,
        ocupacion_actual: 85,
        estado: 'activo',
        verificado: true,
        verificado_por: null,
        verificado_en: now,
        actualizado_por: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        nombre: 'Refugio Comunidad El Pondaje',
        tipo: 'autogestionado',
        municipio: 'Cali',
        lat: 3.395000,
        lng: -76.545000,
        direccion: 'Carrera 50 #13-20',
        responsable_nombre: 'Carlos Ruiz',
        responsable_contacto: '3104445566',
        capacidad: 60,
        ocupacion_actual: 60,
        estado: 'lleno',
        verificado: false,
        verificado_por: null,
        verificado_en: null,
        actualizado_por: null,
        created_at: now,
        updated_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        id: randomUUID(),
        nombre: 'Punto Comunitario La Flora',
        tipo: 'punto_comunitario',
        municipio: 'Palmira',
        lat: 3.539400,
        lng: -76.303600,
        direccion: 'Calle 28 #26-15',
        responsable_nombre: 'Ana Gómez',
        responsable_contacto: '3157778899',
        capacidad: 40,
        ocupacion_actual: 12,
        estado: 'activo',
        verificado: false,
        verificado_por: null,
        verificado_en: null,
        actualizado_por: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('r_puntos_demanda', {
      nombre: [
        'Albergue Coliseo Municipal',
        'Refugio Comunidad El Pondaje',
        'Punto Comunitario La Flora',
      ],
    });
  },
};
