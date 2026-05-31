import React, { useState } from "react";
import { Calculator, Wine, Beer, GlassWater, Layers, Info } from "lucide-react";
import { motion } from "motion/react";
import { getItemQuantity } from "../lib/calculatorUtils";

export default function CalculatorTab({ 
  guests, 
  setGuests, 
  hours, 
  setHours,
  quoteItems = [],
  setQuoteItems
}: { 
  guests: number; 
  setGuests: (v: number) => void; 
  hours: number; 
  setHours: (v: number) => void; 
  quoteItems?: any[];
  setQuoteItems?: (items: any[]) => void;
  key?: any;
}) {
  const [wineRatio, setWineRatio] = useState(25);
  const [beerRatio, setBeerRatio] = useState(25);
  const [liquorRatio, setLiquorRatio] = useState(50);

  const calculateDrinks = () => {
    const totalDrinks = guests * (hours + 1); 
    const wines = Math.ceil((totalDrinks * (wineRatio / 100)) / 5); 
    const beers = Math.ceil(totalDrinks * (beerRatio / 100)); 
    const liquors750 = Math.ceil((totalDrinks * (liquorRatio / 100)) / 17); 
    const liquors1L = Math.ceil((totalDrinks * (liquorRatio / 100)) / 22); 
    const liquors175 = Math.ceil((totalDrinks * (liquorRatio / 100)) / 40); 

    return { totalDrinks, wines, beers, liquors750, liquors1L, liquors175 };
  };

  const { totalDrinks, wines, beers, liquors750, liquors1L, liquors175 } = calculateDrinks();

  // Helper to determine product counts in actual quote cart
  const getItemQuantityLocal = (item: any) => {
    return getItemQuantity(item, quoteItems, guests, hours);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      {/* Split Panel Grid directly mimicking ChatTab's structural layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Configuration Controls (65% width) */}
        <div className="lg:col-span-8 flex flex-col h-[82vh] bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-150">
          
          {/* Header mimicking ChatTab Consultation Header */}
          <div className="bg-[#151619] text-white px-6 py-4 flex justify-between items-center border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#FFA51E] rounded-full animate-pulse" />
              <div>
                <h2 className="font-serif text-sm font-semibold tracking-wide flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-[#FFA51E]" /> Precision Beverage Formula Calibrator
                </h2>
                <p className="text-[10px] text-gray-400 italic hidden md:block">Configure parameters and beverage percentage splits dynamically</p>
                <p className="text-[10px] text-gray-400 md:hidden">Guest Count: {guests}</p>
              </div>
            </div>
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">Config mode</span>
          </div>

          {/* Configuration Scroll Container */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-left">
            
            {/* Guest Count Input Box */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-150/70 shadow-xs relative group transition-colors hover:border-gray-250">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-xs uppercase font-mono tracking-widest text-[#7E6E5A] group-hover:text-gray-900 transition-colors font-bold block">Estimated Guest Count</span>
                  <span className="text-[10px] text-gray-400 font-light block">Number of anticipated participants</span>
                </div>
                <span className="font-mono font-bold text-sm text-[#E06D20] bg-white px-3.5 py-1 rounded-xl border border-gray-200 select-none shadow-xs">
                  {guests} GUESTS
                </span>
              </div>
              <input 
                type="range" min="10" max="500" step="10" value={guests} 
                onChange={(e) => setGuests(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-ew-resize outline-none accent-[#C5A059]"
              />
              <div className="flex justify-between text-[9px] text-[#9A8D7C] font-mono mt-2 uppercase font-medium">
                <span>Min: 10</span>
                <span>Max: 500</span>
              </div>
            </div>

            {/* Event Duration Input Box */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-150/70 shadow-xs relative group transition-colors hover:border-gray-250">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-xs uppercase font-mono tracking-widest text-[#7E6E5A] group-hover:text-gray-900 transition-colors font-bold block">Event duration</span>
                  <span className="text-[10px] text-gray-400 font-light block">Length of active bar hours</span>
                </div>
                <span className="font-mono font-bold text-sm text-[#E06D20] bg-white px-3.5 py-1 rounded-xl border border-gray-200 select-none shadow-xs">
                  {hours} HOURS
                </span>
              </div>
              <input 
                type="range" min="1" max="12" step="1" value={hours} 
                onChange={(e) => setHours(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-ew-resize outline-none accent-[#C5A059]"
              />
              <div className="flex justify-between text-[9px] text-[#9A8D7C] font-mono mt-2 uppercase font-medium">
                <span>Min: 1 Hour</span>
                <span>Max: 12 Hours</span>
              </div>
            </div>

            {/* Percentage Splits controls */}
            <div className="p-6 bg-[#FAF9F6] rounded-2xl border border-gray-200 shadow-xs space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-200/60 pb-3">
                <Layers className="w-4.5 h-4.5 text-[#C5A059]" />
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#3D3220]">Alcohol Ratio Split Calibration</h3>
                  <p className="text-[10px] text-gray-400">Total split must match your desired preference. Standard formula is 25% Wine, 25% Beer, 50% Liquor.</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Wine split slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-[#2F2A24] font-mono">
                    <span className="flex items-center gap-1.5 font-bold"><Wine className="w-3.5 h-3.5 text-[#E06D20]" /> Wine Ratio Selection</span>
                    <span className="bg-[#E06D20]/10 text-[#E06D20] px-2 py-0.5 rounded-lg font-bold">{wineRatio}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={wineRatio} 
                    onChange={(e) => setWineRatio(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-ew-resize outline-none accent-[#E06D20]"
                  />
                </div>

                {/* Beer split slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-[#2F2A24] font-mono">
                    <span className="flex items-center gap-1.5 font-bold"><Beer className="w-3.5 h-3.5 text-[#E06D20]" /> Beer & Seltzer Ratio</span>
                    <span className="bg-[#E06D20]/10 text-[#E06D20] px-2 py-0.5 rounded-lg font-bold">{beerRatio}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={beerRatio} 
                    onChange={(e) => setBeerRatio(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-ew-resize outline-none accent-[#E06D20]"
                  />
                </div>

                {/* Liquor split slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-[#2F2A24] font-mono">
                    <span className="flex items-center gap-1.5 font-bold"><GlassWater className="w-3.5 h-3.5 text-[#E06D20]" /> Liquor Ratio Selection</span>
                    <span className="bg-[#E06D20]/10 text-[#E06D20] px-2 py-0.5 rounded-lg font-bold">{liquorRatio}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={liquorRatio} 
                    onChange={(e) => setLiquorRatio(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-ew-resize outline-none accent-[#E06D20]"
                  />
                </div>
              </div>

              {/* Status validation warning bar */}
              {wineRatio + beerRatio + liquorRatio !== 100 && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-[11px] text-[#B5945B] flex items-center gap-2 font-mono">
                  <Info className="w-4 h-4 shrink-0 text-[#FFA51E]" />
                  <span>Interactive Warning: Your current ratio sum is <strong className="font-bold">{wineRatio + beerRatio + liquorRatio}%</strong>. Standard calibration yields best accuracy at exactly 100%.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Estimates Results Panel (35% width) */}
        <div className="lg:col-span-4 flex flex-col h-[82vh] bg-[#151619] text-white rounded-3xl shadow-lg border border-gray-800 overflow-hidden">
          
          {/* Header matching ChatTab sidebar right aspect */}
          <div className="bg-[#1e1f24] text-white px-6 py-4 border-b border-gray-800 shrink-0 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wine className="text-[#FFA51E] w-4.5 h-4.5 animate-pulse" />
              <div>
                <h3 className="font-serif text-sm font-semibold tracking-wide">Live Volume Output</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-tight">Derived from Splits & formulas</p>
              </div>
            </div>
            <span className="text-[8.5px] font-mono tracking-widest text-[#FFA51E] bg-[#FFA51E]/10 px-2 py-0.5 rounded border border-[#FFA51E]/30 font-bold uppercase shrink-0">Estimator Mode</span>
          </div>

          {/* Results Scroll Container */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-left">
            <div className="space-y-1">
              <span className="text-gray-400 uppercase tracking-widest text-[9px] font-mono block">Estimated Quantity Required</span>
              <div className="text-4xl md:text-5xl font-serif text-[#FFA51E] font-bold mt-1">
                {totalDrinks} <span className="text-base text-gray-400 font-sans uppercase tracking-widest ml-1 font-semibold">Drinks</span>
              </div>
            </div>

            <div className="w-full h-[1px] bg-slate-800" />

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2.5">
                  <Wine className="w-4 h-4 text-[#FFA51E]" />
                  <span className="text-xs font-mono font-semibold text-gray-200">Wine (750ml bottles)</span>
                </div>
                <span className="text-base font-serif text-[#FFA51E] font-bold">{wines}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2.5">
                  <Beer className="w-4 h-4 text-[#FFA51E]" />
                  <span className="text-xs font-mono font-semibold text-gray-200">Beer (cans/bottles)</span>
                </div>
                <span className="text-base font-serif text-[#FFA51E] font-bold">{beers}</span>
              </div>

              <div className="pt-2">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-2 font-mono">Liquor Comparison (1.5oz pours)</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-gray-400 font-mono">750ml</p>
                    <p className="text-base font-serif text-[#FFA51E] font-bold mt-0.5">{liquors750}</p>
                    <p className="text-[8px] text-gray-500 font-mono uppercase">Btls</p>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-gray-400 font-mono">1 Liter</p>
                    <p className="text-base font-serif text-[#FFA51E] font-bold mt-0.5">{liquors1L}</p>
                    <p className="text-[8px] text-gray-500 font-mono uppercase">Btls</p>
                  </div>
                  <div className="p-2 bg-[#FFA51E]/5 rounded-xl border border-[#FFA51E]/30 relative">
                    <p className="text-[10px] text-gray-300 font-mono">1.75L</p>
                    <p className="text-base font-serif text-[#FFA51E] font-bold mt-0.5">{liquors175}</p>
                    <p className="text-[8px] text-gray-400 font-mono uppercase">Handles</p>
                  </div>
                </div>
              </div>

              {/* Bespoke Custom Navigator Items inside Quote Items */}
              {quoteItems && quoteItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 text-left bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-[#FFA51E] uppercase font-bold tracking-wider block mb-2 font-mono">Bespoke Curation Cart</span>
                  <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
                    {quoteItems.map((item: any) => (
                      <div key={item.itemCode} className="flex justify-between items-center text-[11px] text-gray-300">
                        <span className="truncate max-w-[160px] text-gray-200 font-light" title={item.name}>{item.name}</span>
                        <span className="font-semibold text-white bg-[#E06D20] px-1.5 py-0.5 rounded text-[9px] shrink-0 font-mono">{getItemQuantityLocal(item)} Btls</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[9px] text-gray-500 italic leading-tight text-left pt-2">*Standard calculations assume 1.5oz liquor, 5oz wine pours. Drink responsibly.</p>
          </div>
        </div>
      </div>

      {/* Reference Guide Section with same rich visual layout */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-md text-left mt-8">
        <h3 className="text-[#E06D20] font-medium flex items-center gap-2 mb-6 border-b border-gray-200 pb-3 text-lg font-serif">
          <Wine className="w-5 h-5" /> Standard Pour & Bottle Reference Sheet
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wine & Sparkling Card */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150/70 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="font-sans font-bold tracking-wider text-[11px] text-[#E06D20] mb-3 uppercase flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <Wine className="w-3.5 h-3.5" /> Wine & Champagne
              </h4>
              <ul className="space-y-3 text-xs sm:text-[13px] text-gray-600 font-sans">
                <li className="flex justify-between border-b border-gray-200/40 pb-1.5">
                  <span className="font-medium text-gray-800">Wine Standard Pour</span>
                  <span className="font-serif text-[#E06D20] font-semibold">5oz</span>
                </li>
                <li className="flex justify-between border-b border-gray-200/40 pb-1.5">
                  <span className="font-medium text-gray-800">750ml Wine Bottle</span>
                  <span className="font-serif text-[#E06D20] font-semibold">5 glasses</span>
                </li>
                <li className="flex justify-between border-b border-gray-200/40 pb-1.5">
                  <span className="font-medium text-gray-800">Sparkling Standard Pour</span>
                  <span className="font-serif text-[#E06D20] font-semibold">4oz</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium text-gray-800">750ml Champagne Bottle</span>
                  <span className="font-serif text-[#E06D20] font-semibold">6 glasses</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Liquor Card */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150/70 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="font-sans font-bold tracking-wider text-[11px] text-[#E06D20] mb-3 uppercase flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <GlassWater className="w-3.5 h-3.5" /> Liquor Pours
              </h4>
              <ul className="space-y-3 text-xs sm:text-[13px] text-gray-600 font-sans">
                <li className="flex justify-between border-b border-gray-200/40 pb-1.5">
                  <span className="font-medium text-gray-800">Liquor Standard Pour</span>
                  <span className="font-serif text-[#E06D20] font-semibold">1.5oz / shot</span>
                </li>
                <li className="flex justify-between border-b border-gray-200/40 pb-1.5">
                  <span className="font-medium text-gray-800">750ml Bottle</span>
                  <span className="font-serif text-[#E06D20] font-semibold">17 Shots</span>
                </li>
                <li className="flex justify-between border-b border-gray-200/40 pb-1.5">
                  <span className="font-medium text-gray-800">1 Liter Bottle</span>
                  <span className="font-serif text-[#E06D20] font-semibold">22 Shots</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium text-gray-800">1.75L Bottle (Handle)</span>
                  <span className="font-serif text-[#E06D20] font-bold">40 Shots</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Specialty & Mixes Card */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150/70 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="font-sans font-bold tracking-wider text-[11px] text-[#E06D20] mb-3 uppercase flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <Layers className="w-3.5 h-3.5" /> Special Mix Ingredients
              </h4>
              <ul className="space-y-2.5 text-[12px] sm:text-[13px] text-gray-600 font-sans">
                <li className="flex justify-between border-b border-gray-200/40 pb-1.5">
                  <span className="font-medium text-gray-800">Old Fashioneds (750ml)</span>
                  <span className="font-serif text-[#E06D20] font-semibold">12.5 Servings</span>
                </li>
                <li className="flex justify-between border-b border-gray-200/40 pb-1.5">
                  <span className="font-medium text-gray-800">Aperol (750ml)</span>
                  <span className="font-serif text-[#E06D20] font-semibold">12.5 Servings</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium text-gray-800">Mr Blacks (Espresso Martini)</span>
                  <span className="font-serif text-[#E06D20] font-semibold">25 Ounces</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Highlight Banner on 1.75L Bottles */}
        <div className="mt-6 p-4 bg-[#E06D20]/5 rounded-xl border border-[#E06D20]/10 text-left">
          <p className="text-xs text-gray-600 leading-relaxed font-sans">
            <span className="font-semibold text-[#E06D20]">Operational Coordinator Tip:</span> While 1.75L handles are economically dynamic, professional bartenders recommend 750ml or 1L sizes as they align perfectly with high-speed speed rail pours and fit standard spouts.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
