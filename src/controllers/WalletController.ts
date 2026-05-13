import { Request, Response, NextFunction } from 'express';
import { Wallet, Transaction } from '../models';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';

export class WalletController {
  /**
   * Create Squad virtual account and wallet
   * POST /api/users/wallet/create
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

      // Check if wallet already exists
      const existingWallet = await Wallet.findOne({ userId: req.userId });
      if (existingWallet) {
        throw new ValidationError('Wallet already exists for this user');
      }

      // TODO: Call Squad API endpoint to create virtual account
      // Squad endpoint: POST /virtual-account
      // Request body: { bvn, fullName, dob, phone, email, phoneNumber }
      // Response: { accountNumber, bankCode, bankName, verified, walletId }

      // Mock Squad response for now (replace with actual API call)
      const squadResponse = {
        accountNumber: `${Date.now()}`.slice(-10),
        bankCode: '035',
        bankName: 'Wema Bank',
        verified: true,
      };

      // Create wallet in database
      const wallet = await Wallet.create({
        userId: req.userId,
        walletId: `wallet_${req.userId}_${Date.now()}`,
        accountNumber: squadResponse.accountNumber,
        bank: squadResponse.bankName,
        bankCode: squadResponse.bankCode,
        balance: 0,
        currency: 'NGN',
        verified: squadResponse.verified,
        bvn,
        fullName,
      });

      res.status(201).json({
        status: 'success',
        message: 'Wallet created successfully',
        data: {
          wallet: {
            walletId: wallet.walletId,
            accountNumber: wallet.accountNumber,
            bank: wallet.bank,
            bankCode: wallet.bankCode,
            verified: wallet.verified,
            balance: wallet.balance,
            createdAt: wallet.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get wallet balance
   * GET /api/users/wallet/balance
   * Returns: { balance, accountNumber }
   */
  public getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const wallet = await Wallet.findOne({ userId: req.userId });

      if (!wallet) {
        throw new NotFoundError('Wallet');
      }

      res.status(200).json({
        status: 'success',
        data: {
          balance: {
            balance: wallet.balance,
            currency: wallet.currency,
            accountNumber: wallet.accountNumber,
            bank: wallet.bank,
            lastUpdated: wallet.updatedAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get wallet transaction history
   * GET /api/users/wallet/transactions
   * Query params: ?page=1&limit=20&status=completed
   * Returns: List of transactions
   */
  public getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = (req.query.status as string) || undefined;

      // Find wallet
      const wallet = await Wallet.findOne({ userId: req.userId });
      if (!wallet) {
        throw new NotFoundError('Wallet');
      }

      // Build query
      const query: any = { walletId: wallet.walletId };
      if (status) {
        query.status = status;
      }

      // Get total count
      const total = await Transaction.countDocuments(query);

      // Get transactions with pagination
      const skip = (page - 1) * limit;
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      res.status(200).json({
        status: 'success',
        data: {
          transactions: transactions.map((txn) => ({
            id: txn._id,
            type: txn.type,
            amount: txn.amount,
            fee: txn.fee,
            netAmount: txn.netAmount,
            description: txn.description,
            status: txn.status,
            reference: txn.reference,
            date: txn.createdAt,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Withdraw from wallet to bank account
   * POST /api/users/wallet/withdraw
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

      // Get wallet
      const wallet = await Wallet.findOne({ userId: req.userId });
      if (!wallet) {
        throw new NotFoundError('Wallet');
      }

      // Check balance
      if (wallet.balance < amount) {
        throw new ValidationError('Insufficient balance for withdrawal');
      }

      // Calculate fee (1%)
      const fee = amount * 0.01;
      const netAmount = amount - fee;

      // TODO: Call Squad API to process withdrawal
      // Squad endpoint: POST /virtual-account/{accountNumber}/withdraw
      // Request body: { amount, destinationAccountNumber, destinationBankCode }
      // Response: { withdrawalId, status, amount, fee }

      // Create withdrawal transaction
      const withdrawalReference = `with_${Date.now()}`;
      const transaction = await Transaction.create({
        walletId: wallet.walletId,
        userId: req.userId,
        type: 'withdrawal',
        amount,
        fee,
        netAmount,
        description: `Withdrawal to ${bankAccount.accountNumber}`,
        status: 'pending', // Will be 'completed' after Squad webhook
        reference: withdrawalReference,
        metadata: {
          bankAccount,
          destinationAccountNumber: bankAccount.accountNumber,
          destinationBankCode: bankAccount.bankCode,
        },
      });

      // Deduct from balance immediately (or wait for Squad confirmation - your choice)
      // For now, we'll deduct immediately
      wallet.balance -= amount;
      await wallet.save();

      res.status(200).json({
        status: 'success',
        message: 'Withdrawal initiated successfully',
        data: {
          withdrawal: {
            withdrawalId: withdrawalReference,
            status: 'pending',
            amount,
            fee,
            netAmount,
            bankAccount,
            transactionId: transaction._id,
            createdAt: transaction.createdAt,
            walletBalance: wallet.balance,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DEVELOPMENT ONLY: Credit wallet (for testing)
   * POST /api/users/wallet/credit
   * Body: { amount, description }
   * NOTE: Remove this in production - credits come via Squad webhooks in Layer 4
   */
  public creditWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { amount, description = 'Manual credit for testing' } = req.body;

      if (!amount || amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      // Get wallet
      const wallet = await Wallet.findOne({ userId: req.userId });
      if (!wallet) {
        throw new NotFoundError('Wallet');
      }

      // Create credit transaction
      const creditReference = `cred_${Date.now()}`;
      await Transaction.create({
        walletId: wallet.walletId,
        userId: req.userId,
        type: 'credit',
        amount,
        fee: 0,
        netAmount: amount,
        description,
        status: 'completed',
        reference: creditReference,
        metadata: {
          source: 'development_test',
        },
      });

      // Add to balance
      wallet.balance += amount;
      await wallet.save();

      res.status(200).json({
        status: 'success',
        message: 'Wallet credited successfully (DEV MODE)',
        data: {
          credit: {
            creditId: creditReference,
            amount,
            description,
            newBalance: wallet.balance,
            createdAt: new Date(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };;
}

export default new WalletController();
