require('dotenv').config();

const isLambda = () =>
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.IS_OFFLINE);

const pool = () => ({
  max: isLambda() ? 1 : 5,
  min: 0,
  acquire: 30000,
  idle: 10000,
});

const neonSsl = {
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: true,
    },
  },
};

/** Neon URLs por stage (solo en .env local; no suben DB_* a Lambda). */
const STAGE_URL_KEYS = {
  development: 'DATABASE_URL_DEV',
  test: 'DATABASE_URL_DEV',
  staging: 'DATABASE_URL_STAGING',
  production: 'DATABASE_URL_PROD',
};

function getStageDatabaseUrl(nodeEnv = process.env.NODE_ENV || 'development') {
  const key = STAGE_URL_KEYS[nodeEnv] || STAGE_URL_KEYS.development;
  return process.env[key] || null;
}

/**
 * Lambda: DATABASE_URL inyectada por serverless (desde DATABASE_URL_* del stage).
 * Local npm run dev: siempre DB_* (ignora Neon en .env).
 */
function resolveDatabaseUrl() {
  if (isLambda()) {
    return process.env.DATABASE_URL || null;
  }

  if (process.env.USE_DATABASE_URL === 'true') {
    return getStageDatabaseUrl() || process.env.DATABASE_URL || null;
  }

  return null;
}

function dbFieldsFromEnv() {
  return {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
  };
}

/** Runtime Sequelize instance options (src/config/database.js). */
function runtimeOptions() {
  const logging = process.env.NODE_ENV === 'development' ? console.log : false;
  const url = resolveDatabaseUrl();

  if (url) {
    return {
      connection: url,
      options: {
        dialect: 'postgres',
        ...neonSsl,
        pool: pool(),
        logging,
      },
    };
  }

  return {
    connection: null,
    options: {
      ...dbFieldsFromEnv(),
      dialect: 'postgres',
      pool: pool(),
      logging,
    },
  };
}

/** sequelize-cli (config/config.js) — prod/staging migran contra Neon; dev usa DB_* local. */
function cliEnv(logging = false, nodeEnv = 'development') {
  const url = getStageDatabaseUrl(nodeEnv);

  if (url) {
    process.env.DATABASE_URL = url;
    return {
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres',
      ...neonSsl,
      logging,
    };
  }

  const fields = dbFieldsFromEnv();
  if (nodeEnv === 'test') {
    fields.database =
      process.env.DB_NAME_TEST || `${process.env.DB_NAME || 'colombiadepie'}_test`;
  }

  return {
    ...fields,
    dialect: 'postgres',
    logging,
  };
}

module.exports = {
  runtimeOptions,
  cliEnv,
  getStageDatabaseUrl,
};
