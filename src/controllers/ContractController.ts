import { Request, Response, NextFunction } from 'express';
import ContractService from '../services/ContractService';
import { UnauthorizedError } from '../utils/errors';

export class ContractController {
  /**
   * Record stock pickup for sales gig
   * POST /api/contracts/:id/sales/record-pickup
   */
  public recordStockPickup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const { stockQuantity, stockValue } = req.body;

      const contract = await ContractService.recordStockPickup(id, stockQuantity, stockValue);

      res.status(200).json({
        status: 'success',
        message: 'Stock pickup recorded',
        data: { contract },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate unique payment link for sales gig
   * POST /api/contracts/:id/sales/payment-link
   */
  public generateSalesPaymentLink = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const { customerEmail } = req.body;

      const result = await ContractService.generateSalesPaymentLink(id, customerEmail);

      res.status(200).json({
        status: 'success',
        message: 'Payment link generated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get live earnings for sales gig
   * GET /api/contracts/:id/sales/earnings
   */
  public getSalesEarnings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;

      const earnings = await ContractService.getSalesEarnings(id);

      res.status(200).json({
        status: 'success',
        data: { earnings },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Fund escrow for task gig
   * POST /api/contracts/:id/task/fund-escrow
   */
  public fundEscrow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;

      const contract = await ContractService.fundEscrow(id);

      res.status(200).json({
        status: 'success',
        message: 'Escrow funded successfully',
        data: { contract },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Submit deliverable for task gig
   * POST /api/contracts/:id/task/submit
   */
  public submitDeliverable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const { deliverableNotes, attachments } = req.body;

      const contract = await ContractService.submitDeliverable(id, {
        contractId: id,
        deliverableNotes,
        attachments,
      });

      res.status(200).json({
        status: 'success',
        message: 'Deliverable submitted',
        data: { contract },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve task completion and release escrow
   * POST /api/contracts/:id/task/approve
   */
  public approveTaskCompletion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;

      const contract = await ContractService.approveTaskCompletion(id);

      res.status(200).json({
        status: 'success',
        message: 'Task approved and escrow released',
        data: { contract },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Open dispute on task gig
   * POST /api/contracts/:id/task/dispute
   */
  public openDispute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const { reason } = req.body;

      const contract = await ContractService.openDispute(id, reason);

      res.status(200).json({
        status: 'success',
        message: 'Dispute opened',
        data: { contract },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get contract details
   * GET /api/contracts/:id
   */
  public getContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const contract = await ContractService.getContract(id);

      res.status(200).json({
        status: 'success',
        data: { contract },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's contracts
   * GET /api/contracts
   */
  public getUserContracts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const role = (req.query.role as 'owner' | 'helper') || 'owner';
      const status = req.query.status as string | undefined;
      const limit = Math.min(parseInt((req.query.limit as string) || '20'), 100);
      const offset = parseInt((req.query.offset as string) || '0');

      const { contracts, total } = await ContractService.getUserContracts(
        userId,
        role,
        status,
        limit,
        offset
      );

      res.status(200).json({
        status: 'success',
        data: { contracts, total, limit, offset },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new ContractController();
