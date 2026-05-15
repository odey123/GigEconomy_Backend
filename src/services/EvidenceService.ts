import { Evidence, IEvidenceDocument } from '../models/Evidence';
import aiService from './AIService';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

interface UploadPhotoPayload {
  userId: string;
  contractId: string;
  workType: 'sales' | 'task';
  files: Express.Multer.File[];
  notes?: string;
}

class EvidenceService {
  /**
   * Upload work evidence photos and trigger AI verification
   * P1 - Called when helper submits task completion
   */
  async uploadEvidence(payload: UploadPhotoPayload): Promise<any> {
    try {
      if (!payload.files || payload.files.length === 0) {
        throw new AppError('At least one photo is required', 400);
      }

      // Validate file types (only images)
      const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
      for (const file of payload.files) {
        if (!validMimes.includes(file.mimetype)) {
          throw new AppError(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP are allowed`, 400);
        }
        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          throw new AppError(`File too large: ${file.originalname}. Max 5MB per file`, 400);
        }
      }

      logger.info(`Uploading ${payload.files.length} evidence photos for user ${payload.userId}`);

      // Convert files to storage URLs (in production, use S3 or CDN)
      const photos = payload.files.map((file) => ({
        url: this.generateStorageUrl(file),
        uploadedAt: new Date(),
        metadata: {
          size: file.size,
          mimeType: file.mimetype,
          width: undefined,
          height: undefined, // Would be extracted in production
        },
      }));

      // Create evidence record (pending AI verification)
      const evidence = new Evidence({
        userId: payload.userId,
        contractId: payload.contractId,
        photos,
        workType: payload.workType,
        notes: payload.notes,
        status: 'pending',
      });

      await evidence.save();

      // Trigger AI verification asynchronously
      this.verifyEvidenceAsync(evidence._id.toString(), payload.workType, photos[0].url).catch((err) => {
        logger.error(`Failed to verify evidence ${evidence._id}:`, err);
      });

      logger.info(`Evidence created with ID: ${evidence._id}`);

      return {
        evidenceId: evidence._id,
        status: 'pending',
        photoCount: photos.length,
        message: 'Photos uploaded. AI verification in progress...',
      };
    } catch (error) {
      logger.error('Error uploading evidence:', error);
      throw error;
    }
  }

  /**
   * Verify evidence asynchronously using AI
   * Updates evidence status and stores AI analysis
   */
  private async verifyEvidenceAsync(
    evidenceId: string,
    workType: string,
    photoUrl: string
  ): Promise<void> {
    try {
      // Call AI service to verify the first photo
      const aiResult = await aiService.verifyEvidence(photoUrl, 'intermediate', workType);

      // Update evidence with AI analysis
      const evidence = await Evidence.findByIdAndUpdate(
        evidenceId,
        {
          aiAnalysis: {
            quality: aiResult.verified ? 'high' : 'medium',
            skillLevelDetected: aiResult.detectedLevel,
            flags: aiResult.flags,
            qualitySignals: aiResult.qualitySignals,
            confidence: 85, // In production, get from AI response
          },
          status: aiResult.verified ? 'verified' : 'rejected',
          rejectionReason: aiResult.flags.length > 0 ? aiResult.flags.join('; ') : undefined,
          verifiedAt: aiResult.verified ? new Date() : undefined,
        },
        { new: true }
      );

      if (evidence) {
        logger.info(
          `Evidence ${evidenceId} verification complete. Status: ${evidence.status}`
        );
      }
    } catch (error) {
      logger.error(`AI verification failed for evidence ${evidenceId}:`, error);
      // Don't throw - just log. Evidence stays in pending state for manual review
    }
  }

  /**
   * Get evidence for a user
   */
  async getUserEvidence(userId: string, limit: number = 10, offset: number = 0): Promise<{
    evidence: IEvidenceDocument[];
    total: number;
  }> {
    try {
      const [evidence, total] = await Promise.all([
        Evidence.find({ userId }).sort({ createdAt: -1 }).limit(limit).skip(offset),
        Evidence.countDocuments({ userId }),
      ]);

      return { evidence, total };
    } catch (error) {
      logger.error('Error fetching user evidence:', error);
      throw new AppError('Failed to fetch evidence', 500);
    }
  }

  /**
   * Get evidence for a contract
   */
  async getContractEvidence(contractId: string): Promise<IEvidenceDocument | null> {
    try {
      return await Evidence.findOne({ contractId });
    } catch (error) {
      logger.error('Error fetching contract evidence:', error);
      throw new AppError('Failed to fetch evidence', 500);
    }
  }

  /**
   * Get specific evidence by ID
   */
  async getEvidenceById(evidenceId: string): Promise<IEvidenceDocument | null> {
    try {
      return await Evidence.findById(evidenceId);
    } catch (error) {
      logger.error('Error fetching evidence:', error);
      throw new AppError('Failed to fetch evidence', 500);
    }
  }

  /**
   * Update evidence verification status (admin/manual review)
   */
  async updateEvidenceStatus(
    evidenceId: string,
    status: 'verified' | 'rejected',
    rejectionReason?: string
  ): Promise<IEvidenceDocument | null> {
    try {
      const updateData: any = {
        status,
        verifiedAt: status === 'verified' ? new Date() : undefined,
      };

      if (status === 'rejected' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      return await Evidence.findByIdAndUpdate(evidenceId, updateData, { new: true });
    } catch (error) {
      logger.error('Error updating evidence status:', error);
      throw new AppError('Failed to update evidence', 500);
    }
  }

  /**
   * Get evidence stats for reputation scoring
   * Used by reputation calculation
   */
  async getEvidenceStats(userId: string): Promise<{
    totalUploads: number;
    verifiedCount: number;
    rejectedCount: number;
    averageQuality: 'low' | 'medium' | 'high' | 'excellent';
  }> {
    try {
      const evidence = await Evidence.find({ userId });

      const verifiedCount = evidence.filter((e) => e.status === 'verified').length;
      const rejectedCount = evidence.filter((e) => e.status === 'rejected').length;

      // Calculate average quality
      const qualities = evidence
        .filter((e) => e.aiAnalysis)
        .map((e) => e.aiAnalysis!.quality);

      let averageQuality: 'low' | 'medium' | 'high' | 'excellent' = 'medium';
      if (qualities.length > 0) {
        const qualityScore = {
          low: 1,
          medium: 2,
          high: 3,
          excellent: 4,
        };
        const avgScore =
          qualities.reduce((sum, q) => sum + (qualityScore[q] || 2), 0) / qualities.length;
        if (avgScore < 1.5) averageQuality = 'low';
        else if (avgScore < 2.5) averageQuality = 'medium';
        else if (avgScore < 3.5) averageQuality = 'high';
        else averageQuality = 'excellent';
      }

      return {
        totalUploads: evidence.length,
        verifiedCount,
        rejectedCount,
        averageQuality,
      };
    } catch (error) {
      logger.error('Error getting evidence stats:', error);
      throw new AppError('Failed to get evidence stats', 500);
    }
  }

  /**
   * Generate storage URL for uploaded file
   * In production: upload to S3/CDN and return CDN URL
   * For now: return local path
   */
  private generateStorageUrl(file: Express.Multer.File): string {
    // In production:
    // return `https://cdn.gigeconomy.com/evidence/${Date.now()}_${file.originalname}`;

    // For development:
    return `/uploads/evidence/${Date.now()}_${file.originalname}`;
  }
}

export default new EvidenceService();
export { EvidenceService };
