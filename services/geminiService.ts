import { GoogleGenAI } from "@google/genai";
import { PosterConfig } from "../types";
import { auth } from "../config/firebase";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if user is authenticated before allowing API calls
 */
const requireAuth = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Authentication required. Please log in to generate posters.");
  }
  return user;
};

export const generatePosterImage = async (config: PosterConfig, style: 'stadium' | 'players' = 'stadium'): Promise<string> => {
  // Require authentication
  requireAuth();
  
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  let prompt = "";
  
  if (style === 'stadium') {
      // Style: Stadium Only (Night, No Players)
      prompt = `
        Generate a vertical (9:16) photorealistic image of a majestic soccer stadium at night.
        CRITICAL: The pitch must be COMPLETELY EMPTY. NO PLAYERS, NO REFEREES, NO PEOPLE on the green grass.
        Visuals:
        - Wide angle shot from pitch level looking up at the stands.
        - Pristine green grass illuminated by bright, dramatic stadium floodlights.
        - The stands are dark but filled with the atmosphere of a crowd (blurred background).
        - Cinematic lighting, lens flare, high contrast, professional sports photography.
        - The image must purely focus on the architecture and the empty field.
        Negative prompt: players, people on field, athletes, american football, text, watermark, day, match in progress.
      `;
  } else {
      // Style: Players Versus
      // Removed text instructions to ensure a clean background for the UI overlay
      prompt = `
        Ultra-realistic match poster for a soccer game.
        Left: An intense professional soccer player wearing ${config.teamA} soccer kit (jersey and shorts), photo-realistic skin, sharp details, looking heroic.
        Right: An intense professional soccer player wearing ${config.teamB} soccer kit (jersey and shorts), same ultra-realistic look, facing the opponent.
        Subtle dynamic light effects in the background, but still realistic and clean.
        High-end sports photography style, vertical 9:16 format.
        CRITICAL: SOCCER PLAYERS ONLY. NO HELMETS. NO SHOULDER PADS. IMAGE ONLY. NO TEXT.
        Negative prompt: text, typography, letters, words, watermark, american football, rugby, helmet, shoulder pads, distorted faces, bad anatomy, cartoon, illustration, drawing, painting, grid.
      `;
  }

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Generating with style: ${style} (Attempt ${retryCount + 1})`);
      
      // Using gemini-2.5-flash-image which is optimized for image generation
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: {
          parts: [
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
              aspectRatio: "9:16"
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }

      // Check for refusal/text only response
      const textPart = parts?.find(p => p.text);
      if (textPart) {
          console.warn("Gemini Refusal/Text:", textPart.text);
          throw new Error(`Gemini refused to generate image: ${textPart.text.substring(0, 50)}...`);
      }

      throw new Error("Gemini returned no image data.");

    } catch (error: any) {
      console.error("Gemini Image Generation Error:", error);

      // Handle Rate Limits (429)
      if (error.message?.includes('429') || error.status === 429 || error.code === 429 || error.status === 'RESOURCE_EXHAUSTED') {
         if (retryCount < maxRetries) {
             const delay = (retryCount + 1) * 5000; // 5s, 10s, 15s
             console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
             await wait(delay);
             retryCount++;
             continue;
         } else {
             throw new Error("Quota exceeded. Please try fewer matches or wait a minute.");
         }
      }
      
      throw error;
    }
  }
  throw new Error("Failed to generate image after retries.");
};