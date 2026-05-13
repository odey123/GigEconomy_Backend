import { Schema, model, Document } from 'mongoose';

export interface IWallet extends Document {
  userId: string;
  walletId: string;
  accountNumber: string;
  bank: string;
  bankCode: string;
  balance: number;
  currency: string;
  verified: boolean;
  bvn: string;
  fullName: string;
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
    walletId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
    },
    bank: {
      type: String,
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
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
    },
    bvn: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet = model<IWallet>('Wallet', walletSchema);
