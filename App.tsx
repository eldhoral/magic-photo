import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { Button } from './components/Button';
import { ResultCard } from './components/ResultCard';
import { ThemeStyle, AspectRatio, GeneratedImage, ProductCategory } from './types';
import { generateProductShot } from './services/geminiService';

const App: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeStyle>(ThemeStyle.CLEAN_STUDIO);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(ProductCategory.GENERAL);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelected = (base64: string) => {
    setBaseImage(base64);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!baseImage) return;

    setIsGenerating(true);
    setError(null);

    // Reduced to 1 attempt to prevent hitting Free Tier Rate Limits (RPM)
    const attempts = [1];

    try {
      const promises = attempts.map(async (i) => {
         const url = await generateProductShot(baseImage, selectedTheme, selectedRatio, selectedCategory);
         return url ? {
            id: Date.now().toString() + i,
            url,
            theme: selectedTheme,
            ratio: selectedRatio,
            category: selectedCategory,
            timestamp: Date.now()
         } : null;
      });

      const newImages = (await Promise.all(promises)).filter((img): img is GeneratedImage => img !== null);
      
      setResults(prev => [...newImages, ...prev]);
    } catch (err) {
      setError("Failed to generate images. Please try again or check your API limit.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `marketplace-${image.theme.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearResults = () => {
    setResults([]);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 shadow-xl z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
              </svg>
            </span>
            Marketplace Magic
          </h1>
          <p className="text-slate-500 text-xs mt-1">AI Product Photography Suite</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Upload Section */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">1. Input Product</h2>
            <FileUploader onImageSelected={handleImageSelected} currentImage={baseImage} />
          </section>

          {/* Configuration Section */}
          <section>
             <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">2. Configuration</h2>
             
             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Product Category</label>
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as ProductCategory)}
                      className="block w-full pl-3 pr-10 py-2.5 text-sm border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white shadow-sm"
                    >
                      {Object.values(ProductCategory).map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Style Theme</label>
                    <div className="grid grid-cols-1 gap-2">
                        {Object.values(ThemeStyle).map((style) => (
                            <button
                                key={style}
                                onClick={() => setSelectedTheme(style)}
                                className={`px-3 py-2 text-sm rounded-md text-left transition-all border ${
                                    selectedTheme === style 
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                                }`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.values(AspectRatio).map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => setSelectedRatio(ratio)}
                                className={`px-3 py-2 text-xs font-medium rounded-md border text-center transition-all ${
                                    selectedRatio === ratio 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                    {error}
                </div>
            )}
            <Button 
                onClick={handleGenerate} 
                isLoading={isGenerating} 
                disabled={!baseImage}
                className="w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
                Generate Product Shot
            </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-0">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Gallery</h2>
                <p className="text-sm text-slate-500">{results.length} assets generated</p>
            </div>
            {results.length > 0 && (
                <Button variant="outline" onClick={handleClearResults} className="text-xs">
                    Clear Gallery
                </Button>
            )}
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar relative">
            {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-lg font-medium text-slate-600">No images generated yet</p>
                    <p className="max-w-xs text-center mt-2 text-sm">Upload a product image, select a category and style to begin transforming your product assets.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {results.map((img) => (
                        <ResultCard key={img.id} image={img} onDownload={handleDownload} />
                    ))}
                </div>
            )}
            
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[-1] opacity-30">
                 <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-200 blur-3xl mix-blend-multiply filter opacity-50"></div>
                 <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100 blur-3xl mix-blend-multiply filter opacity-50"></div>
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;