import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Loader2, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  Check, 
  Sparkles, 
  Wine, 
  Beer, 
  GlassWater,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getItemQuantity, calculateRecommendedVolume } from "../lib/calculatorUtils";
import products from "../data/products.json";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface QuoteItem {
  itemCode: string;
  name: string;
  size: string;
  category: string;
  offset?: number;
  quantity?: number;
  tempQty?: number;
}

interface ChatTabProps {
  guests: number;
  hours: number;
  quoteItems: QuoteItem[];
  setQuoteItems: (items: any[]) => void;
  selectedTierId: string | null;
  key?: any;
}

interface ExtractedProduct {
  itemCode: string;
  name: string;
  size: string;
  category: string;
}

// Extract [ADD_PRODUCT: ItemCode | Product Name | Size | Category] markup from AI response
function parseMessageProducts(content: string): { cleanContent: string; products: ExtractedProduct[] } {
  const products: ExtractedProduct[] = [];
  const regex = /\[ADD_PRODUCT:\s*([^|\]]+)\s*\|\s*([^|\]]+)\s*\|\s*([^|\]]+)\s*\|\s*([^|\]]+)\s*\]/g;
  
  // Create clean display text by stripping out brackets markup
  let cleanContent = content.replace(regex, "");
  
  // Find all match occurrences
  const matches = [...content.matchAll(regex)];
  for (const m of matches) {
    products.push({
      itemCode: m[1].trim(),
      name: m[2].trim(),
      size: m[3].trim(),
      category: m[4].trim()
    });
  }
  
  return { cleanContent, products };
}

export default function ChatTab({ guests, hours, quoteItems, setQuoteItems, selectedTierId }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "ai", 
      content: "Welcome! I am the Navigator. The Navigator will guide you on your path and lead you towards the spirits that spark a lifetime of memories.\n\nYou can ask questions about our premium Texas beers, curations, and products. Whenever I suggest a specific label, you can click on it below to instantly add it to your custom event estimate!" 
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileQuote, setShowMobileQuote] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const newMessages = [...messages, { role: "user" as const, content: textToSend }];
    setMessages(newMessages);
    if (!textOverride) {
      setInput("");
    }
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          selectedTierId,
          quoteItems
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages([...newMessages, { role: "ai", content: data.content }]);
      } else {
        setMessages([...newMessages, { role: "ai", content: data.error || "Sorry, I encountered an error." }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: "ai", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const addProductToQuote = (product: ExtractedProduct) => {
    const existing = quoteItems.find(item => item.itemCode === product.itemCode);

    if (existing) {
      // If already added, gently increase the offset by 1
      setQuoteItems(
        quoteItems.map(item => 
          item.itemCode === product.itemCode 
            ? { ...item, offset: (item.offset || 0) + 1 } 
            : item
        )
      );
    } else {
      setQuoteItems([
        ...quoteItems,
        {
          itemCode: product.itemCode,
          name: product.name,
          size: product.size,
          category: product.category,
          offset: 0
        }
      ]);
    }
  };

  const updateQuoteItemQty = (itemCode: string, delta: number) => {
    const updated = quoteItems.map(item => {
      if (item.itemCode === itemCode) {
        const currentQty = getItemQuantity(item, quoteItems, guests, hours);
        const newQty = Math.max(0, currentQty + delta);
        
        const cat = (item.category || "").toLowerCase();
        const sameCategoryItems = quoteItems.filter((q) => {
          const qCat = (q.category || "").toLowerCase();
          if (cat.includes("wine")) return qCat.includes("wine");
          if (cat.includes("beer") || qCat.includes("seltzer")) {
            return qCat.includes("beer") || qCat.includes("seltzer");
          }
          return !qCat.includes("wine") && !qCat.includes("beer") && !qCat.includes("seltzer");
        });
        const sameCategoryCount = sameCategoryItems.length || 1;
        const categoryTotalRecommended = calculateRecommendedVolume(item.category, item.size, guests, hours);
        const baseline = Math.max(1, Math.ceil(categoryTotalRecommended / sameCategoryCount));
        
        const newOffset = newQty - baseline;
        return { ...item, offset: newOffset, tempQty: newQty };
      }
      return item;
    }).filter(item => {
      const qty = item.tempQty !== undefined ? item.tempQty : getItemQuantity(item, quoteItems, guests, hours);
      return qty > 0;
    }).map(item => {
      const { tempQty, ...rest } = item;
      return rest;
    });

    setQuoteItems(updated);
  };

  const removeQuoteItem = (itemCode: string) => {
    setQuoteItems(quoteItems.filter(item => item.itemCode !== itemCode));
  };

  const clearQuote = () => {
    setQuoteItems([]);
  };

  // Get matching product icons
  const getProductIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("wine")) return <Wine className="w-5 h-5 text-[#F27D26]" />;
    if (cat.includes("beer")) return <Beer className="w-5 h-5 text-[#F27D26]" />;
    return <GlassWater className="w-5 h-5 text-[#F27D26]" />;
  };

  // Calculate qualitative budget indicators based on pricing
  const totalDrinksTarget = guests * (hours + 1);
  const totalAddedVolume = quoteItems.reduce((acc, item) => acc + getItemQuantity(item, quoteItems, guests, hours), 0);

  // Check if there are any budget-friendly items in quoteItems
  const hasBudgetFriendlyItems = quoteItems.some(qi => {
    const matched = (products as any[]).find(p => p["Item Code"] === qi.itemCode);
    if (matched) {
      const priceStr = matched["Average Price"] || "";
      const val = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
      return !isNaN(val) && val > 0 && val < 15;
    }
    const name = qi.name || "";
    const cat = qi.category || "";
    return name.toLowerCase().includes("budget") || name.toLowerCase().includes("house") || cat.toLowerCase().includes("beer");
  });


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      
      {/* LEFT ASPECT: AI ASSISTANT CONVERSATION VIEW (65%) */}
      <div className="lg:col-span-8 flex flex-col h-[88vh] bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-150">
        
        {/* Chat Control Header */}
        <div className="bg-[#151619] text-white px-6 py-4 flex justify-between items-center border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <div>
              <h2 className="font-serif text-sm font-semibold tracking-wide">Navigator</h2>
              <p className="text-[10px] text-gray-400 italic hidden md:block">"The Navigator will guide you on your path and lead you towards the spirits that spark a lifetime of memories"</p>
              <p className="text-[10px] text-gray-400 md:hidden">Guest Count: {guests}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowMobileQuote(!showMobileQuote)}
            className="lg:hidden bg-[#F27D26] hover:bg-[#D96B1E] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all text-white"
          >
            <ShoppingBag className="w-4 h-4" />
            Estimate ({quoteItems.length})
          </button>
        </div>

        {/* Message Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-[#FAF9F6] to-white">
          {messages.map((msg, i) => {
            const { cleanContent, products } = parseMessageProducts(msg.content);

            return (
              <div key={i} className="space-y-3">
                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-5 rounded-2xl relative shadow-sm ${
                    msg.role === "user" 
                      ? "bg-[#151619] text-white rounded-tr-none text-right font-sans" 
                      : "bg-white border border-gray-150 rounded-tl-none text-[#1A1A1A] font-sans"
                  }`}>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap font-normal text-left">{cleanContent}</p>
                  </div>
                </div>

                {/* Extracted Interactive Product Suggestions Tray */}
                {msg.role === "ai" && products.length > 0 && (
                  <div className="flex justify-start pl-4 select-none">
                    <div className="w-full max-w-xl space-y-2 text-left bg-gray-50 border border-gray-200/60 p-4 rounded-2xl">
                      <div className="flex items-center gap-1.5 mb-2.5 border-b border-gray-100 pb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggested Bottles Mentioned:</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {products.map((prod, idx2) => {
                          const isInQuote = quoteItems.find(item => item.itemCode === prod.itemCode);

                          return (
                            <div 
                              key={`${prod.itemCode}-${idx2}`}
                              className="bg-white border border-gray-150 p-3 rounded-xl flex items-start gap-2.5 shadow-xs transition-hover hover:shadow-sm"
                            >
                              <div className="bg-gray-50 p-2 rounded-lg shrink-0 mt-0.5">
                                {getProductIcon(prod.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[12px] font-semibold text-gray-900 truncate leading-tight" title={prod.name}>
                                  {prod.name}
                                </h4>
                                <p className="text-[10px] text-gray-400 font-light mt-0.5 truncate uppercase">
                                  {prod.category} • {prod.size}
                                </p>
                                <button
                                  onClick={() => addProductToQuote(prod)}
                                  className={`w-full mt-3 py-1.5 px-3 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
                                    isInQuote 
                                      ? "bg-green-50 hover:bg-green-100 border border-green-200 text-green-700" 
                                      : "bg-[#151619] hover:bg-gray-800 text-white"
                                  }`}
                                >
                                  {isInQuote ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      Added (Qty: {getItemQuantity(isInQuote, quoteItems, guests, hours)})
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      Add to Estimate
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-150 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#F27D26]" />
                <span className="text-xs text-gray-400">The Navigator is charting your path...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Control Box */}
        <div className="p-4 border-t border-gray-150 bg-white flex gap-3">
          <input
            type="text"
            placeholder="Ask about brand pairings, specific grapes, policies, or wedding recommendations..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4.5 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 focus:border-[#F27D26] transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="bg-[#151619] text-white p-3.5 rounded-2xl hover:bg-gray-800 transition-colors cursor-pointer group"
          >
            <Send className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

      </div>

      {/* RIGHT ASPECT: CUSTOM beverage QUOTE SIDEBAR PANEL (35% Desktop / Collapsible Drawer Mobile) */}
      <div className={`lg:col-span-4 flex flex-col h-[88vh] bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-150 transition-all duration-300 ${
        showMobileQuote ? "fixed inset-0 z-50 lg:relative lg:inset-auto" : "hidden lg:flex"
      }`}>
        
        {/* Quote Header */}
        <div className="bg-gray-50 border-b border-gray-150 p-5 shrink-0 flex justify-between items-center text-left">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-[#F27D26] w-5 h-5 animate-pulse" />
            <div>
              <h3 className="font-serif text-sm font-semibold text-gray-900">Custom Event Estimate</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-tight">Active Client Curation Selection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {quoteItems.length > 0 && (
              <button 
                onClick={clearQuote}
                className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-tight mr-1 transition-colors"
              >
                Clear
              </button>
            )}
            <button 
              onClick={() => setShowMobileQuote(false)}
              className="lg:hidden text-gray-400 hover:text-gray-900 p-1.5 hover:bg-gray-200/50 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Dynamic Guest Setup Bar */}
        <div className="bg-[#FAF9F6] border-b border-gray-150 px-5 py-3 flex justify-between items-center text-[11px] text-gray-600 font-medium">
          <span className="flex items-center gap-1.5">
            <strong>Group Size:</strong> {guests} Guests
          </span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center gap-1.5">
            <strong>Hours:</strong> {hours} Hrs
          </span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center gap-1.5 text-[#F27D26]">
            <strong>Target:</strong> {totalDrinksTarget} Units
          </span>
        </div>

        {/* Custom Selected Items Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-white select-none">
          <AnimatePresence>
            {quoteItems.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-3">
                <div className="bg-gradient-to-tr from-[#FAF8F5] to-white p-4.5 rounded-full border border-dashed border-gray-200">
                  <Wine className="w-8 h-8 text-gray-300" />
                </div>
                <div>
                  <h4 className="font-serif text-xs font-semibold text-gray-700">Your custom estimate is empty</h4>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[210px] leading-relaxed mx-auto">
                    Ask the Navigator about beers, spirits, or wine options and tap "Add to Estimate" to build your custom menu.
                  </p>
                </div>
              </div>
            ) : (
              quoteItems.map((item) => (
                <motion.div
                  key={item.itemCode}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gray-50 border border-gray-150/70 p-3.5 rounded-2xl flex items-stretch gap-3 shadow-xs hover:border-gray-250 transition-colors"
                >
                  {/* Category icon */}
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-center shrink-0">
                    {getProductIcon(item.category)}
                  </div>

                  {/* Body description */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between text-left">
                    <div className="pr-1">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="text-[12px] font-bold text-gray-900 leading-tight truncate-two-lines" title={item.name}>
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeQuoteItem(item.itemCode)}
                          className="text-gray-300 hover:text-red-500 p-0.5 rounded-lg transition-colors mt-0.5"
                          title="Remove from quote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[9px] text-gray-400 font-normal uppercase tracking-tight mt-0.5 truncate">
                        {item.category} • {item.size} • CODE: {item.itemCode}
                      </p>
                    </div>

                    <div className="flex justify-between items-center mt-3 border-t border-gray-200/50 pt-2.5">
                      <div className="text-[10px] text-gray-400">
                        <span className="text-gray-400">Custom selection quantity</span>
                      </div>

                      {/* Edit controls */}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => updateQuoteItemQty(item.itemCode, -1)}
                          className="bg-white border border-gray-200 text-gray-500 hover:text-gray-900 w-6 h-6 rounded-lg flex items-center justify-center text-xs active:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold text-gray-800">{getItemQuantity(item, quoteItems, guests, hours)}</span>
                        <button
                          onClick={() => updateQuoteItemQty(item.itemCode, 1)}
                          className="bg-white border border-gray-200 text-gray-500 hover:text-gray-900 w-6 h-6 rounded-lg flex items-center justify-center text-xs active:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Estimate Box (qualitative pricing restriction adhere) */}
        <div className="bg-[#151619] text-white p-5 space-y-4 shrink-0 text-left relative overflow-hidden border-t border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest block">Combined Estimate Ranking</span>
              {quoteItems.length === 0 ? (
                <strong className="text-gray-500 text-sm italic font-serif">No custom curation active</strong>
              ) : (
                <strong className="text-[#F27D26] text-xl font-serif">Bespoke Product List</strong>
              )}
            </div>
            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] text-center font-monospace">
              <span className="text-gray-400 block uppercase leading-tight font-sans">Total Bottles</span>
              <span className="text-white text-sm font-bold font-serif">{totalAddedVolume}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-2 text-xs text-gray-300 leading-normal">
            <p className="font-semibold text-[#F27D26] flex items-center gap-1 uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3.5 h-3.5" /> Luxury Service Benefit
            </p>
            <p className="text-[11px] leading-relaxed text-gray-400 font-light">
              This list of customized products will be **automatically imported** to your event questionnaire on the **Planner** tab when you submit your official request!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
