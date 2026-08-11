const { Sequelize } = require('sequelize');
const { runtimeOptions } = require('../../config/sequelize-env');

const { connection, options } = runtimeOptions();

const sequelize = connection
  ? new Sequelize(connection, options)
  : new Sequelize(
      options.database,
      options.username,
      options.password,
      options
    );

module.exports = sequelize;
