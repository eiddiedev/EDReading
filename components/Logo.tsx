import React from 'react';

export const Logo = ({ className = "w-full h-auto" }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 240 120" 
      className={className}
      aria-label="EDReading Logo"
    >
      {/* 
        Modern Minimalist Line-Art Logo 
        - Balanced visual weight (Consistent Stroke/Font thickness)
        - Thicker Icon Lines to match Bold Text
        - Refined Tagline weight
      */}
      
      {/* Icon Group: Thicker strokes for consistency */}
      <g transform="translate(120, 15)" className="stroke-[#000000] dark:stroke-white" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* Book Outline - Increased stroke width to 3px */}
        <path d="M 0 0 L -35 -8 V 28 L 0 38" />
        <path d="M 0 0 L 35 -8 V 28 L 0 38" />
        <path d="M 0 0 V 38" />
        
        {/* Inner Page Detail Lines - Increased to 1.5px for better visibility */}
        <g strokeWidth="1.5" opacity="0.7">
          <path d="M -8 5 Q -20 2 -30 -2" />
          <path d="M -8 15 Q -20 12 -30 8" />
          <path d="M -8 25 Q -20 22 -30 18" />

          <path d="M 8 5 Q 20 2 30 -2" />
          <path d="M 8 15 Q 20 12 30 8" />
          <path d="M 8 25 Q 20 22 30 18" />
        </g>
      </g>

      {/* Main Text: EDReading */}
      <text 
        x="120" 
        y="82" 
        textAnchor="middle" 
        className="font-sans font-bold"
        style={{ fontSize: '28px', letterSpacing: '0.5px' }}
      >
        <tspan className="fill-[#0d9488] dark:fill-teal-400">ED</tspan>
        <tspan className="fill-[#000000] dark:fill-white">Reading</tspan>
      </text>

      {/* Tagline - Adjusted to Medium weight for cleaner look, matching icon's fine lines */}
      <text 
        x="120" 
        y="106" 
        textAnchor="middle" 
        className="font-sans font-medium fill-[#333333] dark:fill-slate-200"
        style={{ fontSize: '11px', letterSpacing: '0.5px' }}
      >
        Eiddie's IELTS Reading Library
      </text>
    </svg>
  );
};
