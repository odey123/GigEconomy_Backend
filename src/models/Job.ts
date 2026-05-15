import { Schema, model, Document } from 'mongoose';
import { IJob, JobStatus, JobCategory } from '../types/index';

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
    workType: {
      type: String,
      enum: ['sales', 'task'],
      required: [true, 'Work type is required (sales or task)'],
      index: true,
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
      type: String,
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
    skillLevelRequired: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert', 'any'],
      default: 'any',
    },
    evidenceRequired: {
      type: String,
      enum: ['none', 'photos', 'videos', 'documents'],
      default: 'none',
    },
    skills: [String],
    acceptedWorkerId: {
      type: String,
      default: null,
    },
    attachments: [String],
    // Sales Gig Specific Fields
    productName: {
      type: String,
      required: function (this: any) {
        return this.workType === 'sales';
      },
    },
    productPrice: {
      type: Number,
      required: function (this: any) {
        return this.workType === 'sales';
      },
    },
    commissionPercent: {
      type: Number,
      required: function (this: any) {
        return this.workType === 'sales';
      },
      min: [0, 'Commission cannot be negative'],
      max: [100, 'Commission cannot exceed 100%'],
    },
    stockAvailable: {
      type: Number,
      required: function (this: any) {
        return this.workType === 'sales';
      },
    },
    starterStockValue: {
      type: Number,
      required: function (this: any) {
        return this.workType === 'sales';
      },
    },
    // Task Gig Specific Fields
    fixedPrice: {
      type: Number,
      required: function (this: any) {
        return this.workType === 'task';
      },
    },
    deadline: {
      type: Date,
      required: function (this: any) {
        return this.workType === 'task';
      },
    },
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
