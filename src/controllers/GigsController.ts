import { Request, Response, NextFunction } from 'express';
import { ValidationError, UnauthorizedError } from '../utils/errors';

export class GigsController {
  public createGig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');

      const {
        workType, title, description, location, skillLevelRequired, evidenceRequired,
        productName, productPrice, commissionPercent, stockAvailable, starterStockValue,
        fixedPrice, deadline,
      } = req.body;

      if (!workType || !['sales', 'task'].includes(workType)) {
        throw new ValidationError('Valid workType (sales or task) is required');
      }
      if (!title || !description || !location) {
        throw new ValidationError('Title, description, and location are required');
      }
      if (workType === 'sales' && (!productName || !productPrice || !commissionPercent)) {
        throw new ValidationError('Sales gig requires productName, productPrice, and commissionPercent');
      }
      if (workType === 'task' && (!fixedPrice || !deadline)) {
        throw new ValidationError('Task gig requires fixedPrice and deadline');
      }

      const gigData: any = {
        workType, title, description, location,
        skillLevelRequired: skillLevelRequired || 'any',
        evidenceRequired: evidenceRequired || 'none',
        ownerId: req.userId,
        status: 'active',
      };
      if (workType === 'sales') {
        Object.assign(gigData, { productName, productPrice, commissionPercent, stockAvailable, starterStockValue });
      } else {
        Object.assign(gigData, { fixedPrice, deadline });
      }

      const gig = { _id: `gig_${Date.now()}`, ...gigData, createdAt: new Date() };

      res.status(201).json({
        status: 'success',
        message: 'Gig created successfully',
        data: { gigId: gig._id, status: gig.status },
      });
    } catch (error) { next(error); }
  };

  public getMatchedGigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      // TODO: AI-ranked matching
      const matchedGigs = [
        {
          _id: 'gig_001', workType: 'sales', title: 'Sell Health Products',
          description: 'Help sell supplements', productName: 'Vitamin D', productPrice: 5000,
          commissionPercent: 15, location: { address: 'Lagos, Nigeria', lat: 6.5244, lng: 3.3792 },
          aiMatchScore: 92, matchReason: 'Location nearby, relevant skills',
        },
      ];
      res.status(200).json({ status: 'success', data: { gigs: matchedGigs, count: matchedGigs.length } });
    } catch (error) { next(error); }
  };

  public getGigDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      // TODO: fetch from DB
      const gig = {
        _id: id, workType: 'sales', title: 'Sell Health Products',
        description: 'Help sell supplements in Lagos', productName: 'Vitamin D',
        productPrice: 5000, commissionPercent: 15, stockAvailable: 100,
        location: { address: 'Lagos, Nigeria' }, skillLevelRequired: 'beginner',
        evidenceRequired: 'none', owner: { _id: 'owner_001', name: 'Rock Healthy', rating: 4.8, reviewCount: 145 },
      };
      res.status(200).json({ status: 'success', data: { gig } });
    } catch (error) { next(error); }
  };

  public listGigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page = 1, limit = 20 } = req.query;
      // TODO: query with filters
      const gigs = [
        { _id: 'gig_001', workType: 'sales', title: 'Sell Health Products', productName: 'Vitamin D', location: { address: 'Lagos' }, commissionPercent: 15 },
      ];
      res.status(200).json({
        status: 'success',
        data: { gigs, pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total: 1 } },
      });
    } catch (error) { next(error); }
  };

  public getMyGigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      // TODO: query by ownerId
      const gigs = [{ _id: 'gig_001', title: 'Sell Health Products', status: 'active', applicants: 5, views: 150 }];
      res.status(200).json({ status: 'success', data: { gigs } });
    } catch (error) { next(error); }
  };

  public updateGig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      // TODO: verify ownership + update
      res.status(200).json({ status: 'success', message: 'Gig updated successfully' });
    } catch (error) { next(error); }
  };

  public deleteGig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new UnauthorizedError('User not authenticated');
      // TODO: verify ownership + close
      res.status(200).json({ status: 'success', message: 'Gig closed successfully' });
    } catch (error) { next(error); }
  };
}

export default new GigsController();
