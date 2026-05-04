import React from 'react';
import { X } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageViewer = ({ imageUrl, onClose }: ImageViewerProps) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image itself
      >
        <img src={imageUrl} alt="Evidence preview" className="w-full h-full object-contain" />
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default ImageViewer;
