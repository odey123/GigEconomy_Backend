import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config/config';
import { connectDB } from './config/database';
import logger from './utils/logger';
import { AppError } from './utils/errors';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import gigsRoutes from './routes/gigs';
// import applicationsRoutes from './routes/applications';
// import contractsRoutes from './routes/contracts';

const app: Express = express();

/**
 * Middleware Setup
 */

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: config.corsCredentials,
  })
);

// Request logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

/**
 * Health Check Endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/gigs', gigsRoutes);
// app.use('/api/applications', applicationsRoutes);
// app.use('/api/contracts', contractsRoutes);

/**
 * 404 Handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

/**
 * Global Error Handler
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      isOperational: err.isOperational,
    });
  }

  // Unexpected error
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(config.nodeEnv === 'development' && { error: err.message }),
  });
});

/**
 * Start the application
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connection established');

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`${config.appName} v${config.appVersion} started successfully`);
      logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`📍 API Base URL: http://localhost:${config.port}/api`);
    });

    // Handle graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start server
startServer();

export default app;
