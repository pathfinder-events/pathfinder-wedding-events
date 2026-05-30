var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_fs = __toESM(require("fs"), 1);
var import_googleapis = require("googleapis");
var import_module = require("module");
var import_meta = {};
var requireDynamic = (0, import_module.createRequire)(import_meta.url);
var rawPdfParse = requireDynamic("pdf-parse");
var pdf = typeof rawPdfParse === "function" ? rawPdfParse : rawPdfParse && typeof rawPdfParse.default === "function" ? rawPdfParse.default : rawPdfParse;
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var getSpreadsheetId = () => {
  const rawId = process.env.GOOGLE_SHEET_ID || "1nma2XkirkD_11V9e-zYb_TBlJKFj0k7MUrSfmQAbqHs";
  const trimmed = rawId.trim().replace(/^["']|["']$/g, "");
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_\s]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
};
async function fetchProductsFromSheets(accessToken) {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    console.error("GOOGLE_SHEET_ID is not configured in the environment variables.");
    return null;
  }
  const auth = new import_googleapis.google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const sheets = import_googleapis.google.sheets({ version: "v4", auth });
  try {
    let sheetName = "Sheet1";
    try {
      const metadata = await sheets.spreadsheets.get({
        spreadsheetId
      });
      const sheetsList = metadata.data.sheets;
      if (sheetsList && sheetsList.length > 0 && sheetsList[0].properties?.title) {
        sheetName = sheetsList[0].properties.title;
        console.log(`Dynamically found first sheet title: "${sheetName}" for spreadsheet ID "${spreadsheetId}"`);
      }
    } catch (metaError) {
      console.warn(`Could not retrieve spreadsheet metadata dynamically for ID "${spreadsheetId}", defaulting to 'Sheet1':`, metaError);
    }
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z`
      // Fetch from the first sheet's actual name to prevent 404
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("No data found in spreadsheet.");
      return [];
    }
    let hasHeader = false;
    let headers = [];
    let dataRows = [];
    if (rows && rows.length > 0) {
      const firstRow = rows[0].map((h) => (h || "").toString().trim().toLowerCase());
      const headerKeywords = [
        "item code",
        "code",
        "sku",
        "id",
        "product name",
        "product",
        "name",
        "title",
        "category",
        "class",
        "product class",
        "size",
        "volume",
        "average price",
        "price",
        "cost",
        "focus product",
        "focus",
        "priority",
        "vintage",
        "year",
        "tasting notes",
        "notes",
        "description"
      ];
      const matchedColumnsCount = firstRow.filter(
        (cell) => headerKeywords.some((keyword) => cell.includes(keyword))
      ).length;
      if (matchedColumnsCount >= 2) {
        hasHeader = true;
      }
    }
    if (hasHeader) {
      headers = rows[0].map((h) => h.toString().trim().toLowerCase());
      dataRows = rows.slice(1);
    } else {
      headers = [
        "item code",
        "product name",
        "category",
        "product class",
        "size",
        "average price",
        "focus product",
        "vintage",
        "tasting notes"
      ];
      dataRows = rows;
    }
    const findIndex = (aliases) => {
      return headers.findIndex((h) => aliases.some((alias) => h.includes(alias)));
    };
    const itemCodeIdx = findIndex(["item code", "code", "sku"]);
    const nameIdx = findIndex(["product name", "product", "name", "title"]);
    const categoryIdx = findIndex(["category", "type", "class"]);
    const productClassIdx = findIndex(["product class", "class", "tier"]);
    const sizeIdx = findIndex(["size", "volume", "bottle size"]);
    const priceIdx = findIndex(["average price", "price", "cost"]);
    const focusIdx = findIndex(["focus product", "focus", "priority"]);
    const vintageIdx = findIndex(["vintage", "year"]);
    const notesIdx = findIndex(["tasting notes", "notes", "description"]);
    return dataRows.map((row) => {
      const itemCode = itemCodeIdx !== -1 ? row[itemCodeIdx] : row[0] || "";
      const productName = nameIdx !== -1 ? row[nameIdx] : row[1] || "";
      const category = categoryIdx !== -1 ? row[categoryIdx] : row[2] || "";
      const productClass = productClassIdx !== -1 ? row[productClassIdx] : row[3] || "";
      const size = sizeIdx !== -1 ? row[sizeIdx] : row[4] || "";
      const averagePrice = priceIdx !== -1 ? row[priceIdx] : row[5] || "";
      const focusProduct = focusIdx !== -1 ? row[focusIdx] : row[6] || "N";
      const vintage = vintageIdx !== -1 ? row[vintageIdx] : "";
      const tastingNotes = notesIdx !== -1 ? row[notesIdx] : "";
      return {
        "Item Code": itemCode || "",
        "Product Name": productName || "",
        "Category": category || "",
        "Product Class": productClass || "",
        "Size": size || "",
        "Average Price": averagePrice || "",
        "Focus Product": (focusProduct || "").toString().trim().toUpperCase() === "Y" ? "Y" : "N",
        "Vintage": vintage || "",
        "Tasting Notes": tastingNotes || ""
      };
    });
  } catch (error) {
    console.error("Error fetching from sheets:", error);
    throw error;
  }
}
async function parseLocalSpecifications() {
  const specsDir = import_path.default.join(process.cwd(), "public", "specs");
  if (!import_fs.default.existsSync(specsDir)) {
    try {
      import_fs.default.mkdirSync(specsDir, { recursive: true });
    } catch (e) {
      console.error("Error creating public/specs folder:", e);
      return [];
    }
  }
  const processedFiles = [];
  try {
    const files = import_fs.default.readdirSync(specsDir);
    for (const filename of files) {
      if (filename === "instructions.txt") {
        continue;
      }
      const filePath = import_path.default.join(specsDir, filename);
      const stat = import_fs.default.statSync(filePath);
      if (stat.isDirectory()) {
        continue;
      }
      const ext = import_path.default.extname(filename).toLowerCase();
      let extractedText = "";
      let mtype = "application/octet-stream";
      console.log(`Loading local specification file: "${filename}"`);
      try {
        if (ext === ".pdf") {
          mtype = "application/pdf";
          const buffer = import_fs.default.readFileSync(filePath);
          if (typeof pdf === "function") {
            try {
              const parsedPdf = await pdf(buffer);
              extractedText = (parsedPdf.text || "").substring(0, 12e3);
              console.log(`Successfully parsed PDF "${filename}": extracted ${extractedText.length} characters.`);
            } catch (pdfErr) {
              console.error(`Failed during pdf-parse library call for "${filename}":`, pdfErr);
              extractedText = `[PDF Content unreadable: ${pdfErr.message || pdfErr}]`;
            }
          } else {
            console.warn(`Local PDF parser is not a function (resolved type: ${typeof pdf}). Defaulting to filename context.`);
            extractedText = `[PDF File: ${filename}]`;
          }
        } else if (ext === ".txt" || ext === ".md") {
          mtype = ext === ".md" ? "text/markdown" : "text/plain";
          extractedText = import_fs.default.readFileSync(filePath, "utf-8").substring(0, 12e3);
          console.log(`Successfully loaded text file "${filename}": ${extractedText.length} characters.`);
        } else {
          console.log(`Skipping unsupported local file type for "${filename}"`);
          continue;
        }
        processedFiles.push({
          id: filename,
          name: filename,
          mimeType: mtype,
          webViewLink: `/specs/${encodeURIComponent(filename)}`,
          folderName: "Local Specs",
          extractedText
        });
      } catch (err) {
        console.error(`Error processing file "${filename}":`, err.message || err);
      }
    }
  } catch (err) {
    console.error("Error reading local specifications folder:", err);
  }
  return processedFiles;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "20mb" }));
  app.use(import_express.default.urlencoded({ limit: "20mb", extended: true }));
  const productsPath = import_path.default.join(process.cwd(), "src/data/products.json");
  let products = [];
  if (import_fs.default.existsSync(productsPath)) {
    products = JSON.parse(import_fs.default.readFileSync(productsPath, "utf-8"));
  }
  const descriptionsPath = import_path.default.join(process.cwd(), "src/data/descriptions.json");
  let descriptions = [];
  try {
    const localSpecs = await parseLocalSpecifications();
    if (localSpecs && localSpecs.length > 0) {
      descriptions = localSpecs;
      import_fs.default.writeFileSync(descriptionsPath, JSON.stringify(descriptions, null, 2));
    } else if (import_fs.default.existsSync(descriptionsPath)) {
      descriptions = JSON.parse(import_fs.default.readFileSync(descriptionsPath, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to parse local specifications on startup:", err);
    if (import_fs.default.existsSync(descriptionsPath)) {
      try {
        descriptions = JSON.parse(import_fs.default.readFileSync(descriptionsPath, "utf-8"));
      } catch (e) {
      }
    }
  }
  const varietalsPath = import_path.default.join(process.cwd(), "src/data/varietals.json");
  let varietals = [];
  if (import_fs.default.existsSync(varietalsPath)) {
    varietals = JSON.parse(import_fs.default.readFileSync(varietalsPath, "utf-8"));
  }
  app.post("/api/sync-sheets", async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    try {
      console.log("Starting hybrid sync: compiling sheets products & local specification files...");
      const newProducts = await fetchProductsFromSheets(accessToken);
      if (newProducts) {
        products = newProducts;
        import_fs.default.writeFileSync(productsPath, JSON.stringify(products, null, 2));
      }
      let filesCount = 0;
      try {
        const newDescriptions = await parseLocalSpecifications();
        if (newDescriptions && newDescriptions.length > 0) {
          descriptions = newDescriptions;
          import_fs.default.writeFileSync(descriptionsPath, JSON.stringify(descriptions, null, 2));
          filesCount = descriptions.length;
        }
      } catch (driveErr) {
        console.error("Failed to compile local specifications during sync:", driveErr);
      }
      return res.json({
        status: "success",
        count: products.length,
        filesCount
      });
    } catch (err) {
      console.error("Error in sync route:", err);
      const currentSpreadsheetId = getSpreadsheetId();
      let errMsg = err.message || "Unknown error occurred";
      if (err.status === 404 || errMsg.toLowerCase().includes("not found") || errMsg.toLowerCase().includes("entity was not found")) {
        errMsg = `Google Spreadsheet Not Found (404) for ID: "${currentSpreadsheetId}". Please check that GOOGLE_SHEET_ID is correct in the Settings menu and that it is fully published/accessible.`;
      } else if (err.status === 403 || errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("forbidden")) {
        errMsg = `Permission Denied (403) accessing ID: "${currentSpreadsheetId}". Please confirm access permissions or update the spreadsheet ID in settings.`;
      }
      return res.status(500).json({ error: errMsg });
    }
  });
  app.post("/api/sync-local", async (req, res) => {
    try {
      console.log("Compiling local specification files ONLY...");
      const newDescriptions = await parseLocalSpecifications();
      descriptions = newDescriptions;
      const dPath = import_path.default.join(process.cwd(), "src/data/descriptions.json");
      import_fs.default.writeFileSync(dPath, JSON.stringify(descriptions, null, 2));
      return res.json({
        status: "success",
        filesCount: descriptions.length
      });
    } catch (err) {
      console.error("Local sync compile error:", err);
      return res.status(500).json({ error: err.message || "Failed to compile local specifications" });
    }
  });
  app.post("/api/upload-spec", async (req, res) => {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: "fileName and fileData (base64) are required" });
    }
    try {
      const specsDir = import_path.default.join(process.cwd(), "public", "specs");
      if (!import_fs.default.existsSync(specsDir)) {
        import_fs.default.mkdirSync(specsDir, { recursive: true });
      }
      const safeName = import_path.default.basename(fileName);
      const buffer = Buffer.from(fileData, "base64");
      import_fs.default.writeFileSync(import_path.default.join(specsDir, safeName), buffer);
      console.log(`Successfully uploaded specification file: ${safeName} (${buffer.length} bytes) to public/specs/`);
      const newSpecs = await parseLocalSpecifications();
      descriptions = newSpecs;
      const dPath = import_path.default.join(process.cwd(), "src/data/descriptions.json");
      import_fs.default.writeFileSync(dPath, JSON.stringify(descriptions, null, 2));
      return res.json({
        status: "success",
        message: `Successfully uploaded ${safeName}`,
        filesCount: descriptions.length
      });
    } catch (err) {
      console.error("Error uploading local specification:", err);
      return res.status(500).json({ error: err.message || "Failed to upload and compile specification" });
    }
  });
  app.get("/api/db-status", (req, res) => {
    const lastUpdated = import_fs.default.existsSync(productsPath) ? import_fs.default.statSync(productsPath).mtime : null;
    const filesLastUpdated = import_fs.default.existsSync(descriptionsPath) ? import_fs.default.statSync(descriptionsPath).mtime : null;
    res.json({
      count: products.length,
      lastUpdated,
      filesCount: descriptions.length,
      filesLastUpdated,
      specFiles: descriptions.map((d) => ({ name: d.name, link: d.webViewLink }))
    });
  });
  const proposalsPath = import_path.default.join(process.cwd(), "src/data/proposals.json");
  app.get("/api/proposals", (req, res) => {
    try {
      let proposals = [];
      if (import_fs.default.existsSync(proposalsPath)) {
        proposals = JSON.parse(import_fs.default.readFileSync(proposalsPath, "utf-8"));
      }
      res.json(proposals);
    } catch (err) {
      console.error("Error loading proposals:", err);
      res.status(500).json({ error: "Failed to load proposals" });
    }
  });
  app.post("/api/proposals", (req, res) => {
    try {
      const newProposal = req.body;
      if (!newProposal.fullName || !newProposal.email) {
        return res.status(400).json({ error: "Full Name and Email are required." });
      }
      newProposal.submittedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (!newProposal.id) {
        newProposal.id = Date.now().toString();
      }
      let proposals = [];
      if (import_fs.default.existsSync(proposalsPath)) {
        try {
          proposals = JSON.parse(import_fs.default.readFileSync(proposalsPath, "utf-8"));
        } catch (e) {
          proposals = [];
        }
      }
      proposals.push(newProposal);
      const dataDir = import_path.default.dirname(proposalsPath);
      if (!import_fs.default.existsSync(dataDir)) {
        import_fs.default.mkdirSync(dataDir, { recursive: true });
      }
      import_fs.default.writeFileSync(proposalsPath, JSON.stringify(proposals, null, 2));
      res.status(201).json({ status: "success", proposal: newProposal });
    } catch (err) {
      console.error("Error saving proposal:", err);
      res.status(500).json({ error: "Failed to save proposal" });
    }
  });
  app.delete("/api/proposals/:id", (req, res) => {
    try {
      const { id } = req.params;
      if (!import_fs.default.existsSync(proposalsPath)) {
        return res.status(404).json({ error: "No proposals exist yet" });
      }
      let proposals = JSON.parse(import_fs.default.readFileSync(proposalsPath, "utf-8"));
      const initialLength = proposals.length;
      proposals = proposals.filter((p) => p.id !== id);
      import_fs.default.writeFileSync(proposalsPath, JSON.stringify(proposals, null, 2));
      res.json({ status: "success", deletedCount: initialLength - proposals.length });
    } catch (err) {
      console.error("Error deleting proposal:", err);
      res.status(500).json({ error: "Failed to delete proposal" });
    }
  });
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
  }
  const ai = new import_genai.GoogleGenAI({
    apiKey: GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
  const getSystemInstruction = (extraInstruction) => `
    ROLE & VOICE IDENTITY:
    You are the "Pathfinder Navigator"\u2014a legendary wine and beverage curator with a lifetime in the hospitality trenches. Your career started at age 17 scrubbing dishes and working the cold side of a fine dining kitchen. You've done it all: waited tables in chaotic Mexican joints, served as a dining room captain at a 5-star country club, bought wine as a Maitre D' for an elite steakhouse, managed top-tier city restaurants, and ran luxury operations as a Banquet Manager and Yacht Club Food & Beverage Director. Later, you mastered the corporate side as a fine wine specialist for the largest distributors, managed high-end tasting rooms, and served as a National Sales Manager for an exclusive estate winery.

    You have seen every wedding triumph and disaster imaginable. Your tone is warm, deeply collaborative, effortlessly confident, and entirely pressure-free. You don't grill the client; you offer "subtle hints" and "insider insights" from your decades in the game, letting them discover their perfect blueprint at their own pace.

    CRITICAL GUARDRAILS:
    1. NEVER display a sterile numbered checklist. Introduce topics conversationally, one phase at a time.
    2. If a client skips a suggestion or doesn't know an answer, adapt gracefully. No fields are "required" in this conversational mockup phase.
    3. Your ultimate goal is to subtly guide them through these insights so they are perfectly primed to fill out Sections 1 through 4 of the official Pathfinder Questionnaire.
    4. MANDATORY INTERACTIVE PRODUCT ACTION MARKUP: When recommending, describing, or listing specific bottles or products from the Pathfinder Product Master under Phase 4 or if asked, you MUST append a specific instruction token immediately after the bottle's name. This allows the client to click it to add to their custom quote.
       Format constraint: [ADD_PRODUCT: Item Code | Product Name | Size | Category]
       Example: "I recommend pairing this with the elegant **Balcones Whiskey Baby Blue** [ADD_PRODUCT: 138128 | Balcones Whiskey Baby Blue | 750ml | Liquor] for its smooth finish."
       Make sure you use the exact 'Item Code', 'Product Name', 'Size', and 'Category' found in the Product JSON. Do NOT wrap this bracket token in asterisks, and do NOT alter the spellings.

    CONVERSATIONAL WATERFALL SEQUENCE:

    PHASE 1: THE LOGISTICAL ANCHORS (Maps to Questionnaire Section 1)
    - Subtle Hint Approach: Welcome them. Explain that after a lifetime running banquets, you know the calendar and clock dictate everything on the floor.
    - Topics to gently uncover:
      * The exact event date, start time, and when the bar physically opens and closes.
      * The venue name, city, and crucially, the COUNTY (remind them with a wink that county lines dictate local liquor permit laws).
      * Do they have an event coordinator, or do they need a recommendation for one? (Remind them a good coordinator keeps the bar timeline on track).
      * Are they hosting a rehearsal dinner that needs its own mini-beverage strategy?

    PHASE 2: THE METRICS, VIBE & FOOD (Maps to Questionnaire Section 2)
    - Subtle Hint Approach: Frame this around the atmosphere and the palate. Use your specific seasonal and demographic wisdom here.
    - Topics to gently uncover:
      * Guest count and their overall target budget framework.
      * The Guest Age Group & Vibe: Drop your veteran wisdom. If it's a mature, wine-focused group, suggest premium pours and lighter beer. If it's a younger crowd, suggest weaving in refreshing seltzers, Margaritas, trendy cocktails, local craft IPAs, and scaling back the heavy wine counts.
      * Seasonality Weather Hints: If it's a mid-summer wedding, casually suggest keeping selections light, crisp, and refreshing (effervescent whites, bright mixed drinks). If it's fall or winter, suggest steering toward richer cocktails, heavier beers, and bold, comforting red and white wines.
      * The Menu: Ask about the food and whether there will be passed hors d'oeuvres, explaining that the bar blueprint should always shake hands beautifully with what's on the plate.

    PHASE 3: THE FLOW of the NIGHT (Maps to Questionnaire Section 3)
    - Subtle Hint Approach: Talk about the pacing of a great evening\u2014the choreography of the hospitality flow.
    - Topics to gently uncover:
      * Will there be a formal cocktail hour? Are we doing "arrival drinks" served right before the ceremony to set an immediate celebratory tone?
      * The Toast: Do they want a formal sparkling wine toast? Suggest the stylistic differences: Are they looking for authentic French Champagne, crisp Spanish Cava, or crowd-pleasing Italian Prosecco? Or would they prefer guests just toast with whatever they're currently holding?
      * Table Service: Will wine be served directly at the tables during dinner, or will guests head to the main bar? (Hint to them that table service alters bottle-count pacing).

    PHASE 4: THE LIQUOR BACKBONE & VARIETALS (Maps to Questionnaire Section 4)
    - Subtle Hint Approach: Step into your master sommelier and distributor shoes. Offer to take the heavy lifting off their shoulders.
    - Topics to gently uncover:
      * Bar Style: Full open bar, beer and wine only, or a custom curated mix? Any specific liquor preferences?
      * Seltzers, Beers & Ros\xE9: Do they want to include them? Proactively offer: "Would you like Pathfinder to come up with some tailored choices and specific selections for you?"
      * The Wine Varietals (Whites & Reds): Ask what they enjoy, but always leave the door wide open for your expertise: "Would you like Pathfinder to choose some specific high-value varietals for you?"
      * Mixers & Non-Alcoholic options.
      * The Ice Disclaimer: Drop a practical veteran reminder\u2014if ice is needed, always suggest reaching out to a dedicated local vendor early so it's fresh and plentiful on the day.

    PHASE 5: THE FINAL CLOSE & PROPAGATE PROMPT (LOGISTICS & THE FINAL HAND-OFF)
    - Objective: Clearly lay out the purchasing rules, payment methods, delivery windows, and return policies, then guide the user to input their mockup details into the official questionnaire.
    - Suggestive AI Approach: Deliver these logistical rules with complete confidence. Frame them as consumer-friendly tips that save them money and reduce stress.
    - Once the mockup on the screen reflects this beautiful, personalized vision, celebrate what you've built together. Tell them they can print out this custom mockup summary right now for their records. Then, deliver the closing call-to-action to transition them to the structured form.

    [MANDATORY CLOSING TEMPLATE]:
    "Now that we\u2019ve dialed in a spectacular blueprint, let\u2019s talk about how the real-world logistics look when we move from this mockup to your formal proposal. I\u2019ve been handling order departments and delivery lines for decades, and we have this down to a science so you don't have to stress about a single detail:

    \u2022 Smart Pricing & Discounts: Your interactive mockup shows baseline credit card pricing, and we automatically apply case discounts for bulk purchases. But here's an insider tip: if you pay in-store using cash or a debit card, you\u2019ll receive an additional 5% off, on top of any active in-store discounts. 
    
    \u2022 Confirmation & Payment: We lock in your order confirmation and full payment the week before your event. You can easily pay over the phone with a credit card or head into the store with a debit card/cash\u2014just make sure it runs directly through our dedicated Orders Department. I\u2019ll send you friendly reminder emails a week before each deadline is due, so absolutely nothing slips through the cracks.

    \u2022 Delivery Windows: We deliver Monday through Saturday in tidy two-hour blocks (10 AM\u201312 PM, 12 PM\u20132 PM, 2 PM\u20134 PM, or 4 PM\u20136 PM). Delivery fees start at just $12 plus $1 per case (a typical order runs right around $45 total). Sidetracked by a Sunday wedding? Don't sweat it\u2014we'll arrange your delivery for the day before so it's safely on-site.

    \u2022 Easy Returns: If you over-purchase, you have a full month after the event to return any un-opened bottles in pristine condition. A standard 10% restocking fee applies, and you can drop them off at any location within the county. Best of all? I keep a digital copy of your receipt safely on file, so if you misplace yours in the post-wedding whirlwind, I've got you covered.

    I\u2019ve updated your interactive ballpark mockup on the screen with all of these custom criteria, and you can print a hard copy right now for your planning binder. 

    To officially save this design and lock in your formal beverage proposal, the final step is to take these details and head over to our Official Questionnaire page. It\u2019s cleanly broken down into Sections 1 through 4 to match the journey we just took:
    
    \u2022 Section 1: Your Baseline Setting & Flow (Dates, times, and venue lines)
    \u2022 Section 2: Guest Metrics & Volume (Counts, budget, and menu style)
    \u2022 Section 3: Custom Allocation & Style Ratios (Toasts, arrival drinks, and table flow)
    \u2022 Section 4: Your Signature Touches & Final Add-Ons (Varietals, spirits, and selections)
    
    It takes less than three minutes to move through, and it ensures your exact vision hits our system flawlessly. Whenever you're ready, click through to Section 1 and let's make it official!"

    BEER FORMAT GUIDANCE: When clients request beer, you MUST suggest canned beer as the best option. Additionally, advise them that for a wedding bar, it is far better and recommended to have either all canned beer or all bottled beer (not mixing formats) for cohesive bar service, chilling, and cleanup.
    
    CAPABILITIES & LOGISTICS POLICIES:
    1. Provide expert info on grape varietals, food pairings, regional styles (Bordeaux, Piedmont, etc.), and liquor profiles.
    2. Suggest specialty cocktails and signature drinks based on client tastes.
    3. Explain company policies and Next Steps & Logistics:
       - Pricing: Estimated pricing is credit card pricing. Case purchases receive case discounts. Cash or debit card payment in-store receives an additional 5% off plus any in-store discounts.
       - Confirmation & Payment: Full payment and order confirmation are required the week before the event. Order confirmation is needed at this time to allow sufficient time to place required purchase orders and complete store transfers to bring the order together properly. Payments can be made in-store with a debit card or over the phone with a credit card.
       - Delivery: Delivery windows are Mon-Sat 10am-12pm, 12-2pm, 2-4pm, and 4-6pm. The delivery fee starts at $25 + $1 per case (typically around $45 total). Sunday delivery is available the day before the event upon request.
       - Returns: Returns of items in pristine condition are accepted within one month of the event at any location. A 10% restocking fee applies. No returns on opened liquor. We keep a copy of the receipt on file.
       - Reminder Emails: We send reminder emails the week before each step is due.
       - Event Planning: We suggest a guideline of 2 drinks per guest in the first hour, and 1 drink per guest every hour after that. 1 bottle of wine serves 5 glasses. 1 bottle of liquor (750ml) serves ~17 drinks (1.5oz pours). 1 liter serves 22 shots, and 1.75L serves 40 shots.
        - Toast Yields: For a toast you can get 7 pours out of a regular size 750ml bottle of Champagne/Sparkling Wine. Explain that we typically don't include this in the drink count for the event.
        - Cocktail Pour Sizes: Most cocktail recipes call for 1.5oz pours, but there are many that call for 2oz pours. eg. Old Fashions, Manhattans, Martinis, Negroni, Sidecar, Sazerac, Daiguiri, Aperol Spritz.
        - Delivery & Chilling: Typically we deliver the orders 2 hours prior to the event to allow the bartenders time to chill down the necessary items. Usually we don't chill the items, because we don't use refrigerated vans.
        - Table Side Wine Service: If the client is having table side wine service, make sure to let them know it will increase the amount of wine needed by a lot, and encourage them to specify how many tables they will have.
       - IMPORTANT: If a client requests or plans to use 1.75L bottles (handles), you MUST advise them to check with their event coordinator or bartender first as they do not fit standard pour spouts.
    4. You have access to a product catalog and a varietal knowledge base. Recommend specific pairings from the data.
    CRITICAL PRODUCT SELECTION REQUIREMENT: When searching the inventory sheet of the Pathfinder Product Master database, you MUST filter the data so that you only look at and suggest rows where the 'Focus Product' column contains the exact character 'Y'. However, if there isn't a product requested or matching the user's needs with a 'Y' in the 'Focus Product' column, then and only then are you allowed to suggest a product with an 'N' in the 'Focus Product' column.
    
    MANDATORY PRODUCT MASTER RESTRICTION: When a client asks for suggestions, recommendations, or details on specific bottles or products, you MUST "ONLY" deliver, suggest, and reference products and information from the "Pathfinder Product Master" sheet (the PATHFINDER PRODUCT MASTER JSON catalog supplied below). You are strictly forbidden from making up, hallucinating, or suggesting any external products, bottles, brands, or labels that do not exist directly in this list. Always double-check your suggestion against this list to ensure it exists. If the user asks "Are you accessing info from Pathfinder Product Master?" or similar, you should proudly confirm that you are and cite specific products from the live database.

    CLIENT SYNCED RECIPES & DESCRIPTIONS (JSON):
    ${JSON.stringify(descriptions.map((d) => ({ name: d.name, path: d.name, link: d.webViewLink, details: (d.extractedText || "").substring(0, 4e3) })))}

    When anyone asks about specific cocktail recipes (e.g. ratios, ingredients, garnish, instructions), wine descriptions, beers, or liquors, you MUST lookup inside this CLIENT SYNCED RECIPES & DESCRIPTIONS section. Use the exact specified ingredients and instructions. Tell them you are reading these details directly from their uploaded custom cocktail PDFs or specification files, and cite the file name with a working hyperlink (e.g. "[File Name](File Link)" where the link points to the local static webViewLink). If no matched records are found, refer politely to standard prestige guidelines.
    
    VARIETAL KNOWLEDGE BASE (JSON):
    ${JSON.stringify(varietals)}
    
    PATHFINDER PRODUCT MASTER / PRODUCT DATABASE (JSON):
    ${JSON.stringify(products.length > 0 ? products : "No products loaded yet.")}
    
    HIGH-PRIORITY SYSTEM RULE - MANDATORY PRICING RESTRICTION:
    1. You are permitted to use the pricing data in column F (e.g., "Average Price") internally to categorize, rank, filter, and sort products (such as identifying the cheapest options, recommending under budget thresholds, or sorting by cost).
    2. However, you must NEVER append, mention, or reveal specific dollar amounts, exact pricing, or numerical costs under any circumstances in any customer-facing output. Even if the client explicitly or specifically asks about the numeric cost or price of a product, you must keep numerical pricing information hidden.
    3. Instead of stating actual numerical prices or dollar figures, you MUST use qualitative tier descriptors exclusively (e.g., "budget-friendly", "premium selection", "ultra-premium tier"). Treat this pricing restriction as a high-priority system rule.
    
    MANDATORY FOCUS PRODUCT STATUS RESTRICTION: Do NOT include "(Focus Product: Y)", "(Focus Product: N)", "Focus Product" tags, or mention focus product status in any of your responses, product recommendations, or product descriptions. This "Focus Product" is internal database metadata and must be kept completely hidden from the client.
    
    Be helpful and proactive in suggesting pairings based on the knowledge base, always strictly prioritizing 'Y' focus products from the Pathfinder Product Master database first, and only falling back to 'N' focus products if no 'Y' focus products match the request.

    IMPORTANT RESPONSE FORMAT DIRECTIVE:
    Shorten any generic or boilerplate portions that are automatically added or posted at the bottom of your responses. Keep the response body focused, elegant, and directly tailored to the user's specific questions or items. Any standard closing note or disclaimer must be kept extremely brief (e.g. at most 1 short sentence), or omitted if not strictly requested by the conversation context.

    ${extraInstruction || ""}
  `;
  app.post("/api/chat", async (req, res) => {
    const { messages, selectedTierId, quoteItems } = req.body;
    let hasBudgetFriendlyProduct = false;
    let budgetFriendlyList = [];
    if (Array.isArray(quoteItems) && quoteItems.length > 0) {
      quoteItems.forEach((qi) => {
        const prod = products.find((p) => p["Item Code"] === qi.itemCode);
        if (prod) {
          const priceStr = prod["Average Price"] || "";
          const parsed = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
          if (!isNaN(parsed) && parsed > 0 && parsed < 15) {
            hasBudgetFriendlyProduct = true;
            budgetFriendlyList.push(prod["Product Name"]);
          }
        } else {
          const name = qi.name || "";
          const cat = qi.category || "";
          if (name.toLowerCase().includes("budget") || name.toLowerCase().includes("house") || cat.toLowerCase().includes("beer")) {
            hasBudgetFriendlyProduct = true;
            budgetFriendlyList.push(name);
          }
        }
      });
    }
    let extraInstruction = "";
    const isWingmanActive = Array.isArray(messages) && messages.some(
      (m) => m && typeof m.content === "string" && (m.content.toLowerCase().includes("wingman") || m.content.includes("\u2708\uFE0F"))
    );
    if (hasBudgetFriendlyProduct && selectedTierId === "standard" && !isWingmanActive) {
      extraInstruction = `
      CRITICAL RECONCILIATION CASE DETECTED:
      The client has added budget-friendly products (such as: ${budgetFriendlyList.join(", ")}) in their Navigator custom estimate, but they have chosen the "Premium Selection" tier on the event planner page!
      
      You MUST immediately prompt the client with this exact phrase: "Would you like a suggestion of Premium Selection products?"
      Explain inside the conversation that while they have added budget-friendly items, their Event Planner has the Premium Selection tier selected. Offer to suggest higher-quality premium wines, craft beers, and spirit pairings from the Pathfinder Product Master that align beautifully with the select Standard Full Bar experience!
      `;
    }
    const GEMINI_API_KEY2 = process.env.GEMINI_API_KEY;
    const ai2 = new import_genai.GoogleGenAI({
      apiKey: GEMINI_API_KEY2 || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const apiMessages = messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));
    while (apiMessages.length > 0 && apiMessages[0].role !== "user") {
      apiMessages.shift();
    }
    if (apiMessages.length === 0) {
      return res.status(400).json({ error: "No user message found to start conversation." });
    }
    const modelsToTry = ["gemini-3.5-flash"];
    let lastError = null;
    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting Gemini generation with model: ${modelName}`);
        const response = await ai2.models.generateContent({
          model: modelName,
          contents: apiMessages,
          config: {
            systemInstruction: getSystemInstruction(extraInstruction),
            temperature: 0.7,
            topP: 0.95
          }
        });
        if (response && response.text) {
          return res.json({ content: response.text });
        }
        throw new Error("Empty response from AI");
      } catch (error) {
        console.error(`Gemini Error with model ${modelName}:`, JSON.stringify(error, null, 2));
        lastError = error;
        if (error?.message?.includes("invalid") || error?.message?.includes("contents") || error?.message?.includes("User-Agent")) {
          break;
        }
      }
    }
    const errorStr = JSON.stringify(lastError) || "";
    const isPermissionError = errorStr.includes("PERMISSION_DENIED") || errorStr.includes("denied access");
    const isQuotaError = errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota");
    if (isPermissionError) {
      const detailedMessage = lastError?.message || lastError?.statusText || "No additional details provided.";
      res.status(403).json({
        error: `AI Access Denied (PERMISSION_DENIED). 

Details: ${detailedMessage}

Common causes:
1. The "Generative Language API" is not enabled in your Google Cloud Project.
2. The API key does not have permission to access the model "gemini-2.5-flash".
3. The project linked to this key has IAM restrictions or billing issues.

Please verify your API key's project settings in the Google Cloud Console.`
      });
    } else if (isQuotaError) {
      res.status(429).json({
        error: "AI Quota Exceeded (RESOURCE_EXHAUSTED). \n\nThis typically happens on the Free Tier. To resolve this:\n1. Generate a paid/unrestricted API key in AI Studio or Cloud Console.\n2. Update the 'GEMINI_API_KEY' in the 'Settings > Secrets' menu.\n3. Verify your billing account is active and linked to the project."
      });
    } else {
      res.status(500).json({ error: "AI Generation failed. Details: " + (lastError?.message || "Check server logs.") });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
