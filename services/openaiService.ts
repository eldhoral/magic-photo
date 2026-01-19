import { AspectRatio, ThemeStyle, ProductCategory, ContentPlanItem } from "../types";

// Helper to get key at runtime and validate
const getApiKey = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === '') {
    throw new Error("OpenAI API Key is missing. Please add OPENAI_API_KEY='sk-...' to your .env file.");
  }
  return key;
};

const getOpenAISize = (ratio: AspectRatio): string => {
  switch (ratio) {
    case AspectRatio.SQUARE: return "1024x1024";
    case AspectRatio.PORTRAIT: return "1024x1792";
    case AspectRatio.LANDSCAPE: return "1792x1024";
    case AspectRatio.WIDE: return "1792x1024";
    case AspectRatio.VERTICAL: return "1080x1920"; // Approximate for Video
    default: return "1024x1024";
  }
};

const getThemePrompt = (theme: ThemeStyle, category: ProductCategory): string => {
  const subject = category === ProductCategory.GENERAL ? "product" : category.toLowerCase();
  
  switch (theme) {
    case ThemeStyle.CLEAN_STUDIO:
      return `Place the product on a clean, seamless white background with soft, professional studio lighting. Commercial e-commerce style.`;
    case ThemeStyle.COZY_LIVING:
      return `Place the product in a cozy, warm living room setting. Blurred background with a sofa or coffee table, warm lighting, lifestyle photography.`;
    case ThemeStyle.NATURE_OUTDOOR:
      return `Place the product in a natural outdoor setting with rocks, moss, or wood. Natural sunlight, depth of field, organic feel.`;
    case ThemeStyle.LUXURY_DARK:
      return `Place the product on a dark marble or slate surface. Dramatic lighting, gold or metallic accents in the background, luxury brand aesthetic.`;
    case ThemeStyle.KITCHEN_BRIGHT:
      return `Place the product on a clean kitchen counter. Bright morning light, subtle kitchen props in background (blurred), fresh and airy atmosphere.`;
    case ThemeStyle.MINIMALIST_PASTEL:
      return `Place the product on a solid pastel colored background with geometric props. Minimalist composition, soft lighting.`;
    case ThemeStyle.INDUSTRIAL:
      return `Place the product in an industrial setting with concrete textures and steel elements. Cool toned lighting, sharp details.`;
    default:
      return `Professional product photography of this ${subject}, high quality, photorealistic, 4k.`;
  }
};

// Step 1: Analyze the uploaded image using a Vision model (GPT-4o, GPT-5, etc.)
const analyzeProductWithVision = async (base64Image: string, visionModelId: string): Promise<string> => {
  console.log(`Analyzing image with ${visionModelId}...`);
  const apiKey = getApiKey();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: visionModelId,
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Describe the MAIN product in this image in extreme detail so a graphic designer could recreate it perfectly. Focus on shape, color, material, texture, packaging details, and any text on labels. Do NOT describe the background. Output the description as a single paragraph." 
              },
              { 
                type: "image_url", 
                image_url: { url: base64Image } 
              }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Vision Analysis Failed (${response.status})`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Vision Analysis Error:", error);
    throw error;
  }
};

export const generateOpenAIShot = async (
  base64Image: string,
  theme: ThemeStyle,
  ratio: AspectRatio,
  category: ProductCategory,
  modelId: string = 'dall-e-3'
): Promise<string | null> => {
  // Validate key early
  const apiKey = getApiKey();

  let prompt = "";
  let finalModel = modelId;

  // Determine Strategy:
  // 1. If model ID starts with "gpt" (e.g. gpt-4o, gpt-5-pro), we use the "Smart Transform" workflow (Vision -> DALL-E 3).
  // 2. If model ID starts with "dall-e" (e.g. dall-e-3), we use standard Text-to-Image (ignoring input image visual details, relying on category).
  
  if (modelId.toLowerCase().startsWith('gpt')) {
     // Smart Transform Workflow
     try {
       const productDescription = await analyzeProductWithVision(base64Image, modelId);
       const themeInstructions = getThemePrompt(theme, category);
       prompt = `Photorealistic product photography. The product is: ${productDescription}. ${themeInstructions}. Ensure the product looks exactly as described.`;
       
       // GPT models analyze, but DALL-E 3 generates the pixels.
       finalModel = 'dall-e-3'; 
     } catch (e: any) {
        throw new Error(`Smart Transform failed during analysis: ${e.message}`);
     }
  } else {
     // Standard Generation Workflow (Fast, but generic)
     const themeInstructions = getThemePrompt(theme, category);
     prompt = `${themeInstructions} The subject is a ${category}. High resolution, 4k.`;
  }

  const size = getOpenAISize(ratio);

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: finalModel,
        prompt: prompt,
        n: 1,
        size: size,
        response_format: "b64_json",
        quality: "hd" // Request higher quality for better product details
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const imageObj = data.data[0];
      if (imageObj.b64_json) {
        return `data:image/png;base64,${imageObj.b64_json}`;
      } else if (imageObj.url) {
        return imageObj.url;
      }
    }
    
    return null;

  } catch (error) {
    console.error("OpenAI Generation Error:", error);
    throw error;
  }
};

export const generateOpenAIVideo = async (
  base64Image: string,
  theme: ThemeStyle,
  ratio: AspectRatio,
  category: ProductCategory,
  modelId: string
): Promise<string | null> => {
  const apiKey = getApiKey();

  const themeInstructions = getThemePrompt(theme, category);
  const prompt = `Create a high quality video of the provided product image. ${themeInstructions} The video should be professional, cinematic, and keep the product as the focal point.`;
  
  // Use a video-friendly resolution (Full HD if possible, or standard)
  const size = "1920x1080"; 

  try {
    const response = await fetch('https://api.openai.com/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId, // sora-2-pro or sora-2
        prompt: prompt,
        image: base64Image, // Assuming endpoint accepts base64 similar to vision
        size: size,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI Video API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Assuming it returns a URL like DALL-E or Veo
      return data.data[0].url;
    }
    
    return null;

  } catch (error) {
    console.error("OpenAI Video Error:", error);
    throw error;
  }
};

export const generateOpenAIPlan = async (
  niche: string,
  goal: string,
  month: string
): Promise<ContentPlanItem[]> => {
  const apiKey = getApiKey();
  try {
    const prompt = `Generate a 30-day Instagram content plan for a brand in the "${niche}" niche. 
    The main goal is "${goal}". 
    For the month of: ${month}.
    
    Return a JSON object with a property "items" which is an array of 30 items.
    Each item must have:
    - day (number 1-30)
    - type (Post, Reel, or Story)
    - title (Short catchy title)
    - caption (A brief caption idea)
    - visualIdea (Description of what the image/video should look like)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o", // Always use a smart chat model for planning
        messages: [
          { role: "system", content: "You are a helpful social media strategist that outputs JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI Plan Failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    return parsed.items as ContentPlanItem[];
  } catch (error) {
    console.error("OpenAI Plan Error:", error);
    throw error;
  }
};