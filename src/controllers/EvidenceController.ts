import { Request, Response, NextFunction } from 'express';
import EvidenceService from '../services/EvidenceService';
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
        throw new AppError(401, 'User not authenticated');
      }

      if (!req.files || req.files.length === 0) {
        throw new AppError(400, 'At least one photo is required');
      }

      const { contractId, workType, notes } = req.body;

      if (!contractId) {
        throw new AppError(400, 'contractId is required');
      }

      if (!workType || !['sales', 'task'].includes(workType)) {
        throw new AppError(400, 'workType must be "sales" or "task"');
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
        throw new AppError(401, 'User not authenticated');
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
        throw new AppError(401, 'User not authenticated');
      }

      const { evidenceId } = req.params;

      if (!evidenceId) {
        throw new AppError(400, 'Evidence ID is required');
      }

      logger.info(`Fetching evidence ${evidenceId}`);

      const evidence = await EvidenceService.getEvidenceById(evidenceId);

      if (!evidence) {
        throw new AppError(404, 'Evidence not found');
      }

      // Verify ownership or admin
      if (evidence.userId !== req.userId && req.user?.role !== 'admin') {
        throw new AppError(403, 'Unauthorized access to this evidence');
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
        throw new AppError(400, 'Contract ID is required');
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
