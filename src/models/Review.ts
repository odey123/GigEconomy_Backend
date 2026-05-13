import { Schema, model, Document, Types } from 'mongoose';
import { IReview } from '@types/index';

export interface IReviewDocument extends IReview, Document {}

const reviewSchema = new Schema<IReviewDocument>(
  {
    bookingId: {
      type: Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    reviewerId: {
      type: Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer ID is required'],
    },
    revieweeId: {
      type: Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewee ID is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    categories: {
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
      },
      quality: {
        type: Number,
        min: 1,
        max: 5,
      },
      timeliness: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one review per booking
reviewSchema.index({ bookingId: 1 }, { unique: true });

// Index for common queries
reviewSchema.index({ revieweeId: 1, createdAt: -1 });
reviewSchema.index({ createdAt: -1 });

// Create and export Review model
export const Review = model<IReviewDocument>('Review', reviewSchema);
