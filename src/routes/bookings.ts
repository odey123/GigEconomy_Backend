import { Router } from 'express';
import bookingController from '../controllers/BookingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Booking routes (all protected)
 */
router.use(authMiddleware); // All routes require authentication

// Create booking
router.post('/', bookingController.createBooking);

// Get my bookings
router.get('/my', bookingController.getMyBookings);

// Get booking details
router.get('/:id', bookingController.getBooking);

// Accept booking
router.patch('/:id/accept', bookingController.acceptBooking);

// Complete booking
router.patch('/:id/complete', bookingController.completeBooking);

// Cancel booking
router.patch('/:id/cancel', bookingController.cancelBooking);

export default router;
