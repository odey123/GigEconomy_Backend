import { Request, Response, NextFunction } from 'express';
import userService from '../services/UserService';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';

export class WalletController {
  /**
   * Create Squad virtual account and wallet
   * POST /api/wallet/create
   * Body: { bvn, fullName, dob, phone }
   * This calls Squad's virtual-account endpoint
   */
  public createWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { bvn, fullName, dob, phone } = req.body;

      // Validate required fields
      if (!bvn || !fullName || !dob || !phone) {
        throw new ValidationError('BVN, fullName, dob, and phone are required');
      }

      // TODO: Call Squad API endpoint to create virtual account
      // Squad endpoint: POST /virtual-account
      // Request body: { bvn, fullName, dob, phone, email, phoneNumber }
      // Response: { accountNumber, bankCode, bankName, verified, walletId }

      // Mock response for now (replace with actual Squad API call)
      const walletData = {
        walletId: `wallet_${req.userId}_${Date.now()}`,
        accountNumber: '1234567890',
        bank: 'Wema Bank',
        bankCode: '035',
        verified: true,
        bvn,
        fullName,
        createdAt: new Date(),
      };

      // TODO: Save wallet data to user document
      // await User.findByIdAndUpdate(req.userId, { wallet: walletData });

      res.status(201).json({
        status: 'success',
        message: 'Wallet created successfully',
        data: {
          wallet: walletData,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get wallet balance
   * GET /api/wallet/balance
   * Returns: { balance, accountNumber }
   */
  public getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      // TODO: Call Squad API to get account balance
      // Squad endpoint: GET /virtual-account/{accountNumber}/balance
      // Response: { balance, currency }

      // Mock response for now
      const balanceData = {
        balance: 45000,
        currency: 'NGN',
        accountNumber: '1234567890',
      };

      res.status(200).json({
        status: 'success',
        data: {
          balance: balanceData,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get wallet transaction history
   * GET /api/wallet/transactions
   * Query params: ?page=1&limit=20
   * Returns: List of Squad transactions
   */
  public getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Call Squad API to get transaction history
      // Squad endpoint: GET /virtual-account/{accountNumber}/transactions
      // Response: { transactions: [...], total, page, limit }

      // Mock response for now
      const transactions = {
        transactions: [
          {
            id: 'txn_001',
            type: 'credit',
            amount: 5000,
            description: 'Payment received',
            date: new Date(),
            status: 'completed',
          },
        ],
        total: 1,
        page,
        limit,
      };

      res.status(200).json({
        status: 'success',
        data: transactions,
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
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { amount, bankAccount } = req.body;

      if (!amount || !bankAccount?.accountNumber || !bankAccount?.bankCode) {
        throw new ValidationError('Amount and bank account details are required');
      }

      if (amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      // TODO: Call Squad API to process withdrawal
      // Squad endpoint: POST /virtual-account/{accountNumber}/withdraw
      // Request body: { amount, destinationAccountNumber, destinationBankCode }
      // Response: { withdrawalId, status, amount, fee }

      // Mock response for now
      const withdrawalData = {
        withdrawalId: `with_${Date.now()}`,
        status: 'processing',
        amount,
        fee: amount * 0.01, // 1% fee
        netAmount: amount - amount * 0.01,
        bankAccount,
        createdAt: new Date(),
      };

      res.status(200).json({
        status: 'success',
        message: 'Withdrawal initiated successfully',
        data: {
          withdrawal: withdrawalData,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new WalletController();
