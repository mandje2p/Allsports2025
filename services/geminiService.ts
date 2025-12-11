
import { GoogleGenAI } from "@google/genai";
import { PosterConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generatePosterImage = async (config: PosterConfig, style: 'stadium' | 'players' | 'abstract' | 'prestige' = 'stadium'): Promise<string> => {
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
  } else if (style === 'players') {
      // Style: Joueurs (Specific Request - Updated for Large Figures & Strict Single Ball)
      prompt = `
        Génère un fond ultra-réaliste pour une affiche de match de football, mettant en scène les deux joueurs les plus connus de l’équipe ${config.teamA} et de l’équipe ${config.teamB} pour la saison 2025/2026.

        Les deux joueurs doivent être représentés en action, en poses dynamiques, avec un rendu photographique très réaliste.
        IMPORTANT : les joueurs doivent être grands, imposants, bien visibles et occuper une grande partie de la hauteur de l’image, de manière à rester parfaitement lisibles même si des logos viennent se superposer par-dessus dans l’affiche finale.
        Le joueur de l’équipe A (${config.teamA}) doit être placé à gauche et celui de l’équipe B (${config.teamB}) à droite.

        CONTRAINTE CRITIQUE : il doit y avoir EXACTEMENT UN SEUL ballon de football dans toute l'image. Le ballon doit être visible au sol ou en mouvement, mais UNIQUE.
        Vérifie qu'il n'y a pas de doublons, pas de ballons dans les reflets, pas de ballons en arrière-plan. UN SEUL BALLON.

        Le fond doit inclure un stade légèrement flouté, une atmosphère intense, un éclairage cinématographique.
        Aucun texte, aucun logo.
        Format vertical haute résolution, optimisé pour une affiche de match.
        Negative prompt: text, typography, letters, words, watermark, american football, rugby, helmet, shoulder pads, distorted faces, bad anatomy, cartoon, illustration, drawing, painting, grid, multiple balls, two balls, many balls, extra balls, duplicate balls, flying balls array.
      `;
  } else if (style === 'abstract') {
      // Style: Abstrait (Specific Request)
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
      // Style: Prestige (Specific Request)
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
