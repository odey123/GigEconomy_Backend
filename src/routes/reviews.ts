import { Router } from 'express';
import reviewController from '../controllers/ReviewController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Review routes
 */

// Public routes (view only)
router.get('/top-rated', reviewController.getTopRatedUsers);
router.get('/user/:userId', reviewController.getUserReviews);
router.get('/:id', reviewController.getReview);

// Protected routes (create/edit)
router.use(authMiddleware);
router.post('/', reviewController.createReview);
router.get('/my', reviewController.getMyReviews);

export default router;
