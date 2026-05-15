import { User, Transaction } from '../models';
import { LoanApplication } from '../models/LoanApplication';
import AIService from './AIService';
import { UserStatus } from '../types';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export class AdminService {
  /**
   * List users with optional filters
   * GET /admin/users
   */
  async getUsers(
    filters: { status?: string; role?: string; search?: string },
    limit: number = 20,
    offset: number = 0
  ) {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.role) query.role = filters.role;
    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return { users, total, limit, offset };
  }

  /**
   * Suspend a user account
   * POST /admin/users/:id/suspend
   */
  async suspendUser(targetUserId: string) {
    const user = await User.findById(targetUserId);
    if (!user) throw new NotFoundError('User');

    user.status = UserStatus.SUSPENDED;
    await user.save();

    logger.info('User suspended by admin', { userId: targetUserId });
    return { userId: targetUserId, status: UserStatus.SUSPENDED };
  }

  /**
   * Reinstate a suspended user
   * POST /admin/users/:id/reinstate
   */
  async reinstateUser(targetUserId: string) {
    const user = await User.findById(targetUserId);
    if (!user) throw new NotFoundError('User');

    user.status = UserStatus.ACTIVE;
    await user.save();

    logger.info('User reinstated by admin', { userId: targetUserId });
    return { userId: targetUserId, status: UserStatus.ACTIVE };
  }

  /**
   * Get cross-platform transaction activity
   * GET /admin/transactions
   */
  async getTransactions(
    filters: { userId?: string; type?: string; status?: string },
    limit: number = 50,
    offset: number = 0
  ) {
    const query: any = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Transaction.countDocuments(query),
    ]);

    // Attach user names in one batch query
    const userIds = [...new Set(transactions.map((t) => t.userId))];
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email');
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const enriched = transactions.map((t) => ({
      ...t.toObject(),
      user: userMap.get(t.userId) || null,
    }));

    return { transactions: enriched, total, limit, offset };
  }

  /**
   * Get AI-flagged anomalies across all users
   * GET /admin/flags
   */
  async getFlags() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find users with recent transaction activity
    const activeUserIds = await Transaction.distinct('userId', {
      createdAt: { $gte: sevenDaysAgo },
    });

    const flags: Array<{
      userId: string;
      user: any;
      riskLevel: string;
      reason: string;
      recommendedAction: string;
      transactionCount: number;
    }> = [];

    // Run anomaly detection per active user (limit to 50 to avoid slow scans)
    const userIdsToCheck = activeUserIds.slice(0, 50);

    await Promise.all(
      userIdsToCheck.map(async (userId) => {
        try {
          const txs = await Transaction.find({ userId })
            .sort({ createdAt: -1 })
            .limit(100);

          if (txs.length < 3) return;

          const anomaly = await AIService.detectAnomaly(
            txs.map((t) => ({
              id: t._id.toString(),
              amount: t.amount,
              type: t.type,
              timestamp: t.createdAt,
              status: t.status,
            }))
          );

          if (anomaly.flagged && anomaly.riskLevel !== 'low') {
            const user = await User.findById(userId).select('firstName lastName email');
            flags.push({
              userId: userId.toString(),
              user,
              riskLevel: anomaly.riskLevel,
              reason: anomaly.reason || 'Anomalous transaction pattern detected',
              recommendedAction: anomaly.recommendedAction,
              transactionCount: txs.length,
            });
          }
        } catch {
          // Skip individual user failures
        }
      })
    );

    flags.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.riskLevel as keyof typeof order] ?? 3) -
             (order[b.riskLevel as keyof typeof order] ?? 3);
    });

    return { flags, total: flags.length };
  }

  /**
   * Platform summary stats for admin dashboard
   */
  async getSummary() {
    const [totalUsers, activeUsers, totalTransactions, totalLoans] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: UserStatus.ACTIVE }),
      Transaction.countDocuments(),
      LoanApplication.countDocuments({ status: 'disbursed' }),
    ]);

    const volumeResult = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
      totalUsers,
      activeUsers,
      totalTransactions,
      activeLoans: totalLoans,
      totalVolume: volumeResult[0]?.total || 0,
    };
  }
}

export default new AdminService();
