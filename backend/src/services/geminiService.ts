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
  style: 'stadium' | 'players' | 'abstract' | 'prestige';
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
      // Style: Stadium Only (Night, No Players)
      prompt = `Generate a vertical (9:16) photorealistic image of a majestic soccer stadium at night.
CRITICAL: The pitch must be COMPLETELY EMPTY. NO PLAYERS, NO REFEREES, NO PEOPLE on the green grass.
Visuals:
- Wide angle shot from pitch level looking up at the stands.
- Pristine green grass illuminated by bright, dramatic stadium floodlights.
- The stands are dark but filled with the atmosphere of a crowd (blurred background).
- Cinematic lighting, lens flare, high contrast, professional sports photography.
- The image must purely focus on the architecture and the empty field.
Negative prompt: players, people on field, athletes, american football, text, watermark, day, match in progress.`;
    } else if (style === 'players') {
      // Style: Joueurs (Specific Request - FIFA 25 Cover Style - Real Players - Top Third Framing)
      prompt = `Génère un fond ultra-réaliste pour une affiche de football, avec les deux top players RECONNAISSABLES de l'équipe ${homeTeam} et de l'équipe ${awayTeam} pour la saison 2025/2026.

Composition obligatoire :
– Les joueurs doivent être cadrés très haut dans l'image : leurs têtes, épaules et torses doivent se trouver dans le tiers supérieur de l'image.
– Leurs corps ne doivent JAMAIS descendre dans la zone inférieure où les logos seront ajoutés.
– L'action doit être dynamique : course, duel, dribble, tir, pression défensive.
– Les joueurs doivent être imposants, très visibles, style cinématographique AAA.

Positionnement :
– Joueur star de l'équipe ${homeTeam} à gauche.
– Joueur star de l'équipe ${awayTeam} à droite.
– Les deux joueurs sont suffisamment hauts et centrés pour qu'aucun logo ne puisse les couvrir.

Contrainte stricte :
– EXACTEMENT un seul ballon visible, au sol ou légèrement devant eux, jamais plus d'un.

Arrière-plan :
– Stade moderne légèrement flou, lumières fortes, ambiance match-night premium.
– Effets lumineux discrets pour renforcer l'intensité.

Style :
– Ultra réaliste, détaillé, proche d'une affiche FIFA 25 ou EA Sports FC.
– Aucun texte, aucun logo.
– Format vertical haute résolution.
Negative prompt: text, typography, letters, words, watermark, american football, rugby, helmet, shoulder pads, distorted faces, bad anatomy, cartoon, illustration, drawing, painting, grid, multiple balls, two balls, many balls, extra balls, duplicate balls, flying balls array, full body shot, distant figures, wide shot, small figures, generic players, players in lower half.`;
    } else if (style === 'abstract') {
      // Style: Abstrait (Specific Request)
      prompt = `Crée un fond abstrait pour une affiche de football, inspiré des visuels sportifs modernes.
Utilise uniquement un mélange artistique des deux couleurs principales des équipes du match (${homeTeam} vs ${awayTeam}).
Style dynamique, énergique, avec des formes abstraites, des textures fluides, des dégradés vifs et des effets lumineux modernes.
Le fond doit évoquer l'intensité d'un match sans montrer de joueurs ni d'éléments figuratifs.
Aspect premium, propre, sans texte ni logos, compatible avec des overlays typographiques.
Format vertical (9:16) pour une affiche.
Negative prompt: players, people, ball, stadium, grass, text, typography, letters, words, watermark, realistic figures.`;
    } else if (style === 'prestige') {
      // Style: Prestige (Specific Request)
      prompt = `Génère un fond extrêmement élégant et premium pour une affiche de football prestige.
Palette uniquement noire et or, avec un rendu luxueux, sobre, moderne et haut de gamme.
Inclure des reflets dorés subtils, des lignes minimalistes, des textures métalliques fines ou des effets de lumière sophistiqués.
Le fond doit évoquer l'élégance, l'importance d'un match VIP ou d'une finale, sans montrer de joueurs.
Style minimaliste, puissant, idéal pour un événement premium.
Format vertical (9:16) haute résolution.
Negative prompt: players, people, ball, stadium, grass, green, colors, text, typography, letters, words, watermark.`;
    } else {
      // Fallback to stadium
      prompt = `Create a dramatic, cinematic football stadium background for a match poster. 
The stadium should be packed with fans, with dramatic lighting effects - spotlights, flares, and atmospheric smoke. 
The image should have an epic, movie-poster quality with deep shadows and highlights.
Style: Ultra-realistic, cinematic, 4K quality, dramatic lighting.
Teams: ${homeTeam} vs ${awayTeam} - incorporate subtle team color hints in the lighting/atmosphere.
NO text, NO logos, NO players - just the atmospheric stadium environment.
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

