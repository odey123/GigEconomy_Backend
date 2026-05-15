import { Request, Response, NextFunction } from 'express';
import { Job } from '../models/Job';
import { User } from '../models/User';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';
import GeminiService from '../services/GeminiService';

export class GigsController {
  /**
   * Create a new gig (owner posts)
   * POST /api/gigs
   * Body: {
   *   workType: "sales" | "task",
   *   category: "cleaning" | "delivery" | ... (required),
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
        category,
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

      if (!category) {
        throw new ValidationError('Category is required');
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
        category,
        title,
        description,
        location,
        skillLevelRequired: skillLevelRequired || 'any',
        evidenceRequired: evidenceRequired || 'none',
        clientId: req.userId,
        status: 'open',
      };

      // Add work-type specific fields
      if (workType === 'sales') {
        gigData.productName = productName;
        gigData.productPrice = productPrice;
        gigData.commissionPercent = commissionPercent;
        gigData.stockAvailable = stockAvailable;
        gigData.starterStockValue = starterStockValue;
        gigData.budget = productPrice || 0;
        gigData.dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days default
      } else if (workType === 'task') {
        gigData.fixedPrice = fixedPrice;
        gigData.deadline = deadline;
        gigData.budget = fixedPrice || 0;
        gigData.dueDate = deadline;
      }

      // Save to database
      const gig = await Job.create(gigData);

      res.status(201).json({
        status: 'success',
        message: 'Gig created successfully',
        data: {
          _id: gig._id,
          workType: gig.workType,
          title: gig.title,
          status: gig.status,
          createdAt: gig.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get matched gigs for helper (AI-ranked by location, skill, work type)
   * GET /api/gigs/matched
   * Query params: ?workType=sales&radius=50&limit=10&page=1
   */
  public getMatchedGigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { workType, limit = '10', page = '1' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;

      // Get worker's profile
      const worker = await User.findById(req.userId).select('skills experience location preferences').lean();
      if (!worker) {
        throw new NotFoundError('Worker profile not found');
      }

      // Build query for gigs
      const query: any = { status: 'open' };
      if (workType && ['sales', 'task'].includes(workType as string)) {
        query.workType = workType;
      }

      // Fetch gigs for matching
      const gigs = await Job.find(query)
        .select(
          '_id workType category title description productName productPrice commissionPercent fixedPrice location skillLevelRequired evidenceRequired'
        )
        .sort({ createdAt: -1 })
        .limit(limitNum * 2) // Get more to account for Gemini filtering
        .lean();

      if (gigs.length === 0) {
        res.status(200).json({
          status: 'success',
          data: {
            gigs: [],
            count: 0,
            pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 },
          },
        });
        return;
      }

      // Score gigs with Gemini
      const gigMatchRequests = gigs.map((g: any) => ({
        gigId: g._id.toString(),
        gigTitle: g.title,
        workType: g.workType,
        category: g.category,
        description: g.description,
        requiredSkills: g.skillLevelRequired ? [g.skillLevelRequired] : [],
        location: g.location,
        salary: g.productPrice || g.fixedPrice,
      }));

      const workerProfile = {
        workerId: req.userId,
        skills: (worker as any).skills || [],
        experience: (worker as any).experience,
        location: (worker as any).location,
        preferences: (worker as any).preferences,
      };

      const matchScores = await GeminiService.scoreGigsForWorker(workerProfile, gigMatchRequests);

      // Create a map of scores for easy lookup
      const scoreMap = new Map(matchScores.map((s) => [s.gigId, s]));

      // Build response with scores
      const matchedGigs = gigs
        .map((g: any) => {
          const score = scoreMap.get(g._id.toString());
          return {
            _id: g._id,
            title: g.title,
            description: g.description,
            workType: g.workType,
            category: g.category,
            productName: g.productName,
            productPrice: g.productPrice,
            commissionPercent: g.commissionPercent,
            fixedPrice: g.fixedPrice,
            location: g.location,
            skillLevelRequired: g.skillLevelRequired,
            aiMatchScore: score?.score || 50,
            matchReason: score?.reasoning || 'Unable to determine match',
          };
        })
        .sort((a, b) => b.aiMatchScore - a.aiMatchScore)
        .slice(0, limitNum);

      res.status(200).json({
        status: 'success',
        data: {
          gigs: matchedGigs,
          count: matchedGigs.length,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: gigs.length,
            pages: Math.ceil(gigs.length / limitNum),
          },
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

      const gig = await Job.findById(id);
      if (!gig) {
        throw new NotFoundError('Gig');
      }

      res.status(200).json({
        status: 'success',
        data: {
          _id: gig._id,
          title: gig.title,
          description: gig.description,
          workType: gig.workType,
          status: gig.status,
          clientId: gig.clientId,
          location: gig.location,
          skillLevelRequired: gig.skillLevelRequired,
          evidenceRequired: gig.evidenceRequired,
          productName: (gig as any).productName,
          productPrice: (gig as any).productPrice,
          commissionPercent: (gig as any).commissionPercent,
          stockAvailable: (gig as any).stockAvailable,
          fixedPrice: (gig as any).fixedPrice,
          deadline: (gig as any).deadline,
          createdAt: gig.createdAt,
          updatedAt: gig.updatedAt,
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
      const { workType, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const skip = (pageNum - 1) * limitNum;

      const query: any = { status: { $in: ['open', 'active'] } };
      if (workType) {
        query.workType = workType;
      }

      const [gigs, total] = await Promise.all([
        Job.find(query)
          .select('_id title description workType status clientId productName productPrice commissionPercent fixedPrice location')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Job.countDocuments(query),
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          gigs: gigs.map((g: any) => ({
            _id: g._id,
            title: g.title,
            description: g.description,
            workType: g.workType,
            status: g.status,
            clientId: g.clientId,
            productName: g.productName,
            productPrice: g.productPrice,
            commissionPercent: g.commissionPercent,
            fixedPrice: g.fixedPrice,
            location: g.location,
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
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

      const gigs = await Job.find({ clientId: req.userId })
        .select('_id title description workType status clientId createdAt')
        .sort({ createdAt: -1 });

      res.status(200).json({
        status: 'success',
        data: {
          gigs: gigs.map((g) => ({
            _id: g._id,
            title: g.title,
            description: g.description,
            workType: g.workType,
            status: g.status,
            createdAt: g.createdAt,
          })),
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
      const updates = req.body;

      // Verify ownership
      const gig = await Job.findById(id);
      if (!gig) {
        throw new NotFoundError('Gig');
      }

      if (gig.clientId !== req.userId) {
        throw new UnauthorizedError('You can only update your own gigs');
      }

      // Update the gig document
      const updatedGig = await Job.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        status: 'success',
        message: 'Gig updated successfully',
        data: updatedGig,
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

      // Verify ownership
      const gig = await Job.findById(id);
      if (!gig) {
        throw new NotFoundError('Gig');
      }

      if (gig.clientId !== req.userId) {
        throw new UnauthorizedError('You can only delete your own gigs');
      }

      // Delete the gig document
      await Job.findByIdAndDelete(id);

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
