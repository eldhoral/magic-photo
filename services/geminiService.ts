import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ThemeStyle } from "../types";

const apiKey = process.env.API_KEY;

// Use gemini-2.5-flash-image for general availability and speed as per guidelines
// unless High Quality is strictly requested. For this demo, 2.5 is excellent for style transfer.
const MODEL_NAME = 'gemini-2.5-flash-image';

const ai = new GoogleGenAI({ apiKey });

const getThemePrompt = (theme: ThemeStyle): string => {
  switch (theme) {
    case ThemeStyle.CLEAN_STUDIO:
      return "Place this product on a clean, seamless white background with soft, professional studio lighting. Soft shadows, high key photography, commercial e-commerce style.";
    case ThemeStyle.COZY_LIVING:
      return "Place this product in a cozy, warm living room setting. Blurred background with a sofa or coffee table, warm lighting, lifestyle photography, photorealistic.";
    case ThemeStyle.NATURE_OUTDOOR:
      return "Place this product in a natural outdoor setting with rocks, moss, or wood. Natural sunlight, depth of field, organic feel, fresh atmosphere.";
    case ThemeStyle.LUXURY_DARK:
      return "Place this product on a dark marble or slate surface. Dramatic lighting, gold or metallic accents in the background, luxury brand aesthetic, high contrast.";
    case ThemeStyle.KITCHEN_BRIGHT:
      return "Place this product on a clean kitchen counter. Bright morning light, subtle kitchen props in background (blurred), fresh and airy atmosphere.";
    case ThemeStyle.MINIMALIST_PASTEL:
      return "Place this product on a solid pastel colored background with geometric props. Minimalist composition, soft lighting, trendy art direction.";
    case ThemeStyle.INDUSTRIAL:
      return "Place this product in an industrial setting with concrete textures and steel elements. Cool toned lighting, sharp details, modern urban look.";
    default:
      return "Professional product photography of this object, high quality, photorealistic, 4k.";
  }
};

export const generateProductShot = async (
  base64Image: string,
  theme: ThemeStyle,
  ratio: AspectRatio
): Promise<string | null> => {
  try {
    const prompt = getThemePrompt(theme);
    
    // Ensure base64 string is clean
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Standardizing input type handling or assume input is jpeg/png compatible
              data: cleanBase64
            }
          },
          {
            text: `${prompt} Ensure the product remains the main focal point and looks realistic. High resolution.`
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: ratio,
          // count: 1 // Default is 1
        }
      }
    });

    // Extract image from response
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
