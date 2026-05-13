import config from '@config/config';
import { connectDB } from '@config/database';
import logger from '@utils/logger';

/**
 * Start the application
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connection established');

    // TODO: Initialize Express app
    logger.info(`${config.appName} v${config.appVersion} starting...`);
    logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

// Start server
startServer();
