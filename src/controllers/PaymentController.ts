import { Request, Response, NextFunction } from 'express';
import { PaymentService, type CreatePaymentDTO, type PaymentResponseDTO } from '../services/PaymentService';
import { ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/errors';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Create and process a payment
   * POST /api/payments
   * Body: { bookingId, paymentMethod, description? }
   */
  public createPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { bookingId, paymentMethod, description } = req.body;

      if (!bookingId || !paymentMethod) {
        throw new ValidationError('bookingId and paymentMethod are required');
      }

      if (!['card', 'transfer', 'wallet'].includes(paymentMethod)) {
        throw new ValidationError("paymentMethod must be 'card', 'transfer', or 'wallet'");
      }

      const createPaymentDTO: CreatePaymentDTO = {
        bookingId,
        paymentMethod,
        description,
      };

      const payment = await this.paymentService.createPayment(req.userId, createPaymentDTO);

      res.status(201).json({
        status: 'success',
        message: 'Payment created successfully',
        data: {
          payment,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get payment details
   * GET /api/payments/:id
   */
  public getPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Payment ID is required');
      }

      const payment = await this.paymentService.getPaymentById(id);

      res.status(200).json({
        status: 'success',
        data: {
          payment,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get payments for a booking
   * GET /api/payments/booking/:bookingId
   */
  public getBookingPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params;

      if (!bookingId) {
        throw new ValidationError('Booking ID is required');
      }

      const payments = await this.paymentService.getBookingPayments(bookingId);

      res.status(200).json({
        status: 'success',
        data: {
          payments,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get my earnings (as worker)
   * GET /api/payments/earnings
   * Query: { dateFrom?, dateTo?, limit?, page? }
   */
  public getMyEarnings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { dateFrom, dateTo, limit = 20, page = 1 } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);

      const dateFromObj = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days default
      const dateToObj = dateTo ? new Date(dateTo as string) : new Date();

      const result = await this.paymentService.getWorkerEarnings(req.userId, {
        dateFrom: dateFromObj,
        dateTo: dateToObj,
        limit: limitNum,
        page: pageNum,
      });

      res.status(200).json({
        status: 'success',
        data: {
          earnings: result.payments,
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
   * Get my payments (as client)
   * GET /api/payments/my
   * Query: { status?, limit?, page? }
   */
  public getMyPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { status, limit = 20, page = 1 } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);

      const result = await this.paymentService.getClientPayments(req.userId, {
        status: status as string,
        limit: limitNum,
        page: pageNum,
      });

      res.status(200).json({
        status: 'success',
        data: {
          payments: result.payments,
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
}

export default new PaymentController();
