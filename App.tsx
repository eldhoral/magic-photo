import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { Button } from './components/Button';
import { ResultCard } from './components/ResultCard';
import { Calendar } from './components/Calendar';
import { ThemeStyle, AspectRatio, GeneratedImage, ProductCategory, AIProvider, ContentPlanItem, MediaType } from './types';
import { generateProductShot, generateProductVideo, generateGeminiPlan } from './services/geminiService';
import { generateOpenAIShot, generateOpenAIPlan, generateOpenAIVideo } from './services/openaiService';

type ViewMode = 'studio' | 'planner';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('studio');

  // --- Studio State ---
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeStyle>(ThemeStyle.CLEAN_STUDIO);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(ProductCategory.GENERAL);
  const [customModelId, setCustomModelId] = useState<string>('gemini-2.5-flash-image');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.IMAGE);

  // --- Planner State ---
  const [plannerNiche, setPlannerNiche] = useState('');
  const [plannerGoal, setPlannerGoal] = useState('');
  const [plannerMonth, setPlannerMonth] = useState('Current Month');
  const [planItems, setPlanItems] = useState<ContentPlanItem[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  // --- Shared State ---
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(AIProvider.GEMINI);

  // Update default model when provider OR media type changes
  useEffect(() => {
    if (selectedProvider === AIProvider.GEMINI) {
      if (mediaType === MediaType.VIDEO) {
          setCustomModelId('veo-3.1-fast-generate-preview');
      } else {
          setCustomModelId('gemini-2.5-flash-image');
      }
    } else {
      if (mediaType === MediaType.VIDEO) {
          setCustomModelId('sora-2-pro');
      } else {
          setCustomModelId('gpt-4o'); 
      }
    }
    setIsCustomModel(false);
  }, [selectedProvider, mediaType]);

  const handleImageSelected = (base64: string) => {
    setBaseImage(base64);
    setError(null);
  };

  const handleGenerateImage = async () => {
    if (!baseImage) return;

    setIsGenerating(true);
    setError(null);
    const attempts = [1];

    try {
      const promises = attempts.map(async (i) => {
         let url: string | null = null;
         let type = MediaType.IMAGE;

         if (mediaType === MediaType.VIDEO) {
             if (selectedProvider === AIProvider.GEMINI) {
                 url = await generateProductVideo(baseImage, selectedTheme, selectedRatio, selectedCategory, customModelId);
             } else {
                 url = await generateOpenAIVideo(baseImage, selectedTheme, selectedRatio, selectedCategory, customModelId);
             }
             type = MediaType.VIDEO;
         } else {
             if (selectedProvider === AIProvider.GEMINI) {
                 url = await generateProductShot(baseImage, selectedTheme, selectedRatio, selectedCategory, customModelId);
             } else {
                 url = await generateOpenAIShot(baseImage, selectedTheme, selectedRatio, selectedCategory, customModelId);
             }
         }

         return url ? {
            id: Date.now().toString() + i,
            url,
            theme: selectedTheme,
            ratio: selectedRatio,
            category: selectedCategory,
            timestamp: Date.now(),
            provider: selectedProvider,
            type
         } : null;
      });

      const newAssets = (await Promise.all(promises)).filter((img): img is GeneratedImage => img !== null);
      setResults(prev => [...newAssets, ...prev]);
    } catch (err: any) {
      console.error(err);
      let errorMessage = "Failed to generate assets.";
      if (err.message) errorMessage = err.message;
      if (errorMessage.includes("API Key")) errorMessage = "Billing Check: " + errorMessage;
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!plannerNiche || !plannerGoal) return;
    
    setIsPlanning(true);
    setError(null);
    
    try {
        let items: ContentPlanItem[] = [];
        if (selectedProvider === AIProvider.GEMINI) {
            items = await generateGeminiPlan(plannerNiche, plannerGoal, plannerMonth);
        } else {
            items = await generateOpenAIPlan(plannerNiche, plannerGoal, plannerMonth);
        }
        setPlanItems(items);
    } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to generate plan");
    } finally {
        setIsPlanning(false);
    }
  }

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    const ext = image.type === MediaType.VIDEO ? 'mp4' : 'jpg';
    link.download = `marketplace-${image.theme.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.${ext}`;
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
          
          {/* Main Nav Tabs */}
          <div className="flex mt-6 bg-slate-100 p-1 rounded-lg">
             <button 
                onClick={() => setView('studio')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${view === 'studio' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Product Studio
             </button>
             <button 
                onClick={() => setView('planner')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${view === 'planner' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Content Planner
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* SHARED: Provider Selector */}
          <section>
             <label className="block text-sm font-medium text-slate-700 mb-2">
                AI Provider
             </label>
             <select 
               value={selectedProvider}
               onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
               className="block w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white text-slate-900 shadow-sm"
             >
               {Object.values(AIProvider).map((provider) => (
                 <option key={provider} value={provider}>{provider}</option>
               ))}
             </select>
          </section>

          {view === 'studio' ? (
              /* STUDIO CONTROLS */
              <>
                <section>
                    <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">1. Input Product</h2>
                    <FileUploader onImageSelected={handleImageSelected} currentImage={baseImage} />
                </section>
                <section>
                     <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">2. Configuration</h2>
                     <div className="space-y-6">
                        
                        {/* Format Selection (Image vs Video) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Output Format</label>
                            <div className="flex bg-slate-100 p-1 rounded-md">
                                <button
                                    onClick={() => setMediaType(MediaType.IMAGE)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${mediaType === MediaType.IMAGE ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Still Image
                                </button>
                                <button
                                    onClick={() => setMediaType(MediaType.VIDEO)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${mediaType === MediaType.VIDEO ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Video Ad
                                </button>
                            </div>
                        </div>

                        {/* Model Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                AI Model 
                            </label>
                            {!isCustomModel ? (
                                <select 
                                    value={customModelId}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setIsCustomModel(true);
                                            setCustomModelId('');
                                        } else {
                                            setCustomModelId(e.target.value);
                                        }
                                    }}
                                    className="block w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white text-slate-900 shadow-sm"
                                >
                                    {selectedProvider === AIProvider.GEMINI ? (
                                        mediaType === MediaType.VIDEO ? (
                                            <>
                                                <option value="veo-3.1-fast-generate-preview">veo-3.1-fast-generate-preview</option>
                                                <option value="veo-3.1-generate-preview">veo-3.1-generate-preview</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="gemini-2.5-flash-image">gemini-2.5-flash-image</option>
                                                <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
                                            </>
                                        )
                                    ) : (
                                        mediaType === MediaType.VIDEO ? (
                                            <>
                                                <option value="sora-2-pro">sora-2-pro</option>
                                                <option value="sora-2">sora-2</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="gpt-4o">gpt-4o (Vision + DALL-E)</option>
                                                <option value="dall-e-3">dall-e-3 (Text Only)</option>
                                            </>
                                        )
                                    )}
                                    <option value="custom">Other / Custom...</option>
                                </select>
                            ) : (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={customModelId}
                                        onChange={(e) => setCustomModelId(e.target.value)}
                                        className="block w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white text-slate-900 shadow-sm"
                                    />
                                    <button onClick={() => setIsCustomModel(false)} className="px-2 text-xs text-slate-500">Cancel</button>
                                </div>
                            )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                          <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value as ProductCategory)}
                              className="block w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white text-slate-900"
                          >
                              {Object.values(ProductCategory).map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {mediaType === MediaType.VIDEO ? 'Visual Style & Motion' : 'Style Theme'}
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.values(ThemeStyle).map((style) => (
                                    <button
                                        key={style}
                                        onClick={() => setSelectedTheme(style)}
                                        className={`px-3 py-2 text-sm rounded-md text-left border ${selectedTheme === style ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200'}`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Ratio</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.values(AspectRatio).map((ratio) => {
                                    // Veo mainly supports 16:9 or 9:16 (via 720p/1080p settings)
                                    // We will disable 1:1 and 4:3 for video to avoid confusion or resize internally
                                    const isVideoUnsupported = mediaType === MediaType.VIDEO && (ratio === AspectRatio.SQUARE || ratio === AspectRatio.LANDSCAPE);
                                    
                                    return (
                                        <button
                                            key={ratio}
                                            disabled={isVideoUnsupported}
                                            onClick={() => setSelectedRatio(ratio)}
                                            className={`px-3 py-2 text-xs border rounded-md transition-all 
                                                ${selectedRatio === ratio ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}
                                                ${isVideoUnsupported ? 'opacity-30 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            {ratio}
                                        </button>
                                    )
                                })}
                            </div>
                            {mediaType === MediaType.VIDEO && (
                                <p className="text-[10px] text-amber-600 mt-1">Video generation optimized for 16:9 (Landscape) or 3:4 (Portrait).</p>
                            )}
                        </div>
                     </div>
                </section>
              </>
          ) : (
              /* PLANNER CONTROLS */
              <>
                 <section>
                    <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Strategy</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Brand Niche</label>
                            <input 
                                type="text"
                                value={plannerNiche}
                                onChange={(e) => setPlannerNiche(e.target.value)}
                                placeholder="e.g. Handmade Soap, Tech Reviews"
                                className="block w-full px-3 py-2 text-sm border border-slate-300 focus:ring-indigo-500 focus:outline-none rounded-md bg-white text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Primary Goal</label>
                            <input 
                                type="text"
                                value={plannerGoal}
                                onChange={(e) => setPlannerGoal(e.target.value)}
                                placeholder="e.g. Increase Sales, Brand Awareness"
                                className="block w-full px-3 py-2 text-sm border border-slate-300 focus:ring-indigo-500 focus:outline-none rounded-md bg-white text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Target Month</label>
                            <select
                                value={plannerMonth}
                                onChange={(e) => setPlannerMonth(e.target.value)}
                                className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-indigo-500"
                            >
                                <option value="Current Month">Current Month</option>
                                <option value="Next Month">Next Month</option>
                                <option value="January">January</option>
                                <option value="February">February</option>
                                <option value="March">March</option>
                                <option value="April">April</option>
                                <option value="May">May</option>
                                <option value="June">June</option>
                                <option value="July">July</option>
                                <option value="August">August</option>
                                <option value="September">September</option>
                                <option value="October">October</option>
                                <option value="November">November</option>
                                <option value="December">December</option>
                            </select>
                        </div>
                    </div>
                 </section>
                 
                 <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100">
                    <p className="text-xs text-indigo-700">
                        <b>Note:</b> Generating a plan uses 
                        {selectedProvider === AIProvider.GEMINI ? ' Gemini 2.5 Flash' : ' GPT-4o'} 
                        to create a tailored 30-day strategy.
                    </p>
                 </div>
              </>
          )}

        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                    {error}
                </div>
            )}
            
            {view === 'studio' ? (
                <Button 
                    onClick={handleGenerateImage} 
                    isLoading={isGenerating} 
                    disabled={!baseImage}
                    className="w-full shadow-lg"
                >
                    {mediaType === MediaType.VIDEO ? 'Generate Video Ad' : 'Generate Product Shot'}
                </Button>
            ) : (
                <Button 
                    onClick={handleGeneratePlan} 
                    isLoading={isPlanning} 
                    disabled={!plannerNiche || !plannerGoal}
                    className="w-full shadow-lg"
                >
                    Generate Monthly Plan
                </Button>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-0">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">
                    {view === 'studio' ? 'Gallery' : 'Strategy Calendar'}
                </h2>
                <p className="text-sm text-slate-500">
                    {view === 'studio' 
                        ? `${results.length} assets generated` 
                        : planItems.length > 0 ? '30-day plan ready' : 'Configure strategy to begin'
                    }
                </p>
            </div>
            {view === 'studio' && results.length > 0 && (
                <Button variant="outline" onClick={handleClearResults} className="text-xs">
                    Clear Gallery
                </Button>
            )}
        </header>

        <main className="flex-1 overflow-hidden relative">
            {view === 'studio' ? (
                <div className="h-full overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
                     {results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-lg font-medium text-slate-600">No assets generated yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                            {results.map((img) => (
                                <ResultCard key={img.id} image={img} onDownload={handleDownload} />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <Calendar items={planItems} isLoading={isPlanning} />
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