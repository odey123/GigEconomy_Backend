import { Request, Response, NextFunction } from 'express';
import AIService from '../services/AIService';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

class AIController {
  /**
   * POST /api/ai/match-score
   * Score how well a helper fits a gig
   * P0 - Used by /gigs/matched endpoint
   */
  async matchScore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gigData, helperProfile } = req.body;

      if (!gigData || !helperProfile) {
        throw new AppError(400, 'Missing gigData or helperProfile');
      }

      logger.info(`Calculating match score for gig analysis`);

      const result = await AIService.matchScore(gigData, helperProfile);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/verify-evidence
   * Multimodal LLM analyses uploaded work photos vs claimed skill
   * P1 - Used when approving task gig deliverables
   */
  async verifyEvidence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageUrl, claimedSkillLevel, workType } = req.body;

      if (!imageUrl || !claimedSkillLevel || !workType) {
        throw new AppError('Missing imageUrl, claimedSkillLevel, or workType', 400);
      }

      logger.info(`Verifying evidence for ${workType} work`);

      const result = await AIService.verifyEvidence(imageUrl, claimedSkillLevel, workType);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/credit-score
   * Analyses Squad transaction history → credit score
   * P1 - Used for loan eligibility checks
   */
  async creditScore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionHistory } = req.body;

      if (!transactionHistory) {
        throw new AppError('Missing transactionHistory', 400);
      }

      logger.info(`Calculating credit score for user ${req.user?.userId}`);

      const result = await AIService.creditScore(transactionHistory);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/detect-anomaly
   * Flag suspicious transaction patterns
   * P2 - Rule-based with LLM reasoning
   */
  async detectAnomaly(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactions } = req.body;

      if (!transactions || !Array.isArray(transactions)) {
        throw new AppError('Missing or invalid transactions array', 400);
      }

      logger.info(`Analyzing ${transactions.length} transactions for anomalies`);

      const result = await AIService.detectAnomaly(transactions);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AIController();
export { AIController };
