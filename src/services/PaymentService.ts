import { Payment, Booking, type IPaymentDocument } from '../models';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface CreatePaymentDTO {
  bookingId: string;
  paymentMethod: 'card' | 'transfer' | 'wallet';
  description?: string;
}

export interface PaymentResponseDTO {
  _id: string;
  bookingId: string;
  workerId: string;
  clientId: string;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentService {
  /**
   * Create and process a payment
   */
  async createPayment(clientId: string, data: CreatePaymentDTO): Promise<PaymentResponseDTO> {
    const booking = await Booking.findById(data.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.clientId.toString() !== clientId) {
      throw new ValidationError('Only job client can make payments for this booking');
    }

    if (booking.status !== 'completed') {
      throw new ValidationError('Can only pay for completed bookings');
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      bookingId: data.bookingId,
      status: { $in: ['completed', 'processing'] },
    });

    if (existingPayment) {
      throw new ValidationError('Payment already made for this booking');
    }

    const amount = booking.acceptedBudget || booking.proposedBudget;

    const payment = await Payment.create({
      bookingId: data.bookingId,
      workerId: booking.workerId,
      clientId: booking.clientId,
      amount,
      paymentMethod: data.paymentMethod,
      status: 'processing',
      description: data.description,
    });

    // For hackathon: simulate instant payment
    await this.processPayment(payment._id.toString());

    const updatedPayment = await Payment.findById(payment._id);
    return this.formatPaymentResponse(updatedPayment!);
  }

  /**
   * Process payment (internal)
   */
  private async processPayment(paymentId: string): Promise<void> {
    // Mock payment processing - in production, integrate with Stripe, PayPal, etc.
    const payment = await Payment.findById(paymentId);
    if (!payment) return;

    // Simulate successful payment
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    payment.status = 'completed';
    payment.transactionId = transactionId;
    await payment.save();
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<PaymentResponseDTO> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment');
    }
    return this.formatPaymentResponse(payment);
  }

  /**
   * Get payments for a booking
   */
  async getBookingPayments(bookingId: string): Promise<PaymentResponseDTO[]> {
    const payments = await Payment.find({ bookingId }).sort({ createdAt: -1 });
    return payments.map((p) => this.formatPaymentResponse(p));
  }

  /**
   * Get worker earnings
   */
  async getWorkerEarnings(
    workerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    payments: PaymentResponseDTO[];
    total: number;
    totalEarnings: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [payments, totalData] = await Promise.all([
      Payment.find({ workerId, status: 'completed' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Payment.aggregate([
        { $match: { workerId: workerId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const total = totalData.length > 0 ? totalData[0].count : 0;
    const totalEarnings = totalData.length > 0 ? totalData[0].total : 0;

    return {
      payments: payments.map((p) => this.formatPaymentResponse(p)),
      total,
      totalEarnings,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get client payments
   */
  async getClientPayments(
    clientId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    payments: PaymentResponseDTO[];
    total: number;
    totalSpent: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [payments, totalData] = await Promise.all([
      Payment.find({ clientId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Payment.aggregate([
        { $match: { clientId } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const total = totalData.length > 0 ? totalData[0].count : 0;
    const totalSpent = totalData.length > 0 ? totalData[0].total : 0;

    return {
      payments: payments.map((p) => this.formatPaymentResponse(p)),
      total,
      totalSpent,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Format payment response
   */
  private formatPaymentResponse(payment: IPaymentDocument): PaymentResponseDTO {
    return {
      _id: payment._id.toString(),
      bookingId: payment.bookingId.toString(),
      workerId: payment.workerId.toString(),
      clientId: payment.clientId.toString(),
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod || 'card',
      transactionId: payment.transactionId,
      createdAt: payment.createdAt!,
      updatedAt: payment.updatedAt!,
    };
  }
}

export default new PaymentService();
