import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ThemeStyle, ProductCategory } from "../types";

const apiKey = process.env.API_KEY;

// Use gemini-2.5-flash-image for general availability and speed as per guidelines
const MODEL_NAME = 'gemini-2.5-flash-image';

const ai = new GoogleGenAI({ apiKey });

const getThemePrompt = (theme: ThemeStyle, category: ProductCategory): string => {
  const subject = category === ProductCategory.GENERAL ? "product" : category.toLowerCase();

  switch (theme) {
    case ThemeStyle.CLEAN_STUDIO:
      return `Place this ${subject} on a clean, seamless white background with soft, professional studio lighting. Soft shadows, high key photography, commercial e-commerce style.`;
    case ThemeStyle.COZY_LIVING:
      return `Place this ${subject} in a cozy, warm living room setting. Blurred background with a sofa or coffee table, warm lighting, lifestyle photography, photorealistic.`;
    case ThemeStyle.NATURE_OUTDOOR:
      return `Place this ${subject} in a natural outdoor setting with rocks, moss, or wood. Natural sunlight, depth of field, organic feel, fresh atmosphere.`;
    case ThemeStyle.LUXURY_DARK:
      return `Place this ${subject} on a dark marble or slate surface. Dramatic lighting, gold or metallic accents in the background, luxury brand aesthetic, high contrast.`;
    case ThemeStyle.KITCHEN_BRIGHT:
      return `Place this ${subject} on a clean kitchen counter. Bright morning light, subtle kitchen props in background (blurred), fresh and airy atmosphere.`;
    case ThemeStyle.MINIMALIST_PASTEL:
      return `Place this ${subject} on a solid pastel colored background with geometric props. Minimalist composition, soft lighting, trendy art direction.`;
    case ThemeStyle.INDUSTRIAL:
      return `Place this ${subject} in an industrial setting with concrete textures and steel elements. Cool toned lighting, sharp details, modern urban look.`;
    default:
      return `Professional product photography of this ${subject}, high quality, photorealistic, 4k.`;
  }
};

const getCategorySpecificInstruction = (category: ProductCategory): string => {
  switch (category) {
    case ProductCategory.PERFUME:
      return "Ensure the glass bottle reflects light realistically. Emphasize elegance and transparency.";
    case ProductCategory.FOOD:
      return "Make it look appetizing and fresh. Ensure food textures are detailed and lighting enhances the appeal.";
    case ProductCategory.JEWELRY:
      return "Focus on the sparkle and material details (gold, silver, gems). Macro photography style sharpness.";
    case ProductCategory.FASHION:
      return "Highlight the fabric texture and drape. Ensure the fit and form look natural.";
    case ProductCategory.ELECTRONICS:
      return "Emphasize sleek lines and screen displays if any. Clean reflections on glossy surfaces.";
    default:
      return "Maintain the integrity of the product's original shape and texture.";
  }
};

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateProductShot = async (
  base64Image: string,
  theme: ThemeStyle,
  ratio: AspectRatio,
  category: ProductCategory
): Promise<string | null> => {
  
  const basePrompt = getThemePrompt(theme, category);
  const categoryInstruction = getCategorySpecificInstruction(category);
  
  // Extract mime type and clean base64 data correctly
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  
  // Remove the data URL prefix to get just the base64 string
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  const finalPrompt = `${basePrompt} The subject of the image is a ${category}. ${categoryInstruction} Ensure the product remains the main focal point, looks realistic, and blends naturally with the new background. High resolution.`;

  // Retry configuration
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            },
            {
              text: finalPrompt
            }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: ratio,
          }
        }
      });

      if (!response.candidates || response.candidates.length === 0) {
          throw new Error("No candidates returned from API");
      }

      const candidate = response.candidates[0];

      // Check for safety blocks
      if (candidate.finishReason && candidate.finishReason !== "STOP") {
           console.warn("Generation stopped due to:", candidate.finishReason);
           // If it's a safety block, retrying won't help, so we throw immediately
           throw new Error(`Generation blocked: ${candidate.finishReason} (Safety Filter)`);
      }

      // Extract image from response
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            return `data:image/jpeg;base64,${part.inlineData.data}`;
          }
        }
      }
      
      return null; // Successful response structure but no image found (unlikely)

    } catch (error: any) {
      attempt++;
      
      // Check if it's a 429 error or similar capacity error
      const isRateLimit = error.message?.includes('429') || error.message?.includes('Too Many Requests') || error.status === 429;
      
      if (isRateLimit && attempt < MAX_RETRIES) {
        // Exponential backoff with a generous start for free tier (4s, 8s, 16s)
        const waitTime = Math.pow(2, attempt) * 2000; 
        console.warn(`Rate limit hit. Retrying in ${waitTime}ms (Attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await delay(waitTime);
        continue;
      }
      
      console.error("Gemini Generation Error:", error);
      throw error;
    }
  }
  
  return null;
};