import { Schema, model, Document } from 'mongoose';
import { IPayment, PaymentStatus } from '../types/index';

export interface IPaymentDocument extends IPayment, Document {}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    bookingId: {
      type: String,
      required: [true, 'Booking ID is required'],
      index: true,
    },
    workerId: {
      type: String,
      required: [true, 'Worker ID is required'],
      index: true,
    },
    clientId: {
      type: String,
      required: [true, 'Client ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      enum: [
        PaymentStatus.PENDING,
        PaymentStatus.PROCESSING,
        PaymentStatus.COMPLETED,
        PaymentStatus.FAILED,
        PaymentStatus.REFUNDED,
      ],
      default: PaymentStatus.PENDING,
      index: true,
    },
    paymentMethod: String,
    squadPaymentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    squadReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    description: String,
  },
  {
    timestamps: true,
  }
);

// Index for common queries
paymentSchema.index({ bookingId: 1, status: 1 });
paymentSchema.index({ workerId: 1, status: 1 });
paymentSchema.index({ clientId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

// Create and export Payment model
export const Payment = model<IPaymentDocument>('Payment', paymentSchema);
