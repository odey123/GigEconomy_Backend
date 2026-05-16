import { Wallet, Transaction, User, type IWallet } from '../models';
import SquadService from './SquadService';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';

export interface CreateWalletDTO {
  bvn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string; // mm/dd/yyyy as required by Squad
  gender: string;      // '1' = Male, '2' = Female
  address: string;
  beneficiaryAccount?: string;
}

export interface WalletResponseDTO {
  _id: string;
  userId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  balance: number;
  verified: boolean;
  createdAt: Date;
}

export class WalletService {
  /**
   * Create virtual account via Squad (BVN verification + wallet in one call)
   */
  async createWallet(userId: string, data: CreateWalletDTO): Promise<WalletResponseDTO> {
    try {
      // Check if user already has a wallet
      const existingWallet = await Wallet.findOne({ userId });
      if (existingWallet) {
        throw new ConflictError('User already has a wallet');
      }

      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Call Squad to create virtual account
      const squadResponse = await SquadService.createVirtualAccount({
        customerId: userId,
        bvn: data.bvn,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || '',
        email: user.email,
        mobileNum: user.phone,
        dateOfBirth: data.dateOfBirth, // already in mm/dd/yyyy from controller
        gender: data.gender,
        address: data.address,
        beneficiaryAccount: data.beneficiaryAccount,
      });

      if (!squadResponse.status) {
        throw new ValidationError(`Failed to create Squad virtual account: ${squadResponse.message}`);
      }

      // Create wallet record
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const wallet = await Wallet.create({
        userId,
        squadVirtualAccountId: squadResponse.data?.id || userId,
        accountNumber: squadResponse.data?.account_number || '',
        accountName: squadResponse.data?.account_name || fullName,
        bankCode: squadResponse.data?.bank_code || '',
        bankName: squadResponse.data?.bank_name || 'Squad MFB',
        balance: 0,
        verified: true,
        bvn: data.bvn,
        fullName,
        dateOfBirth: new Date(data.dateOfBirth),
      });

      logger.info('Wallet created successfully', {
        userId,
        accountNumber: wallet.accountNumber,
      });

      return this.formatWalletResponse(wallet);
    } catch (error: any) {
      logger.error('Failed to create wallet', error);
      if (error instanceof ConflictError || error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error.message || 'Failed to create wallet');
    }
  }

  /**
   * Get wallet by user ID
   */
  async getWallet(userId: string): Promise<WalletResponseDTO> {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new NotFoundError('Wallet');
    }
    return this.formatWalletResponse(wallet);
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<{ balance: number; accountNumber: string }> {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new NotFoundError('Wallet');
    }

    return {
      balance: wallet.balance,
      accountNumber: wallet.accountNumber,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    transactions: any[];
    total: number;
  }> {
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await Transaction.countDocuments({ userId });

    return { transactions, total };
  }

  /**
   * Record a transaction (internal use)
   */
  async recordTransaction(payload: {
    userId: string;
    walletId: string;
    type: string;
    amount: number;
    description: string;
    reference: string;
    squadTransactionId?: string;
    relatedContractId?: string;
    status?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const transaction = await Transaction.create({
      userId: payload.userId,
      walletId: payload.walletId,
      type: payload.type,
      amount: payload.amount,
      netAmount: payload.amount, // Adjust if there are fees
      description: payload.description,
      reference: payload.reference,
      squadTransactionId: payload.squadTransactionId,
      relatedContractId: payload.relatedContractId,
      status: payload.status || 'pending',
      metadata: payload.metadata || {},
    });

    return transaction;
  }

  /**
   * Update wallet balance (triggered by Squad webhook)
   */
  async updateBalance(userId: string, amount: number, type: 'credit' | 'debit'): Promise<void> {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new NotFoundError('Wallet');
    }

    if (type === 'credit') {
      wallet.balance += amount;
    } else if (type === 'debit') {
      if (wallet.balance < amount) {
        throw new ValidationError('Insufficient balance');
      }
      wallet.balance -= amount;
    }

    await wallet.save();
    logger.info('Wallet balance updated', { userId, newBalance: wallet.balance });
  }

  /**
   * Initiate withdrawal (withdraw to bank)
   */
  async withdraw(
    userId: string,
    amount: number,
    bankAccount: {
      accountNumber: string;
      bankCode: string;
    }
  ): Promise<any> {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new NotFoundError('Wallet');
    }

    if (wallet.balance < amount) {
      throw new ValidationError('Insufficient balance');
    }

    const reference = `WTH_${userId}_${Date.now()}`;

    try {
      // Call Squad to initiate transfer
      const result = await SquadService.transfer({
        amount,
        accountNumber: bankAccount.accountNumber,
        bankCode: bankAccount.bankCode,
        narration: `Withdrawal from platform wallet`,
        reference,
      });

      // Record transaction
      await this.recordTransaction({
        userId,
        walletId: wallet._id.toString(),
        type: 'withdrawal',
        amount,
        description: `Withdrawal to ${bankAccount.accountNumber}`,
        reference,
        squadTransactionId: result.data.transaction_id,
        status: 'pending',
      });

      // Deduct from balance (will be credited back if transfer fails via webhook)
      wallet.balance -= amount;
      await wallet.save();

      logger.info('Withdrawal initiated', { userId, amount, reference });
      return result;
    } catch (error: any) {
      logger.error('Failed to initiate withdrawal', error);
      throw error;
    }
  }

  /**
   * Format wallet response
   */
  private formatWalletResponse(wallet: IWallet): WalletResponseDTO {
    return {
      _id: wallet._id.toString(),
      userId: wallet.userId,
      accountNumber: wallet.accountNumber,
      accountName: wallet.accountName,
      bankName: wallet.bankName,
      bankCode: wallet.bankCode,
      balance: wallet.balance,
      verified: wallet.verified,
      createdAt: wallet.createdAt,
    };
  }
}

export default new WalletService();
