import { Request, Response, NextFunction } from 'express';
import { EvidenceService } from '../services/EvidenceService';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  userId?: string;
  files?: Express.Multer.File[];
}

class EvidenceController {
  /**
   * POST /api/users/me/evidence
   * Upload work-sample photos (multipart)
   * P1 - Triggers AI verification
   */
  async uploadEvidence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!req.files || req.files.length === 0) {
        throw new AppError('At least one photo is required', 400);
      }

      const { contractId, workType, notes } = req.body;

      if (!contractId) {
        throw new AppError('contractId is required', 400);
      }

      if (!workType || !['sales', 'task'].includes(workType)) {
        throw new AppError('workType must be "sales" or "task"', 400);
      }

      logger.info(`Uploading evidence for user ${req.userId}, contract ${contractId}`);

      const result = await EvidenceService.uploadEvidence({
        userId: req.userId,
        contractId,
        workType,
        files: req.files,
        notes,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/me/evidence
   * Get user's evidence uploads
   */
  async getUserEvidence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new AppError('User not authenticated', 401);
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      logger.info(`Fetching evidence for user ${req.userId}`);

      const result = await EvidenceService.getUserEvidence(req.userId, limit, offset);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/me/evidence/:evidenceId
   * Get specific evidence by ID
   */
  async getEvidenceById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { evidenceId } = req.params;

      if (!evidenceId) {
        throw new AppError('Evidence ID is required', 400);
      }

      logger.info(`Fetching evidence ${evidenceId}`);

      const evidence = await EvidenceService.getEvidenceById(evidenceId);

      if (!evidence) {
        throw new AppError('Evidence not found', 404);
      }

      // Verify ownership or admin
      if (evidence.userId !== req.userId && req.user?.role !== 'admin') {
        throw new AppError('Unauthorized access to this evidence', 403);
      }

      res.status(200).json({
        success: true,
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/contracts/:contractId/evidence
   * Get evidence for a specific contract
   */
  async getContractEvidence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { contractId } = req.params;

      if (!contractId) {
        throw new AppError('Contract ID is required', 400);
      }

      logger.info(`Fetching evidence for contract ${contractId}`);

      const evidence = await EvidenceService.getContractEvidence(contractId);

      res.status(200).json({
        success: true,
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new EvidenceController();
export { EvidenceController };
