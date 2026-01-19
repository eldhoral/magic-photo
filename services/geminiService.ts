import { GoogleGenAI, Type } from "@google/genai";
import { AspectRatio, ThemeStyle, ProductCategory, ContentPlanItem } from "../types";

const apiKey = process.env.API_KEY;

// Note: For Veo, we re-instantiate inside the function to ensure we get the latest selected key if needed
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
  category: ProductCategory,
  modelId: string = 'gemini-2.5-flash-image'
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
        model: modelId,
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
            aspectRatio: ratio === AspectRatio.VERTICAL ? AspectRatio.PORTRAIT : ratio, // Map 9:16 to 3:4 for image gen if needed, or rely on model support
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
      
      // If no image is found in the parts, checking if we got text instead (which means model doesn't support image gen)
      if (candidate.content?.parts?.[0]?.text) {
          throw new Error(`The model '${modelId}' returned text instead of an image. It might not support image generation. Try 'gemini-2.5-flash-image'.`);
      }
      
      return null;

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

export const generateProductVideo = async (
  base64Image: string,
  theme: ThemeStyle,
  ratio: AspectRatio,
  category: ProductCategory,
  modelId: string = 'veo-3.1-fast-generate-preview'
): Promise<string | null> => {

  // 1. Veo Requirement: User must select a paid API Key
  if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
       await (window as any).aistudio.openSelectKey();
       // Race condition check: Assume successful selection after dialog closes or throw to let user try again
       if (!await (window as any).aistudio.hasSelectedApiKey()) {
          throw new Error("A paid API Key is required for Video Generation. Please select one to continue.");
       }
    }
  }

  // Always Create new instance to pick up the potentially newly selected key
  const freshAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 2. Prepare Inputs
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  // 3. Create a Motion-specific prompt based on theme
  let motionPrompt = "";
  switch(theme) {
      case ThemeStyle.CLEAN_STUDIO: motionPrompt = "Slow, cinematic camera pan around the product. Professional studio lighting."; break;
      case ThemeStyle.COZY_LIVING: motionPrompt = "Gentle handheld camera movement, soft light flickering, warm atmosphere."; break;
      case ThemeStyle.NATURE_OUTDOOR: motionPrompt = "Leaves swaying gently in the background, sun flare, organic movement."; break;
      case ThemeStyle.LUXURY_DARK: motionPrompt = "Dramatic lighting reveal, slow glint of light on the product edges."; break;
      case ThemeStyle.KITCHEN_BRIGHT: motionPrompt = "Bright and airy, soft morning light movement."; break;
      case ThemeStyle.INDUSTRIAL: motionPrompt = "Steady cam tracking shot, sharp focus, industrial ambiance."; break;
      default: motionPrompt = "Cinematic product showcase, slow motion, high quality."; break;
  }

  const fullPrompt = `A high quality, photorealistic video of a ${category.toLowerCase()}. ${motionPrompt} The product should remain consistent.`;

  // Veo supports 16:9 or 9:16 primarily for best results. Mapping 1:1 to 9:16 for social media.
  let veoRatio = '16:9';
  if (ratio === AspectRatio.PORTRAIT || ratio === AspectRatio.SQUARE || ratio === AspectRatio.VERTICAL) veoRatio = '9:16';
  else veoRatio = '16:9';

  console.log("Starting Veo Generation:", { fullPrompt, veoRatio, modelId });

  try {
      let operation = await freshAi.models.generateVideos({
        model: modelId,
        prompt: fullPrompt,
        image: {
            imageBytes: cleanBase64,
            mimeType: mimeType
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: veoRatio
        }
      });

      // 4. Polling Loop
      console.log("Polling for video...");
      while (!operation.done) {
        await delay(5000); // Poll every 5 seconds
        operation = await freshAi.operations.getVideosOperation({ operation: operation });
      }

      // 5. Fetch Result
      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
          const videoUri = operation.response.generatedVideos[0].video.uri;
          // Append Key for download
          const fetchUrl = `${videoUri}&key=${process.env.API_KEY}`;
          
          // Fetch blob to make it playable in browser without CORS/Auth issues sometimes
          const res = await fetch(fetchUrl);
          const blob = await res.blob();
          return URL.createObjectURL(blob);
      }

      throw new Error("Video generation completed but no video URI was returned.");

  } catch (error: any) {
      console.error("Veo Error:", error);
      if (error.message.includes("404")) {
         throw new Error("Veo model not found. Ensure your API Key project has access to Vertex AI/Gemini API.");
      }
      throw error;
  }
};

export const generateGeminiPlan = async (
  niche: string,
  goal: string,
  month: string
): Promise<ContentPlanItem[]> => {
  try {
    const prompt = `Generate a 30-day Instagram content plan for a brand in the "${niche}" niche. 
    The main goal is "${goal}". 
    For the month of: ${month}.
    
    Return a structured JSON array with 30 items (one for each day).
    Each item must have:
    - day (number 1-30)
    - type (Post, Reel, or Story)
    - title (Short catchy title)
    - caption (A brief caption idea)
    - visualIdea (Description of what the image/video should look like)
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using Flash for fast text generation
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.NUMBER },
              type: { type: Type.STRING }, // Simplified for schema, we cast later
              title: { type: Type.STRING },
              caption: { type: Type.STRING },
              visualIdea: { type: Type.STRING }
            },
            required: ["day", "type", "title", "caption", "visualIdea"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as ContentPlanItem[];
  } catch (error) {
    console.error("Gemini Plan Error:", error);
    throw error;
  }
};