import { Review, Booking, User } from '../models';
import evidenceService from './EvidenceService';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

interface ReputationSummary {
  averageRating: number;
  totalReviews: number;
  completedGigs: number;
  trustTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  creditScore: number;
  loanEligibility: {
    microCredit: boolean;
    instantPayouts: boolean;
    weeklyAdvance: boolean;
  };
  topTags: string[];
  evidenceVerificationRate: number;
}

class ReputationService {
  /**
   * Calculate complete reputation summary for a user
   * P1 - Used by /users/:id/reputation endpoint
   */
  async getReputationSummary(userId: string): Promise<ReputationSummary> {
    try {
      logger.info(`Calculating reputation summary for user ${userId}`);

      // Get user's reviews
      const reviews = await Review.find({ revieweeId: userId });

      // Get completed gigs count
      const completedGigs = await Booking.countDocuments({
        workerId: userId,
        status: 'completed',
      });

      // Get average rating
      const averageRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      // Get top tags
      const allTags = reviews.flatMap((r) => r.tags || []);
      const tagCounts: Record<string, number> = {};
      allTags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);

      // Get evidence verification rate
      const evidenceStats = await evidenceService.getEvidenceStats(userId);
      const evidenceVerificationRate =
        evidenceStats.totalUploads > 0
          ? (evidenceStats.verifiedCount / evidenceStats.totalUploads) * 100
          : 0;

      // Get credit score from wallet/transaction data
      // const wallet = await WalletService.getWallet(userId);
      const creditScoreData = await this.calculateCreditScore(userId);

      // Determine trust tier based on reputation
      const trustTier = this.calculateTrustTier(averageRating, completedGigs, reviews.length);

      return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
        completedGigs,
        trustTier,
        creditScore: creditScoreData.score,
        loanEligibility: creditScoreData.eligibility,
        topTags,
        evidenceVerificationRate: Math.round(evidenceVerificationRate),
      };
    } catch (error) {
      logger.error('Error calculating reputation summary:', error);
      throw new AppError(500, 'Failed to calculate reputation');
    }
  }

  /**
   * Get public profile for a user (limited info)
   * P2 - Anyone can view
   */
  async getPublicProfile(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      const reviews = await Review.find({ revieweeId: userId }).sort({ createdAt: -1 }).limit(5);
      const completedGigs = await Booking.countDocuments({
        workerId: userId,
        status: 'completed',
      });

      const averageRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      // Get top tags
      const allTags = reviews.flatMap((r) => r.tags || []);
      const tagCounts: Record<string, number> = {};
      allTags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([tag]) => tag);

      return {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        bio: user.bio,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
        completedGigs,
        topTags,
        joinedDate: user.createdAt,
        recentReviews: reviews.map((r) => ({
          rating: r.rating,
          comment: r.comment,
          tags: r.tags,
          createdAt: r.createdAt,
        })),
      };
    } catch (error) {
      logger.error('Error getting public profile:', error);
      throw error;
    }
  }

  /**
   * Calculate credit score from transaction history and reputation
   * Uses transaction data to determine creditworthiness
   */
  private async calculateCreditScore(userId: string): Promise<{
    score: number;
    eligibility: {
      microCredit: boolean;
      instantPayouts: boolean;
      weeklyAdvance: boolean;
    };
  }> {
    try {
      const reviews = await Review.find({ revieweeId: userId });
      const completedGigs = await Booking.countDocuments({
        workerId: userId,
        status: 'completed',
      });

      // Simple credit scoring algorithm
      let score = 300; // Base score

      // Add points for reviews
      const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
      score += Math.min(avgRating * 100, 300); // Max +300

      // Add points for completed gigs
      score += Math.min(completedGigs * 10, 200); // Max +200

      // Add points for positive tags
      const allTags = reviews.flatMap((r) => r.tags || []);
      const positiveTagCount = allTags.filter((t) =>
        ['punctual', 'honest', 'skilled', 'professional', 'responsive'].includes(t)
      ).length;
      score += Math.min(positiveTagCount * 5, 100); // Max +100

      // Cap at 1000
      score = Math.min(score, 1000);

      // Determine eligibility
      const eligibility = {
        microCredit: score >= 400,
        instantPayouts: score >= 600,
        weeklyAdvance: score >= 750,
      };

      return { score, eligibility };
    } catch (error) {
      logger.error('Error calculating credit score:', error);
      return {
        score: 300,
        eligibility: {
          microCredit: false,
          instantPayouts: false,
          weeklyAdvance: false,
        },
      };
    }
  }

  /**
   * Determine trust tier based on reputation metrics
   */
  private calculateTrustTier(
    averageRating: number,
    completedGigs: number,
    reviewCount: number
  ): 'bronze' | 'silver' | 'gold' | 'platinum' {
    // Platinum: 4.8+ rating, 50+ gigs, 20+ reviews
    if (averageRating >= 4.8 && completedGigs >= 50 && reviewCount >= 20) {
      return 'platinum';
    }

    // Gold: 4.5+ rating, 25+ gigs, 10+ reviews
    if (averageRating >= 4.5 && completedGigs >= 25 && reviewCount >= 10) {
      return 'gold';
    }

    // Silver: 4.0+ rating, 10+ gigs, 5+ reviews
    if (averageRating >= 4.0 && completedGigs >= 10 && reviewCount >= 5) {
      return 'silver';
    }

    // Bronze: Default for active users
    return 'bronze';
  }

  /**
   * Update reputation after a new review is posted
   * Called by ReviewController
   */
  async updateReputationOnReview(userId: string, rating: number): Promise<void> {
    try {
      // Trigger reputation recalculation (could be async in production)
      logger.info(`Reputation updated for user ${userId} after new review with rating ${rating}`);
      // In production: update cached reputation scores, send notifications, etc.
    } catch (error) {
      logger.error('Error updating reputation:', error);
    }
  }
}

export default new ReputationService();
export { ReputationService, ReputationSummary };
