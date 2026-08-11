#!/usr/bin/env node
'use strict';

/**
 * Crea (o resetea) un usuario staff en la BD del stage actual.
 *
 * Uso prod (con DATABASE_URL_PROD en .env):
 *   BOOTSTRAP_ADMIN_EMAIL=coordinador@ejemplo.com \
 *   BOOTSTRAP_ADMIN_PASSWORD='tu-contraseña-segura' \
 *   BOOTSTRAP_ADMIN_NOMBRE='Nombre Coordinador' \
 *   npm run bootstrap:admin:prod
 *
 * Resetear contraseña de un usuario existente:
 *   BOOTSTRAP_RESET_PASSWORD=true ... npm run bootstrap:admin:prod
 */

require('dotenv').config();

// Usa DATABASE_URL del stage (como migrate:prod), no DB_* local.
process.env.USE_DATABASE_URL = 'true';

const bcrypt = require('bcryptjs');
const { getStageDatabaseUrl } = require('../config/sequelize-env');
const sequelize = require('../src/config/database');
const usuarioRepository = require('../src/components/usuarios/usuario.repository');

const VALID_ROLES = ['coordinador', 'verificador'];

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const nombre = (process.env.BOOTSTRAP_ADMIN_NOMBRE || 'Coordinador').trim();
  const rol = (process.env.BOOTSTRAP_ADMIN_ROL || 'coordinador').trim();
  const reset = process.env.BOOTSTRAP_RESET_PASSWORD === 'true';

  if (!email || !password) {
    console.error(
      'Define BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD (mín. 10 caracteres).'
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 10 caracteres.');
    process.exit(1);
  }

  if (!VALID_ROLES.includes(rol)) {
    console.error(`BOOTSTRAP_ADMIN_ROL inválido. Usa: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const dbUrl = getStageDatabaseUrl(nodeEnv);

  if (nodeEnv === 'production' || nodeEnv === 'staging') {
    if (!dbUrl) {
      console.error(
        `Falta DATABASE_URL_${nodeEnv === 'production' ? 'PROD' : 'STAGING'} en .env`
      );
      process.exit(1);
    }
    const host = dbUrl.split('@')[1]?.split('/')[0] || 'remota';
    console.log(`Conectando a ${host} (${nodeEnv})…`);
  } else {
    console.log(`Conectando (${nodeEnv})…`);
  }

  await sequelize.authenticate();

  const existing = await usuarioRepository.findByEmail(email);

  if (existing) {
    if (!reset) {
      console.log(
        `Ya existe ${email} con rol "${existing.rol}". ` +
          'Para cambiar contraseña: BOOTSTRAP_RESET_PASSWORD=true'
      );
      await sequelize.close();
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, 10);
    await usuarioRepository.updatePassword(existing.id, password_hash);
    console.log(`Contraseña actualizada para ${email} (${existing.rol}).`);
    await sequelize.close();
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 10);
  await usuarioRepository.create({
    nombre,
    email,
    password_hash,
    rol,
    punto_id: null,
  });

  console.log(`Usuario creado: ${email} (${rol}).`);
  console.log('Entra en https://colombiadepie.com/login');
  await sequelize.close();
}

main().catch(async (error) => {
  console.error('Error:', error.message);
  try {
    await sequelize.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
