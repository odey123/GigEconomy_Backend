import { Request, Response, NextFunction } from 'express';
import AIService from '../services/AIService';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

class AIController {
  async matchScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gigData, helperProfile } = req.body;
      if (!gigData || !helperProfile) throw new AppError(400, 'Missing gigData or helperProfile');
      logger.info('Calculating match score');
      const result = await AIService.matchScore(gigData, helperProfile);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async verifyEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageUrl, claimedSkillLevel, workType } = req.body;
      if (!imageUrl || !claimedSkillLevel || !workType) {
        throw new AppError(400, 'Missing imageUrl, claimedSkillLevel, or workType');
      }
      logger.info(`Verifying evidence for ${workType} work`);
      const result = await AIService.verifyEvidence(imageUrl, claimedSkillLevel, workType);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async creditScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionHistory } = req.body;
      if (!transactionHistory) throw new AppError(400, 'Missing transactionHistory');
      logger.info(`Calculating credit score for user ${req.userId}`);
      const result = await AIService.creditScore(transactionHistory);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async detectAnomaly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactions } = req.body;
      if (!transactions || !Array.isArray(transactions)) {
        throw new AppError(400, 'Missing or invalid transactions array');
      }
      logger.info(`Analyzing ${transactions.length} transactions for anomalies`);
      const result = await AIService.detectAnomaly(transactions);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export default new AIController();
export { AIController };
