import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Calculator, 
  Calendar, 
  GlassWater,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Compass,
  Sliders,
  FileText,
  Trash2,
  Plus,
  Minus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ChatTab from "./components/ChatTab";
import CalculatorTab from "./components/CalculatorTab";
import PlannerTab from "./components/PlannerTab";
import NavigatorIcon from "./components/NavigatorIcon";
import { initAuth, googleSignIn, getAccessToken } from "./lib/google-auth";

// Removed wingmanEmblemImg import to use standard robust CSS & lucide icons
import { getItemQuantity } from "./lib/calculatorUtils";

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "calc" | "planner">(() => {
     const param = new URLSearchParams(window.location.search).get("tab");
     if (param === "calc" || param === "planner" || param === "chat") return param;
     return "chat";
   });
  const [guests, setGuests] = useState(50);
  const [hours, setHours] = useState(3);

  // Custom Drink Quote State
  const [quoteItems, setQuoteItems] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("pathfinder_custom_quote");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedTierId, setSelectedTierId] = useState<string | null>(() => {
    return localStorage.getItem("pathfinder_selected_tier_id") || null;
  });
  useEffect(() => {
  window.addEventListener('message', (e) => {
    if (e.data?.tab === 'calc' || e.data?.tab === 'planner' || e.data?.tab === 'chat') {
      setActiveTab(e.data.tab);
    }
  });
}, []);

  const saveSelectedTierId = (id: string | null) => {
    setSelectedTierId(id);
    if (id) {
      localStorage.setItem("pathfinder_selected_tier_id", id);
    } else {
      localStorage.removeItem("pathfinder_selected_tier_id");
    }
  };

  const saveQuoteItems = (items: any[]) => {
    setQuoteItems(items);
    localStorage.setItem("pathfinder_custom_quote", JSON.stringify(items));
  };

  // Sync state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error" | "syncing">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ 
    count: number; 
    lastUpdated: string | null; 
    filesCount?: number; 
    filesLastUpdated?: string | null;
    specFiles?: Array<{ name: string; link: string }>;
  } | null>(null);

  // Fetch DB status from backend on load & after sync
  const fetchDbStatus = async () => {
    try {
      const res = await fetch("/api/db-status");
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch database status:", err);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    initAuth(
      () => setIsAuthenticated(true),
      () => setIsAuthenticated(false)
    );
  }, []);

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (result) {
          token = result.accessToken;
          setIsAuthenticated(true);
        } else {
          throw new Error("Failed to authenticate with Google");
        }
      }

      const response = await fetch("/api/sync-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });

      if (response.ok) {
        setSyncStatus("success");
        setSyncError(null);
        await fetchDbStatus(); // update loaded count
        setTimeout(() => setSyncStatus("idle"), 5000);
      } else {
        const errData = await response.json().catch(() => ({}));
        setSyncStatus("error");
        setSyncError(errData.error || "Failed to sync with Google Sheets. Please verify SPREADSHEET_ID.");
      }
    } catch (error: any) {
      console.error("Sync failed:", error);
      setSyncStatus("error");
      const errMsg = error.message || String(error);
      if (errMsg.includes("popup-blocked") || (error.code && error.code.includes("popup-blocked"))) {
        setSyncError("Your browser's pop-up blocker prevented Google Sign-In. Because this preview runs in a restricted iframe, popups are blocked by standard browser security. To resolve this, click 'Open in a new tab' at the top-right of your preview frame to load Pathfinder in a standalone tab where the Google login popup will open and function normally!");
      } else {
        setSyncError(errMsg || "An unexpected error occurred during sync");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const clearQuote = () => {
    saveQuoteItems([]);
  };

  const removeQuoteItemByCode = (itemCode: string) => {
    saveQuoteItems(quoteItems.filter(item => item.itemCode !== itemCode));
  };

  const modifyQuoteItemQty = (itemCode: string, delta: number) => {
    const updated = quoteItems.map(item => {
      if (item.itemCode === itemCode) {
        const currentQty = getItemQuantity(item, quoteItems, guests, hours);
        const newQty = Math.max(0, currentQty + delta);
        return { ...item, offset: (item.offset || 0) + delta };
      }
      return item;
    }).filter(item => {
      const qty = getItemQuantity(item, quoteItems, guests, hours);
      return qty > 0;
    });
    saveQuoteItems(updated);
  };

  // Calculations for static elements on Dashboard
  const activeCargoTotal = quoteItems.reduce((acc, item) => acc + getItemQuantity(item, quoteItems, guests, hours), 0);
  const totalRecommendedVolume = guests * (hours + 1);

  return (
    <div id="app-container" className="min-h-screen text-[#2F2A24] font-sans relative pb-32 nautical-grid overflow-x-hidden">
      
      {/* Elegant Header - Gold Accent & Warm Ivory Backdrop */}
      <header id="main-header" className="bg-[#FCFAF5]/90 border-b border-[#C5A059]/30 backdrop-blur-md px-6 py-4 relative z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo & Wedding Curation Identity */}
          <div className="flex items-center gap-4">
            <div className="relative p-2 rounded-xl bg-gradient-to-br from-[#FCFAF5] to-[#F5EFE2] border border-[#C5A059]/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] flex items-center justify-center">
              <Compass className="w-8 h-8 text-[#C5A059] animate-pulse" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#E06D20] animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="text-xl serif-heading font-extrabold tracking-wider text-[#3D3220] uppercase flex items-center gap-2">
                Pathfinder
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-[#7E6E5A] font-mono font-bold">Wine & Beverage Curation</p>
            </div>
          </div>

          {/* Sync Status Hub */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 bg-[#FAF5EA] py-1.5 px-3.5 rounded-lg border border-[#D9C3A0]/50 text-left shrink-0">
              <div className="p-1 rounded bg-[#FCFAF5] border border-[#D9C3A0]/30 text-[#C5A059]">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="pr-2 leading-none">
                <div className="text-[8px] text-[#7E6E5A] font-mono uppercase tracking-wider font-bold">Beverage Directory</div>
                <div className="text-[11px] font-semibold text-[#3D3220] mt-0.5">
                  {dbStatus ? (
                    <span className="telemetry-font font-bold text-[#B5945B]">{dbStatus.count.toLocaleString()} Loaded</span>
                  ) : (
                    "Checking connection..."
                  )}
                </div>
              </div>
              <button
                onClick={handleGlobalSync}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono tracking-widest uppercase transition-all ${
                  syncStatus === "success"
                    ? "bg-[#DDECD3] text-green-800 border border-green-300 font-bold"
                    : syncStatus === "error"
                    ? "bg-[#FFD9D9] text-red-800 border border-red-300"
                    : "bg-[#C5A059] text-white hover:bg-[#B5945B] font-bold cursor-pointer"
                }`}
              >
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-white" />
                ) : (
                  <RefreshCw className="w-3 h-3 text-white" />
                )}
                {isSyncing ? "Syncing" : syncStatus === "success" ? "Synced" : syncStatus === "error" ? "Error" : "Sync Index"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Wedding Curation Desk Layout */}
      <main id="main-content" className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 relative z-10 transition-all">
        
        {/* Sync Issues Notification Alert block */}
        <AnimatePresence>
          {syncError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 bg-red-50 border-2 border-red-200 text-slate-800 rounded-2xl flex items-start gap-4 shadow-md border-l-4 border-l-red-500"
            >
              <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm leading-relaxed text-left">
                <span className="font-bold font-serif text-[#B5945B] uppercase tracking-wide">Google Sheets Authentication Warning</span>
                <p className="mt-1 text-slate-600 font-normal">{syncError}</p>
                <div className="mt-3.5 pt-3 border-t border-red-200/50 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Recommended Steps:</p>
                  <ul className="list-disc list-inside mt-1.5 space-y-1">
                    <li>Launch this application in a <strong>standalone tab</strong> using the "Open in new tab" link to permit standard pop-ups properly.</li>
                    <li>Verify your active <code>GOOGLE_SHEET_ID</code> is correctly configured in your settings page.</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={() => setSyncError(null)}
                className="text-slate-400 hover:text-slate-600 p-1 bg-black/5 hover:bg-black/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Static Tab-Based Navigation Menu */}
        <div id="navigation-tabs" className="flex border-b border-gray-200 gap-8 justify-start select-none shrink-0 mb-6 pb-2.5">
          <button
            onClick={() => setActiveTab("chat")}
            className={`pb-2.5 text-sm font-serif font-bold uppercase tracking-wider relative transition-all duration-205 cursor-pointer focus:outline-none ${
              activeTab === "chat" ? "text-[#E06D20]" : "text-[#7E6E5A] hover:text-[#3D3220]"
            }`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> 1. AI Navigator (Chat)
            </span>
            {activeTab === "chat" && (
              <motion.span layoutId="activeTabUnderline" className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#E06D20] rounded-full" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("calc")}
            className={`pb-2.5 text-sm font-serif font-bold uppercase tracking-wider relative transition-all duration-205 cursor-pointer focus:outline-none ${
              activeTab === "calc" ? "text-[#E06D20]" : "text-[#7E6E5A] hover:text-[#3D3220]"
            }`}
          >
            <span className="flex items-center gap-2">
              <Calculator className="w-4 h-4" /> 2. Drink Estimator
            </span>
            {activeTab === "calc" && (
              <motion.span layoutId="activeTabUnderline" className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#E06D20] rounded-full" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("planner")}
            className={`pb-2.5 text-sm font-serif font-bold uppercase tracking-wider relative transition-all duration-205 cursor-pointer focus:outline-none ${
              activeTab === "planner" ? "text-[#E06D20]" : "text-[#7E6E5A] hover:text-[#3D3220]"
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" /> 3. Beverage Planner
            </span>
            {activeTab === "planner" && (
              <motion.span layoutId="activeTabUnderline" className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#E06D20] rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content Display Area */}
        <div className="min-h-[75vh]">
          {activeTab === "chat" && (
            <ChatTab 
              guests={guests} 
              hours={hours} 
              quoteItems={quoteItems} 
              setQuoteItems={saveQuoteItems} 
              selectedTierId={selectedTierId}
            />
          )}
          {activeTab === "calc" && (
            <CalculatorTab 
              guests={guests} 
              setGuests={setGuests} 
              hours={hours} 
              setHours={setHours} 
              quoteItems={quoteItems}
              setQuoteItems={saveQuoteItems}
            />
          )}
          {activeTab === "planner" && (
            <PlannerTab 
              guests={guests} 
              quoteItems={quoteItems}
              selectedTierId={selectedTierId}
              setSelectedTierId={saveSelectedTierId}
              dbStatus={dbStatus}
              handleGlobalSync={handleGlobalSync}
              isSyncing={isSyncing}
              fetchDbStatus={fetchDbStatus}
            />
          )}
        </div>

        {/* Local Spec Files Listing Widget */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 relative text-left shadow-[0_10px_35px_rgba(181,148,91,0.03)] mt-8">
          <div className="flex justify-between items-center border-b border-gray-150 pb-3.5 mb-4">
            <h3 className="serif-heading font-bold text-sm text-[#3D3220] tracking-wider flex items-center gap-2">
              <FileText className="text-[#C5A059] w-4 h-4" /> Shared References & Product Specification Sheets
            </h3>
            {dbStatus?.filesCount !== undefined && dbStatus.filesCount > 0 && (
              <span className="text-[10px] font-mono text-[#E06D20] font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded border border-[#C5A059]/30 font-semibold">
                ✓ {dbStatus.filesCount} Reference Sheets Sync'd
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dbStatus?.specFiles && dbStatus.specFiles.length > 0 ? (
              dbStatus.specFiles.map((file, idx) => (
                <a 
                  key={idx}
                  href={file.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-3.5 bg-white border border-gray-150 hover:border-[#C5A059] rounded-xl flex items-center justify-between text-[#524534] hover:text-[#E06D20] group transition-all shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-3">
                    <FileText className="w-4 h-4 shrink-0 text-[#9A8D7C] group-hover:text-[#C5A059]" />
                    <span className="text-xs truncate font-medium font-sans">{file.name}</span>
                  </div>
                  <span className="text-[9px] font-mono tracking-widest uppercase py-0.5 px-2 bg-gray-50 border border-gray-200 rounded shrink-0 group-hover:border-[#C5A059]/40 font-bold text-[#7E6E5A]">
                    VIEW SPEC
                  </span>
                </a>
              ))
            ) : (
              <div className="col-span-1 md:col-span-3 text-center py-6 text-xs text-[#9A8D7C] italic">
                No local reference sheets synchronized yet. Add product specifications inside the Beverage Planner.
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <footer className="pt-8 border-t border-gray-150 flex flex-col md:flex-row justify-between items-center gap-4 text-[#7E6E5A] text-xs mt-12 bg-transparent">
          <p className="font-serif tracking-widest uppercase font-bold text-slate-500">Pathfinder Wine & Beverage Consultation Panel</p>
          <div className="flex items-center gap-3 text-[10px] font-mono tracking-wider text-[#9A8D7C] font-semibold">
            <span>CURATION RECONCILIATION FEEDBACK ACTIVE</span>
            <span>•</span>
            <span>PATHFINDER BEVERAGE SERVICES EST. 1996</span>
          </div>
        </footer>
      </main>

    </div>
  );
}
