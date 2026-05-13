import { Schema, model, Document, Types } from 'mongoose';
import { INotification } from '@types/index';

export interface INotificationDocument extends INotification, Document {}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: ['job_offer', 'booking_accepted', 'payment_received', 'review', 'message', 'system'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    data: Schema.Types.Mixed,
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for common queries
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

// Create and export Notification model
export const Notification = model<INotificationDocument>(
  'Notification',
  notificationSchema
);
