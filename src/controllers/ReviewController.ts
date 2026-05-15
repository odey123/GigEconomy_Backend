import { Request, Response, NextFunction } from 'express';
import { ReviewService, type CreateReviewDTO } from '../services/ReviewService';
import { ValidationError, UnauthorizedError } from '../utils/errors';

export class ReviewController {
  private reviewService: ReviewService;
  constructor() { this.reviewService = new ReviewService(); }

  public createReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const { bookingId, rating, comment, categories, tags } = req.body;
      if (!bookingId || rating === undefined || !comment) {
        throw new ValidationError('bookingId, rating, and comment are required');
      }
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        throw new ValidationError('rating must be a number between 1 and 5');
      }
      if (!comment.trim()) throw new ValidationError('comment cannot be empty');
      const validTags = ['punctual', 'honest', 'skilled', 'professional', 'responsive', 'careless', 'unreliable', 'unfriendly'];
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          if (!validTags.includes(tag)) throw new ValidationError(`Invalid tag: ${tag}`);
        }
      }
      const dto: CreateReviewDTO = { bookingId, rating, comment, categories, tags };
      const review = await this.reviewService.createReview(req.userId, dto);
      res.status(201).json({ status: 'success', message: 'Review created successfully', data: { review } });
    } catch (error) { next(error); }
  };

  public getReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Review ID is required');
      const review = await this.reviewService.getReviewById(id);
      res.status(200).json({ status: 'success', data: { review } });
    } catch (error) { next(error); }
  };

  public getUserReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId) throw new ValidationError('User ID is required');
      const limitNum = Math.min(parseInt((req.query.limit as string) || '20'), 100);
      const pageNum = Math.max(parseInt((req.query.page as string) || '1'), 1);
      const result = await this.reviewService.getUserReviews(userId, pageNum, limitNum);
      res.status(200).json({
        status: 'success',
        data: {
          reviews: result.reviews,
          average: result.average,
          pagination: { total: result.total, limit: limitNum, page: pageNum, totalPages: Math.ceil(result.total / limitNum) },
        },
      });
    } catch (error) { next(error); }
  };

  public getMyReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const limitNum = Math.min(parseInt((req.query.limit as string) || '20'), 100);
      const pageNum = Math.max(parseInt((req.query.page as string) || '1'), 1);
      const result = await this.reviewService.getReviewsByReviewer(req.userId, pageNum, limitNum);
      res.status(200).json({
        status: 'success',
        data: {
          reviews: result.reviews,
          pagination: { total: result.total, limit: limitNum, page: pageNum, totalPages: Math.ceil(result.total / limitNum) },
        },
      });
    } catch (error) { next(error); }
  };

  public getTopRatedUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limitNum = Math.min(parseInt((req.query.limit as string) || '10'), 50);
      const users = await this.reviewService.getTopRatedUsers(limitNum);
      res.status(200).json({ status: 'success', data: { users } });
    } catch (error) { next(error); }
  };
}

export default new ReviewController();
