import { Router } from 'express';
import adminController from '../controllers/AdminController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireRole(['admin']));

/**
 * GET /admin/users
 * List and filter users — supports ?status=&role=&search=&limit=&offset=
 */
router.get('/users', adminController.getUsers);

/**
 * POST /admin/users/:id/suspend
 * Suspend a user account
 */
router.post('/users/:id/suspend', adminController.suspendUser);

/**
 * POST /admin/users/:id/reinstate
 * Reinstate a suspended user
 */
router.post('/users/:id/reinstate', adminController.reinstateUser);

/**
 * GET /admin/transactions
 * Cross-platform Squad transaction activity — supports ?userId=&type=&status=
 */
router.get('/transactions', adminController.getTransactions);

/**
 * GET /admin/flags
 * AI-flagged anomalies across all users
 */
router.get('/flags', adminController.getFlags);

/**
 * GET /admin/summary
 * Platform-wide stats for the admin dashboard
 */
router.get('/summary', adminController.getSummary);

export default router;
