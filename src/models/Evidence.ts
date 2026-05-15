import { Schema, model, Document } from 'mongoose';

export interface AIAnalysis {
  quality: 'low' | 'medium' | 'high' | 'excellent';
  skillLevelDetected: 'beginner' | 'intermediate' | 'expert' | 'unknown';
  flags: string[];
  qualitySignals: string[];
  confidence: number; // 0-100
}

export interface IEvidence {
  userId: string;
  contractId: string;
  photos: {
    url: string;
    uploadedAt: Date;
    metadata?: {
      size: number;
      mimeType: string;
      width?: number;
      height?: number;
    };
  }[];
  aiAnalysis?: AIAnalysis;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  workType: 'sales' | 'task';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
}

export interface IEvidenceDocument extends IEvidence, Document {}

const evidenceSchema = new Schema<IEvidenceDocument>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    contractId: {
      type: String,
      required: [true, 'Contract ID is required'],
      index: true,
    },
    photos: [
      {
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          size: Number,
          mimeType: String,
          width: Number,
          height: Number,
        },
      },
    ],
    aiAnalysis: {
      quality: {
        type: String,
        enum: ['low', 'medium', 'high', 'excellent'],
        default: 'medium',
      },
      skillLevelDetected: {
        type: String,
        enum: ['beginner', 'intermediate', 'expert', 'unknown'],
        default: 'unknown',
      },
      flags: [String],
      qualitySignals: [String],
      confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: String,
    workType: {
      type: String,
      enum: ['sales', 'task'],
      required: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
evidenceSchema.index({ userId: 1, createdAt: -1 });
evidenceSchema.index({ contractId: 1 });
evidenceSchema.index({ status: 1, userId: 1 });
evidenceSchema.index({ workType: 1, userId: 1 });

// Create and export Evidence model
export const Evidence = model<IEvidenceDocument>('Evidence', evidenceSchema);
