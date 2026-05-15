import { Transaction, Wallet } from '../models';
import { LoanApplication, type ILoanApplication } from '../models/LoanApplication';
import AIService from './AIService';
import WalletService from './WalletService';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

interface LoanTerms {
  interestRate: number;
  repaymentTermDays: number;
  maxAmount: number;
}

function getTermsForScore(score: number): LoanTerms {
  if (score >= 800) return { interestRate: 3, repaymentTermDays: 90, maxAmount: 500000 };
  if (score >= 600) return { interestRate: 5, repaymentTermDays: 60, maxAmount: 200000 };
  return { interestRate: 8, repaymentTermDays: 30, maxAmount: 50000 };
}

export class CreditService {
  /**
   * Build transaction metrics for AI credit scoring
   */
  private async buildMetrics(userId: string) {
    const transactions = await Transaction.find({ userId }).sort({ createdAt: 1 });

    if (transactions.length === 0) {
      return null;
    }

    const completed = transactions.filter((t) => t.status === 'completed');
    const successRate = (completed.length / transactions.length) * 100;
    const totalVolume = completed.reduce((sum, t) => sum + t.amount, 0);
    const avgValue = totalVolume / Math.max(1, completed.length);
    const firstTx = transactions[0].createdAt;
    const daysSince = Math.floor(
      (Date.now() - new Date(firstTx).getTime()) / (1000 * 60 * 60 * 24)
    );
    const disputes = transactions.filter((t) => t.status === 'failed').length;
    const completedWithDates = completed.filter((t) => t.updatedAt && t.createdAt);
    const avgDaysToComplete =
      completedWithDates.length > 0
        ? completedWithDates.reduce((sum, t) => {
            const diff =
              (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + diff;
          }, 0) / completedWithDates.length
        : 1;

    const recentTx = transactions.filter(
      (t) => Date.now() - new Date(t.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
    );
    const recentSuccess = recentTx.length === 0 || recentTx.some((t) => t.status === 'completed');

    return {
      totalTransactions: transactions.length,
      totalVolume,
      successRate,
      averageTransactionValue: avgValue,
      daysSinceFirstTransaction: daysSince,
      chargebackCount: 0,
      disputeCount: disputes,
      averageDaysToCompletion: avgDaysToComplete,
      recentPaymentSuccess: recentSuccess,
    };
  }

  /**
   * Owner applies for inventory loan
   * POST /credit/loan-application
   */
  async applyForLoan(
    userId: string,
    requestedAmount: number,
    purpose: string
  ): Promise<{
    approved: boolean;
    amount: number;
    terms: {
      interestRate: number;
      repaymentTermDays: number;
      dueDate: Date | null;
      totalRepayable: number;
    };
    disbursementId: string | null;
    score: number;
    rejectionReason?: string;
  }> {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new NotFoundError('Wallet');

    const metrics = await this.buildMetrics(userId);

    // New users with no history get a base score
    const aiResult = metrics
      ? await AIService.creditScore(metrics)
      : {
          score: 350,
          factors: { transactionHistory: 30, paymentReliability: 40, volumeConsistency: 30, riskIndicators: 50 },
          eligibility: { microCredit: false, instantPayouts: false, weeklyAdvance: false },
        };

    const score = aiResult.score;

    if (score < 400) {
      const loan = await LoanApplication.create({
        userId,
        type: 'inventory_loan',
        requestedAmount,
        purpose,
        status: 'rejected',
        interestRate: 0,
        repaymentTermDays: 0,
        aiScore: score,
        aiFactors: aiResult.factors,
        rejectionReason: `Credit score too low (${score}/1000). Minimum required: 400.`,
      });

      logger.info('Loan application rejected', { userId, score, loanId: loan._id });

      return {
        approved: false,
        amount: 0,
        terms: { interestRate: 0, repaymentTermDays: 0, dueDate: null, totalRepayable: 0 },
        disbursementId: null,
        score,
        rejectionReason: loan.rejectionReason,
      };
    }

    const terms = getTermsForScore(score);
    const approvedAmount = Math.min(requestedAmount, terms.maxAmount);
    const dueDate = new Date(Date.now() + terms.repaymentTermDays * 24 * 60 * 60 * 1000);
    const interest = (approvedAmount * terms.interestRate) / 100;
    const totalRepayable = approvedAmount + interest;
    const disbursementId = `DISBURSE_${userId}_${Date.now()}`;

    const loan = await LoanApplication.create({
      userId,
      type: 'inventory_loan',
      requestedAmount,
      approvedAmount,
      purpose,
      status: 'disbursed',
      interestRate: terms.interestRate,
      repaymentTermDays: terms.repaymentTermDays,
      dueDate,
      disbursedAt: new Date(),
      disbursementId,
      aiScore: score,
      aiFactors: aiResult.factors,
    });

    // Credit the wallet
    await WalletService.updateBalance(userId, approvedAmount, 'credit');
    await WalletService.recordTransaction({
      userId,
      walletId: wallet._id.toString(),
      type: 'credit',
      amount: approvedAmount,
      description: `Inventory loan disbursement — ${purpose}`,
      reference: disbursementId,
      status: 'completed',
      metadata: { loanId: loan._id, type: 'inventory_loan' },
    });

    logger.info('Loan disbursed', { userId, approvedAmount, score, disbursementId });

    return {
      approved: true,
      amount: approvedAmount,
      terms: { interestRate: terms.interestRate, repaymentTermDays: terms.repaymentTermDays, dueDate, totalRepayable },
      disbursementId,
      score,
    };
  }

  /**
   * Helper requests earnings advance
   * POST /credit/advance-request
   */
  async requestAdvance(
    userId: string,
    requestedAmount: number
  ): Promise<{
    approved: boolean;
    amount: number;
    terms: {
      repaymentTermDays: number;
      dueDate: Date | null;
      totalRepayable: number;
    };
    disbursementId: string | null;
    rejectionReason?: string;
  }> {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new NotFoundError('Wallet');

    // Calculate recent earnings (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEarnings = await Transaction.find({
      userId,
      type: { $in: ['credit', 'release'] },
      status: 'completed',
      createdAt: { $gte: thirtyDaysAgo },
    });

    const totalRecentEarnings = recentEarnings.reduce((sum, t) => sum + t.amount, 0);
    const maxAdvance = totalRecentEarnings * 0.8; // 80% of last 30-day earnings

    if (totalRecentEarnings === 0) {
      return {
        approved: false,
        amount: 0,
        terms: { repaymentTermDays: 0, dueDate: null, totalRepayable: 0 },
        disbursementId: null,
        rejectionReason: 'No completed earnings found in the last 30 days.',
      };
    }

    if (requestedAmount > maxAdvance) {
      return {
        approved: false,
        amount: 0,
        terms: { repaymentTermDays: 0, dueDate: null, totalRepayable: 0 },
        disbursementId: null,
        rejectionReason: `Requested amount exceeds limit. Maximum advance available: ₦${maxAdvance.toFixed(2)}.`,
      };
    }

    const repaymentTermDays = 14;
    const dueDate = new Date(Date.now() + repaymentTermDays * 24 * 60 * 60 * 1000);
    const disbursementId = `ADV_${userId}_${Date.now()}`;

    const advance = await LoanApplication.create({
      userId,
      type: 'earnings_advance',
      requestedAmount,
      approvedAmount: requestedAmount,
      status: 'disbursed',
      interestRate: 0,
      repaymentTermDays,
      dueDate,
      disbursedAt: new Date(),
      disbursementId,
    });

    await WalletService.updateBalance(userId, requestedAmount, 'credit');
    await WalletService.recordTransaction({
      userId,
      walletId: wallet._id.toString(),
      type: 'credit',
      amount: requestedAmount,
      description: 'Earnings advance disbursement',
      reference: disbursementId,
      status: 'completed',
      metadata: { loanId: advance._id, type: 'earnings_advance' },
    });

    logger.info('Earnings advance disbursed', { userId, requestedAmount, disbursementId });

    return {
      approved: true,
      amount: requestedAmount,
      terms: { repaymentTermDays, dueDate, totalRepayable: requestedAmount },
      disbursementId,
    };
  }

  /**
   * Get loan/advance history for current user
   * GET /credit/me
   */
  async getMyCreditHistory(userId: string): Promise<{
    loans: ILoanApplication[];
    summary: {
      totalDisbursed: number;
      totalOutstanding: number;
      activeLoans: number;
    };
  }> {
    const loans = await LoanApplication.find({ userId }).sort({ createdAt: -1 });

    const disbursed = loans.filter((l) => ['disbursed', 'repaid'].includes(l.status));
    const totalDisbursed = disbursed.reduce((sum, l) => sum + (l.approvedAmount || 0), 0);

    const active = loans.filter((l) => l.status === 'disbursed');
    const totalOutstanding = active.reduce(
      (sum, l) => sum + (l.approvedAmount || 0) - l.repaidAmount,
      0
    );

    return {
      loans,
      summary: {
        totalDisbursed,
        totalOutstanding,
        activeLoans: active.length,
      },
    };
  }
}

export default new CreditService();
