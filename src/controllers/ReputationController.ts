import { Request, Response, NextFunction } from 'express';
import reputationService from '../services/ReputationService';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

class ReputationController {
  async getReputationSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) throw new AppError(400, 'User ID is required');
      logger.info(`Fetching reputation for user ${id}`);
      const reputation = await reputationService.getReputationSummary(id);
      res.status(200).json({ success: true, data: reputation });
    } catch (error) { next(error); }
  }

  async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) throw new AppError(400, 'User ID is required');
      logger.info(`Fetching public profile for user ${id}`);
      const profile = await reputationService.getPublicProfile(id);
      res.status(200).json({ success: true, data: profile });
    } catch (error) { next(error); }
  }
}

export default new ReputationController();
export { ReputationController };
