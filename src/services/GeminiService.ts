import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger';

interface GigMatchRequest {
  gigId: string;
  gigTitle: string;
  workType: string;
  category: string;
  description: string;
  requiredSkills?: string[];
  location?: any;
  salary?: number;
}

interface WorkerProfile {
  workerId: string;
  skills: string[];
  experience?: string;
  location?: any;
  preferences?: string;
}

interface MatchScore {
  gigId: string;
  score: number; // 0-100
  reasoning: string;
}

class GeminiService {
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not set. AI gig matching will be disabled.');
      return;
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Score a list of gigs for a worker using Gemini AI
   * Returns gigs sorted by match score in descending order
   */
  public async scoreGigsForWorker(
    workerProfile: WorkerProfile,
    gigs: GigMatchRequest[]
  ): Promise<MatchScore[]> {
    if (!this.client) {
      logger.warn('Gemini API not configured. Returning unscored gigs.');
      return gigs.map((g) => ({
        gigId: g.gigId,
        score: 50, // Default middle score
        reasoning: 'AI matching disabled',
      }));
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = this.buildMatchingPrompt(workerProfile, gigs);

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      return this.parseMatchingResponse(responseText, gigs);
    } catch (error) {
      logger.error('Gemini gig matching error:', error);
      // Fall back to basic scoring
      return gigs.map((g) => ({
        gigId: g.gigId,
        score: 50,
        reasoning: 'AI matching error - using default score',
      }));
    }
  }

  /**
   * Score a single gig for a worker
   */
  public async scoreGigForWorker(
    workerProfile: WorkerProfile,
    gig: GigMatchRequest
  ): Promise<MatchScore> {
    const scores = await this.scoreGigsForWorker(workerProfile, [gig]);
    return scores[0];
  }

  /**
   * Build the prompt for gig matching
   */
  private buildMatchingPrompt(workerProfile: WorkerProfile, gigs: GigMatchRequest[]): string {
    const gigsJson = gigs
      .map((g) => ({
        id: g.gigId,
        title: g.gigTitle,
        type: g.workType,
        category: g.category,
        description: g.description,
        skills: g.requiredSkills || [],
      }))
      .map((g) => JSON.stringify(g))
      .join('\n');

    return `You are a gig matching expert. Score how well each gig matches the worker's profile.

WORKER PROFILE:
- Skills: ${(workerProfile.skills || []).join(', ') || 'Not specified'}
- Experience: ${workerProfile.experience || 'Not specified'}
- Location: ${workerProfile.location?.city || 'Not specified'}
- Preferences: ${workerProfile.preferences || 'Any gigs'}

GIGS TO SCORE:
${gigsJson}

For each gig, respond with a JSON object in this EXACT format:
{
  "id": "gig_id",
  "score": 0-100,
  "reasoning": "brief explanation"
}

Return ONLY valid JSON, one object per line. No markdown, no code blocks.`;
  }

  /**
   * Parse the Gemini response and extract match scores
   */
  private parseMatchingResponse(responseText: string, gigs: GigMatchRequest[]): MatchScore[] {
    const scores: MatchScore[] = [];
    const lines = responseText.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.id && typeof parsed.score === 'number' && parsed.reasoning) {
          scores.push({
            gigId: parsed.id,
            score: Math.min(100, Math.max(0, parsed.score)),
            reasoning: parsed.reasoning,
          });
        }
      } catch {
        // Skip lines that don't parse as JSON
        continue;
      }
    }

    // Fallback: assign default scores to gigs not scored
    const scoredIds = new Set(scores.map((s) => s.gigId));
    for (const gig of gigs) {
      if (!scoredIds.has(gig.gigId)) {
        scores.push({
          gigId: gig.gigId,
          score: 50,
          reasoning: 'Unable to score',
        });
      }
    }

    return scores.sort((a, b) => b.score - a.score);
  }
}

export default new GeminiService();
