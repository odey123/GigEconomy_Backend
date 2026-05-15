import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/config';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

// Types for AI responses
interface MatchScoreResponse {
  score: number; // 0-100
  reasoning: string;
}

interface VerifyEvidenceResponse {
  verified: boolean;
  detectedLevel: 'beginner' | 'intermediate' | 'expert' | 'unknown';
  qualitySignals: string[];
  flags: string[];
}

interface CreditScoreResponse {
  score: number; // 0-1000
  factors: {
    transactionHistory: number;
    paymentReliability: number;
    volumeConsistency: number;
    riskIndicators: number;
  };
  eligibility: {
    microCredit: boolean;
    instantPayouts: boolean;
    weeklyAdvance: boolean;
  };
}

interface AnomalyDetectionResponse {
  flagged: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
}

class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!config.geminiApiKey) {
      logger.warn('Gemini API key not configured - AI Service will be limited');
    }
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Score how well a helper fits a gig
   * P0 - Used by /gigs/matched endpoint
   */
  async matchScore(
    gigData: {
      workType: 'sales' | 'task';
      skillLevel: 'beginner' | 'intermediate' | 'expert' | 'any';
      evidenceRequired: 'none' | 'photos' | 'videos' | 'documents';
      productName?: string;
      description?: string;
    },
    helperProfile: {
      skillLevel: 'beginner' | 'intermediate' | 'expert';
      completedGigs: number;
      avgRating: number;
      totalEarnings: number;
      recentActivity: string;
      certifications?: string[];
    }
  ): Promise<MatchScoreResponse> {
    try {
      const prompt = `
You are an expert gig matching AI. Score how well a helper fits a specific gig (0-100 scale).

GIG DETAILS:
- Type: ${gigData.workType}
- Required Skill Level: ${gigData.skillLevel}
- Evidence Required: ${gigData.evidenceRequired}
${gigData.productName ? `- Product/Task: ${gigData.productName}` : ''}
${gigData.description ? `- Description: ${gigData.description}` : ''}

HELPER PROFILE:
- Skill Level: ${helperProfile.skillLevel}
- Completed Gigs: ${helperProfile.completedGigs}
- Average Rating: ${helperProfile.avgRating}/5
- Total Earnings: ${helperProfile.totalEarnings}
- Recent Activity: ${helperProfile.recentActivity}
${helperProfile.certifications ? `- Certifications: ${helperProfile.certifications.join(', ')}` : ''}

Provide a JSON response with:
{
  "score": <0-100>,
  "reasoning": "<brief explanation of the score>"
}

Consider: skill alignment, experience level, rating history, activity recency, specializations.
`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(100, Math.max(0, parseInt(parsedResponse.score))),
        reasoning: parsedResponse.reasoning || '',
      };
    } catch (error) {
      logger.error('Error in matchScore:', error);
      throw new AppError(500, 'Failed to calculate match score');
    }
  }

  /**
   * Verify work evidence (photos) against claimed skill level
   * P1 - Multimodal LLM analysis of uploaded work
   */
  async verifyEvidence(
    imageUrl: string,
    claimedSkillLevel: 'beginner' | 'intermediate' | 'expert',
    workType: string
  ): Promise<VerifyEvidenceResponse> {
    try {
      const prompt = `
You are an expert work quality evaluator. Analyze the provided work photo and assess it against the claimed skill level.

CLAIMED SKILL LEVEL: ${claimedSkillLevel}
WORK TYPE: ${workType}

Evaluate and provide a JSON response with:
{
  "verified": <boolean - does work match claimed level?>,
  "detectedLevel": "<beginner|intermediate|expert|unknown>",
  "qualitySignals": ["<signal1>", "<signal2>", ...],
  "flags": ["<flag1>", "<flag2>", ...] (empty if none)
}

Quality Signals: Professionalism, attention to detail, tool expertise, finish quality, etc.
Flags: Obvious issues like low effort, quality mismatch, suspiciously perfect, etc.
`;

      const response = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: Buffer.from(imageUrl, 'base64').toString('base64'),
          },
        },
      ]);

      const responseText = response.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      return {
        verified: parsedResponse.verified || false,
        detectedLevel: parsedResponse.detectedLevel || 'unknown',
        qualitySignals: parsedResponse.qualitySignals || [],
        flags: parsedResponse.flags || [],
      };
    } catch (error) {
      logger.error('Error in verifyEvidence:', error);
      throw new AppError(500, 'Failed to verify evidence');
    }
  }

  /**
   * Generate credit score from transaction history
   * P1 - Analyzes Squad transaction data
   */
  async creditScore(
    transactionHistory: {
      totalTransactions: number;
      totalVolume: number;
      successRate: number;
      averageTransactionValue: number;
      daysSinceFirstTransaction: number;
      chargebackCount: number;
      disputeCount: number;
      averageDaysToCompletion: number;
      recentPaymentSuccess: boolean;
    }
  ): Promise<CreditScoreResponse> {
    try {
      const prompt = `
You are a fintech credit scoring expert. Generate a credit score (0-1000) based on gig economy transaction history.

TRANSACTION DATA:
- Total Transactions: ${transactionHistory.totalTransactions}
- Total Volume: ${transactionHistory.totalVolume}
- Success Rate: ${transactionHistory.successRate}%
- Average Transaction Value: ${transactionHistory.averageTransactionValue}
- Account Age (days): ${transactionHistory.daysSinceFirstTransaction}
- Chargebacks: ${transactionHistory.chargebackCount}
- Disputes: ${transactionHistory.disputeCount}
- Avg Days to Completion: ${transactionHistory.averageDaysToCompletion}
- Recent Payment Success: ${transactionHistory.recentPaymentSuccess}

Provide a JSON response with:
{
  "score": <0-1000>,
  "factors": {
    "transactionHistory": <0-100>,
    "paymentReliability": <0-100>,
    "volumeConsistency": <0-100>,
    "riskIndicators": <0-100>
  },
  "eligibility": {
    "microCredit": <boolean>,
    "instantPayouts": <boolean>,
    "weeklyAdvance": <boolean>
  }
}

Score 0-300: Poor. Score 300-600: Fair. Score 600-800: Good. Score 800-1000: Excellent.
Eligibility thresholds: microCredit (score >= 400), instantPayouts (score >= 600), weeklyAdvance (score >= 750).
`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(1000, Math.max(0, parseInt(parsedResponse.score))),
        factors: parsedResponse.factors || {
          transactionHistory: 0,
          paymentReliability: 0,
          volumeConsistency: 0,
          riskIndicators: 0,
        },
        eligibility: parsedResponse.eligibility || {
          microCredit: false,
          instantPayouts: false,
          weeklyAdvance: false,
        },
      };
    } catch (error) {
      logger.error('Error in creditScore:', error);
      throw new AppError(500, 'Failed to calculate credit score');
    }
  }

  /**
   * Detect anomalous transaction patterns
   * P2 - Rule-based with LLM reasoning
   */
  async detectAnomaly(transactions: Array<{
    id: string;
    amount: number;
    type: string;
    timestamp: Date;
    status: string;
    relatedUserId?: string;
  }>): Promise<AnomalyDetectionResponse> {
    try {
      // Simple rule-based checks first
      const flags: string[] = [];

      // Rule: Sudden spike in volume
      const last7Days = transactions.filter(
        (t) => new Date().getTime() - t.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
      );
      const volumeRatio = last7Days.length / Math.max(1, transactions.length / 4.29);
      if (volumeRatio > 3) {
        flags.push('Unusual spike in transaction volume');
      }

      // Rule: High failure rate in recent transactions
      const recentFailures = last7Days.filter((t) => t.status === 'failed').length;
      if (recentFailures / Math.max(1, last7Days.length) > 0.3) {
        flags.push('High transaction failure rate');
      }

      // Rule: Duplicate amounts in short timeframe
      const amounts = last7Days.map((t) => t.amount);
      const duplicates = amounts.filter((val, idx) => amounts.indexOf(val) !== idx);
      if (duplicates.length > 2) {
        flags.push('Multiple duplicate transaction amounts');
      }

      // If rules detected issues, use LLM for deeper analysis
      if (flags.length > 0) {
        const transactionSummary = transactions
          .slice(-20)
          .map((t) => `${t.type}: ${t.amount} (${t.status})`)
          .join('\n');

        const prompt = `
You are a fraud detection expert. Analyze these transactions and determine if they are suspicious.

DETECTED FLAGS:
${flags.join('\n')}

RECENT TRANSACTIONS:
${transactionSummary}

Provide a JSON response with:
{
  "flagged": <boolean>,
  "reason": "<explanation if flagged>",
  "riskLevel": "<low|medium|high|critical>",
  "recommendedAction": "<action to take>"
}
`;

        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return {
            flagged: flags.length > 0,
            reason: flags.join('; '),
            riskLevel: 'medium',
            recommendedAction: 'Review account activity',
          };
        }

        const parsedResponse = JSON.parse(jsonMatch[0]);
        return {
          flagged: parsedResponse.flagged || flags.length > 0,
          reason: parsedResponse.reason,
          riskLevel: parsedResponse.riskLevel || 'low',
          recommendedAction: parsedResponse.recommendedAction || 'Monitor account',
        };
      }

      return {
        flagged: false,
        riskLevel: 'low',
        recommendedAction: 'No action needed',
      };
    } catch (error) {
      logger.error('Error in detectAnomaly:', error);
      throw new AppError('Failed to detect anomalies', 500);
    }
  }
}

export default new AIService();
export { AIService, MatchScoreResponse, VerifyEvidenceResponse, CreditScoreResponse, AnomalyDetectionResponse };
