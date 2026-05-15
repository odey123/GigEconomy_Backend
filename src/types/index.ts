/**
 * Common type definitions for the application
 */

export enum UserRole {
  WORKER = 'worker',
  CLIENT = 'client',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  SUSPENDED = 'suspended',
}

export enum JobStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum BookingStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum JobCategory {
  CLEANING = 'cleaning',
  DELIVERY = 'delivery',
  MOVING = 'moving',
  REPAIRS = 'repairs',
  TUTORING = 'tutoring',
  DESIGN = 'design',
  WRITING = 'writing',
  PROGRAMMING = 'programming',
  MARKETING = 'marketing',
  OTHER = 'other',
}

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  profileImage?: string;
  bio?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  skills?: string[];
  rating?: number;
  reviewCount?: number;
  totalEarnings?: number;
  totalSpent?: number;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IJob {
  title: string;
  description: string;
  category: JobCategory;
  budget: number;
  clientId: string;
  status: JobStatus;
  workType?: 'sales' | 'task';
  skillLevelRequired?: 'beginner' | 'intermediate' | 'expert' | 'any';
  evidenceRequired?: 'none' | 'photos' | 'videos' | 'documents';
  // Sales-specific fields
  productName?: string;
  productPrice?: number;
  commissionPercent?: number;
  stockAvailable?: number;
  starterStockValue?: number;
  // Task-specific fields
  fixedPrice?: number;
  deadline?: Date;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
  };
  dueDate: Date;
  estimatedDuration?: string;
  skills?: string[];
  acceptedWorkerId?: string;
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBooking {
  jobId: string;
  workerId: string;
  clientId: string;
  status: BookingStatus;
  proposedBudget: number;
  acceptedBudget?: number;
  startDate?: Date;
  completionDate?: Date;
  deliverables?: string;
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPayment {
  bookingId: string;
  workerId: string;
  clientId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod?: string;
  stripePaymentId?: string;
  transactionId?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReview {
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  tags?: string[]; // ["punctual", "honest", "skilled", etc]
  categories?: {
    communication?: number;
    professionalism?: number;
    quality?: number;
    timeliness?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotification {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt?: Date;
}
