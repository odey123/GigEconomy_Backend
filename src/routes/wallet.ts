import { Router } from 'express';
import walletController from '../controllers/WalletController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/wallet/create
 * Create virtual account and wallet via Squad
 */
router.post('/create', walletController.createWallet);

/**
 * GET /api/wallet
 * Get wallet details
 */
router.get('/', walletController.getWallet);

/**
 * GET /api/wallet/balance
 * Get wallet balance
 */
router.get('/balance', walletController.getBalance);

/**
 * GET /api/wallet/transactions
 * Get transaction history
 */
router.get('/transactions', walletController.getTransactions);

/**
 * POST /api/wallet/withdraw
 * Withdraw to bank account
 */
router.post('/withdraw', walletController.withdraw);

export default router;
