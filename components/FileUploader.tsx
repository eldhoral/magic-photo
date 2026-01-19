import React, { useCallback } from 'react';

interface FileUploaderProps {
  onImageSelected: (base64: string) => void;
  currentImage: string | null;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onImageSelected, currentImage }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large. Please select an image under 5MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onImageSelected(base64String);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelected]);

  return (
    <div className="w-full">
      <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group h-64">
        {currentImage ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-md">
            <img 
              src={currentImage} 
              alt="Product Preview" 
              className="max-h-full max-w-full object-contain shadow-sm"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                <p className="text-white opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 px-3 py-1 rounded text-sm font-medium">Change Image</p>
            </div>
          </div>
        ) : (
          <div className="text-center p-4">
             <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            <p className="mt-2 text-sm text-slate-600 font-medium">Click to upload product image</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG up to 5MB</p>
          </div>
        )}
        <input 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
