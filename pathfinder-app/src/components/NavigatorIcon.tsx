import React from "react";
import { Compass } from "lucide-react";

interface NavigatorIconProps {
  isActive: boolean;
}

export default function NavigatorIcon({ isActive }: NavigatorIconProps) {
  return (
    <div 
      id="navigator-icon-container" 
      className="relative w-12 h-12 flex items-center justify-center rounded-full bg-[#15181C] border border-[#C5A059]/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),0_0_15px_rgba(197,160,89,0.05)] overflow-hidden transition-all duration-300 group-hover:border-[#C5A059] cursor-pointer"
    >
      {/* Flight Bezel marking rings */}
      <div className="absolute inset-1 rounded-full border border-dashed border-slate-700/60 pointer-events-none" />
      
      {/* Compass Needle Element */}
      <div 
        id="compass-spinning-needle"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-1000 ${
          isActive ? "animate-[spin_40s_linear_infinite]" : "hover:rotate-45"
        }`}
      >
        <Compass className={`w-5 h-5 transition-colors ${isActive ? "text-[#FFA51E]" : "text-slate-400 group-hover:text-[#FFA51E]"}`} />
      </div>

      {/* Compass LED indicator top position */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FFA51E] shadow-[0_0_8px_#FFA51E]" />

      {/* Glass glossy reflection layer */}
      <div 
        id="navigator-icon-reflection" 
        className="absolute inset-[1px] bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12] rounded-full pointer-events-none" 
      />
    </div>
  );
}
