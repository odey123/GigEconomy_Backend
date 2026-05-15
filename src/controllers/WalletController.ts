import { Request, Response, NextFunction } from 'express';
import WalletService from '../services/WalletService';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { walletValidationSchemas } from '../utils/validators';

export class WalletController {
  /**
   * Create Squad virtual account and wallet
   * POST /api/wallet/create
   * Body: { bvn, fullName, dateOfBirth }
   */
  public createWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { error, value } = walletValidationSchemas.create.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const wallet = await WalletService.createWallet(userId, {
        bvn: value.bvn,
        fullName: value.fullName,
        dateOfBirth: value.dateOfBirth,
      });

      res.status(201).json({
        status: 'success',
        message: 'Wallet created successfully with Squad virtual account',
        data: { wallet },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get wallet details
   * GET /api/wallet
   */
  public getWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const wallet = await WalletService.getWallet(userId);

      res.status(200).json({
        status: 'success',
        data: { wallet },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get wallet balance
   * GET /api/wallet/balance
   */
  public getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const balance = await WalletService.getBalance(userId);

      res.status(200).json({
        status: 'success',
        data: { balance },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get wallet transaction history
   * GET /api/wallet/transactions
   */
  public getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const limit = Math.min(parseInt((req.query.limit as string) || '50'), 100);
      const offset = parseInt((req.query.offset as string) || '0');

      const { transactions, total } = await WalletService.getTransactions(userId, limit, offset);

      res.status(200).json({
        status: 'success',
        data: { transactions, total, limit, offset },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Withdraw from wallet to bank account
   * POST /api/wallet/withdraw
   * Body: { amount, bankAccount: { accountNumber, bankCode } }
   */
  public withdraw = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { error, value } = walletValidationSchemas.withdraw.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const result = await WalletService.withdraw(userId, value.amount, value.bankAccount);

      res.status(200).json({
        status: 'success',
        message: 'Withdrawal initiated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new WalletController();
