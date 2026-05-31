// Utility to calculate recommended volume depending on standard formulas
export function calculateRecommendedVolume(
  category: string,
  size: string,
  guests: number,
  hours: number
): number {
  const totalDrinks = guests * (hours + 1);
  const cat = (category || "").toLowerCase();

  if (cat.includes("wine")) {
    // Wine represents 25% allocation, 5 glasses per standard 750ml bottle
    return Math.max(1, Math.ceil((totalDrinks * 0.25) / 5));
  } else if (cat.includes("beer") || cat.includes("seltzer")) {
    // Beer/Seltzer represents 25% allocation, 1 drink per unit (can/bottle)
    return Math.max(1, Math.ceil(totalDrinks * 0.25));
  } else {
    // Liquor/Spirit represents 50% allocation, pours depend on bottle size
    const s = (size || "").toLowerCase();
    if (s.includes("1.75") || s.includes("handle")) {
      return Math.max(1, Math.ceil((totalDrinks * 0.50) / 40));
    } else if (s.includes("1 liter") || s.includes("1l") || s.includes("1.0")) {
      return Math.max(1, Math.ceil((totalDrinks * 0.50) / 22));
    } else {
      // Default 750ml bottles (approx 17 1.5oz shots)
      return Math.max(1, Math.ceil((totalDrinks * 0.50) / 17));
    }
  }
}

// Calculate the dynamically adjusted quantity for any product in the custom estimate list
export function getItemQuantity(
  item: any,
  quoteItems: any[],
  guests: number,
  hours: number
): number {
  const cat = (item.category || "").toLowerCase();

  // Find all items in the estimate belonging to the same broad category (Wine, Beer/Seltzer, or Liquor)
  const sameCategoryItems = quoteItems.filter((q) => {
    const qCat = (q.category || "").toLowerCase();
    if (cat.includes("wine")) return qCat.includes("wine");
    if (cat.includes("beer") || qCat.includes("seltzer")) {
      return qCat.includes("beer") || qCat.includes("seltzer");
    }
    // Falls back to liquor
    return !qCat.includes("wine") && !qCat.includes("beer") && !qCat.includes("seltzer");
  });

  const sameCategoryCount = sameCategoryItems.length || 1;

  // Calculate the total recommended volume for this entire category
  const categoryTotalRecommended = calculateRecommendedVolume(
    item.category,
    item.size,
    guests,
    hours
  );

  // Divide the total category requirement evenly across the added selections
  const baseline = Math.max(1, Math.ceil(categoryTotalRecommended / sameCategoryCount));

  // Incorporate any manual offset tweak (user clickable + or - buttons)
  const offset = item.offset || 0;

  return Math.max(1, baseline + offset);
}
