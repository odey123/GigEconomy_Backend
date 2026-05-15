import { Request, Response, NextFunction } from 'express';
import { BookingService, type CreateBookingDTO } from '../services/BookingService';
import { ValidationError, UnauthorizedError } from '../utils/errors';

export class BookingController {
  private bookingService: BookingService;
  constructor() { this.bookingService = new BookingService(); }

  public createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const { jobId, proposedBudget, deliverables, attachments } = req.body;
      if (!jobId || !proposedBudget) throw new ValidationError('jobId and proposedBudget are required');
      if (proposedBudget <= 0) throw new ValidationError('proposedBudget must be greater than 0');
      const dto: CreateBookingDTO = { jobId, proposedBudget, deliverables, attachments };
      const booking = await this.bookingService.createBooking(req.userId, dto);
      res.status(201).json({ status: 'success', message: 'Booking created successfully', data: { booking } });
    } catch (error) { next(error); }
  };

  public getBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Booking ID is required');
      const booking = await this.bookingService.getBookingById(id);
      res.status(200).json({ status: 'success', data: { booking } });
    } catch (error) { next(error); }
  };

  public acceptBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const { id } = req.params;
      const { acceptedBudget } = req.body;
      if (!id) throw new ValidationError('Booking ID is required');
      const booking = await this.bookingService.acceptBooking(id, req.userId, acceptedBudget);
      res.status(200).json({ status: 'success', message: 'Booking accepted successfully', data: { booking } });
    } catch (error) { next(error); }
  };

  public completeBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const { id } = req.params;
      if (!id) throw new ValidationError('Booking ID is required');
      const booking = await this.bookingService.completeBooking(id, req.userId);
      res.status(200).json({ status: 'success', message: 'Booking completed successfully', data: { booking } });
    } catch (error) { next(error); }
  };

  public cancelBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const { id } = req.params;
      if (!id) throw new ValidationError('Booking ID is required');
      const booking = await this.bookingService.cancelBooking(id, req.userId);
      res.status(200).json({ status: 'success', message: 'Booking cancelled successfully', data: { booking } });
    } catch (error) { next(error); }
  };

  public getMyBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const { role = 'worker', status } = req.query;
      const limitNum = Math.min(parseInt((req.query.limit as string) || '10'), 100);
      const pageNum = Math.max(parseInt((req.query.page as string) || '1'), 1);

      let result: any;
      if (role === 'client') {
        result = await this.bookingService.getClientBookings(req.userId, pageNum, limitNum, status as string);
      } else {
        result = await this.bookingService.getWorkerBookings(req.userId, pageNum, limitNum, status as string);
      }

      res.status(200).json({
        status: 'success',
        data: {
          bookings: result.bookings,
          pagination: { total: result.total, limit: limitNum, page: pageNum, totalPages: Math.ceil(result.total / limitNum) },
        },
      });
    } catch (error) { next(error); }
  };
}

export default new BookingController();
