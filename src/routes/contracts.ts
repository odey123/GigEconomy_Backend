import { Router } from 'express';
import contractController from '../controllers/ContractController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/contracts/:id
 * Get contract details
 */
router.get('/:id', contractController.getContract);

/**
 * GET /api/contracts/me
 * Get user's contracts (both owner and helper)
 */
router.get('/', contractController.getUserContracts);

/**
 * SALES GIG ENDPOINTS
 */

/**
 * POST /api/contracts/:id/sales/record-pickup
 * Record stock pickup for sales gig
 */
router.post('/:id/sales/record-pickup', contractController.recordStockPickup);

/**
 * POST /api/contracts/:id/sales/payment-link
 * Generate unique payment link for customer
 */
router.post('/:id/sales/payment-link', contractController.generateSalesPaymentLink);

/**
 * GET /api/contracts/:id/sales/earnings
 * Get live earnings for sales gig
 */
router.get('/:id/sales/earnings', contractController.getSalesEarnings);

/**
 * TASK GIG ENDPOINTS
 */

/**
 * POST /api/contracts/:id/task/fund-escrow
 * Fund escrow (owner locks money upfront)
 */
router.post('/:id/task/fund-escrow', contractController.fundEscrow);

/**
 * POST /api/contracts/:id/task/submit
 * Submit completed work
 */
router.post('/:id/task/submit', contractController.submitDeliverable);

/**
 * POST /api/contracts/:id/task/approve
 * Owner approves completion and releases escrow
 */
router.post('/:id/task/approve', contractController.approveTaskCompletion);

/**
 * POST /api/contracts/:id/task/dispute
 * Open a dispute
 */
router.post('/:id/task/dispute', contractController.openDispute);

export default router;
