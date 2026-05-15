import { Router } from 'express';
import WebhookController from '../controllers/WebhookController';

const router = Router();

/**
 * POST /webhooks/squad
 * Squad payment event webhook
 * This is called by Squad when payments, transfers, or escrow events occur
 */
router.post('/squad', WebhookController.handlePayment);

export default router;
