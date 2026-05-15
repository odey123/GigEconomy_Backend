import dotenv from 'dotenv';

dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  appName: string;
  appVersion: string;
  mongoUri: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiry: string;
  jwtRefreshExpiry: string;
  frontendUrl: string;
  allowedOrigins: string[];
  corsCredentials: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  logLevel: string;
  emailProvider: string;
  sendgridApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  squadApiBaseUrl: string;
  squadApiKey: string;
  squadWebhookSecret: string;
  stripePublicKey: string;
  stripeSecretKey: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3Bucket: string;
  geminiApiKey: string;
  maxFileSize: number;
  maxFilesPerUpload: number;
  enableEmailNotifications: boolean;
  enablePaymentProcessing: boolean;
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000'),
  appName: process.env.APP_NAME || 'Gig_Economy_Backend',
  appVersion: process.env.APP_VERSION || '1.0.0',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/gig_economy',
  jwtSecret: process.env.JWT_SECRET || 'your_secret_key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  corsCredentials: process.env.CORS_CREDENTIALS === 'true',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  logLevel: process.env.LOG_LEVEL || 'debug',
  emailProvider: process.env.EMAIL_PROVIDER || 'nodemailer',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@gigeconomy.com',
  squadApiBaseUrl: process.env.SQUAD_API_BASE_URL || 'https://api.sandbox.squad.co',
  squadApiKey: process.env.SQUAD_API_KEY || '',
  squadWebhookSecret: process.env.SQUAD_WEBHOOK_SECRET || '',
  stripePublicKey: process.env.STRIPE_PUBLIC_KEY || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsS3Bucket: process.env.AWS_S3_BUCKET || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
  maxFilesPerUpload: parseInt(process.env.MAX_FILES_PER_UPLOAD || '10'),
  enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  enablePaymentProcessing: process.env.ENABLE_PAYMENT_PROCESSING === 'true',
};

// Validate critical configuration
if (config.nodeEnv === 'production') {
  if (!config.jwtSecret || config.jwtSecret === 'your_secret_key') {
    throw new Error('JWT_SECRET must be set in production');
  }
  if (!config.mongoUri || config.mongoUri.includes('localhost')) {
    throw new Error('MONGO_URI must be set to a remote database in production');
  }
}

export default config;
