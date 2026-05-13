import { Request, Response, NextFunction } from 'express';
import { Job } from '../models/Job';
import { ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/errors';

export class GigsController {
  /**
   * Create a new gig (owner posts)
   * POST /api/gigs
   * Body: {
   *   workType: "sales" | "task",
   *   title, description, location, skillLevelRequired, evidenceRequired,
   *   // Sales-specific
   *   productName, productPrice, commissionPercent, stockAvailable, starterStockValue,
   *   // Task-specific
   *   fixedPrice, deadline
   * }
   */
  public createGig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const {
        workType,
        title,
        description,
        location,
        skillLevelRequired,
        evidenceRequired,
        // Sales-specific
        productName,
        productPrice,
        commissionPercent,
        stockAvailable,
        starterStockValue,
        // Task-specific
        fixedPrice,
        deadline,
      } = req.body;

      // Validate common fields
      if (!workType || !['sales', 'task'].includes(workType)) {
        throw new ValidationError('Valid workType (sales or task) is required');
      }

      if (!title || !description || !location) {
        throw new ValidationError('Title, description, and location are required');
      }

      // Validate work-type specific fields
      if (workType === 'sales') {
        if (!productName || !productPrice || !commissionPercent) {
          throw new ValidationError('Sales gig requires productName, productPrice, and commissionPercent');
        }
      } else if (workType === 'task') {
        if (!fixedPrice || !deadline) {
          throw new ValidationError('Task gig requires fixedPrice and deadline');
        }
      }

      // Create gig with appropriate fields
      const gigData: any = {
        workType,
        title,
        description,
        location,
        skillLevelRequired: skillLevelRequired || 'any',
        evidenceRequired: evidenceRequired || 'none',
        ownerId: req.userId,
        status: 'active',
      };

      // Add work-type specific fields
      if (workType === 'sales') {
        gigData.productName = productName;
        gigData.productPrice = productPrice;
        gigData.commissionPercent = commissionPercent;
        gigData.stockAvailable = stockAvailable;
        gigData.starterStockValue = starterStockValue;
      } else if (workType === 'task') {
        gigData.fixedPrice = fixedPrice;
        gigData.deadline = deadline;
      }

      // TODO: Create Job document with work-type schema
      // For now, we'll use a placeholder response
      const gig = {
        _id: `gig_${Date.now()}`,
        ...gigData,
        createdAt: new Date(),
      };

      res.status(201).json({
        status: 'success',
        message: 'Gig created successfully',
        data: {
          gigId: gig._id,
          status: gig.status,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get matched gigs for helper (AI-ranked by location, skill, work type)
   * GET /api/gigs/matched
   * Query params: ?workType=sales&lat=&lng=&radius=
   */
  public getMatchedGigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { workType, lat, lng, radius = 50 } = req.query;

      // TODO: Implement AI matching algorithm
      // 1. Query gigs by location (lat/lng + radius)
      // 2. Filter by workType if provided
      // 3. Score matches based on helper's skills and preferences
      // 4. Sort by AI score descending
      // 5. Return with match scores

      // Mock response for now
      const matchedGigs = [
        {
          _id: 'gig_001',
          workType: 'sales',
          title: 'Sell Health Products',
          description: 'Help sell Rock Healthy health supplements',
          productName: 'Vitamin D Supplement',
          productPrice: 5000,
          commissionPercent: 15,
          location: { address: 'Lagos, Nigeria', lat: 6.5244, lng: 3.3792 },
          aiMatchScore: 92,
          matchReason: 'High match: Location nearby, relevant skills',
        },
      ];

      res.status(200).json({
        status: 'success',
        data: {
          gigs: matchedGigs,
          count: matchedGigs.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get gig details
   * GET /api/gigs/:id
   */
  public getGigDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // TODO: Fetch gig from database
      // TODO: Include owner snippet (name, rating, reviewCount)

      // Mock response for now
      const gig = {
        _id: id,
        workType: 'sales',
        title: 'Sell Health Products',
        description: 'Help sell Rock Healthy health supplements in Lagos',
        productName: 'Vitamin D Supplement',
        productPrice: 5000,
        commissionPercent: 15,
        stockAvailable: 100,
        location: { address: 'Lagos, Nigeria', lat: 6.5244, lng: 3.3792 },
        skillLevelRequired: 'beginner',
        evidenceRequired: 'none',
        owner: {
          _id: 'owner_001',
          name: 'Rock Healthy',
          rating: 4.8,
          reviewCount: 145,
        },
      };

      res.status(200).json({
        status: 'success',
        data: {
          gig,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get public gig listings with filters
   * GET /api/gigs
   * Query params: ?workType=sales&lat=&lng=&radius=&page=1&limit=20
   */
  public listGigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workType, lat, lng, radius = 50, page = 1, limit = 20 } = req.query;

      // TODO: Query gigs with filters
      // TODO: Apply pagination

      // Mock response
      const gigs = [
        {
          _id: 'gig_001',
          workType: 'sales',
          title: 'Sell Health Products',
          productName: 'Vitamin D Supplement',
          location: { address: 'Lagos, Nigeria' },
          commissionPercent: 15,
        },
      ];

      res.status(200).json({
        status: 'success',
        data: {
          gigs,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get owner's posted gigs
   * GET /api/gigs/mine
   */
  public getMyGigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      // TODO: Query gigs where ownerId === req.userId

      // Mock response
      const gigs = [
        {
          _id: 'gig_001',
          title: 'Sell Health Products',
          status: 'active',
          applicants: 5,
          views: 150,
        },
      ];

      res.status(200).json({
        status: 'success',
        data: {
          gigs,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a gig (owner only)
   * PATCH /api/gigs/:id
   */
  public updateGig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;

      // TODO: Verify ownership
      // TODO: Update gig document

      res.status(200).json({
        status: 'success',
        message: 'Gig updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete/close a gig (owner only)
   * DELETE /api/gigs/:id
   */
  public deleteGig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;

      // TODO: Verify ownership
      // TODO: Close/delete gig

      res.status(200).json({
        status: 'success',
        message: 'Gig closed successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new GigsController();
