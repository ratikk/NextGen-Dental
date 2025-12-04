import React, { useState } from 'react';
import type { ImageMetadata } from 'astro';

interface Transformation {
  title: string;
  description: string;
  before: ImageMetadata;
  after: ImageMetadata;
  treatment: string;
  duration: string;
  concern: string;
}

interface Props {
  transformations: Transformation[];
}

/**
 * Individual Slider Component
 * Handles the logic for dragging the handle to reveal the 'Before' vs 'After' image.
 */
const CompareSlider = ({ before, after, alt }: { before: ImageMetadata, after: ImageMetadata, alt: string }) => {
  const [position, setPosition] = useState(50); // Start at 50%

  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-ew-resize group select-none shadow-lg border border-gray-100">
      
      {/* 1. AFTER Image (Background Layer) */}
      <img 
        src={after.src} 
        alt={`After ${alt}`} 
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm z-10 tracking-widest">
        AFTER
      </div>

      {/* 2. BEFORE Image (Top Layer - Clipped) */}
      <img 
        src={before.src} 
        alt={`Before ${alt}`} 
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} // Magic happens here
        draggable={false}
      />
      <div 
        className="absolute top-4 left-4 bg-white/90 text-gray-900 px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm z-10 tracking-widest shadow-sm"
        style={{ opacity: position > 15 ? 1 : 0, transition: 'opacity 0.2s' }} // Hide label if slider covers it
      >
        BEFORE
      </div>

      {/* 3. The Slider Handle (Visual Only) */}
      <div 
        className="absolute inset-y-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
        style={{ left: `${position}%` }}
      >
        {/* Circle Handle Button */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center text-primary-600 border border-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" className="rotate-90 origin-center" />
          </svg>
        </div>
      </div>

      {/* 4. Invisible Input Range (The actual interactive part) */}
      <input
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30 touch-none"
        aria-label={`Compare before and after images for ${alt}`}
      />
    </div>
  );
};

export default function BeforeAfterGallery({ transformations }: Props) {
  return (
    <div className="space-y-24">
      {transformations.map((item, index) => (
        // Alternating Layout for visual interest
        <div key={index} className={`flex flex-col gap-10 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
          
          {/* Image Slider Side */}
          <div className="w-full lg:w-1/2" data-aos="fade-up">
            <CompareSlider before={item.before} after={item.after} alt={item.title} />
          </div>

          {/* Text Details Side */}
          <div className="w-full lg:w-1/2 lg:px-8" data-aos="fade-up" data-aos-delay="100">
            <div className="inline-block px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
              Case Study #{index + 1}
            </div>
            
            <h3 className="text-3xl font-bold font-heading text-gray-900 mb-4 leading-tight">
              {item.title}
            </h3>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              {item.description}
            </p>

            <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Treatment</div>
                  <div className="text-gray-900 font-semibold">{item.treatment}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Duration</div>
                  <div className="text-gray-900 font-semibold">{item.duration}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Primary Concern</div>
                  <div className="text-gray-900 font-semibold">{item.concern}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
