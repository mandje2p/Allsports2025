import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import {
  generateMatchBackground,
  generateProgramBackground,
  GenerateImageParams,
  GenerateProgramBackgroundParams,
} from '../services/geminiService';

const router = Router();

// All routes in this file require authentication
router.use(authMiddleware);

/**
 * POST /api/gemini/generate-match-background
 * Generate a match poster background using Gemini AI
 *
 * Body: { homeTeam: string, awayTeam: string, style: 'stadium' | 'players' | 'abstract' | 'prestige' }
 */
router.post(
  '/generate-match-background',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { homeTeam, awayTeam, style } = req.body as GenerateImageParams;

      // Validate request body
      if (!homeTeam || !awayTeam) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: homeTeam and awayTeam',
        });
        return;
      }

      if (style && !['stadium', 'players', 'abstract', 'prestige'].includes(style)) {
        res.status(400).json({
          success: false,
          error: 'Invalid style. Must be "stadium", "players", "abstract", or "prestige"',
        });
        return;
      }

      console.log(`[API] User ${req.user?.uid} requesting match background: ${homeTeam} vs ${awayTeam} (${style})`);

      const result = await generateMatchBackground({
        homeTeam,
        awayTeam,
        style: style || 'stadium',
      });

      if (result.success) {
        res.json({
          success: true,
          image: result.image,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error('[API] Error generating match background:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate image. Please try again.',
      });
    }
  }
);

/**
 * POST /api/gemini/generate-program-background
 * Generate a program poster background using Gemini AI
 *
 * Body: { matchCount: number }
 */
router.post(
  '/generate-program-background',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { matchCount } = req.body as GenerateProgramBackgroundParams;

      // Validate request body
      if (!matchCount || typeof matchCount !== 'number' || matchCount < 1) {
        res.status(400).json({
          success: false,
          error: 'Invalid matchCount. Must be a positive number.',
        });
        return;
      }

      console.log(`[API] User ${req.user?.uid} requesting program background for ${matchCount} matches`);

      const result = await generateProgramBackground({ matchCount });

      if (result.success) {
        res.json({
          success: true,
          image: result.image,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error('[API] Error generating program background:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate image. Please try again.',
      });
    }
  }
);

export default router;

