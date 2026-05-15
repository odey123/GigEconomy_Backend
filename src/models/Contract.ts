import { Schema, model, Document } from 'mongoose';

export enum ContractStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

export interface IMeetup {
  location: string;
  latitude: number;
  longitude: number;
  time: Date;
  instructions?: string;
  ownerContact?: string;
}

export interface ISalesData {
  paymentReference: string;
  paymentUrl: string;
  qrCode: string;
  stockPickupQuantity?: number;
  stockPickupValue?: number;
  pickupDate?: Date;
  customerAmount: number;
  ownerAmount: number;
  helperCommission: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
}

export interface ITaskData {
  escrowReference: string;
  escrowAmount: number;
  escrowStatus: 'pending' | 'funded' | 'released' | 'disputed';
  deliverables?: string;
  submissionDate?: Date;
  completionDate?: Date;
  approvalDate?: Date;
}

export interface IContract extends Document {
  gigId: string;
  ownerId: string;
  helperId: string;
  workType: 'sales' | 'task';
  status: ContractStatus;
  meetup?: IMeetup;
  salesData?: ISalesData;
  taskData?: ITaskData;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const contractSchema = new Schema<IContract>(
  {
    gigId: {
      type: String,
      required: [true, 'Gig ID is required'],
      index: true,
    },
    ownerId: {
      type: String,
      required: [true, 'Owner ID is required'],
      index: true,
    },
    helperId: {
      type: String,
      required: [true, 'Helper ID is required'],
      index: true,
    },
    workType: {
      type: String,
      enum: ['sales', 'task'],
      required: [true, 'Work type is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ContractStatus),
      default: ContractStatus.PENDING,
      index: true,
    },
    meetup: {
      location: String,
      latitude: Number,
      longitude: Number,
      time: Date,
      instructions: String,
      ownerContact: String,
    },
    salesData: {
      paymentReference: String,
      paymentUrl: String,
      qrCode: String,
      stockPickupQuantity: Number,
      stockPickupValue: Number,
      pickupDate: Date,
      customerAmount: Number,
      ownerAmount: Number,
      helperCommission: Number,
      paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
      },
    },
    taskData: {
      escrowReference: String,
      escrowAmount: Number,
      escrowStatus: {
        type: String,
        enum: ['pending', 'funded', 'released', 'disputed'],
        default: 'pending',
      },
      deliverables: String,
      submissionDate: Date,
      completionDate: Date,
      approvalDate: Date,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
contractSchema.index({ ownerId: 1, status: 1 });
contractSchema.index({ helperId: 1, status: 1 });
contractSchema.index({ gigId: 1 });
contractSchema.index({ workType: 1, status: 1 });
contractSchema.index({ createdAt: -1 });

export const Contract = model<IContract>('Contract', contractSchema);
