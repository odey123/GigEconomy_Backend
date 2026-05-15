import { Schema, model, Document } from 'mongoose';

export type LoanType = 'inventory_loan' | 'earnings_advance';
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'repaid';

export interface ILoanApplication extends Document {
  userId: string;
  type: LoanType;
  requestedAmount: number;
  approvedAmount?: number;
  purpose?: string;
  status: LoanStatus;
  interestRate: number;
  repaymentTermDays: number;
  dueDate?: Date;
  disbursedAt?: Date;
  disbursementId?: string;
  repaidAmount: number;
  repaidAt?: Date;
  aiScore?: number;
  aiFactors?: {
    transactionHistory: number;
    paymentReliability: number;
    volumeConsistency: number;
    riskIndicators: number;
  };
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const loanApplicationSchema = new Schema<ILoanApplication>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['inventory_loan', 'earnings_advance'],
      required: true,
    },
    requestedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, min: 0 },
    purpose: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disbursed', 'repaid'],
      default: 'pending',
      index: true,
    },
    interestRate: { type: Number, default: 0 },
    repaymentTermDays: { type: Number, default: 30 },
    dueDate: { type: Date },
    disbursedAt: { type: Date },
    disbursementId: { type: String },
    repaidAmount: { type: Number, default: 0 },
    repaidAt: { type: Date },
    aiScore: { type: Number },
    aiFactors: {
      transactionHistory: Number,
      paymentReliability: Number,
      volumeConsistency: Number,
      riskIndicators: Number,
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

loanApplicationSchema.index({ userId: 1, createdAt: -1 });

export const LoanApplication = model<ILoanApplication>('LoanApplication', loanApplicationSchema);
