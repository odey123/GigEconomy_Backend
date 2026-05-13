import { Router } from 'express';
import gigsController from '../controllers/GigsController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Gigs routes
 */

// Public routes (with optional auth for personalization)
router.get('/matched', authMiddleware, gigsController.getMatchedGigs);
router.get('/', optionalAuthMiddleware, gigsController.listGigs);
router.get('/:id', optionalAuthMiddleware, gigsController.getGigDetail);

// Protected routes (owner only)
router.post('/', authMiddleware, gigsController.createGig);
router.get('/mine', authMiddleware, gigsController.getMyGigs);
router.patch('/:id', authMiddleware, gigsController.updateGig);
router.delete('/:id', authMiddleware, gigsController.deleteGig);

export default router;
