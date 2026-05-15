import { Job, type IJobDocument } from '../models';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface CreateJobDTO {
  title: string;
  description: string;
  category: string;
  budget: number;
  dueDate: Date;
  location?: {
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  estimatedDuration?: string;
  skills?: string[];
  attachments?: string[];
}

export interface JobResponseDTO {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  clientId: string;
  status: string;
  location?: any;
  dueDate: Date;
  acceptedWorkerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class JobService {
  /**
   * Create a new job
   */
  async createJob(clientId: string, data: CreateJobDTO): Promise<JobResponseDTO> {
    if (!data.title || !data.description || !data.budget || !data.dueDate) {
      throw new ValidationError('Missing required fields: title, description, budget, dueDate');
    }

    const job = await Job.create({
      title: data.title,
      description: data.description,
      category: data.category,
      budget: data.budget,
      dueDate: data.dueDate,
      clientId,
      location: data.location,
      estimatedDuration: data.estimatedDuration,
      skills: data.skills,
      attachments: data.attachments,
    });

    return this.formatJobResponse(job);
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId: string): Promise<JobResponseDTO> {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job');
    }
    return this.formatJobResponse(job);
  }

  /**
   * List all jobs with filtering and pagination
   */
  async listJobs(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: string;
      category?: string;
      minBudget?: number;
      maxBudget?: number;
      city?: string;
      clientId?: string;
    }
  ): Promise<{ jobs: JobResponseDTO[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters?.status) query.status = filters.status;
    if (filters?.category) query.category = filters.category;
    if (filters?.clientId) query.clientId = filters.clientId;
    if (filters?.city) query['location.city'] = filters.city;

    if (filters?.minBudget || filters?.maxBudget) {
      query.budget = {};
      if (filters.minBudget) query.budget.$gte = filters.minBudget;
      if (filters.maxBudget) query.budget.$lte = filters.maxBudget;
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Job.countDocuments(query),
    ]);

    return {
      jobs: jobs.map((j) => this.formatJobResponse(j)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update job
   */
  async updateJob(jobId: string, clientId: string, data: Partial<CreateJobDTO>): Promise<JobResponseDTO> {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job');
    }

    // Ensure only client can update their own job
    if (job.clientId.toString() !== clientId) {
      throw new ValidationError('Only job creator can update this job');
    }

    // Can't update completed or cancelled jobs
    if (['completed', 'cancelled'].includes(job.status)) {
      throw new ValidationError(`Cannot update a ${job.status} job`);
    }

    const updatedJob = await Job.findByIdAndUpdate(jobId, data, { new: true, runValidators: true });
    return this.formatJobResponse(updatedJob!);
  }

  /**
   * Close/Cancel a job
   */
  async closeJob(jobId: string, clientId: string, status: 'completed' | 'cancelled'): Promise<JobResponseDTO> {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job');
    }

    if (job.clientId.toString() !== clientId) {
      throw new ValidationError('Only job creator can close this job');
    }

    job.status = status as any;
    await job.save();

    return this.formatJobResponse(job);
  }

  /**
   * Search jobs
   */
  async searchJobs(query: string, page: number = 1, limit: number = 10): Promise<{ jobs: JobResponseDTO[]; total: number }> {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { skills: { $regex: query, $options: 'i' } },
        ],
        status: 'open',
      })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Job.countDocuments({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { skills: { $regex: query, $options: 'i' } },
        ],
        status: 'open',
      }),
    ]);

    return {
      jobs: jobs.map((j) => this.formatJobResponse(j)),
      total,
    };
  }

  /**
   * Format job response
   */
  private formatJobResponse(job: IJobDocument): JobResponseDTO {
    return {
      _id: job._id.toString(),
      title: job.title,
      description: job.description,
      category: job.category,
      budget: job.budget,
      clientId: job.clientId.toString(),
      status: job.status,
      location: job.location,
      dueDate: job.dueDate,
      acceptedWorkerId: job.acceptedWorkerId?.toString(),
      createdAt: job.createdAt!,
      updatedAt: job.updatedAt!,
    };
  }
}

export default new JobService();
