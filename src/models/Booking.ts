import { Schema, model, Document } from 'mongoose';
import { IBooking, BookingStatus } from '../types/index';

export interface IBookingDocument extends IBooking, Document {}

const bookingSchema = new Schema<IBookingDocument>(
  {
    jobId: {
      type: String,
      required: [true, 'Job ID is required'],
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
    status: {
      type: String,
      enum: [
        BookingStatus.PENDING,
        BookingStatus.ACCEPTED,
        BookingStatus.IN_PROGRESS,
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
        BookingStatus.DISPUTED,
      ],
      default: BookingStatus.PENDING,
      index: true,
    },
    proposedBudget: {
      type: Number,
      required: [true, 'Proposed budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    acceptedBudget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
    },
    startDate: Date,
    completionDate: Date,
    deliverables: String,
    attachments: [String],
  },
  {
    timestamps: true,
  }
);

// Index for common queries
bookingSchema.index({ jobId: 1, status: 1 });
bookingSchema.index({ workerId: 1, status: 1 });
bookingSchema.index({ clientId: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });

// Create and export Booking model
export const Booking = model<IBookingDocument>('Booking', bookingSchema);
