import { Request, Response, NextFunction } from 'express';
import { Contract, Wallet, Transaction } from '../models';
import { ContractStatus } from '../models/Contract';
import WalletService from '../services/WalletService';
import config from '../config/config';
import logger from '../utils/logger';
import crypto from 'crypto';

/**
 * Squad Webhook Handler
 * Processes payment events from Squad (auto-splits, escrow releases, transfers)
 */

export class SquadWebhookController {
  /**
   * Verify webhook signature from Squad
   */
  private verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const hash = crypto.createHmac('sha256', config.squadWebhookSecret).update(rawBody).digest('hex');
    return hash === signature;
  }

  /**
   * Handle Squad payment webhook
   * POST /webhooks/squad
   */
  public handlePayment = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const signature = req.headers['x-squad-signature'] as string;
      const rawBody: Buffer = (req as any).rawBody;

      // Verify webhook signature against the original raw bytes
      if (!this.verifyWebhookSignature(rawBody, signature)) {
        logger.warn('Invalid Squad webhook signature');
        res.status(401).json({ status: 'error', message: 'Invalid signature' });
        return;
      }

      const event = req.body;

      logger.info('Squad webhook received', { eventType: event.event, reference: event.data?.reference });

      switch (event.event) {
        case 'charge.success':
          await this.handleChargeSuccess(event.data);
          break;
        case 'charge.failed':
          await this.handleChargeFailed(event.data);
          break;
        case 'transfer.success':
          await this.handleTransferSuccess(event.data);
          break;
        case 'transfer.failed':
          await this.handleTransferFailed(event.data);
          break;
        case 'split.success':
          await this.handleSplitSuccess(event.data);
          break;
        case 'escrow.released':
          await this.handleEscrowReleased(event.data);
          break;
        default:
          logger.info('Unknown Squad event', { eventType: event.event });
      }

      res.status(200).json({ status: 'success', message: 'Webhook processed' });
    } catch (error: any) {
      logger.error('Squad webhook processing error', error);
      res.status(500).json({ status: 'error', message: 'Failed to process webhook' });
    }
  };

  /**
   * Handle successful charge (customer paid)
   */
  private async handleChargeSuccess(data: any): Promise<void> {
    const { reference, amount } = data;

    logger.info('Processing charge success', { reference, amount });

    // Find contract by reference or metadata
    const contract = await Contract.findOne({
      'salesData.paymentReference': reference,
    });

    if (contract) {
      // Update contract payment status
      if (contract.salesData) {
        contract.salesData.paymentStatus = 'completed';
      }
      contract.status = ContractStatus.ACTIVE;

      await contract.save();

      // Update both wallets (owner and helper)
      const ownerWallet = await Wallet.findOne({ userId: contract.ownerId });
      const helperWallet = await Wallet.findOne({ userId: contract.helperId });

      if (ownerWallet && contract.salesData) {
        await WalletService.recordTransaction({
          userId: contract.ownerId,
          walletId: ownerWallet._id.toString(),
          type: 'credit',
          amount: contract.salesData.ownerAmount,
          description: `Payment received for sales gig`,
          reference,
          squadTransactionId: reference,
          relatedContractId: contract._id.toString(),
          status: 'completed',
        });
        await WalletService.updateBalance(contract.ownerId, contract.salesData.ownerAmount, 'credit');
      }

      if (helperWallet && contract.salesData) {
        await WalletService.recordTransaction({
          userId: contract.helperId,
          walletId: helperWallet._id.toString(),
          type: 'credit',
          amount: contract.salesData.helperCommission,
          description: `Commission earned from sales gig`,
          reference: `${reference}-HELPER`,
          squadTransactionId: `${reference}-HELPER`,
          relatedContractId: contract._id.toString(),
          status: 'completed',
        });
        await WalletService.updateBalance(contract.helperId, contract.salesData.helperCommission, 'credit');
      }

      logger.info('Charge success processed', { contractId: contract._id });
    }
  }

  /**
   * Handle failed charge
   */
  private async handleChargeFailed(data: any): Promise<void> {
    const { reference, reason } = data;

    logger.error('Charge failed', { reference, reason });

    const contract = await Contract.findOne({
      'salesData.paymentReference': reference,
    });

    if (contract && contract.salesData) {
      contract.salesData.paymentStatus = 'failed';
      await contract.save();
    }
  }

  /**
   * Handle successful transfer (withdrawal)
   */
  private async handleTransferSuccess(data: any): Promise<void> {
    const { reference, amount, transaction_id } = data;

    logger.info('Transfer success', { reference, amount });

    // Update transaction status
    const transaction = await Transaction.findOne({ reference });
    if (transaction) {
      transaction.status = 'completed';
      transaction.squadTransactionId = transaction_id;
      await transaction.save();
    }
  }

  /**
   * Handle failed transfer
   */
  private async handleTransferFailed(data: any): Promise<void> {
    const { reference, reason } = data;

    logger.error('Transfer failed', { reference, reason });

    // Find transaction and mark as failed
    const transaction = await Transaction.findOne({ reference });
    if (transaction) {
      transaction.status = 'failed';
      await transaction.save();

      // Refund to wallet if it was a withdrawal
      if (transaction.type === 'withdrawal') {
        const wallet = await Wallet.findById(transaction.walletId);
        if (wallet) {
          wallet.balance += transaction.amount;
          await wallet.save();
          logger.info('Withdrawal refunded to wallet', { walletId: transaction.walletId });
        }
      }
    }
  }

  /**
   * Handle successful auto-split
   */
  private async handleSplitSuccess(data: any): Promise<void> {
    const { reference, splits } = data;

    logger.info('Auto-split completed', {
      reference,
      splitCount: splits.length,
    });

    // Update contract to indicate split was applied
    const contract = await Contract.findOne({
      'salesData.paymentReference': reference,
    });

    if (contract) {
      // Both parties should have received their amounts by now
      logger.info('Auto-split applied to contract', { contractId: contract._id });
    }
  }

  /**
   * Handle escrow release
   */
  private async handleEscrowReleased(data: any): Promise<void> {
    const { reference, amount } = data;

    logger.info('Escrow released', { reference, amount });

    // Find and update contract
    const contract = await Contract.findOne({
      'taskData.escrowReference': reference,
    });

    if (contract && contract.taskData) {
      contract.taskData.escrowStatus = 'released';
      contract.taskData.completionDate = new Date();
      contract.status = ContractStatus.COMPLETED;
      await contract.save();

      logger.info('Escrow release processed', { contractId: contract._id });
    }
  }
}

export default new SquadWebhookController();
