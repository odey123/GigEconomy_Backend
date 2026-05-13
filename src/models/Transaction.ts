import { Schema, model, Document } from 'mongoose';

export interface ITransaction extends Document {
  walletId: string;
  userId: string;
  type: 'credit' | 'debit' | 'withdrawal' | 'deposit';
  amount: number;
  fee?: number;
  netAmount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference: string;
  metadata?: any; // For storing additional data like bank details, payment link, etc
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    walletId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'withdrawal', 'deposit'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    fee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for common queries
transactionSchema.index({ walletId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
