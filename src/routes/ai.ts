import { Router, Request, Response, NextFunction } from 'express';
import AIController from '../controllers/AIController';
import authMiddleware from '../middleware/auth';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * AI Service Routes
 * Internal endpoints called by the backend layers, not directly by frontend
 * All endpoints require authentication (P0 = internal use)
 */

/**
 * POST /api/ai/match-score
 * Score how well a helper fits a gig (0-100)
 * P0 - Used by /gigs/matched endpoint
 */
router.post(
  '/match-score',
  authMiddleware,
  (req: AuthRequest, res: Response, next: NextFunction) =>
    AIController.matchScore(req, res, next)
);

/**
 * POST /api/ai/verify-evidence
 * Multimodal LLM analyses uploaded work photos vs claimed skill
 * P1 - Used when approving task gig deliverables
 */
router.post(
  '/verify-evidence',
  authMiddleware,
  (req: AuthRequest, res: Response, next: NextFunction) =>
    AIController.verifyEvidence(req, res, next)
);

/**
 * POST /api/ai/credit-score
 * Analyses transaction history → credit score
 * P1 - Used for loan eligibility checks
 */
router.post(
  '/credit-score',
  authMiddleware,
  (req: AuthRequest, res: Response, next: NextFunction) =>
    AIController.creditScore(req, res, next)
);

/**
 * POST /api/ai/detect-anomaly
 * Flag suspicious transaction patterns
 * P2 - Rule-based with LLM reasoning
 */
router.post(
  '/detect-anomaly',
  authMiddleware,
  (req: AuthRequest, res: Response, next: NextFunction) =>
    AIController.detectAnomaly(req, res, next)
);

export default router;
