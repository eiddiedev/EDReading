/**
 * Logo 组件 (Logo)
 * 作用：显示应用的品牌标识，通常用于导航栏或页脚。
 * 定义：包含图标和应用名称的组合组件。
 * 逻辑：
 * 1. 渲染 BookOpen 图标和 "EDReading" 文本。
 * 2. 作为一个 Link 组件，点击可导航至首页。
 * 3. 支持通过 className 自定义样式。
 */
import Link from "next/link";
import { BookOpen } from "lucide-react";

export const Logo = ({ className = "w-full h-auto" }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 240 64" 
      className={className}
      aria-label="EDReading Logo"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" /> {/* Teal-400 */}
          <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan-500 */}
        </linearGradient>
      </defs>

      {/* 
        Horizontal Layout: Icon Left, Text Right
      */}
      
      {/* Icon Group: Stylized 'E' Open Book - Positioned Left */}
      <g transform="translate(15, 0)" fill="none" stroke="url(#logoGradient)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
         {/* 
            The Frame Path:
            Starts at Top-Right, curves to Spine Top, down Spine, curves to Bottom-Right.
            Creates the 'C' shape of the E.
         */}
         <path d="M 48 14 C 38 10, 28 10, 20 18 C 14 26, 14 38, 20 46 C 28 54, 38 54, 48 50" />
         
         {/* 
            The Middle Path:
            The center bar of the 'E', floating slightly to create the open page effect.
         */}
         <path d="M 18 32 C 28 34, 36 30, 44 32" />
      </g>

      {/* Main Text: EDReading - Positioned Right */}
      <text 
        x="72" 
        y="43" 
        textAnchor="start" 
        className="font-sans font-bold"
        style={{ fontSize: '30px', letterSpacing: '-0.5px' }}
      >
        <tspan className="fill-slate-800 dark:fill-slate-100">ED</tspan>
        <tspan className="fill-slate-700 dark:fill-slate-200" fontWeight="400">Reading</tspan>
      </text>
    </svg>
  );
};
