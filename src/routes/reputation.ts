import { Router, Request, Response, NextFunction } from 'express';
import ReputationController from '../controllers/ReputationController';
import authMiddleware from '../middleware/auth';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  userId?: string;
}

const router = Router();

/**
 * Reputation Routes
 * P1 - Reputation + credit summary
 * P2 - Public profile (anyone can view)
 */

/**
 * GET /api/reputation/:userId
 * Get reputation summary for a user (requires authentication)
 * Returns: { averageRating, totalReviews, completedGigs, trustTier, creditScore, loanEligibility }
 */
router.get(
  '/:id',
  authMiddleware,
  (req: AuthRequest, res: Response, next: NextFunction) =>
    ReputationController.getReputationSummary(req, res, next)
);

/**
 * GET /api/public-profile/:userId
 * Get public profile for a user (no authentication required)
 * P2 - Anyone can view another user's reputation
 */
router.get(
  '/public/:id',
  (req: AuthRequest, res: Response, next: NextFunction) =>
    ReputationController.getPublicProfile(req, res, next)
);

export default router;
