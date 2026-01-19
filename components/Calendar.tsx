import React from 'react';
import { ContentPlanItem } from '../types';

interface CalendarProps {
  items: ContentPlanItem[];
  isLoading: boolean;
}

export const Calendar: React.FC<CalendarProps> = ({ items, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-indigo-500">
        <svg className="animate-spin h-10 w-10 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-medium text-slate-700">Generating your monthly strategy...</p>
        <p className="text-sm text-slate-500 mt-2">This may take a few seconds.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-slate-600">No Plan Generated</p>
        <p className="text-sm">Enter your niche and goal in the sidebar to start.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10">
        {items.sort((a,b) => a.day - b.day).map((item) => (
          <div key={item.day} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow flex flex-col h-full">
             <div className="flex justify-between items-start mb-3">
                 <span className="text-2xl font-bold text-slate-200">Day {item.day}</span>
                 <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                     item.type === 'Reel' ? 'bg-pink-100 text-pink-700' :
                     item.type === 'Story' ? 'bg-amber-100 text-amber-700' :
                     'bg-blue-100 text-blue-700'
                 }`}>
                     {item.type}
                 </span>
             </div>
             
             <h3 className="font-semibold text-slate-800 mb-2 leading-tight">{item.title}</h3>
             
             <div className="flex-1">
                 <p className="text-xs text-slate-500 mb-3 line-clamp-3 italic">"{item.caption}"</p>
                 <div className="bg-slate-50 rounded p-2 border border-slate-100">
                     <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Visual Idea</p>
                     <p className="text-xs text-slate-600 leading-relaxed">{item.visualIdea}</p>
                 </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
