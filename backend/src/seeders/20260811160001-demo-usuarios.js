'use strict';

const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM r_usuarios WHERE email = 'coordinador@colombiadepie.local' LIMIT 1`
    );
    if (existing.length > 0) {
      return;
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const [puntos] = await queryInterface.sequelize.query(
      `SELECT id FROM r_puntos_demanda
       WHERE nombre = 'Albergue Coliseo Municipal' LIMIT 1`
    );
    const puntoId = puntos[0] ? puntos[0].id : null;

    await queryInterface.bulkInsert('r_usuarios', [
      {
        id: randomUUID(),
        nombre: 'Ana Coordinadora',
        email: 'coordinador@colombiadepie.local',
        password_hash: passwordHash,
        rol: 'coordinador',
        punto_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        nombre: 'Luis Verificador',
        email: 'verificador@colombiadepie.local',
        password_hash: passwordHash,
        rol: 'verificador',
        punto_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        nombre: 'María Responsable',
        email: 'responsable@colombiadepie.local',
        password_hash: passwordHash,
        rol: 'responsable_albergue',
        punto_id: puntoId,
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        nombre: 'Pedro Oferente',
        email: 'oferente@colombiadepie.local',
        password_hash: passwordHash,
        rol: 'oferente',
        punto_id: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('r_usuarios', {
      email: [
        'coordinador@colombiadepie.local',
        'verificador@colombiadepie.local',
        'responsable@colombiadepie.local',
        'oferente@colombiadepie.local',
      ],
    });
  },
};
