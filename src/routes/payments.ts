import { Router } from 'express';
import paymentController from '../controllers/PaymentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Payment routes (all protected)
 */
router.use(authMiddleware); // All routes require authentication

// Create payment
router.post('/', paymentController.createPayment);

// Get payment details
router.get('/:id', paymentController.getPayment);

// Get payments for booking
router.get('/booking/:bookingId', paymentController.getBookingPayments);

// Get my earnings (worker)
router.get('/earnings/my', paymentController.getMyEarnings);

// Get my payments (client)
router.get('/my', paymentController.getMyPayments);

export default router;
