import { Review, Booking, User, type IReviewDocument } from '../models';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface CreateReviewDTO {
  bookingId: string;
  rating: number;
  comment: string;
  categories?: {
    communication?: number;
    professionalism?: number;
    quality?: number;
    timeliness?: number;
  };
}

export interface ReviewResponseDTO {
  _id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  categories?: any;
  createdAt: Date;
}

export class ReviewService {
  /**
   * Create a review for a booking
   */
  async createReview(reviewerId: string, data: CreateReviewDTO): Promise<ReviewResponseDTO> {
    // Validate booking exists and is completed
    const booking = await Booking.findById(data.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.status !== 'completed') {
      throw new ValidationError('Can only review completed bookings');
    }

    // Determine reviewee (opposite party)
    let revieweeId: string;
    if (booking.workerId.toString() === reviewerId) {
      revieweeId = booking.clientId.toString();
    } else if (booking.clientId.toString() === reviewerId) {
      revieweeId = booking.workerId.toString();
    } else {
      throw new ValidationError('Only booking participants can leave reviews');
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      bookingId: data.bookingId,
      reviewerId,
    });

    if (existingReview) {
      throw new ValidationError('You have already reviewed this booking');
    }

    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    const review = await Review.create({
      bookingId: data.bookingId,
      reviewerId,
      revieweeId,
      rating: data.rating,
      comment: data.comment,
      categories: data.categories,
    });

    // Update reviewer's rating and review count
    await this.updateUserRating(revieweeId);

    return this.formatReviewResponse(review);
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string): Promise<ReviewResponseDTO> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review');
    }
    return this.formatReviewResponse(review);
  }

  /**
   * Get reviews for a user
   */
  async getUserReviews(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: ReviewResponseDTO[]; average: number; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total, average] = await Promise.all([
      Review.find({ revieweeId: userId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Review.countDocuments({ revieweeId: userId }),
      Review.aggregate([
        { $match: { revieweeId: userId } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
    ]);

    const avgRating = average.length > 0 ? average[0].avgRating : 0;

    return {
      reviews: reviews.map((r) => this.formatReviewResponse(r)),
      average: Math.round(avgRating * 100) / 100,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get reviews by reviewer
   */
  async getReviewsByReviewer(
    reviewerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: ReviewResponseDTO[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ reviewerId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Review.countDocuments({ reviewerId }),
    ]);

    return {
      reviews: reviews.map((r) => this.formatReviewResponse(r)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get top-rated users
   */
  async getTopRatedUsers(limit: number = 10): Promise<any[]> {
    return User.aggregate([
      { $sort: { rating: -1 } },
      { $limit: limit },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          rating: 1,
          reviewCount: 1,
          profileImage: 1,
          bio: 1,
        },
      },
    ]);
  }

  /**
   * Update user rating based on reviews
   */
  private async updateUserRating(userId: string): Promise<void> {
    const ratingData = await Review.aggregate([
      { $match: { revieweeId: userId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (ratingData.length > 0) {
      const { avgRating, count } = ratingData[0];
      await User.findByIdAndUpdate(
        userId,
        {
          rating: Math.round(avgRating * 100) / 100,
          reviewCount: count,
        },
        { new: true }
      );
    }
  }

  /**
   * Format review response
   */
  private formatReviewResponse(review: IReviewDocument): ReviewResponseDTO {
    return {
      _id: review._id.toString(),
      bookingId: review.bookingId.toString(),
      reviewerId: review.reviewerId.toString(),
      revieweeId: review.revieweeId.toString(),
      rating: review.rating,
      comment: review.comment,
      categories: review.categories,
      createdAt: review.createdAt!,
    };
  }
}

export default new ReviewService();
