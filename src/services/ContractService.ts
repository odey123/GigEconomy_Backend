import { Contract, Wallet, type IContract } from '../models';
import { ContractStatus } from '../models/Contract';
import SquadService from './SquadService';
import WalletService from './WalletService';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export interface CreateSalesPaymentLinkDTO {
  contractId: string;
  customerEmail: string;
}

export interface SubmitTaskDeliverableDTO {
  contractId: string;
  deliverableNotes: string;
  attachments?: string[];
}

export class ContractService {
  /**
   * SALES GIG: Record stock pickup
   */
  async recordStockPickup(
    contractId: string,
    stockQuantity: number,
    stockValue: number
  ): Promise<IContract> {
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (contract.workType !== 'sales') {
      throw new ValidationError('This endpoint is only for sales gigs');
    }

    if (!contract.salesData) {
      contract.salesData = {
        paymentReference: '',
        paymentUrl: '',
        qrCode: '',
        customerAmount: 0,
        ownerAmount: 0,
        helperCommission: 0,
        paymentStatus: 'pending',
      };
    }

    contract.salesData.stockPickupQuantity = stockQuantity;
    contract.salesData.stockPickupValue = stockValue;
    contract.salesData.pickupDate = new Date();

    await contract.save();

    logger.info('Stock pickup recorded', {
      contractId,
      quantity: stockQuantity,
      value: stockValue,
    });

    return contract;
  }

  /**
   * SALES GIG: Generate unique payment link for customer
   */
  async generateSalesPaymentLink(
    contractId: string,
    customerEmail: string
  ): Promise<{
    paymentUrl: string;
    qrCode: string;
  }> {
    const contract = await Contract.findById(contractId).populate('gigId');
    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (contract.workType !== 'sales') {
      throw new ValidationError('This endpoint is only for sales gigs');
    }

    const gig = contract.gigId as any;
    if (!gig) {
      throw new NotFoundError('Gig');
    }

    // Calculate commission split
    const productPrice = gig.productPrice;
    const commissionPercent = gig.commissionPercent;
    const commissionAmount = (productPrice * commissionPercent) / 100;
    const ownerAmount = productPrice - commissionAmount;

    const reference = `PAY_${contractId}_${Date.now()}`;

    try {
      // Create payment link via Squad
      const paymentLink = await SquadService.createPaymentLink({
        amount: productPrice,
        customerId: contract.ownerId,
        reference,
        metadata: {
          contractId,
          workType: 'sales',
          customerEmail,
        },
      });

      if (!paymentLink.status) {
        throw new ValidationError('Failed to create payment link');
      }

      // Setup auto-split for this payment
      const ownerWallet = await Wallet.findOne({ userId: contract.ownerId });
      const helperWallet = await Wallet.findOne({ userId: contract.helperId });

      if (!ownerWallet || !helperWallet) {
        throw new NotFoundError('Wallet not found for owner or helper');
      }

      await SquadService.setupAutoSplit(paymentLink.data.reference, [
        {
          accountNumber: ownerWallet.accountNumber,
          bankCode: ownerWallet.bankCode,
          amount: ownerAmount,
          narration: 'Owner commission',
        },
        {
          accountNumber: helperWallet.accountNumber,
          bankCode: helperWallet.bankCode,
          amount: commissionAmount,
          narration: 'Helper commission',
        },
      ]);

      // Generate QR code
      const qrCode = SquadService.generateQRCode(paymentLink.data.authorization_url);

      // Update contract with payment details
      if (!contract.salesData) {
        contract.salesData = {
          paymentReference: '',
          paymentUrl: '',
          qrCode: '',
          customerAmount: 0,
          ownerAmount: 0,
          helperCommission: 0,
          paymentStatus: 'pending',
        };
      }

      contract.salesData.paymentReference = paymentLink.data.reference;
      contract.salesData.paymentUrl = paymentLink.data.authorization_url;
      contract.salesData.qrCode = qrCode;
      contract.salesData.customerAmount = productPrice;
      contract.salesData.ownerAmount = ownerAmount;
      contract.salesData.helperCommission = commissionAmount;

      await contract.save();

      logger.info('Sales payment link generated', {
        contractId,
        reference,
        amount: productPrice,
      });

      return {
        paymentUrl: paymentLink.data.authorization_url,
        qrCode,
      };
    } catch (error: any) {
      logger.error('Failed to generate payment link', error);
      throw error;
    }
  }

  /**
   * SALES GIG: Get live earnings (updated by Squad webhook)
   */
  async getSalesEarnings(contractId: string): Promise<{
    ownerEarnings: number;
    helperEarnings: number;
    paymentStatus: string;
    totalAmount: number;
  }> {
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (!contract.salesData) {
      throw new ValidationError('No sales data found for this contract');
    }

    return {
      ownerEarnings: contract.salesData.ownerAmount || 0,
      helperEarnings: contract.salesData.helperCommission || 0,
      paymentStatus: contract.salesData.paymentStatus,
      totalAmount: contract.salesData.customerAmount || 0,
    };
  }

  /**
   * TASK GIG: Fund escrow (owner locks money upfront)
   */
  async fundEscrow(contractId: string): Promise<IContract> {
    const contract = await Contract.findById(contractId).populate('gigId');
    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (contract.workType !== 'task') {
      throw new ValidationError('This endpoint is only for task gigs');
    }

    const gig = contract.gigId as any;
    const amount = gig.fixedPrice || contract.totalAmount;

    const ownerWallet = await Wallet.findOne({ userId: contract.ownerId });
    if (!ownerWallet) {
      throw new NotFoundError('Owner wallet');
    }

    if (ownerWallet.balance < amount) {
      throw new ValidationError('Insufficient balance for escrow');
    }

    const reference = `ESC_${contractId}_${Date.now()}`;

    try {
      // Create escrow via Squad
      const escrowResponse = await SquadService.createEscrow({
        amount,
        customerId: contract.ownerId,
        reference,
        metadata: {
          contractId,
          workType: 'task',
        },
      });

      if (!escrowResponse.status) {
        throw new ValidationError('Failed to create escrow');
      }

      // Deduct from owner wallet balance
      ownerWallet.balance -= amount;
      await ownerWallet.save();

      // Record transaction
      await WalletService.recordTransaction({
        userId: contract.ownerId,
        walletId: ownerWallet._id.toString(),
        type: 'escrow',
        amount,
        description: `Escrow for task contract`,
        reference,
        squadTransactionId: escrowResponse.data.reference,
        relatedContractId: contractId,
        status: 'pending',
      });

      // Update contract
      if (!contract.taskData) {
        contract.taskData = {
          escrowReference: '',
          escrowAmount: 0,
          escrowStatus: 'pending',
        };
      }

      contract.taskData.escrowReference = reference;
      contract.taskData.escrowAmount = amount;
      contract.taskData.escrowStatus = 'funded';
      contract.status = ContractStatus.ACTIVE;

      await contract.save();

      logger.info('Escrow funded', { contractId, amount, reference });

      return contract;
    } catch (error: any) {
      logger.error('Failed to fund escrow', error);
      throw error;
    }
  }

  /**
   * TASK GIG: Helper submits completed work
   */
  async submitDeliverable(
    contractId: string,
    data: SubmitTaskDeliverableDTO
  ): Promise<IContract> {
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (contract.workType !== 'task') {
      throw new ValidationError('This endpoint is only for task gigs');
    }

    if (!contract.taskData) {
      throw new ValidationError('No task data found');
    }

    if (contract.taskData.escrowStatus !== 'funded') {
      throw new ValidationError('Escrow must be funded before submission');
    }

    contract.taskData.deliverables = data.deliverableNotes;
    contract.taskData.submissionDate = new Date();
    contract.status = ContractStatus.COMPLETED; // Pending owner approval

    await contract.save();

    logger.info('Task deliverable submitted', { contractId });

    return contract;
  }

  /**
   * TASK GIG: Owner approves completion and releases escrow
   */
  async approveTaskCompletion(contractId: string): Promise<IContract> {
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (contract.workType !== 'task') {
      throw new ValidationError('This endpoint is only for task gigs');
    }

    if (!contract.taskData) {
      throw new ValidationError('No task data found');
    }

    if (contract.taskData.escrowStatus !== 'funded') {
      throw new ValidationError('Escrow not funded');
    }

    const helperWallet = await Wallet.findOne({ userId: contract.helperId });
    if (!helperWallet) {
      throw new NotFoundError('Helper wallet');
    }

    try {
      // Release escrow via Squad
      const releaseResponse = await SquadService.releaseEscrow(
        contract.taskData.escrowReference,
        helperWallet.accountNumber,
        helperWallet.bankCode,
        contract.taskData.escrowAmount!
      );

      if (!releaseResponse.status) {
        throw new ValidationError('Failed to release escrow');
      }

      // Update helper wallet balance
      helperWallet.balance += contract.taskData.escrowAmount!;
      await helperWallet.save();

      // Record transaction for helper
      await WalletService.recordTransaction({
        userId: contract.helperId,
        walletId: helperWallet._id.toString(),
        type: 'release',
        amount: contract.taskData.escrowAmount!,
        description: `Escrow released for completed task`,
        reference: releaseResponse.data.reference,
        squadTransactionId: releaseResponse.data.transaction_id,
        relatedContractId: contractId,
        status: 'completed',
      });

      // Update contract
      contract.taskData.escrowStatus = 'released';
      contract.taskData.completionDate = new Date();
      contract.taskData.approvalDate = new Date();
      contract.status = ContractStatus.COMPLETED;

      await contract.save();

      logger.info('Task completion approved and escrow released', {
        contractId,
        amount: contract.taskData.escrowAmount,
      });

      return contract;
    } catch (error: any) {
      logger.error('Failed to approve task completion', error);
      throw error;
    }
  }

  /**
   * TASK GIG: Open a dispute
   */
  async openDispute(contractId: string, reason: string): Promise<IContract> {
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (contract.workType !== 'task') {
      throw new ValidationError('This endpoint is only for task gigs');
    }

    contract.status = ContractStatus.DISPUTED;
    if (contract.taskData) {
      contract.taskData.escrowStatus = 'disputed';
    }

    await contract.save();

    logger.info('Dispute opened for contract', { contractId, reason });

    return contract;
  }

  /**
   * Get contract detail
   */
  async getContract(contractId: string): Promise<IContract> {
    const contract = await Contract.findById(contractId)
      .populate('gigId')
      .populate('ownerId', 'firstName lastName email')
      .populate('helperId', 'firstName lastName email');

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    return contract;
  }

  /**
   * Get user's contracts
   */
  async getUserContracts(
    userId: string,
    role: 'owner' | 'helper',
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    contracts: IContract[];
    total: number;
  }> {
    const query: any =
      role === 'owner' ? { ownerId: userId } : { helperId: userId };

    if (status) {
      query.status = status;
    }

    const contracts = await Contract.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('gigId');

    const total = await Contract.countDocuments(query);

    return { contracts, total };
  }
}

export default new ContractService();
