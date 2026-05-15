import { Router } from 'express';
import creditController from '../controllers/CreditController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * POST /api/credit/loan-application
 * Owner applies for inventory loan — AI scores from Squad transaction history
 */
router.post('/loan-application', creditController.applyForLoan);

/**
 * POST /api/credit/advance-request
 * Helper requests earnings advance against future commissions
 */
router.post('/advance-request', creditController.requestAdvance);

/**
 * GET /api/credit/me
 * Loan / advance history for the authenticated user
 */
router.get('/me', creditController.getMyCreditHistory);

export default router;
