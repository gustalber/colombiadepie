require('dotenv').config();

const app = require('../src/app');
const serverless = require('serverless-http');
const sequelize = require('../src/config/database');

// In development (without serverless-offline) → start a local HTTP server.
// In Lambda or serverless-offline → export the handler.
const runAsServer = process.env.NODE_ENV === 'development' && !process.env.IS_OFFLINE;

if (runAsServer) {
  const PORT = process.env.PORT || 3000;

  (async () => {
    try {
      await sequelize.authenticate();
      console.log('Database connection established');

      app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });
    } catch (error) {
      console.error('Unable to start server:', error);
      process.exit(1);
    }
  })();
} else {
  module.exports.handler = serverless(app);
}
