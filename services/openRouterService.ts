import { AspectRatio, ThemeStyle, ProductCategory, ContentPlanItem } from "../types";

const getApiKey = () => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.trim() === '') {
    throw new Error("OpenRouter API Key is missing. Please add OPENROUTER_API_KEY to your .env file.");
  }
  return key;
};

const getThemePrompt = (theme: ThemeStyle, category: ProductCategory): string => {
  const subject = category === ProductCategory.GENERAL ? "product" : category.toLowerCase();
  
  switch (theme) {
    case ThemeStyle.CLEAN_STUDIO:
      return `Professional studio photography of a ${subject}, clean seamless white background, soft lighting, commercial e-commerce style, 4k.`;
    case ThemeStyle.COZY_LIVING:
      return `Lifestyle photography of a ${subject} in a cozy living room, warm lighting, bokeh background, photorealistic.`;
    case ThemeStyle.NATURE_OUTDOOR:
      return `Product photography of a ${subject} in nature, outdoor setting, sunlight, organic textures, cinematic.`;
    case ThemeStyle.LUXURY_DARK:
      return `Luxury photography of a ${subject}, dark moody background, dramatic lighting, premium look.`;
    case ThemeStyle.KITCHEN_BRIGHT:
      return `Bright airy photography of a ${subject} on a kitchen counter, morning light, fresh atmosphere.`;
    case ThemeStyle.MINIMALIST_PASTEL:
      return `Minimalist art direction, ${subject} on a solid pastel background, hard shadows, trendy style.`;
    case ThemeStyle.INDUSTRIAL:
      return `Industrial style photography of a ${subject}, concrete background, cool lighting, sharp details.`;
    default:
      return `Professional product photography of a ${subject}, high quality, photorealistic.`;
  }
};

const getOpenRouterSize = (ratio: AspectRatio): string => {
  // Many OpenRouter image models default to 1024x1024 or similar, 
  // but we pass standard OpenAI sizes as best effort
  switch (ratio) {
    case AspectRatio.SQUARE: return "1024x1024";
    case AspectRatio.PORTRAIT: return "1024x1792"; 
    case AspectRatio.LANDSCAPE: return "1792x1024";
    case AspectRatio.WIDE: return "1024x1024"; // Fallback as wide isn't always standard
    case AspectRatio.VERTICAL: return "1024x1792";
    default: return "1024x1024";
  }
};

export const generateOpenRouterShot = async (
  base64Image: string,
  theme: ThemeStyle,
  ratio: AspectRatio,
  category: ProductCategory,
  modelId: string
): Promise<string | null> => {
  const apiKey = getApiKey();
  const themePrompt = getThemePrompt(theme, category);
  const size = getOpenRouterSize(ratio);

  // NOTE: OpenRouter image generation endpoints vary. 
  // We use the standard OpenAI compatible 'images/generations' endpoint.
  // Most image models on OpenRouter (like Flux, Stable Diffusion wrappers) 
  // do not support "Image-to-Image" via this specific endpoint easily 
  // without using a multimodal chat endpoint or specific API extensions.
  // 
  // For the default model 'sourceful/riverflow-v2-fast-preview', we will try
  // to generation based on text description derived from the context.
  
  const prompt = `${themePrompt} High resolution, highly detailed.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin, // OpenRouter requirement
        'X-Title': 'Marketplace Magic' // OpenRouter requirement
      },
      body: JSON.stringify({
        model: modelId,
        prompt: prompt,
        n: 1,
        size: size
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenRouter Image Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // OpenRouter usually returns a URL
      return data.data[0].url;
    }
    
    return null;
  } catch (error) {
    console.error("OpenRouter Shot Error:", error);
    throw error;
  }
};

export const generateOpenRouterVideo = async (
  base64Image: string,
  theme: ThemeStyle,
  ratio: AspectRatio,
  category: ProductCategory,
  modelId: string
): Promise<string | null> => {
  const apiKey = getApiKey();
  
  // As of now, OpenRouter video generation standardization is limited.
  // We will attempt to call it via the same generations endpoint or chat endpoint 
  // depending on how the model is exposed, but generally it follows OpenAI structure.
  
  if (!modelId) {
      throw new Error("No video model selected for OpenRouter.");
  }

  const themePrompt = getThemePrompt(theme, category);
  
  try {
    // Attempting via video generations endpoint (Sora-like interface if supported)
    // Or standard generation endpoint. 
    // Since there is no default, this relies on user knowing the specific OpenRouter video model ID.
    const response = await fetch('https://openrouter.ai/api/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Marketplace Magic'
      },
      body: JSON.stringify({
        model: modelId,
        prompt: `Cinematic video of a ${category}. ${themePrompt}`,
        image: base64Image, // Some models might accept this
      })
    });

    if (!response.ok) {
       // Fallback: If video endpoint fails, many OpenRouter models use standard chat/completions 
       // but return a video URL. However, without a specific target, we return error.
       const errorData = await response.json().catch(() => ({}));
       throw new Error(errorData.error?.message || `OpenRouter Video Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
        return data.data[0].url;
    }

    return null;
  } catch (error) {
    console.error("OpenRouter Video Error:", error);
    throw error;
  }
}

export const generateOpenRouterPlan = async (
  niche: string,
  goal: string,
  month: string,
  modelId: string
): Promise<ContentPlanItem[]> => {
  const apiKey = getApiKey();

  const prompt = `Generate a 30-day Instagram content plan for a brand in the "${niche}" niche. 
    The main goal is "${goal}". 
    For the month of: ${month}.
    
    Return a valid JSON object (not markdown, just raw JSON) with a property "items" which is an array of 30 items.
    Each item must have:
    - day (number 1-30)
    - type (Post, Reel, or Story)
    - title (Short catchy title)
    - caption (A brief caption idea)
    - visualIdea (Description of what the image/video should look like)`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Marketplace Magic'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: "You are a social media strategist. You output strictly JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" } // Best effort, not all OpenRouter models support this
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenRouter Plan Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Clean up potential markdown code blocks if the model adds them
    const cleanJson = content.replace(/```json\n?|\n?```/g, '');
    
    const parsed = JSON.parse(cleanJson);
    return parsed.items as ContentPlanItem[];
  } catch (error) {
    console.error("OpenRouter Plan Error:", error);
    throw error;
  }
};