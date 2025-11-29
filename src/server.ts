// Inicializar OpenTelemetry ANTES que cualquier otra cosa
import { initTelemetry } from './config/telemetry';
initTelemetry();

import app from './app';
import config from './config';
import dbService from './services/dbService';
import seeder from './config/seeds';
import { logger } from './middlewares/logger.middleware';

// environment: development, staging, testing, production
const environment = process.env.NODE_ENV || 'development';

// list all available endpoints
async function startServer() {
  try {
    logger.info('Starting database initialization...');
    await dbService(environment, config.migrate, seeder).start();
    logger.info('Database initialized successfully');

    app.listen(config.port, () => {
      if (!['production', 'development', 'testing'].includes(environment)) {
        logger.error({
          environment,
          msg: 'Invalid NODE_ENV value',
        });
        process.exit(1);
      }
      const url = `http://localhost:${config.port}`;
      logger.info({
        port: config.port,
        url,
        environment,
        msg: 'API Server is running',
      });
    });
  } catch (err) {
    logger.error({ err }, 'Failed to initialize database');
    process.exit(1);
  }
}

startServer();
