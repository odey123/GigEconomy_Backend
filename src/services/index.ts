/**
 * Barrel exports for all services
 */

export { UserService, default as userService } from './UserService';
export { JobService, default as jobService } from './JobService';
export { BookingService, default as bookingService } from './BookingService';
export { ReviewService, default as reviewService } from './ReviewService';
export { PaymentService, default as paymentService } from './PaymentService';
export { NotificationService, default as notificationService } from './NotificationService';
export { SquadService, default as squadService } from './SquadService';
export { WalletService, default as walletService } from './WalletService';
export { ContractService, default as contractService } from './ContractService';
export { AIService, default as aiService } from './AIService';
export { EvidenceService, default as evidenceService } from './EvidenceService';
export { ReputationService, default as reputationService } from './ReputationService';

// Export types
export type { CreateUserDTO, LoginDTO, UpdateUserDTO, UserResponseDTO } from '../utils/dtos';
export type { CreateJobDTO, JobResponseDTO } from './JobService';
export type { CreateBookingDTO, BookingResponseDTO } from './BookingService';
export type { CreateReviewDTO, ReviewResponseDTO } from './ReviewService';
export type { CreatePaymentDTO, PaymentResponseDTO } from './PaymentService';
export type { MatchScoreResponse, VerifyEvidenceResponse, CreditScoreResponse, AnomalyDetectionResponse } from './AIService';
export type { ReputationSummary } from './ReputationService';
export type { CreateNotificationDTO, NotificationResponseDTO } from './NotificationService';
export type { CreateWalletDTO, WalletResponseDTO } from './WalletService';
