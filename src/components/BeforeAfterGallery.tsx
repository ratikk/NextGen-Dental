import React from 'react';
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

export default function BeforeAfterGallery({ transformations }: Props) {
  return (
    <div className="grid grid-cols-1 gap-16">
      {transformations.map((item, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">{item.title}</h3>
          <p className="text-gray-600 mb-6">{item.description}</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="relative aspect-[4/3] mb-2">
                <img 
                  src={item.before.src} 
                  alt={`Before - ${item.title}`}
                  width={item.before.width}
                  height={item.before.height}
                  className="w-full h-full object-cover rounded-lg shadow-sm"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-600">
                  Before
                </div>
              </div>
            </div>
            
            <div>
              <div className="relative aspect-[4/3] mb-2">
                <img 
                  src={item.after.src} 
                  alt={`After - ${item.title}`}
                  width={item.after.width}
                  height={item.after.height}
                  className="w-full h-full object-cover rounded-lg shadow-sm"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-600">
                  After
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Treatment:</span>
              <span>{item.treatment}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Duration:</span>
              <span>{item.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Concern:</span>
              <span>{item.concern}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}