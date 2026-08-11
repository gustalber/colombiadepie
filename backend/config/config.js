const { cliEnv } = require('./sequelize-env');

module.exports = {
  development: cliEnv(true, 'development'),
  test: cliEnv(false, 'test'),
  staging: cliEnv(false, 'staging'),
  production: cliEnv(false, 'production'),
};
