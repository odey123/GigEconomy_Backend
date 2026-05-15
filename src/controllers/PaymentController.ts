import { Request, Response, NextFunction } from 'express';
import { PaymentService, type CreatePaymentDTO } from '../services/PaymentService';
import { ValidationError, UnauthorizedError } from '../utils/errors';

export class PaymentController {
  private paymentService: PaymentService;
  constructor() { this.paymentService = new PaymentService(); }

  public createPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const { bookingId, paymentMethod, description } = req.body;
      if (!bookingId || !paymentMethod) throw new ValidationError('bookingId and paymentMethod are required');
      if (!['card', 'transfer', 'wallet'].includes(paymentMethod)) {
        throw new ValidationError("paymentMethod must be 'card', 'transfer', or 'wallet'");
      }
      const dto: CreatePaymentDTO = { bookingId, paymentMethod, description };
      const payment = await this.paymentService.createPayment(req.userId, dto);
      res.status(201).json({ status: 'success', message: 'Payment created successfully', data: { payment } });
    } catch (error) { next(error); }
  };

  public getPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Payment ID is required');
      const payment = await this.paymentService.getPaymentById(id);
      res.status(200).json({ status: 'success', data: { payment } });
    } catch (error) { next(error); }
  };

  public getBookingPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params;
      if (!bookingId) throw new ValidationError('Booking ID is required');
      const payments = await this.paymentService.getBookingPayments(bookingId);
      res.status(200).json({ status: 'success', data: { payments } });
    } catch (error) { next(error); }
  };

  public getMyEarnings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const limitNum = Math.min(parseInt((req.query.limit as string) || '20'), 100);
      const pageNum = Math.max(parseInt((req.query.page as string) || '1'), 1);
      const result = await this.paymentService.getWorkerEarnings(req.userId, pageNum, limitNum);
      res.status(200).json({
        status: 'success',
        data: {
          earnings: result.payments,
          totalEarnings: result.totalEarnings,
          pagination: { total: result.total, limit: limitNum, page: pageNum, totalPages: Math.ceil(result.total / limitNum) },
        },
      });
    } catch (error) { next(error); }
  };

  public getMyPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      const limitNum = Math.min(parseInt((req.query.limit as string) || '20'), 100);
      const pageNum = Math.max(parseInt((req.query.page as string) || '1'), 1);
      const result = await this.paymentService.getClientPayments(req.userId, pageNum, limitNum);
      res.status(200).json({
        status: 'success',
        data: {
          payments: result.payments,
          totalSpent: result.totalSpent,
          pagination: { total: result.total, limit: limitNum, page: pageNum, totalPages: Math.ceil(result.total / limitNum) },
        },
      });
    } catch (error) { next(error); }
  };
}

export default new PaymentController();
