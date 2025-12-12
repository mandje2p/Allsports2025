
import { GoogleGenAI } from "@google/genai";
import { PosterConfig } from "../types";

// Lazy initialization singleton to prevent startup crashes
let aiInstance: GoogleGenAI | null = null;

const getAIClient = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
       console.error("API Key is missing. Please check your .env file or build configuration.");
       throw new Error("Service unavailable: API Key configuration missing.");
    }
    
    try {
        aiInstance = new GoogleGenAI({ apiKey });
    } catch (error) {
        console.error("Failed to initialize GoogleGenAI:", error);
        throw new Error("Failed to initialize AI client");
    }
  }
  return aiInstance;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generatePosterImage = async (config: PosterConfig, style: 'stadium' | 'players' | 'abstract' | 'prestige' = 'stadium'): Promise<string> => {
  // Ensure client is initialized only when needed
  let ai: GoogleGenAI;
  try {
      ai = getAIClient();
  } catch (e: any) {
      console.error(e);
      throw new Error(e.message || "AI Service unavailable");
  }

  let prompt = "";
  
  if (style === 'stadium') {
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
  } else if (style === 'players') {
      prompt = `
        Génère un fond ultra-réaliste pour une affiche de football, avec les deux top players RECONNAISSABLES de l’équipe ${config.teamA} et de l’équipe ${config.teamB} pour la saison 2025/2026.
        Composition obligatoire :
        – Les joueurs doivent être cadrés très haut dans l’image : leurs têtes, épaules et torses doivent se trouver dans le tiers supérieur de l’image.
        – Leurs corps ne doivent JAMAIS descendre dans la zone inférieure où les logos seront ajoutés.
        – L’action doit être dynamique : course, duel, dribble, tir, pression défensive.
        – Les joueurs doivent être imposants, très visibles, style cinématographique AAA.
        Positionnement :
        – Joueur star de l’équipe ${config.teamA} à gauche.
        – Joueur star de l’équipe ${config.teamB} à droite.
        – Les deux joueurs sont suffisamment hauts et centrés pour qu’aucun logo ne puisse les couvrir.
        Contrainte stricte :
        – EXACTEMENT un seul ballon visible, au sol ou légèrement devant eux, jamais plus d’un.
        Arrière-plan :
        – Stade moderne légèrement flou, lumières fortes, ambiance match-night premium.
        – Effets lumineux discrets pour renforcer l’intensité.
        Style :
        – Ultra réaliste, détaillé, proche d’une affiche FIFA 25 ou EA Sports FC.
        – Aucun texte, aucun logo.
        – Format vertical haute résolution.
        Negative prompt: text, typography, letters, words, watermark, american football, rugby, helmet, shoulder pads, distorted faces, bad anatomy, cartoon, illustration, drawing, painting, grid, multiple balls, two balls, many balls, extra balls, duplicate balls, flying balls array, full body shot, distant figures, wide shot, small figures, generic players, players in lower half.
      `;
  } else if (style === 'abstract') {
      prompt = `
        Crée un fond abstrait pour une affiche de football, inspiré des visuels sportifs modernes.
        Utilise uniquement un mélange artistique des deux couleurs principales des équipes du match (${config.teamA} vs ${config.teamB}).
        Style dynamique, énergique, avec des formes abstraites, des textures fluides, des dégradés vifs et des effets lumineux modernes.
        Le fond doit évoquer l’intensité d’un match sans montrer de joueurs ni d’éléments figuratifs.
        Aspect premium, propre, sans texte ni logos, compatible avec des overlays typographiques.
        Format vertical (9:16) pour une affiche.
        Negative prompt: players, people, ball, stadium, grass, text, typography, letters, words, watermark, realistic figures.
      `;
  } else if (style === 'prestige') {
      prompt = `
        Génère un fond extrêmement élégant et premium pour une affiche de football prestige.
        Palette uniquement noire et or, avec un rendu luxueux, sobre, moderne et haut de gamme.
        Inclure des reflets dorés subtils, des lignes minimalistes, des textures métalliques fines ou des effets de lumière sophistiqués.
        Le fond doit évoquer l’élégance, l’importance d’un match VIP ou d’une finale, sans montrer de joueurs.
        Style minimaliste, puissant, idéal pour un événement premium.
        Format vertical (9:16) haute résolution.
        Negative prompt: players, people, ball, stadium, grass, green, colors, text, typography, letters, words, watermark.
      `;
  }

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Generating with style: ${style} (Attempt ${retryCount + 1})`);
      
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

      const textPart = parts?.find(p => p.text);
      if (textPart) {
          console.warn("Gemini Refusal/Text:", textPart.text);
          throw new Error(`Gemini refused to generate image: ${textPart.text.substring(0, 50)}...`);
      }

      throw new Error("Gemini returned no image data.");

    } catch (error: any) {
      console.error("Gemini Image Generation Error:", error);

      if (error.message?.includes('429') || error.status === 429 || error.code === 429 || error.status === 'RESOURCE_EXHAUSTED') {
         if (retryCount < maxRetries) {
             const delay = (retryCount + 1) * 5000;
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
    