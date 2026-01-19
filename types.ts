export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9'
}

export interface GeneratedImage {
  id: string;
  url: string;
  theme: string;
  ratio: AspectRatio;
  timestamp: number;
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

export interface GenerationConfig {
  theme: ThemeStyle;
  ratio: AspectRatio;
  customPrompt?: string;
}
