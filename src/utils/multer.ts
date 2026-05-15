import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from './logger';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'evidence');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info(`Created uploads directory: ${uploadsDir}`);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadsDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    // Generate unique filename: timestamp_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter - only allow images
const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Only JPEG, PNG, and WebP are allowed. Received: ${file.mimetype}`
      ),
      false
    );
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10, // Max 10 files per upload
  },
});

export default upload;
export { upload };
