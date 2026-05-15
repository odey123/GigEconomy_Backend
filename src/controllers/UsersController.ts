import { Request, Response, NextFunction } from 'express';
import userService from '../services/UserService';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import type { UpdateUserDTO } from '../utils/dtos';

export class UsersController {
  /**
   * Get current user profile
   * GET /api/users/me
   */
  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const user = await userService.getUserById(req.userId);

      res.status(200).json({
        status: 'success',
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update current user profile
   * PATCH /api/users/me
   * Body: { firstName, lastName, bio, profileImage, skills, address }
   */
  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const updateData: UpdateUserDTO = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        bio: req.body.bio,
        profileImage: req.body.profileImage,
        skills: req.body.skills,
        address: req.body.address,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => updateData[key as keyof UpdateUserDTO] === undefined && delete updateData[key as keyof UpdateUserDTO]);

      const updatedUser = await userService.updateUser(req.userId, updateData);

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Setup owner business profile
   * POST /api/users/me/owner-profile
   * Body: { businessName, businessType, description }
   */
  public setupOwnerProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { businessName, businessType, description } = req.body;

      if (!businessName || !businessType) {
        throw new ValidationError('Business name and type are required');
      }

      const ownerProfile = {
        businessName,
        businessType,
        description,
      };

      // TODO: Store owner profile in database
      // For now, we'll extend the user update
      const updatedUser = await userService.updateUser(req.userId, {
        ...ownerProfile,
      } as any);

      res.status(200).json({
        status: 'success',
        message: 'Owner profile setup completed',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Setup helper work preferences
   * POST /api/users/me/helper-profile
   * Body: { openTo: ["sales", "task"], skills: [{ category, level }], preferredRadius }
   */
  public setupHelperProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { openTo, skills, preferredRadius } = req.body;

      if (!Array.isArray(openTo) || openTo.length === 0) {
        throw new ValidationError('At least one work type must be selected');
      }

      const validWorkTypes = ['sales', 'task'];
      if (!openTo.every((type) => validWorkTypes.includes(type))) {
        throw new ValidationError('Invalid work type selected');
      }

      const helperProfile = {
        openTo,
        skills,
        preferredRadius: preferredRadius || 50,
      };

      // TODO: Store helper profile in database
      const updatedUser = await userService.updateUser(req.userId, {
        ...helperProfile,
      } as any);

      res.status(200).json({
        status: 'success',
        message: 'Helper profile setup completed',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new UsersController();
