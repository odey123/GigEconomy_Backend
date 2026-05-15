import { Request, Response, NextFunction } from 'express';
import { ReputationService } from '../services/ReputationService';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  userId?: string;
}

class ReputationController {
  /**
   * GET /api/users/:id/reputation
   * Get reputation summary for a user (requires authentication)
   * P1 - Returns detailed reputation + credit score
   */
  async getReputationSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('User ID is required', 400);
      }

      logger.info(`Fetching reputation for user ${id}`);

      const reputation = await ReputationService.getReputationSummary(id);

      res.status(200).json({
        success: true,
        data: reputation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id/public-profile
   * Get public profile for a user (no authentication required)
   * P2 - Anyone can view another user's public reputation
   */
  async getPublicProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('User ID is required', 400);
      }

      logger.info(`Fetching public profile for user ${id}`);

      const profile = await ReputationService.getPublicProfile(id);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ReputationController();
export { ReputationController };
