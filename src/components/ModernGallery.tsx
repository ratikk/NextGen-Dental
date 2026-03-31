import React, { useState } from 'react';
import type { ImageMetadata } from 'astro';

interface GalleryItem {
  title: string;
  category: string;
  before: ImageMetadata | string;
  after: ImageMetadata | string;
}

interface Props {
  items: GalleryItem[];
}

const getImageSrc = (image: ImageMetadata | string): string => {
  return typeof image === 'string' ? image : image.src;
};

export default function ModernGallery({ items }: Props) {
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string; type: 'before' | 'after' } | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(items.map(item => item.category)))];
  const filteredItems = filter === 'all' ? items : items.filter(item => item.category === filter);

  const openLightbox = (src: string, title: string, type: 'before' | 'after') => {
    setSelectedImage({ src, title, type });
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto';
  };

  return (
    <>
      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-6 py-2.5 rounded-full font-semibold text-sm uppercase tracking-wider transition-all duration-300 ${
              filter === category
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item, index) => (
          <div
            key={index}
            className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100"
            data-aos="fade-up"
            data-aos-delay={index * 50}
          >
            {/* Card Header */}
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg mb-1">{item.title}</h3>
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                {item.category}
              </span>
            </div>

            {/* Before/After Images Side by Side */}
            <div className="grid grid-cols-2 gap-0">
              {/* Before Image */}
              <div
                className="relative aspect-[3/4] cursor-pointer overflow-hidden group/img"
                onClick={() => openLightbox(getImageSrc(item.before), item.title, 'before')}
              >
                <img
                  src={getImageSrc(item.before)}
                  alt={`Before ${item.title}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-3">
                  <span className="bg-white/90 text-gray-900 px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm tracking-wider">
                    BEFORE
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-900">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* After Image */}
              <div
                className="relative aspect-[3/4] cursor-pointer overflow-hidden group/img"
                onClick={() => openLightbox(getImageSrc(item.after), item.title, 'after')}
              >
                <img
                  src={getImageSrc(item.after)}
                  alt={`After ${item.title}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-3">
                  <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm tracking-wider shadow-lg">
                    AFTER
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-900">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-50 bg-white/10 hover:bg-white/20 rounded-full p-3"
            aria-label="Close lightbox"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage.src}
              alt={`${selectedImage.type} ${selectedImage.title}`}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 text-sm font-bold rounded-full uppercase tracking-wider ${
                  selectedImage.type === 'after'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    : 'bg-white text-gray-900'
                }`}>
                  {selectedImage.type}
                </span>
                <h3 className="text-white text-xl font-bold">{selectedImage.title}</h3>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
