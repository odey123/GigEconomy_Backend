import { Router } from 'express';
import gigsController from '../controllers/GigsController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Gigs routes
 * NOTE: Order matters! Specific routes (/mine, /matched) must come before dynamic routes (/:id)
 */

// Protected routes (owner only) - MUST be before /:id
router.get('/mine', authMiddleware, gigsController.getMyGigs);
router.post('/', authMiddleware, gigsController.createGig);

// AI matching route - MUST be before /:id
router.get('/matched', authMiddleware, gigsController.getMatchedGigs);

// Public routes (with optional auth for personalization)
router.get('/', optionalAuthMiddleware, gigsController.listGigs);

// Dynamic routes (these catch everything else)
router.get('/:id', optionalAuthMiddleware, gigsController.getGigDetail);
router.patch('/:id', authMiddleware, gigsController.updateGig);
router.delete('/:id', authMiddleware, gigsController.deleteGig);

export default router;
