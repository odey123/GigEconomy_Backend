import { Request, Response, NextFunction } from 'express';
import CreditService from '../services/CreditService';
import { ValidationError, UnauthorizedError } from '../utils/errors';

export class CreditController {
  /**
   * Owner applies for inventory loan
   * POST /credit/loan-application
   * Body: { amount, purpose }
   */
  public applyForLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) throw new UnauthorizedError();

      const { amount, purpose } = req.body;
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new ValidationError('amount must be a positive number');
      }
      if (!purpose || typeof purpose !== 'string') {
        throw new ValidationError('purpose is required');
      }

      const result = await CreditService.applyForLoan(userId, amount, purpose);

      res.status(result.approved ? 200 : 200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Helper requests earnings advance
   * POST /credit/advance-request
   * Body: { amount }
   */
  public requestAdvance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) throw new UnauthorizedError();

      const { amount } = req.body;
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new ValidationError('amount must be a positive number');
      }

      const result = await CreditService.requestAdvance(userId, amount);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get loan/advance history
   * GET /credit/me
   */
  public getMyCreditHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) throw new UnauthorizedError();

      const result = await CreditService.getMyCreditHistory(userId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new CreditController();
