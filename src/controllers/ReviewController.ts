import { Request, Response, NextFunction } from 'express';
import { ReviewService, type CreateReviewDTO, type ReviewResponseDTO } from '../services/ReviewService';
import { ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/errors';

export class ReviewController {
  private reviewService: ReviewService;

  constructor() {
    this.reviewService = new ReviewService();
  }

  /**
   * Create a review for a booking
   * POST /api/contracts/:id/review
   * Body: { rating, comment, tags? }
   */
  public createReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { bookingId, rating, comment, categories, tags } = req.body;

      if (!bookingId || rating === undefined || !comment) {
        throw new ValidationError('bookingId, rating, and comment are required');
      }

      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        throw new ValidationError('rating must be a number between 1 and 5');
      }

      if (comment.trim().length === 0) {
        throw new ValidationError('comment cannot be empty');
      }

      // Validate tags if provided
      const validTags = ['punctual', 'honest', 'skilled', 'professional', 'responsive', 'careless', 'unreliable', 'unfriendly'];
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          if (!validTags.includes(tag)) {
            throw new ValidationError(`Invalid tag: ${tag}`);
          }
        }
      }

      const createReviewDTO: CreateReviewDTO = {
        bookingId,
        rating,
        comment,
        categories,
        tags,
      };

      const review = await this.reviewService.createReview(req.userId, createReviewDTO);

      res.status(201).json({
        status: 'success',
        message: 'Review created successfully',
        data: {
          review,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get review details
   * GET /api/reviews/:id
   */
  public getReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Review ID is required');
      }

      const review = await this.reviewService.getReviewById(id);

      res.status(200).json({
        status: 'success',
        data: {
          review,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get reviews for a user
   * GET /api/reviews/user/:userId
   * Query: { limit?, page? }
   */
  public getUserReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { limit = 20, page = 1 } = req.query;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);

      const result = await this.reviewService.getUserReviews(userId, {
        limit: limitNum,
        page: pageNum,
      });

      res.status(200).json({
        status: 'success',
        data: {
          reviews: result.reviews,
          summary: result.summary,
          pagination: {
            total: result.total,
            limit: limitNum,
            page: pageNum,
            totalPages: Math.ceil(result.total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get reviews by current user (as reviewer)
   * GET /api/reviews/my
   * Query: { limit?, page? }
   */
  public getMyReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { limit = 20, page = 1 } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);

      const result = await this.reviewService.getReviewsByReviewer(req.userId, {
        limit: limitNum,
        page: pageNum,
      });

      res.status(200).json({
        status: 'success',
        data: {
          reviews: result.reviews,
          pagination: {
            total: result.total,
            limit: limitNum,
            page: pageNum,
            totalPages: Math.ceil(result.total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get top rated users
   * GET /api/reviews/top-rated
   * Query: { limit? }
   */
  public getTopRatedUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit = 10 } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 10, 50);

      const users = await this.reviewService.getTopRatedUsers(limitNum);

      res.status(200).json({
        status: 'success',
        data: {
          users,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new ReviewController();
