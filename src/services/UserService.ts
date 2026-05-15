import jwt from 'jsonwebtoken';
import { User, type IUserDocument } from '../models';
import config from '../config/config';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import type { CreateUserDTO, LoginDTO, UpdateUserDTO, UserResponseDTO } from '../utils/dtos';

export class UserService {
  /**
   * Create a new user (register)
   */
  async createUser(data: CreateUserDTO): Promise<UserResponseDTO> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    try {
      const user = await User.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        password: data.password,
        role: data.role,
      });

      return this.formatUserResponse(user);
    } catch (error: any) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new ConflictError(`${field} already exists`);
      }
      throw error;
    }
  }

  /**
   * Login user and return JWT token
   */
  async login(data: LoginDTO): Promise<{ token: string; refreshToken: string; user: UserResponseDTO }> {
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken(user._id.toString(), '24h');
    const refreshToken = this.generateToken(user._id.toString(), '7d');

    return {
      token,
      refreshToken,
      user: this.formatUserResponse(user),
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserResponseDTO> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return this.formatUserResponse(user);
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: UpdateUserDTO): Promise<UserResponseDTO> {
    const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });

    if (!user) {
      throw new NotFoundError('User');
    }

    return this.formatUserResponse(user);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserResponseDTO | null> {
    const user = await User.findOne({ email: email.toLowerCase() });
    return user ? this.formatUserResponse(user) : null;
  }

  /**
   * List all users with pagination and filtering
   */
  async listUsers(
    page: number = 1,
    limit: number = 10,
    filters?: { role?: string; status?: string }
  ): Promise<{ users: UserResponseDTO[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters?.role) query.role = filters.role;
    if (filters?.status) query.status = filters.status;

    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return {
      users: users.map((u) => this.formatUserResponse(u)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; iat: number; exp: number } | null {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      return {
        userId: decoded.userId,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh JWT token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;
      const newToken = this.generateToken(decoded.userId, config.jwtExpiry);
      return newToken;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Generate JWT token
   */
  public generateToken(userId: string, expiresIn: string): string {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: expiresIn as any });
  }

  /**
   * Format user response (exclude sensitive data)
   */
  private formatUserResponse(user: IUserDocument): UserResponseDTO {
    return {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      profileImage: user.profileImage,
      bio: user.bio,
      rating: user.rating || 0,
      reviewCount: user.reviewCount || 0,
      createdAt: user.createdAt!,
    };
  }
}

export default new UserService();
