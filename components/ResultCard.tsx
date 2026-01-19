import React from 'react';
import { GeneratedImage } from '../types';

interface ResultCardProps {
  image: GeneratedImage;
  onDownload: (image: GeneratedImage) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ image, onDownload }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200 group relative">
        <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
            <img 
                src={image.url} 
                alt={`Generated ${image.theme}`} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <button 
                    onClick={() => onDownload(image)}
                    className="w-full bg-white text-slate-900 py-2 px-4 rounded font-medium text-sm hover:bg-slate-100 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                >
                    Download
                </button>
            </div>
        </div>
        <div className="p-3">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{image.ratio}</p>
            <p className="text-sm font-medium text-slate-900 truncate">{image.theme}</p>
        </div>
    </div>
  );
};
