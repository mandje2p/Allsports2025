import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

/**
 * Wait for rate limit with exponential backoff
 */
const waitForRateLimit = async (retryCount: number = 0): Promise<void> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Add exponential backoff for retries
  if (retryCount > 0) {
    const backoffTime = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
    console.log(`[Gemini] Rate limit backoff: waiting ${backoffTime}ms (retry ${retryCount})`);
    await new Promise((resolve) => setTimeout(resolve, backoffTime));
  }

  lastRequestTime = Date.now();
};

/**
 * Extract retry delay from error response
 */
const extractRetryDelay = (error: any): number | null => {
  try {
    if (error?.message) {
      const match = error.message.match(/retry_delay['":\s]+(\d+)/i);
      if (match) {
        return parseInt(match[1], 10) * 1000;
      }
    }
    if (error?.response?.headers?.['retry-after']) {
      return parseInt(error.response.headers['retry-after'], 10) * 1000;
    }
  } catch {
    // Ignore extraction errors
  }
  return null;
};

export interface GenerateImageParams {
  homeTeam: string;
  awayTeam: string;
  style: 'stadium' | 'players';
}

export interface GenerateImageResult {
  success: boolean;
  image?: string; // base64 data URL
  error?: string;
}

/**
 * Generate a match poster background using Gemini AI
 */
export const generateMatchBackground = async (
  params: GenerateImageParams,
  retryCount: number = 0
): Promise<GenerateImageResult> => {
  const maxRetries = 3;

  try {
    await waitForRateLimit(retryCount);

    const { homeTeam, awayTeam, style } = params;

    let prompt: string;
    if (style === 'stadium') {
      prompt = `Create a dramatic, cinematic football stadium background for a match poster. 
The stadium should be packed with fans, with dramatic lighting effects - spotlights, flares, and atmospheric smoke. 
The image should have an epic, movie-poster quality with deep shadows and highlights.
Style: Ultra-realistic, cinematic, 4K quality, dramatic lighting.
Teams: ${homeTeam} vs ${awayTeam} - incorporate subtle team color hints in the lighting/atmosphere.
NO text, NO logos, NO players - just the atmospheric stadium environment.
Aspect ratio: 9:16 portrait orientation for mobile poster.`;
    } else {
      prompt = `Create a dramatic sports poster background featuring two football players in an intense face-off stance.
The players should be silhouettes or artistic renderings, facing each other in a confrontational pose.
Background: Dark, dramatic with energy effects, sparks, or atmospheric elements.
Style: Modern sports poster aesthetic, high contrast, cinematic lighting.
Teams: ${homeTeam} vs ${awayTeam} - use team colors subtly in the lighting/effects.
NO specific player faces or identifying features - keep them as dramatic silhouettes.
NO text, NO logos.
Aspect ratio: 9:16 portrait orientation for mobile poster.`;
    }

    console.log(`[Gemini] Generating ${style} image for ${homeTeam} vs ${awayTeam}`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // Extract image from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
          const base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          console.log(`[Gemini] Successfully generated image for ${homeTeam} vs ${awayTeam}`);
          return {
            success: true,
            image: base64Image,
          };
        }
      }
    }

    console.warn('[Gemini] No image in response');
    return {
      success: false,
      error: 'No image generated. Please try again.',
    };
  } catch (error: any) {
    console.error('[Gemini] Error:', error.message);

    // Handle rate limiting
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      if (retryCount < maxRetries) {
        const retryDelay = extractRetryDelay(error);
        if (retryDelay) {
          console.log(`[Gemini] Rate limited. Waiting ${retryDelay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        console.log(`[Gemini] Retrying... (attempt ${retryCount + 2}/${maxRetries + 1})`);
        return generateMatchBackground(params, retryCount + 1);
      }
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment and try again.',
      };
    }

    // Handle other errors
    if (error.message?.includes('SAFETY')) {
      return {
        success: false,
        error: 'Content was blocked by safety filters. Please try again.',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to generate image. Please try again.',
    };
  }
};

export interface GenerateProgramBackgroundParams {
  matchCount: number;
}

/**
 * Generate a program poster background using Gemini AI
 */
export const generateProgramBackground = async (
  params: GenerateProgramBackgroundParams,
  retryCount: number = 0
): Promise<GenerateImageResult> => {
  const maxRetries = 3;

  try {
    await waitForRateLimit(retryCount);

    const prompt = `Create a dramatic, cinematic football match day program poster background.
The image should feature a grand stadium atmosphere with dramatic lighting - spotlights cutting through atmospheric haze.
Include subtle elements suggesting multiple matches: perhaps multiple pitch sections visible or a collage effect of stadium scenes.
Style: Ultra-premium sports broadcast quality, dark and moody with selective lighting highlights.
Color scheme: Deep blacks, rich shadows with golden/warm highlight accents.
This will be used as a background for a ${params.matchCount}-match program listing.
NO text, NO logos, NO specific players.
Aspect ratio: 9:16 portrait orientation for mobile.`;

    console.log(`[Gemini] Generating program background for ${params.matchCount} matches`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // Extract image from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
          const base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          console.log('[Gemini] Successfully generated program background');
          return {
            success: true,
            image: base64Image,
          };
        }
      }
    }

    console.warn('[Gemini] No image in response');
    return {
      success: false,
      error: 'No image generated. Please try again.',
    };
  } catch (error: any) {
    console.error('[Gemini] Error:', error.message);

    // Handle rate limiting
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      if (retryCount < maxRetries) {
        const retryDelay = extractRetryDelay(error);
        if (retryDelay) {
          console.log(`[Gemini] Rate limited. Waiting ${retryDelay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        console.log(`[Gemini] Retrying... (attempt ${retryCount + 2}/${maxRetries + 1})`);
        return generateProgramBackground(params, retryCount + 1);
      }
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment and try again.',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to generate image. Please try again.',
    };
  }
};

