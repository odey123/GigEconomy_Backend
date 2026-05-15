import { Schema, model, Document } from 'mongoose';

export interface IWallet extends Document {
  userId: string;
  squadVirtualAccountId: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
  balance: number;
  currency: string;
  verified: boolean;
  bvn: string;
  fullName: string;
  dateOfBirth: Date;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    squadVirtualAccountId: {
      type: String,
      required: [true, 'Squad Virtual Account ID is required'],
      unique: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      unique: true,
    },
    accountName: {
      type: String,
      required: [true, 'Account name is required'],
    },
    bankCode: {
      type: String,
      required: [true, 'Bank code is required'],
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    bvn: {
      type: String,
      required: [true, 'BVN is required'],
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet = model<IWallet>('Wallet', walletSchema);
