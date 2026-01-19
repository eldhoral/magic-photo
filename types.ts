export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9'
}

export enum ProductCategory {
  GENERAL = 'General Product',
  PERFUME = 'Perfume & Beauty',
  FOOD = 'Food & Beverage',
  FASHION = 'Fashion & Accessories',
  ELECTRONICS = 'Electronics',
  FURNITURE = 'Furniture & Home',
  TOYS = 'Toys & Games',
  FOOTWEAR = 'Footwear',
  JEWELRY = 'Jewelry & Watches'
}

export enum ThemeStyle {
  CLEAN_STUDIO = 'Clean Studio',
  COZY_LIVING = 'Cozy Living Room',
  NATURE_OUTDOOR = 'Nature & Outdoors',
  LUXURY_DARK = 'Luxury Dark',
  KITCHEN_BRIGHT = 'Bright Kitchen',
  MINIMALIST_PASTEL = 'Minimalist Pastel',
  INDUSTRIAL = 'Industrial Concrete'
}

export enum AIProvider {
  GEMINI = 'Google Gemini',
  OPENAI = 'OpenAI (ChatGPT)'
}

export interface GeneratedImage {
  id: string;
  url: string;
  theme: ThemeStyle;
  ratio: AspectRatio;
  category: ProductCategory;
  timestamp: number;
  provider: AIProvider;
}

export interface GenerationConfig {
  theme: ThemeStyle;
  ratio: AspectRatio;
  category: ProductCategory;
  customPrompt?: string;
}

export interface ContentPlanItem {
  day: number;
  type: 'Post' | 'Reel' | 'Story';
  title: string;
  caption: string;
  visualIdea: string;
}