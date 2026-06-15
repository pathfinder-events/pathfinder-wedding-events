import React, { useState, useEffect } from "react";
import { MessageSquare, Calculator, Calendar, Compass, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ChatTab from "./components/ChatTab-corporate";
import CalculatorTab from "./components/CalculatorTab-corporate";
import PlannerTab from "./components/PlannerTab-corporate";
import { getItemQuantity } from "./lib/calculatorUtils";

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "calc" | "planner">("chat");
  const [guests, setGuests] = useState(50);
  const [hours, setHours] = useState(3);
  const [wineRatio, setWineRatio] = useState(() => {
    try { return parseInt(localStorage.getItem("pathfinder_wine_ratio") || "25"); } catch { return 25; }
  });
  const [beerRatio, setBeerRatio] = useState(() => {
    try { return parseInt(localStorage.getItem("pathfinder_beer_ratio") || "25"); } catch { return 25; }
  });
  const [liquorRatio, setLiquorRatio] = useState(() => {
    try { return parseInt(localStorage.getItem("pathfinder_liquor_ratio") || "50"); } catch { return 50; }
  });

  const [quoteItems, setQuoteItems] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("pathfinder_custom_quote");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [selectedTierId, setSelectedTierId] = useState<string | null>(() => {
    return localStorage.getItem("pathfinder_selected_tier_id") || null;
  });

  // Hide header when embedded in drawer iframe
  const isEmbed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1';
  const [headerHidden, setHeaderHidden] = useState(isEmbed);

  // ── postMessage listener: tab switching + hide-header ──────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.tab === 'chat' || e.data?.tab === 'calc' || e.data?.tab === 'planner') {
        setActiveTab(e.data.tab as "chat" | "calc" | "planner");
      }
      if (e.data?.type === 'hide-header') {
        setHeaderHidden(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const saveSelectedTierId = (id: string | null) => {
    setSelectedTierId(id);
    if (id) { localStorage.setItem("pathfinder_selected_tier_id", id); }
    else { localStorage.removeItem("pathfinder_selected_tier_id"); }
  };

  const saveWineRatio   = (v: number) => { setWineRatio(v);   localStorage.setItem("pathfinder_wine_ratio",   String(v)); };
  const saveBeerRatio   = (v: number) => { setBeerRatio(v);   localStorage.setItem("pathfinder_beer_ratio",   String(v)); };
  const saveLiquorRatio = (v: number) => { setLiquorRatio(v); localStorage.setItem("pathfinder_liquor_ratio", String(v)); };

  const saveQuoteItems = (items: any[]) => {
    setQuoteItems(items);
    localStorage.setItem("pathfinder_custom_quote", JSON.stringify(items));
  };

  const clearQuote = () => { saveQuoteItems([]); };

  const removeQuoteItemByCode = (itemCode: string) => {
    saveQuoteItems(quoteItems.filter(item => item.itemCode !== itemCode));
  };

  const modifyQuoteItemQty = (itemCode: string, delta: number) => {
    const updated = quoteItems.map(item => {
      if (item.itemCode === itemCode) {
        return { ...item, offset: (item.offset || 0) + delta };
      }
      return item;
    }).filter(item => getItemQuantity(item, quoteItems, guests, hours) > 0);
    saveQuoteItems(updated);
  };

  const activeCargoTotal = quoteItems.reduce((acc, item) => acc + getItemQuantity(item, quoteItems, guests, hours), 0);
  const totalRecommendedVolume = guests * (hours + 1);

  return (
    <div id="app-container" className="min-h-screen text-[#0f2240] font-sans relative pb-32 bg-[#edf3f9] overflow-x-hidden">

      {/* Corporate Header — hidden in embed/drawer mode */}
      <header id="main-header" style={{ display: headerHidden ? 'none' : 'block' }} className="bg-[#ffffff]/95 border-b border-[#1a5fa8]/20 backdrop-blur-md px-6 py-4 relative z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative p-2 rounded-xl bg-gradient-to-br from-[#eaf2fb] to-[#d4e6f5] border border-[#1a5fa8]/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] flex items-center justify-center">
              <Compass className="w-8 h-8 text-[#1a5fa8] animate-pulse" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#0a84c8] animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="text-xl serif-heading font-extrabold tracking-wider text-[#0d2240] uppercase flex items-center gap-2">
                Pathfinder
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-[#2c4a6e] font-mono font-bold">Wine & Beverage Curation</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main id="main-content" className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 relative z-10 transition-all">
        <div className="min-h-[75vh]">
          {activeTab === "chat" && (
            <ChatTab guests={guests} hours={hours} quoteItems={quoteItems} setQuoteItems={saveQuoteItems} selectedTierId={selectedTierId} />
          )}
          {activeTab === "calc" && (
            <CalculatorTab
              guests={guests} setGuests={setGuests}
              hours={hours} setHours={setHours}
              quoteItems={quoteItems} setQuoteItems={saveQuoteItems}
              wineRatio={wineRatio} setWineRatio={saveWineRatio}
              beerRatio={beerRatio} setBeerRatio={saveBeerRatio}
              liquorRatio={liquorRatio} setLiquorRatio={saveLiquorRatio}
            />
          )}
          {activeTab === "planner" && (
            <PlannerTab
              guests={guests} setGuests={setGuests}
              hours={hours} setHours={setHours}
              wineRatio={wineRatio} beerRatio={beerRatio} liquorRatio={liquorRatio}
              quoteItems={quoteItems}
              selectedTierId={selectedTierId} setSelectedTierId={saveSelectedTierId}
            />
          )}
        </div>

        <footer className="pt-8 border-t border-[#1a5fa8]/15 flex flex-col md:flex-row justify-between items-center gap-4 text-[#6080a0] text-xs mt-12 bg-transparent">
          <p className="font-serif tracking-widest uppercase font-bold text-[#2c4a6e]">Pathfinder Wine & Beverage Consultation Panel</p>
          <div className="flex items-center gap-3 text-[10px] font-mono tracking-wider text-[#6080a0] font-semibold">
            <span>CURATION RECONCILIATION FEEDBACK ACTIVE</span>
            <span>•</span>
            <span>PATHFINDER BEVERAGE SERVICES EST. 2026</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
