import { Router, Request, Response, NextFunction } from 'express';
import EvidenceController from '../controllers/EvidenceController';
import authMiddleware from '../middleware/auth';
import upload from '../utils/multer';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  userId?: string;
  files?: Express.Multer.File[];
}

const router = Router();

/**
 * Evidence Routes
 * P1 - Task gigs need photo evidence
 */

/**
 * POST /api/evidence/upload
 * Upload work-sample photos (multipart)
 * Triggers AI verification
 */
router.post(
  '/upload',
  authMiddleware,
  upload.array('photos', 10),
  (req: AuthRequest, res: Response, next: NextFunction) =>
    EvidenceController.uploadEvidence(req, res, next)
);

/**
 * GET /api/evidence
 * Get user's evidence uploads
 */
router.get(
  '/',
  authMiddleware,
  (req: AuthRequest, res: Response, next: NextFunction) =>
    EvidenceController.getUserEvidence(req, res, next)
);

/**
 * GET /api/evidence/:evidenceId
 * Get specific evidence by ID
 */
router.get(
  '/:evidenceId',
  authMiddleware,
  (req: AuthRequest, res: Response, next: NextFunction) =>
    EvidenceController.getEvidenceById(req, res, next)
);

/**
 * GET /api/evidence/contract/:contractId
 * Get evidence for a specific contract
 */
router.get(
  '/contract/:contractId',
  (req: AuthRequest, res: Response, next: NextFunction) =>
    EvidenceController.getContractEvidence(req, res, next)
);

export default router;
