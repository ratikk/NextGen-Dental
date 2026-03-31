import React from 'react';
import ReactCompareImage from 'react-compare-image';

export default function BeforeAfterSlider({ beforeImage, afterImage, beforeLabel = "Before", afterLabel = "After" }) {
  return (
    <div className="w-full">
      <ReactCompareImage
        leftImage={beforeImage}
        rightImage={afterImage}
        leftImageLabel={beforeLabel}
        rightImageLabel={afterLabel}
        sliderLineWidth={2}
        sliderLineColor="#6B46C1"
        handleSize={40}
        hover={true}
      />
    </div>
  );
}