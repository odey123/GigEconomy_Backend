import { Request, Response, NextFunction } from 'express';
import { BookingService, type CreateBookingDTO, type BookingResponseDTO } from '../services/BookingService';
import { ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/errors';

export class BookingController {
  private bookingService: BookingService;

  constructor() {
    this.bookingService = new BookingService();
  }

  /**
   * Create a booking (worker applies for job)
   * POST /api/bookings
   * Body: { jobId, proposedBudget, deliverables?, attachments? }
   */
  public createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { jobId, proposedBudget, deliverables, attachments } = req.body;

      if (!jobId || !proposedBudget) {
        throw new ValidationError('jobId and proposedBudget are required');
      }

      if (proposedBudget <= 0) {
        throw new ValidationError('proposedBudget must be greater than 0');
      }

      const createBookingDTO: CreateBookingDTO = {
        jobId,
        proposedBudget,
        deliverables,
        attachments,
      };

      const booking = await this.bookingService.createBooking(req.userId, createBookingDTO);

      res.status(201).json({
        status: 'success',
        message: 'Booking created successfully',
        data: {
          booking,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get booking details
   * GET /api/bookings/:id
   */
  public getBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Booking ID is required');
      }

      const booking = await this.bookingService.getBookingById(id);

      res.status(200).json({
        status: 'success',
        data: {
          booking,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Accept a booking (client accepts worker)
   * PATCH /api/bookings/:id/accept
   * Body: { acceptedBudget? }
   */
  public acceptBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const { acceptedBudget } = req.body;

      if (!id) {
        throw new ValidationError('Booking ID is required');
      }

      const booking = await this.bookingService.acceptBooking(id, req.userId, acceptedBudget);

      res.status(200).json({
        status: 'success',
        message: 'Booking accepted successfully',
        data: {
          booking,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete a booking (mark work as done)
   * PATCH /api/bookings/:id/complete
   */
  public completeBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Booking ID is required');
      }

      const booking = await this.bookingService.completeBooking(id, req.userId);

      res.status(200).json({
        status: 'success',
        message: 'Booking completed successfully',
        data: {
          booking,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancel a booking
   * PATCH /api/bookings/:id/cancel
   * Body: { reason? }
   */
  public cancelBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Booking ID is required');
      }

      const booking = await this.bookingService.cancelBooking(id, req.userId);

      res.status(200).json({
        status: 'success',
        message: 'Booking cancelled successfully',
        data: {
          booking,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get my bookings (as worker or client)
   * GET /api/bookings/my
   * Query: { role?, status?, limit?, page? }
   */
  public getMyBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { role = 'worker', status, limit = 10, page = 1 } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 10, 100);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);

      let bookings: any[];
      let total: number;

      if (role === 'client') {
        const result = await this.bookingService.getClientBookings(req.userId, {
          status: status as string,
          limit: limitNum,
          page: pageNum,
        });
        bookings = result.bookings;
        total = result.total;
      } else {
        const result = await this.bookingService.getWorkerBookings(req.userId, {
          status: status as string,
          limit: limitNum,
          page: pageNum,
        });
        bookings = result.bookings;
        total = result.total;
      }

      res.status(200).json({
        status: 'success',
        data: {
          bookings,
          pagination: {
            total,
            limit: limitNum,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new BookingController();
