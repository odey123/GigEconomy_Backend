import { Schema, model, Document, Types } from 'mongoose';
import { IJob, JobStatus, JobCategory } from '@types/index';

export interface IJobDocument extends IJob, Document {}

const jobSchema = new Schema<IJobDocument>(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: [
        JobCategory.CLEANING,
        JobCategory.DELIVERY,
        JobCategory.MOVING,
        JobCategory.REPAIRS,
        JobCategory.TUTORING,
        JobCategory.DESIGN,
        JobCategory.WRITING,
        JobCategory.PROGRAMMING,
        JobCategory.MARKETING,
        JobCategory.OTHER,
      ],
      required: true,
      index: true,
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    clientId: {
      type: Types.ObjectId,
      ref: 'User',
      required: [true, 'Client ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: [
        JobStatus.OPEN,
        JobStatus.IN_PROGRESS,
        JobStatus.COMPLETED,
        JobStatus.CANCELLED,
      ],
      default: JobStatus.OPEN,
      index: true,
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      city: {
        type: String,
        index: true,
      },
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    estimatedDuration: String,
    skills: [String],
    acceptedWorkerId: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
    },
    attachments: [String],
  },
  {
    timestamps: true,
  }
);

// Index for common queries
jobSchema.index({ clientId: 1, status: 1 });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ budget: 1 });

// Create and export Job model
export const Job = model<IJobDocument>('Job', jobSchema);
