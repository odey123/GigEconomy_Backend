import { Request, Response, NextFunction } from 'express';
import AdminService from '../services/AdminService';
import { UnauthorizedError } from '../utils/errors';

export class AdminController {
  /**
   * List / filter users
   * GET /admin/users
   */
  public getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError();

      const limit = Math.min(parseInt((req.query.limit as string) || '20'), 100);
      const offset = parseInt((req.query.offset as string) || '0');
      const filters = {
        status: req.query.status as string | undefined,
        role: req.query.role as string | undefined,
        search: req.query.search as string | undefined,
      };

      const result = await AdminService.getUsers(filters, limit, offset);

      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Suspend a user account
   * POST /admin/users/:id/suspend
   */
  public suspendUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError();

      const result = await AdminService.suspendUser(req.params.id);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reinstate a suspended user
   * POST /admin/users/:id/reinstate
   */
  public reinstateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError();

      const result = await AdminService.reinstateUser(req.params.id);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cross-platform transaction activity
   * GET /admin/transactions
   */
  public getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError();

      const limit = Math.min(parseInt((req.query.limit as string) || '50'), 200);
      const offset = parseInt((req.query.offset as string) || '0');
      const filters = {
        userId: req.query.userId as string | undefined,
        type: req.query.type as string | undefined,
        status: req.query.status as string | undefined,
      };

      const result = await AdminService.getTransactions(filters, limit, offset);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * AI-flagged anomalies
   * GET /admin/flags
   */
  public getFlags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError();

      const result = await AdminService.getFlags();
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Platform summary stats
   * GET /admin/summary
   */
  public getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError();

      const result = await AdminService.getSummary();
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };
}

export default new AdminController();
