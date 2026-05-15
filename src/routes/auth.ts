import { Router } from 'express';
import authController from '../controllers/AuthController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Auth routes
 */

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);

export default router;
