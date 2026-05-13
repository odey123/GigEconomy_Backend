import { Booking, Job, User, type IBookingDocument } from '../models';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface CreateBookingDTO {
  jobId: string;
  proposedBudget: number;
  deliverables?: string;
  attachments?: string[];
}

export interface BookingResponseDTO {
  _id: string;
  jobId: string;
  workerId: string;
  clientId: string;
  status: string;
  proposedBudget: number;
  acceptedBudget?: number;
  startDate?: Date;
  completionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class BookingService {
  /**
   * Create a booking (worker applies for job)
   */
  async createBooking(workerId: string, data: CreateBookingDTO): Promise<BookingResponseDTO> {
    // Check if job exists
    const job = await Job.findById(data.jobId);
    if (!job) {
      throw new NotFoundError('Job');
    }

    if (job.status !== 'open') {
      throw new ValidationError('Job is no longer available');
    }

    // Check if already booked
    const existingBooking = await Booking.findOne({
      jobId: data.jobId,
      workerId,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingBooking) {
      throw new ValidationError('You have already applied for this job');
    }

    const booking = await Booking.create({
      jobId: data.jobId,
      workerId,
      clientId: job.clientId,
      proposedBudget: data.proposedBudget,
      deliverables: data.deliverables,
      attachments: data.attachments,
    });

    return this.formatBookingResponse(booking);
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<BookingResponseDTO> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking');
    }
    return this.formatBookingResponse(booking);
  }

  /**
   * Accept a booking (client accepts worker)
   */
  async acceptBooking(bookingId: string, clientId: string, acceptedBudget?: number): Promise<BookingResponseDTO> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.clientId.toString() !== clientId) {
      throw new ValidationError('Only client can accept bookings for their job');
    }

    if (booking.status !== 'pending') {
      throw new ValidationError(`Cannot accept a ${booking.status} booking`);
    }

    // Update booking
    booking.status = 'accepted';
    booking.acceptedBudget = acceptedBudget || booking.proposedBudget;
    booking.startDate = new Date();
    await booking.save();

    // Update job status and assign worker
    const job = await Job.findById(booking.jobId);
    if (job) {
      job.status = 'in_progress';
      job.acceptedWorkerId = booking.workerId;
      await job.save();
    }

    // Cancel other pending bookings for this job
    await Booking.updateMany(
      { jobId: booking.jobId, _id: { $ne: bookingId }, status: 'pending' },
      { status: 'cancelled' }
    );

    return this.formatBookingResponse(booking);
  }

  /**
   * Complete a booking
   */
  async completeBooking(bookingId: string, userId: string): Promise<BookingResponseDTO> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    // Either worker or client can mark as complete
    if (booking.workerId.toString() !== userId && booking.clientId.toString() !== userId) {
      throw new ValidationError('Unauthorized to complete this booking');
    }

    if (booking.status !== 'accepted' && booking.status !== 'in_progress') {
      throw new ValidationError(`Cannot complete a ${booking.status} booking`);
    }

    booking.status = 'completed';
    booking.completionDate = new Date();
    await booking.save();

    // Update job status
    const job = await Job.findById(booking.jobId);
    if (job) {
      job.status = 'completed';
      await job.save();
    }

    return this.formatBookingResponse(booking);
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, userId: string): Promise<BookingResponseDTO> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.workerId.toString() !== userId && booking.clientId.toString() !== userId) {
      throw new ValidationError('Unauthorized to cancel this booking');
    }

    if (!['pending', 'accepted'].includes(booking.status)) {
      throw new ValidationError(`Cannot cancel a ${booking.status} booking`);
    }

    booking.status = 'cancelled';
    await booking.save();

    // If job was in progress, reset it to open
    if (booking.status === 'accepted') {
      const job = await Job.findById(booking.jobId);
      if (job) {
        job.status = 'open';
        job.acceptedWorkerId = undefined;
        await job.save();
      }
    }

    return this.formatBookingResponse(booking);
  }

  /**
   * List worker's bookings
   */
  async getWorkerBookings(
    workerId: string,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{ bookings: BookingResponseDTO[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const query: any = { workerId };
    if (status) query.status = status;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Booking.countDocuments(query),
    ]);

    return {
      bookings: bookings.map((b) => this.formatBookingResponse(b)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * List client's bookings for their jobs
   */
  async getClientBookings(
    clientId: string,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{ bookings: BookingResponseDTO[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const query: any = { clientId };
    if (status) query.status = status;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Booking.countDocuments(query),
    ]);

    return {
      bookings: bookings.map((b) => this.formatBookingResponse(b)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Format booking response
   */
  private formatBookingResponse(booking: IBookingDocument): BookingResponseDTO {
    return {
      _id: booking._id.toString(),
      jobId: booking.jobId.toString(),
      workerId: booking.workerId.toString(),
      clientId: booking.clientId.toString(),
      status: booking.status,
      proposedBudget: booking.proposedBudget,
      acceptedBudget: booking.acceptedBudget,
      startDate: booking.startDate,
      completionDate: booking.completionDate,
      createdAt: booking.createdAt!,
      updatedAt: booking.updatedAt!,
    };
  }
}

export default new BookingService();
