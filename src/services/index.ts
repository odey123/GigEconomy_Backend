/**
 * Barrel exports for all services
 */

export { UserService, default as userService } from './UserService';
export { JobService, default as jobService } from './JobService';
export { BookingService, default as bookingService } from './BookingService';
export { ReviewService, default as reviewService } from './ReviewService';
export { PaymentService, default as paymentService } from './PaymentService';
export { NotificationService, default as notificationService } from './NotificationService';

// Export types
export type { CreateUserDTO, LoginDTO, UpdateUserDTO, UserResponseDTO } from './UserService';
export type { CreateJobDTO, JobResponseDTO } from './JobService';
export type { CreateBookingDTO, BookingResponseDTO } from './BookingService';
export type { CreateReviewDTO, ReviewResponseDTO } from './ReviewService';
export type { CreatePaymentDTO, PaymentResponseDTO } from './PaymentService';
export type { CreateNotificationDTO, NotificationResponseDTO } from './NotificationService';
