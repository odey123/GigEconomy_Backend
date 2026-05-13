import mongoose, { Connection } from 'mongoose';
import config from './config';
import logger from '@utils/logger';

let connection: Connection;

/**
 * Connect to MongoDB database
 * @returns {Promise<Connection>} Database connection
 */
export const connectDB = async (): Promise<Connection> => {
  try {
    logger.info(`Connecting to MongoDB at ${config.mongoUri}`);

    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4, // Use IPv4
    });

    connection = mongoose.connection;

    // Handle connection events
    connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });

    connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    logger.info('MongoDB pool initialized with size 10');
    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    if (connection) {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

/**
 * Get current database connection
 * @returns {Connection} Current connection
 */
export const getConnection = (): Connection => {
  if (!connection) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return connection;
};

export default { connectDB, disconnectDB, getConnection };
