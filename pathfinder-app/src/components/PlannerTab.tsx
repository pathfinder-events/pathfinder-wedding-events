import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  ChevronRight, 
  Check, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Sparkles, 
  Lock, 
  Unlock,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getItemQuantity } from "../lib/calculatorUtils";

interface PlannerTabProps {
  guests: number;
  quoteItems?: any[];
  key?: any;
  selectedTierId: string | null;
  setSelectedTierId: (id: string | null) => void;
  dbStatus?: any;
  handleGlobalSync?: () => Promise<void>;
  isSyncing?: boolean;
  fetchDbStatus?: () => Promise<void>;
}

export default function PlannerTab({ 
  guests: initialGuests, 
  quoteItems = [], 
  selectedTierId, 
  setSelectedTierId,
  dbStatus,
  handleGlobalSync,
  isSyncing = false,
  fetchDbStatus
}: PlannerTabProps) {
  // Local guest count state to allow custom tuning inside the planner
  const [localGuests, setLocalGuests] = useState(initialGuests);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1); // 1: Select Tier, 2: Official Form, 3: Success

  // Admin Retractable Dashboard Uploader panel
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<Array<{ name: string; status: "idle" | "uploading" | "success" | "error"; error?: string }>>([]);
  const [latestSuccessFile, setLatestSuccessFile] = useState<string | null>(null);
  const [isCompilingLocal, setIsCompilingLocal] = useState(false);

  const handleLocalSyncOnly = async () => {
    setIsCompilingLocal(true);
    try {
      const res = await fetch("/api/sync-local", { method: "POST" });
      if (res.ok) {
        if (fetchDbStatus) {
          await fetchDbStatus();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to compile local specifications: ${err.error || "Unknown error"}`);
      }
    } catch (e: any) {
      alert(`Error compiling local specifications: ${e.message}`);
    } finally {
      setIsCompilingLocal(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (ext === ".pdf" || ext === ".txt" || ext === ".md") {
        validFiles.push(file);
      } else {
        alert(`Unsupported file format error: "${file.name}" is not a PDF, TXT, or MD spec file.`);
      }
    }

    if (validFiles.length === 0) return;

    // Initialize uploading state in queue
    setUploadQueue(prev => [
      ...prev,
      ...validFiles.map(f => ({ name: f.name, status: "uploading" as const }))
    ]);

    for (const file of validFiles) {
      try {
        const base64 = await convertFileToBase64(file);
        
        const res = await fetch("/api/upload-spec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed raw transfer");
        }

        // Mark file as uploaded successfully
        setUploadQueue(prev => prev.map(item => 
          item.name === file.name ? { ...item, status: "success" } : item
        ));
        setLatestSuccessFile(file.name);

        // Fetch local status to reload the files listing andcounts without triggering Google sheets login
        if (fetchDbStatus) {
          await fetchDbStatus();
        }
      } catch (err: any) {
        console.error("Upload error for file", file.name, err);
        setUploadQueue(prev => prev.map(item => 
          item.name === file.name ? { ...item, status: "error", error: err.message || "Upload failed" } : item
        ));
      }
    }

    if (fetchDbStatus) {
      await fetchDbStatus();
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Form Field States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [duration, setDuration] = useState("4 Hours");
  const [eventStartTime, setEventStartTime] = useState("");
  const [barOpensAt, setBarOpensAt] = useState("");
  const [barClosesAt, setBarClosesAt] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [hasChangedRequestsManually, setHasChangedRequestsManually] = useState(false);

  // Corporate Questionnaire multi-section form steps state (Sections 1, 2, 3, 4)
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [deliveryWindow, setDeliveryWindow] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [contactPref, setContactPref] = useState("");

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-section form segment validation
  const validateStep1 = () => {
    const tempErrors: Record<string, string> = {};
    if (!fullName.trim()) tempErrors.fullName = "Full name is required before moving to Section 2.";
    if (!email.trim()) {
      tempErrors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = "Please enter a valid email address.";
    }
    if (!phone.trim()) tempErrors.phone = "Phone number is required.";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const validateStep2 = () => {
    const tempErrors: Record<string, string> = {};
    if (!eventDate) tempErrors.eventDate = "Event date is required.";
    if (!venue.trim()) tempErrors.venue = "Venue detail is required.";
    if (!eventStartTime.trim()) tempErrors.eventStartTime = "Event start time is required.";
    if (!barOpensAt.trim()) tempErrors.barOpensAt = "Bar open time is required.";
    if (!barClosesAt.trim()) tempErrors.barClosesAt = "Bar close time is required.";
    if (!localGuests || localGuests <= 0) tempErrors.localGuests = "Number of guests is required.";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const validateStep3 = () => {
    const tempErrors: Record<string, string> = {};
    if (!specialRequests.trim()) {
      tempErrors.specialRequests = "Special requests and curated list are required. Please adjust or enter some custom desires first.";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleNextFormStep = () => {
    if (formStep === 1) {
      if (validateStep1()) {
        setFormStep(2);
        setErrors({});
      }
    } else if (formStep === 2) {
      if (validateStep2()) {
        setFormStep(3);
        setErrors({});
      }
    } else if (formStep === 3) {
      if (validateStep3()) {
        setFormStep(4);
        setErrors({});
      }
    }
  };

  const handlePrevFormStep = () => {
    if (formStep === 1) {
      setActiveStep(1);
    } else {
      setFormStep((prev) => (prev - 1) as any);
      setErrors({});
    }
  };

  // Sync prop guests initially
  useEffect(() => {
    setLocalGuests(initialGuests);
  }, [initialGuests]);

  // Pre-populate special requests with custom drink quote items
  useEffect(() => {
    if (quoteItems && quoteItems.length > 0 && !hasChangedRequestsManually) {
      const hoursNum = parseInt(duration) || 4;
      const formattedItems = quoteItems
        .map(item => {
          const liveQty = getItemQuantity(item, quoteItems, localGuests, hoursNum);
          return `- ${liveQty} x ${item.name} (${item.size}) [Code: ${item.itemCode}]`;
        })
        .join("\n");
      setSpecialRequests(`Please include the following curated products in my custom beverage estimate:\n${formattedItems}\n\n`);
    }
  }, [quoteItems, localGuests, duration, hasChangedRequestsManually]);

  const [proposals, setProposals] = useState<any[]>([]);
  const [adminActiveTab, setAdminActiveTab] = useState<"specs" | "leads">("specs");

  const fetchProposals = async () => {
    try {
      const res = await fetch("/api/proposals");
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (e) {
      console.error("Failed to fetch proposals:", e);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleDeleteProposal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this client lead?")) return;
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setProposals(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Failed to delete proposal.");
      }
    } catch (e) {
      console.error("Failed to delete proposal:", e);
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const tiers = [
    {
      id: "beer-wine",
      name: "Beer & Wine Only",
      min: 12,
      max: 15,
      tierClass: "budget-friendly tier",
      desc: "House premium wines + local craft beer and premium sodas.",
      features: [
        "2 Curated House Red Wines",
        "2 Curated House White Wines",
        "3 Local Texas Craft Beers & Seltzers",
        "Assorted Sodas, Cokes, and Sparkling Bottled Waters"
      ]
    },
    {
      id: "standard",
      name: "Standard Full Bar",
      min: 18,
      max: 23,
      tierClass: "premium selection tier",
      desc: "Call-brand spirits, house wines, domestic and local craft beers.",
      features: [
        "All features from Beer & Wine Only selection",
        "Standard Well Spirits (Vodka, Gin, Bourbon, Rum & Tequila)",
        "Premium Tonic, Club Sodas, Fresh Lime Juice & Simple Syrups"
      ]
    },
    {
      id: "premium",
      name: "Premium Experience",
      min: 30,
      max: 55,
      tierClass: "ultra-premium tier",
      desc: "Top-shelf luxury spirits, reserve wines, import selections.",
      features: [
        "Premium Class Spirits (Belvedere Vodka, Hendrick's, Willet Pot Still Bourbon, Beltrones Silver Tequila, etc.)",
        "Curated Reserve Red, White, and Sparkling Wine Selections",
        "Expanded Imported & Premium Texas Craft Beers"
      ]
    }
  ];

  const selectedTier = tiers.find(t => t.id === selectedTierId);

  const handleTierSelect = (id: string) => {
    setSelectedTierId(id);
    // Clear selection error if present
    if (errors.tier) {
      const updatedErrors = { ...errors };
      delete updatedErrors.tier;
      setErrors(updatedErrors);
    }
  };

  const handleNextToForm = () => {
    if (!selectedTierId) {
      setErrors({ tier: "You must choose a package tier first before continuing." });
      return;
    }
    setActiveStep(2);
  };

  const validateForm = () => {
    return validateStep1() && validateStep2() && validateStep3();
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    const payload = {
      fullName,
      email,
      phone,
      eventDate,
      venue,
      duration,
      eventStartTime,
      barOpensAt,
      barClosesAt,
      specialRequests,
      localGuests,
      tierChoice: selectedTier ? selectedTier.name : "",
      quoteItems: quoteItems || [],
      deliveryWindow,
      deliveryAddress,
      contactPref
    };

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Reload proposals to keep synchronization
        await fetchProposals();
      }
    } catch (err) {
      console.error("Failed to persist proposal lead to server:", err);
    } finally {
      setIsSubmitting(false);
      setActiveStep(3);
    }
  };

  const handleReset = () => {
    setActiveStep(1);
    setFormStep(1);
    setSelectedTierId(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setEventDate("");
    setVenue("");
    setDuration("4 Hours");
    setEventStartTime("");
    setBarOpensAt("");
    setBarClosesAt("");
    setSpecialRequests("");
    setDeliveryWindow("");
    setDeliveryAddress("");
    setContactPref("");
    setErrors({});
  };

  return (
    <div id="planner-tab-container" className="max-w-4xl mx-auto space-y-8">
      {/* Dynamic Header Step Indicator */}
      <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-150/60 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-[#F27D26] w-5 h-5" />
            <h2 className="font-serif text-lg font-medium text-gray-900">Pathfinder Event Planner</h2>
          </div>
          <button
            onClick={() => setIsAdminOpen(!isAdminOpen)}
            className="text-[11px] font-mono font-medium px-2 py-1 bg-gray-100 hover:bg-[#F27D26]/10 text-gray-600 hover:text-[#F27D26] rounded-lg transition-all border border-gray-200 uppercase tracking-wider text-center"
          >
            {isAdminOpen ? "✕ Close Uploader" : "⚙ Manage specs & sync"}
          </button>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3 text-xs uppercase tracking-wider font-semibold">
          <span className={`px-2.5 py-1.5 rounded-lg transition-colors duration-200 ${activeStep === 1 ? "bg-[#F27D26]/10 text-[#F27D26]" : "bg-gray-100 text-gray-500"}`}>
            1. Package Tier
          </span>
          <span className="text-gray-300">──</span>
          <span className={`px-2.5 py-1.5 rounded-lg transition-colors duration-200 ${activeStep === 2 ? "bg-[#F27D26]/10 text-[#F27D26]" : "bg-gray-100 text-gray-500"}`}>
            2. Request Proposal {activeStep === 2 ? `(Sec ${formStep}/4)` : ""}
          </span>
          <span className="text-gray-300">──</span>
          <span className={`px-2.5 py-1.5 rounded-lg transition-colors duration-200 ${activeStep === 3 ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
            3. Curated Menu
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isAdminOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -15 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -15 }}
            className="overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-150/60 p-6 space-y-6"
          >
            <div>
              <h3 className="font-serif text-base font-semibold text-gray-900 flex items-center gap-2">
                ⚙ Local Specification & Synchronization Center
              </h3>
              <p className="text-xs text-gray-500 font-light mt-1">
                Feed premium custom cocktail, wine, beer, or corporate liquor recipes directly into the Navigator's brain by uploading spec sheets.
              </p>
            </div>

            {/* Sub-Tabs for admin control */}
            <div className="flex border-b border-gray-150 gap-6 mt-1 mb-2 select-none shrink-0">
              <button
                type="button"
                onClick={() => setAdminActiveTab("specs")}
                className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-colors ${
                  adminActiveTab === "specs" ? "text-[#F27D26]" : "text-gray-400 hover:text-gray-650"
                }`}
              >
                Manage Recipe Specs
                {adminActiveTab === "specs" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F27D26] rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminActiveTab("leads");
                  fetchProposals();
                }}
                className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-colors flex items-center gap-1.5 ${
                  adminActiveTab === "leads" ? "text-[#F27D26]" : "text-gray-400 hover:text-gray-650"
                }`}
              >
                Client Proposals & Leads
                <span className="bg-[#F27D26]/10 text-[#F27D26] text-[10px] py-0.5 px-2 rounded-full font-bold">
                  {proposals.length}
                </span>
                {adminActiveTab === "leads" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F27D26] rounded-full" />
                )}
              </button>
            </div>

            {adminActiveTab === "specs" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? "border-[#F27D26] bg-[#F27D26]/5 scale-[0.99] shadow-inner" 
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {/* Visual success feedback overlay */}
                  <AnimatePresence>
                    {latestSuccessFile && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 bg-green-50/95 flex flex-col items-center justify-center p-4 rounded-xl border border-green-200 z-10 text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                        <p className="text-xs font-bold text-green-800">Upload & Parse Successful! 🎉</p>
                        <p className="text-[11px] text-green-600 mt-1 max-w-[240px] truncate font-medium">
                          "{latestSuccessFile}"
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2 font-light">
                          The Navigator knowledge base is fully updated.
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLatestSuccessFile(null);
                          }}
                          className="mt-3 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                        >
                          Upload Another
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <input
                    type="file"
                    id="spec-file-input"
                    multiple
                    accept=".pdf, .txt, .md"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="spec-file-input" className="cursor-pointer space-y-3 block">
                    <div className="mx-auto w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-[#F27D26]">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-700">
                        Drag & drop spec PDFs, TXT, or MD files here
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Maximum file size: 20MB. PDF text will be extracted natively.
                      </p>
                    </div>
                    <span className="inline-block px-3 py-1.5 bg-[#F27D26] text-white text-[11px] font-semibold uppercase tracking-wider rounded-lg hover:bg-[#E06D20]">
                      Browse Files
                    </span>
                  </label>
                </div>

                {/* Status and Active Specs */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block">Active Specifications</span>
                        <strong className="text-sm text-gray-800">{dbStatus?.filesCount || 0} files parsed in memory</strong>
                      </div>
                      <button
                        onClick={handleLocalSyncOnly}
                        disabled={isCompilingLocal}
                        className="px-3 py-1.5 bg-[#151619] hover:bg-[#F27D26] disabled:bg-gray-600 text-white rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 transition-all"
                      >
                        {isCompilingLocal ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        {isCompilingLocal ? "Compiling..." : "Recompile Specs"}
                      </button>
                    </div>

                    <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-xs">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Uploaded PDF / TXT Documents:</span>
                      {dbStatus?.specFiles && dbStatus.specFiles.length > 0 ? (
                        dbStatus.specFiles.map((file: { name: string; link: string }, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-2 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                            <span className="text-gray-700 truncate max-w-[200px] font-medium" title={file.name}>
                              📄 {file.name}
                            </span>
                            <a
                              href={file.link || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#F27D26] hover:text-[#E06D20] font-semibold text-[11px] flex items-center gap-0.5 whitespace-nowrap shrink-0"
                            >
                              View Specs <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 italic text-[11px] font-light leading-relaxed">
                          No recipe PDFs or wine lists uploaded yet. Upload your files in the left panel.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Queue status */}
                  {uploadQueue.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Upload Progress queue:</span>
                      <div className="max-h-[80px] overflow-y-auto space-y-1">
                        {uploadQueue.slice(-3).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-600 truncate max-w-[180px]">{item.name}</span>
                            <span className={`font-semibold ${
                              item.status === "uploading" ? "text-blue-500" :
                              item.status === "success" ? "text-green-500" : "text-red-500"
                            }`}>
                              {item.status === "uploading" && "Uploading & Parsing..."}
                              {item.status === "success" && "✓ Completed"}
                              {item.status === "error" && `✕ Failed: ${item.error}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                {proposals.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                    <p className="text-sm text-gray-400 italic">No client proposals or estimates registered on the server yet.</p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-md mx-auto">
                      Whenever a customer submits the proposal request form in Step 2, their full contact requirements and custom drink estimates will be recorded here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 max-h-[460px] overflow-y-auto pr-1">
                    {proposals.map((lead: any) => (
                      <div key={lead.id} className="bg-[#FAF8F5] border border-gray-200 rounded-2xl p-4.5 space-y-3.5 shadow-sm hover:border-gray-300 transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-200 pb-2.5">
                          <div>
                            <h4 className="font-serif text-sm font-bold text-gray-900">{lead.fullName}</h4>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              Submitted: {lead.submittedAt ? new Date(lead.submittedAt).toLocaleString() : "Date Unknown"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-between sm:justify-start">
                            <span className="bg-[#F27D26]/10 text-[#F27D26] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#F27D26]/25">
                              {lead.tierChoice || "Custom Package"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteProposal(lead.id, e)}
                              className="text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors font-medium border border-transparent hover:border-red-200"
                            >
                              ✕ Delete
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Contact Information</span>
                            <p className="text-gray-800 font-medium select-all">✉ {lead.email}</p>
                            <p className="text-gray-600 font-mono select-all">📱 {lead.phone}</p>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Logistics & Date</span>
                            <p className="text-gray-800 font-medium font-mono">📅 {lead.eventDate}</p>
                            <p className="text-gray-600 font-medium">👥 {lead.localGuests} Guests ({lead.duration})</p>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Operating Hours</span>
                            <p className="text-gray-700">🎪 Event Start: <strong className="text-gray-900">{lead.eventStartTime || "N/A"}</strong></p>
                            <p className="text-gray-600">🍺 Bar hours: <strong className="text-gray-900">{lead.barOpensAt || "N/A"}</strong> to <strong className="text-gray-900">{lead.barClosesAt || "N/A"}</strong></p>
                          </div>
                        </div>

                        <div className="text-[11px] border-t border-gray-150 pt-2.5 flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Venue Place</span>
                            <p className="text-gray-800 font-medium bg-white/70 p-2 rounded-xl border border-gray-200 mt-1 truncate" title={lead.venue}>
                              📍 {lead.venue}
                            </p>

                            {(lead.deliveryAddress || lead.deliveryWindow || lead.contactPref) && (
                              <div className="mt-2 text-[10px] space-y-1 bg-white/50 p-2 rounded-xl border border-[#e5e7eb]">
                                {lead.deliveryAddress && <p className="text-gray-700 truncate">🚚 Info: <span className="font-semibold">{lead.deliveryAddress}</span></p>}
                                {lead.deliveryWindow && <p className="text-gray-600">⏱ Window: <span className="font-semibold">{lead.deliveryWindow}</span></p>}
                                {lead.contactPref && <p className="text-gray-700">📞 Contact: <span className="font-semibold">{lead.contactPref}</span></p>}
                              </div>
                            )}
                          </div>
                          
                          {lead.specialRequests && (
                            <div className="flex-[2]">
                              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Special Notes & Quantities List</span>
                              <div className="text-[10px] text-gray-600 bg-white/70 p-2 rounded-xl border border-gray-200 mt-1 italic font-mono whitespace-pre-wrap max-h-[140px] overflow-y-auto leading-normal">
                                {lead.specialRequests}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* STEP 1: SELECT PACKAGE TIER */}
        {activeStep === 1 && (
          <motion.div
            key="step1-tier-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* INSTRUCTION ALERT */}
            <div className="bg-gradient-to-r from-[#F27D26]/10 to-transparent p-5 rounded-2xl border border-[#F27D26]/20 shadow-sm">
              <div className="flex gap-3">
                <Sparkles className="text-[#F27D26] w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-serif text-sm font-semibold text-gray-900 leading-tight">
                    🌸 Please Select a Beverage Package Tier First
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Select one of our signature liquid catering packages below. Selecting a tier displays your custom cost estimate and unlocks the official estimate request builder.
                  </p>
                </div>
              </div>
            </div>

            {/* GUEST SLIDER CONTROL */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150/60 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <label htmlFor="guest-count-range" className="text-sm font-semibold text-gray-800 uppercase tracking-wider block">
                    Estimated Guest Count
                  </label>
                  <p className="text-xs text-gray-400 italic">Adjust guests to see instant cost expectations</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                  <span className="font-monospace text-lg font-bold text-[#F27D26]">{localGuests}</span>
                  <span className="text-xs text-gray-400">Guests</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <input
                  id="guest-count-range"
                  type="range"
                  min="20"
                  max="500"
                  step="5"
                  value={localGuests}
                  onChange={(e) => setLocalGuests(Number(e.target.value))}
                  className="w-full accent-[#F27D26] h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 uppercase font-medium">
                <span>Min: 20</span>
                <span>Max: 500+</span>
              </div>
            </div>

            {errors.tier && (
              <div className="bg-red-50 text-red-700 text-xs px-4 py-2.5 rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{errors.tier}</span>
              </div>
            )}

            {/* THREE EXCLUSIVELY STYLED BRAND TIERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((pkg) => {
                const isSelected = selectedTierId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    id={`tier-card-${pkg.id}`}
                    onClick={() => handleTierSelect(pkg.id)}
                    className={`bg-white p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-sm relative overflow-hidden h-full group ${
                      isSelected 
                        ? "border-[#F27D26] ring-2 ring-[#F27D26]/20 shadow-md transform scale-[1.01]" 
                        : "border-gray-150/70 hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    {/* Upper decorative banner */}
                    <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#F27D26] to-[#E06D20] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div>
                      {/* Interactive radio checkmark bubble */}
                      <div className="flex justify-between items-start mb-4">
                        <span className="inline-block px-2.5 py-1 bg-gray-100 rounded-full text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          {pkg.tierClass}
                        </span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? "bg-[#F27D26] border-[#F27D26]" : "border-gray-300"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>

                      <h3 className="font-serif text-lg font-bold text-gray-900 mb-1 group-hover:text-[#F27D26] transition-colors">
                        {pkg.name}
                      </h3>
                      <p className="text-[11px] text-gray-400 font-medium tracking-tight mb-4 uppercase">
                        Qualitative Class: <span className="text-gray-600 font-semibold">{pkg.tierClass}</span>
                      </p>
                      
                      <p className="text-xs text-gray-500 leading-relaxed mb-6 font-normal">
                        {pkg.desc}
                      </p>

                      <div className="border-t border-gray-100 pt-5 space-y-3.5">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Sample Package Features:
                        </p>
                        <ul className="space-y-2 text-xs text-gray-600 font-light">
                          {pkg.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#F27D26] mt-0.5">•</span>
                              <span className="leading-relaxed">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-8 pt-5 border-t border-gray-100">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-gray-400">
                        Typical Estimate Rate:
                      </div>
                      <div className="text-2xl font-serif text-gray-900 mt-1 font-semibold">
                        ${pkg.min} - ${pkg.max} <span className="text-[11px] font-sans text-gray-400 font-normal">/ guest</span>
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-tighter mt-1">
                        Est. Total: {formatCurrency(localGuests * pkg.min)} - {formatCurrency(localGuests * pkg.max)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SELECTED FOOTER ACTION WIDGET */}
            <div className="bg-[#151619] text-white p-7 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] border border-gray-800">
              <div className="text-center md:text-left">
                <span className="text-[#F27D26] uppercase text-[10px] tracking-widest font-bold block mb-1">
                  {selectedTierId ? "Estimate Locked & Ready" : "Selection Status"}
                </span>
                {selectedTierId && selectedTier ? (
                  <div>
                    <h4 className="text-lg font-serif">Selected: {selectedTier.name}</h4>
                    <p className="text-xs text-gray-300 mt-1">
                      Personalized Cost Expectation for <strong className="text-[#F27D26]">{localGuests} guests</strong> is{" "}
                      <strong className="text-[#F27D26]">{formatCurrency(localGuests * selectedTier.min)} — {formatCurrency(localGuests * selectedTier.max)}</strong>
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-lg font-serif text-gray-300">No Package Tier Selected Yet</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Choose single package from the top options to calculate budget and unlock request form.
                    </p>
                  </div>
                )}
              </div>

              <div>
                {selectedTierId ? (
                  <button
                    onClick={handleNextToForm}
                    className="px-8 py-3.5 bg-[#F27D26] text-white rounded-full font-medium hover:bg-[#E06D20] transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm w-full md:w-auto shrink-0 group"
                  >
                    Continue to Official Estimate Request
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-6 py-3.5 bg-gray-800/60 rounded-full border border-gray-700/50 text-gray-400 text-xs font-semibold cursor-not-allowed select-none">
                    <Lock className="w-3.5 h-3.5" />
                    Select a Tier Above to Continue
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: OFFICIAL REQUEST PAGE */}
        {activeStep === 2 && selectedTier && (
          <motion.div
            key="step2-form-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* BACK HEADER BAR */}
            <div className="flex justify-between items-center bg-white px-5 py-3 rounded-2xl border border-gray-150/60 shadow-sm text-left">
              <button
                type="button"
                onClick={handlePrevFormStep}
                className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#F27D26] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {formStep === 1 ? "Change Selected Package Tier" : "Previous Section"}
              </button>
              <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                Section {formStep} of 4
              </span>
            </div>

            {/* SELECTION SUMMARY HEADER */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150/60 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-left">
                <p className="text-[10px] text-[#F27D26] uppercase tracking-wider font-bold">Planned Package Selected</p>
                <h3 className="font-serif text-xl font-bold text-gray-900 mt-0.5">{selectedTier.name}</h3>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-tight">
                  Designation Class: <strong className="text-gray-600">{selectedTier.tierClass}</strong>
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-left min-w-[200px]">
                <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">Estimated Total Budget</span>
                <span className="font-serif text-[#F27D26] text-xl font-semibold">
                  {formatCurrency(localGuests * selectedTier.min)} — {formatCurrency(localGuests * selectedTier.max)}
                </span>
                <p className="text-[10px] text-gray-400 uppercase mt-1 leading-none tracking-tight">For {localGuests} Visitors</p>
              </div>
            </div>

            {/* MAIN DETAILS FORM */}
            <form onSubmit={handleSubmitQuote} className="bg-white p-8 rounded-3xl border border-gray-150/60 shadow-sm space-y-6 text-left">
              
              <div className="flex justify-between items-center bg-[#FAF8F5] p-3.5 rounded-2xl border border-gray-150/80">
                <span className="text-[11px] text-[#F27D26] uppercase tracking-wider font-bold">
                  {formStep === 1 && "Section 1 of 4: Contact Credentials"}
                  {formStep === 2 && "Section 2 of 4: Event Logistics"}
                  {formStep === 3 && "Section 3 of 4: Custom Desires & Layout"}
                  {formStep === 4 && "Section 4 of 4: Next Steps & Contact Preference"}
                </span>
                <span className="text-xs text-gray-400 font-bold uppercase">
                  Step {formStep} of 4
                </span>
              </div>

              {/* SECTION 1: CONTACT LOGISTICS */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest pb-1 border-b border-gray-100">
                    Contact Credentials
                  </h4>

                  <div>
                    <label htmlFor="client-fullname" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        id="client-fullname"
                        type="text"
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (errors.fullName) {
                            const newErrors = { ...errors };
                            delete newErrors.fullName;
                            setErrors(newErrors);
                          }
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all ${
                          errors.fullName ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                        }`}
                      />
                    </div>
                    {errors.fullName && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label htmlFor="client-email" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        id="client-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) {
                            const newErrors = { ...errors };
                            delete newErrors.email;
                            setErrors(newErrors);
                          }
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all ${
                          errors.email ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="client-phone" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Cell Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        id="client-phone"
                        type="tel"
                        placeholder="+1 (000) 000-0000"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (errors.phone) {
                            const newErrors = { ...errors };
                            delete newErrors.phone;
                            setErrors(newErrors);
                          }
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all ${
                          errors.phone ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                        }`}
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.phone}</p>}
                  </div>
                </div>
              )}

              {/* SECTION 2: EVENT LOGISTICS */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest pb-1 border-b border-gray-100">
                    Event Logistics
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="event-date" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                        Event Date *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          id="event-date"
                          type="date"
                          placeholder="mm/dd/yyyy"
                          value={eventDate}
                          onChange={(e) => {
                            setEventDate(e.target.value);
                            if (errors.eventDate) {
                              const newErrors = { ...errors };
                              delete newErrors.eventDate;
                              setErrors(newErrors);
                            }
                          }}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all ${
                            errors.eventDate ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                          }`}
                        />
                      </div>
                      {errors.eventDate && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.eventDate}</p>}
                    </div>

                    <div>
                      <label htmlFor="event-guests" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                        Number of Guests *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          id="event-guests"
                          type="number"
                          placeholder="e.g. 120"
                          value={localGuests || ""}
                          onChange={(e) => {
                            setLocalGuests(Number(e.target.value));
                            if (errors.localGuests) {
                              const newErrors = { ...errors };
                              delete newErrors.localGuests;
                              setErrors(newErrors);
                            }
                          }}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all ${
                            errors.localGuests ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                          }`}
                        />
                      </div>
                      {errors.localGuests && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.localGuests}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="event-venue" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Venue & City / County *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        id="event-venue"
                        type="text"
                        placeholder="Venue name and city or county"
                        value={venue}
                        onChange={(e) => {
                          setVenue(e.target.value);
                          if (errors.venue) {
                            const newErrors = { ...errors };
                            delete newErrors.venue;
                            setErrors(newErrors);
                          }
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all ${
                          errors.venue ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                        }`}
                      />
                    </div>
                    {errors.venue && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.venue}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="event-start-time" className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1 truncate" title="Event Start Time">
                        Event Start Time *
                      </label>
                      <input
                        id="event-start-time"
                        type="text"
                        placeholder="e.g. 4:00 PM"
                        value={eventStartTime}
                        onChange={(e) => {
                          setEventStartTime(e.target.value);
                          if (errors.eventStartTime) {
                            const newErrors = { ...errors };
                            delete newErrors.eventStartTime;
                            setErrors(newErrors);
                          }
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-sans placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all ${
                          errors.eventStartTime ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                        }`}
                      />
                      {errors.eventStartTime && <p className="text-red-500 text-[10px] mt-0.5 font-medium">{errors.eventStartTime}</p>}
                    </div>

                    <div>
                      <label htmlFor="bar-opens-at" className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1 truncate" title="Bar Opens At">
                        Bar Opens At *
                      </label>
                      <input
                        id="bar-opens-at"
                        type="text"
                        placeholder="e.g. 4:30 PM"
                        value={barOpensAt}
                        onChange={(e) => {
                          setBarOpensAt(e.target.value);
                          if (errors.barOpensAt) {
                            const newErrors = { ...errors };
                            delete newErrors.barOpensAt;
                            setErrors(newErrors);
                          }
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-sans placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all ${
                          errors.barOpensAt ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                        }`}
                      />
                      {errors.barOpensAt && <p className="text-red-500 text-[10px] mt-0.5 font-medium">{errors.barOpensAt}</p>}
                    </div>

                    <div>
                      <label htmlFor="bar-closes-at" className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1 truncate" title="Bar Closes At">
                        Bar Closes At *
                      </label>
                      <input
                        id="bar-closes-at"
                        type="text"
                        placeholder="e.g. 10:00 PM"
                        value={barClosesAt}
                        onChange={(e) => {
                          setBarClosesAt(e.target.value);
                          if (errors.barClosesAt) {
                            const newErrors = { ...errors };
                            delete newErrors.barClosesAt;
                            setErrors(newErrors);
                          }
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-sans placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all ${
                          errors.barClosesAt ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                        }`}
                      />
                      {errors.barClosesAt && <p className="text-red-500 text-[10px] mt-0.5 font-medium">{errors.barClosesAt}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="event-duration" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Estimated Beverage Hours
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select
                        id="event-duration"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-sans bg-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 focus:border-[#F27D26] appearance-none"
                      >
                        <option value="2 Hours">2 Hours</option>
                        <option value="3 Hours">3 Hours</option>
                        <option value="4 Hours">4 Hours</option>
                        <option value="5 Hours">5 Hours</option>
                        <option value="6 Hours">6 Hours (Full Service)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: SPECIAL REQUIREMENTS */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest pb-1 border-b border-gray-100">
                    Custom Desires & Special Requests *
                  </h4>
                  <div className="bg-[#FAF8F5] p-4 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed mb-2 font-light">
                    📋 <span className="font-semibold text-gray-800">Curation Note:</span> Review or list your custom beverage selections below. This field is required to finalize your draft menu.
                  </div>
                  <div>
                    <label htmlFor="special-requests" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Custom Desires, Liquor Brands, & Cocktail Requests *
                    </label>
                    <textarea
                      id="special-requests"
                      rows={5}
                      placeholder="Please specify specific wines, signature cocktails (e.g. Espresso Martinis, Mojito bar), or favorite bourbon/tequilas you wish to highlight."
                      value={specialRequests}
                      onChange={(e) => {
                        setSpecialRequests(e.target.value);
                        setHasChangedRequestsManually(true);
                        if (errors.specialRequests) {
                          const newErrors = { ...errors };
                          delete newErrors.specialRequests;
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full text-sm font-sans p-4 rounded-xl border placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 transition-all leading-relaxed ${
                        errors.specialRequests ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#F27D26]"
                      }`}
                    />
                    {errors.specialRequests && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.specialRequests}</p>}
                  </div>
                </div>
              )}

              {/* SECTION 4: NEXT STEPS & LOGISTICS */}
              {formStep === 4 && (
                <div className="space-y-5">
                  <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest pb-1 border-b border-gray-100">
                    Next Steps, Delivery & Contact Preference
                  </h4>

                  {/* Delivery window pills */}
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                      Preferred Delivery Window
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        "10am – 12pm",
                        "12pm – 2pm",
                        "2pm – 4pm",
                        "4pm – 6pm",
                        "Sunday Pre-Delivery (Day Before)"
                      ].map((win) => {
                        const isSel = deliveryWindow === win;
                        return (
                          <button
                            key={win}
                            type="button"
                            onClick={() => setDeliveryWindow(win)}
                            className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                              isSel 
                                ? "bg-[#F27D26]/15 hover:bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]" 
                                : "bg-white hover:bg-gray-50 text-gray-550 border-gray-200"
                            }`}
                          >
                            {win}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery address input */}
                  <div>
                    <label htmlFor="delivery-address" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Delivery Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        id="delivery-address"
                        type="text"
                        placeholder="e.g. Venue delivery address or corporate office details"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-sans placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 focus:border-[#F27D26] transition-all"
                      />
                    </div>
                  </div>

                  {/* Preferred way to connect selection */}
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                      Preferred Way to Connect
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {["Email", "Phone call", "Text"].map((pref) => {
                        const isSel = contactPref === pref;
                        return (
                          <button
                            key={pref}
                            type="button"
                            onClick={() => setContactPref(pref)}
                            className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                              isSel 
                                ? "bg-[#F27D26]/15 hover:bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]" 
                                : "bg-white hover:bg-gray-50 text-gray-550 border-gray-200"
                            }`}
                          >
                            {pref}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* NAVIGATION ACTION ROW (Back, Continue/Submit) */}
              <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  {formStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevFormStep}
                      className="text-xs font-bold text-gray-550 hover:text-[#F27D26] transition-colors border border-gray-200 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 shadow-sm"
                    >
                      &larr; Previous Section
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {formStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextFormStep}
                      className="w-full sm:w-auto px-8 py-3.5 bg-[#F27D26] text-white rounded-full font-medium hover:bg-[#E06D20] transition-colors flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg text-sm shrink-0 min-w-[200px]"
                    >
                      Next Section
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-3.5 bg-[#F27D26] text-white rounded-full font-medium hover:bg-[#E06D20] transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm shrink-0 min-w-[220px]"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Registering Lead...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          Submit Estimate Request
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </form>
          </motion.div>
        )}

        {/* STEP 3: SUCCESS STATE RECEIVED */}
        {activeStep === 3 && selectedTier && (
          <motion.div
            key="step3-success-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white p-8 md:p-12 rounded-3xl border border-gray-150/60 shadow-lg space-y-8 text-center"
          >
            {/* LARGE HEADER SUCCESS HERO */}
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center p-4 bg-green-50 text-green-500 rounded-full mb-2 animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif text-gray-900 tracking-tight">
                Official Estimate Proposal Registered! 🌸
              </h2>
              <p className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed font-light">
                Thank you, <strong className="font-semibold text-gray-800">{fullName}</strong>. Your customized event planning profile has been securely recorded inside the Pathfinder Client Service dashboard.
              </p>
            </div>

            {/* CURATED ORDER DETAILS TICKET */}
            <div className="max-w-xl mx-auto bg-[#FAF8F5] border border-gray-200/60 rounded-3xl p-6 text-left relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-3 bg-gradient-to-l from-green-50 to-transparent text-[10px] text-green-600 font-bold uppercase tracking-wider rounded-bl-xl border-l border-b border-gray-100">
                PENDING REVIEW
              </div>

              <h4 className="text-[10px] font-bold text-[#F27D26] uppercase tracking-widest mb-4">
                Curated Event Proposal Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs text-gray-600">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Package Tier Choice</span>
                  <strong className="text-gray-900 text-sm font-serif">{selectedTier.name}</strong>
                  <span className="text-[10px] text-gray-400 capitalize block mt-0.5">({selectedTier.tierClass})</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Estimated Guest Load</span>
                  <strong className="text-gray-900 text-sm font-serif">{localGuests} Clients</strong>
                </div>

                <div className="border-t border-gray-150/50 pt-3.5 mt-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Event Date</span>
                  <strong className="text-gray-900 text-sm">{eventDate}</strong>
                </div>

                <div className="border-t border-gray-150/50 pt-3.5 mt-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Duration Requested</span>
                  <strong className="text-gray-900 text-sm">{duration}</strong>
                </div>

                <div className="border-t border-gray-150/50 pt-3.5 mt-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Event Start Time</span>
                  <strong className="text-gray-900 text-sm">{eventStartTime}</strong>
                </div>

                <div className="border-t border-gray-150/50 pt-3.5 mt-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Bar Opens At</span>
                  <strong className="text-gray-900 text-sm">{barOpensAt}</strong>
                </div>

                <div className="border-t border-gray-150/50 pt-3.5 mt-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Bar Closes At</span>
                  <strong className="text-gray-900 text-sm">{barClosesAt}</strong>
                </div>

                <div className="border-t border-gray-150/50 pt-3.5 mt-1 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Venue Name</span>
                  <strong className="text-gray-900 text-sm font-sans">{venue}</strong>
                </div>

                <div className="border-t border-gray-150/50 pt-3.5 mt-1 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Staff Notification Delivery Destination</span>
                  <strong className="text-gray-900 text-sm block font-sans break-all">{email}</strong>
                  <span className="text-[11px] text-gray-400 block mt-0.5">{phone}</span>
                </div>

                {deliveryWindow && (
                  <div className="border-t border-gray-150/50 pt-3.5 mt-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Preferred Delivery Window</span>
                    <strong className="text-gray-900 text-sm">{deliveryWindow}</strong>
                  </div>
                )}

                {contactPref && (
                  <div className="border-t border-gray-150/50 pt-3.5 mt-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Connect Preference</span>
                    <strong className="text-gray-900 text-sm">{contactPref}</strong>
                  </div>
                )}

                {deliveryAddress && (
                  <div className="border-t border-gray-150/50 pt-3.5 mt-1 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Delivery Address</span>
                    <strong className="text-gray-900 text-sm font-sans">{deliveryAddress}</strong>
                  </div>
                )}

                {specialRequests.trim() && (
                  <div className="border-t border-gray-150/50 pt-3.5 mt-1 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Custom Desires Log</span>
                    <p className="text-xs text-gray-500 mt-1 italic leading-relaxed bg-white/70 p-3 rounded-xl border border-gray-100 font-sans font-normal">
                      "{specialRequests}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* NEXT BUSINESS LOGISTICS INSTRUCTIONS */}
            <div className="max-w-xl mx-auto text-left space-y-3.5 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h5 className="text-[11px] uppercase tracking-wider font-bold text-gray-700">What happens next?</h5>
              <ol className="list-decimal list-inside text-xs text-gray-600 space-y-2 leading-relaxed font-light">
                <li>
                  <strong className="font-semibold text-gray-800">Proposal Custom Build</strong>: A Pathfinder staff specialist in Austin will look at your date, venue requirements, and selected <strong className="font-semibold">{selectedTier.name}</strong> tier.
                </li>
                <li>
                  <strong className="font-semibold text-gray-800">Menu Draft Sent</strong>: Within 2-4 business hours, you will receive an elegant interactive excel estimate containing a bespoke menu layout with specific brand variations mapped to your desires.
                </li>
                <li>
                  <strong className="font-semibold text-gray-800">Coordination Calls</strong>: We sync up with you regarding deliveries, return restocking allowances, payments, and case options.
                </li>
              </ol>
            </div>

            {/* ACTION FOOTER BUTTONS */}
            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                onClick={handleReset}
                className="px-8 py-3.5 bg-gray-[#151619] bg-[#151619] text-white rounded-full font-medium hover:bg-gray-800 transition-colors shadow-sm text-sm shrink-0 min-w-[200px]"
              >
                Plan Another Event
              </button>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                Austin • Travis County • Hays County
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Statement */}
      <div className="text-center pt-8 border-t border-gray-200/60 mt-4">
        <p className="font-serif italic text-lg text-gray-600 tracking-wide">
          "Cheers to navigating life's greatest celebrations."
        </p>
      </div>
    </div>
  );
}
