import { Router } from 'express';
import usersController from '../controllers/UsersController';
import walletController from '../controllers/WalletController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * User profile routes (protected)
 */
router.use(authMiddleware); // All routes below require authentication

// Profile management
router.get('/me', usersController.getProfile);
router.patch('/me', usersController.updateProfile);

// Owner setup
router.post('/me/owner-profile', usersController.setupOwnerProfile);

// Helper setup
router.post('/me/helper-profile', usersController.setupHelperProfile);

// Wallet operations
router.post('/wallet/create', walletController.createWallet);
router.get('/wallet/balance', walletController.getBalance);
router.get('/wallet/transactions', walletController.getTransactions);
router.post('/wallet/withdraw', walletController.withdraw);

export default router;
