import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { ValidationError } from '../utils/errors';
import { userValidationSchemas } from '../utils/validators';
import type { CreateUserDTO, LoginDTO } from '../utils/dtos';

export class AuthController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * User signup
   * POST /api/auth/signup
   * Body: { email, phone, password, role, firstName, lastName }
   */
  public signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = userValidationSchemas.register.validate(req.body);

      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const createUserDTO: CreateUserDTO = {
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        phone: value.phone,
        password: value.password,
        role: value.role,
      };

      const user = await this.userService.createUser(createUserDTO);

      // Auto-login after signup by generating tokens
      const token = this.userService.generateToken(user._id, '24h');
      const refreshToken = this.userService.generateToken(user._id, '7d');

      res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: {
          user,
          token,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * User login
   * POST /api/auth/login
   * Body: { email, password }
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = userValidationSchemas.login.validate(req.body);

      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const loginDTO: LoginDTO = {
        email: value.email,
        password: value.password,
      };

      const result = await this.userService.login(loginDTO);

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh JWT token
   * POST /api/auth/refresh
   * Body: { refreshToken }
   */
  public refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const newToken = await this.userService.refreshToken(refreshToken);

      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user (client-side, mainly for cleanup)
   * POST /api/auth/logout
   */
  public logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        status: 'success',
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new AuthController();
