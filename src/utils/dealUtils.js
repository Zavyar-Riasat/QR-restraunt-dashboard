// Utilities for Deal & Combo Menu Items

/**
 * Extracts deal metadata from an item if it's configured as a deal
 */
export function getItemDealInfo(item) {
  if (!item) return null;

  // Check if item has top-level deal fields
  if (item.is_deal) {
    return {
      is_deal: true,
      original_price: Number(item.original_price) || 0,
      deal_items: item.deal_items || '',
      badge: item.badge || '🔥 SPECIAL DEAL',
    };
  }

  // Check if stored in variants object
  if (item.variants && !Array.isArray(item.variants) && item.variants.is_deal) {
    return {
      is_deal: true,
      original_price: Number(item.variants.original_price) || 0,
      deal_items: item.variants.deal_items || '',
      badge: item.variants.badge || '🔥 SPECIAL DEAL',
    };
  }

  // Check if stored in variants array as _deal_meta
  if (Array.isArray(item.variants)) {
    const meta = item.variants.find((v) => v && (v.type === '_deal_meta' || v.is_deal));
    if (meta) {
      return {
        is_deal: true,
        original_price: Number(meta.original_price) || 0,
        deal_items: meta.deal_items || '',
        badge: meta.badge || '🔥 SPECIAL DEAL',
      };
    }
  }

  return null;
}

/**
 * Checks if an item is a deal
 */
export function isDeal(item) {
  return Boolean(getItemDealInfo(item));
}

/**
 * Safely extracts customization option groups whether variants is an array or object
 */
export function getItemVariants(item) {
  if (!item || !item.variants) return [];

  if (Array.isArray(item.variants)) {
    return item.variants.filter((v) => v && v.type !== '_deal_meta' && !v.is_deal);
  }

  if (item.variants.options && Array.isArray(item.variants.options)) {
    return item.variants.options;
  }

  return [];
}

/**
 * Parses a deal_items string into a list of normalized items: [{ qty: number, title: string }]
 */
export function parseDealItems(currentText) {
  if (!currentText || typeof currentText !== 'string' || !currentText.trim()) {
    return [];
  }

  // Split by comma or newline
  const parts = currentText.split(/,|\n/).map((s) => s.trim()).filter(Boolean);
  const items = [];

  for (const part of parts) {
    const match = part.match(/^(\d+)\s*x\s*(.*)$/i);
    if (match) {
      const qty = parseInt(match[1], 10) || 1;
      const title = match[2].trim();
      if (title) {
        items.push({ qty, title });
      }
    } else {
      items.push({ qty: 1, title: part });
    }
  }

  return items;
}

/**
 * Serializes an array of deal items back to a formatted string
 */
export function serializeDealItems(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.map((item) => `${item.qty}x ${item.title}`).join(', ');
}

/**
 * Increments the quantity of an item inside a deal items text string (e.g. "1x Item" -> "2x Item")
 */
export function incrementDealItem(currentText, itemTitle) {
  const targetTitle = (itemTitle || '').trim();
  if (!targetTitle) return currentText || '';

  const items = parseDealItems(currentText);
  const existingIndex = items.findIndex(
    (item) => item.title.toLowerCase() === targetTitle.toLowerCase()
  );

  if (existingIndex >= 0) {
    // Combine any potential duplicates if user had them previously
    let totalQty = items[existingIndex].qty + 1;
    for (let i = items.length - 1; i > existingIndex; i--) {
      if (items[i].title.toLowerCase() === targetTitle.toLowerCase()) {
        totalQty += items[i].qty;
        items.splice(i, 1);
      }
    }
    items[existingIndex].qty = totalQty;
    items[existingIndex].title = targetTitle; // Use clean target title casing
  } else {
    items.push({ qty: 1, title: targetTitle });
  }

  return serializeDealItems(items);
}

/**
 * Decrements the quantity of an item inside a deal items text string
 */
export function decrementDealItem(currentText, itemTitle) {
  const targetTitle = (itemTitle || '').trim();
  if (!targetTitle) return currentText || '';

  const items = parseDealItems(currentText);
  const existingIndex = items.findIndex(
    (item) => item.title.toLowerCase() === targetTitle.toLowerCase()
  );

  if (existingIndex >= 0) {
    // Combine any duplicate entries first
    let totalQty = items[existingIndex].qty;
    for (let i = items.length - 1; i > existingIndex; i--) {
      if (items[i].title.toLowerCase() === targetTitle.toLowerCase()) {
        totalQty += items[i].qty;
        items.splice(i, 1);
      }
    }

    const newQty = totalQty - 1;
    if (newQty <= 0) {
      items.splice(existingIndex, 1);
    } else {
      items[existingIndex].qty = newQty;
      items[existingIndex].title = targetTitle;
    }
  }

  return serializeDealItems(items);
}

/**
 * Gets the current quantity of an item inside a deal items text string
 */
export function getDealItemQuantity(currentText, itemTitle) {
  const targetTitle = (itemTitle || '').trim();
  if (!targetTitle) return 0;

  const items = parseDealItems(currentText);
  let totalQty = 0;
  for (const item of items) {
    if (item.title.toLowerCase() === targetTitle.toLowerCase()) {
      totalQty += item.qty;
    }
  }
  return totalQty;
}

/**
 * Checks if an item is available in stock (defaults to true)
 */
export function getItemAvailability(item) {
  if (!item) return true;
  if (item.is_available === false) return false;
  if (item.variants && !Array.isArray(item.variants) && item.variants.is_available === false) {
    return false;
  }
  return true;
}

/**
 * Gets the photo / image URL of an item
 */
export function getItemImage(item) {
  if (!item) return null;
  if (item.image_url) return item.image_url;
  if (item.variants && !Array.isArray(item.variants) && item.variants.image_url) {
    return item.variants.image_url;
  }
  return null;
}

/**
 * Gets the description of an item
 */
export function getItemDescription(item) {
  if (!item) return '';
  if (item.description) return item.description;
  if (item.variants && !Array.isArray(item.variants) && item.variants.description) {
    return item.variants.description;
  }
  return '';
}

/**
 * Resolves discount and pricing details for any menu item (dishes and deals):
 * Guarantees discounted selling price is primary, original price is secondary with strikethrough.
 *
 * @param {Object} item
 * @param {Object} [restaurant]
 * @returns {{
 *   finalPrice: number,
 *   originalPrice: number,
 *   hasDiscount: boolean,
 *   savings: number,
 *   discountPercent: number
 * }}
 */
export function getItemPricing(item, restaurant = null) {
  if (!item) {
    return { finalPrice: 0, originalPrice: 0, hasDiscount: false, savings: 0, discountPercent: 0 };
  }

  const currentPrice = Number(item.price) || 0;
  const dealInfo = getItemDealInfo(item);

  // 1. Direct item-level original price (from item.original_price, item.variants.original_price, compare_at_price, or dealInfo)
  let rawOriginalPrice =
    Number(item.original_price) ||
    Number(item.variants?.original_price) ||
    Number(item.compare_at_price) ||
    Number(item.variants?.compare_at_price) ||
    (dealInfo?.original_price ? Number(dealInfo.original_price) : 0);

  // 2. Direct discount percentage if configured on item
  const itemDiscountPercent =
    Number(item.discount_percent) ||
    Number(item.variants?.discount_percent) ||
    Number(item.discount_percentage) ||
    Number(item.variants?.discount_percentage) ||
    0;

  let finalPrice = currentPrice;
  let originalPrice = rawOriginalPrice;

  if (rawOriginalPrice > currentPrice) {
    // Standard case: Original price is higher than current selling price
    originalPrice = rawOriginalPrice;
    finalPrice = currentPrice;
  } else if (itemDiscountPercent > 0 && itemDiscountPercent < 100) {
    // Item has explicit discount percentage
    originalPrice = currentPrice;
    finalPrice = Math.round(currentPrice * (1 - itemDiscountPercent / 100));
  } else if (restaurant && Number(restaurant.discount_percentage) > 0 && !dealInfo) {
    // Store-wide active discount applied on standard menu dishes
    const restDiscount = Number(restaurant.discount_percentage);
    if (restDiscount > 0 && restDiscount < 100) {
      originalPrice = currentPrice;
      finalPrice = Math.round(currentPrice * (1 - restDiscount / 100));
    }
  }

  const hasDiscount = originalPrice > finalPrice && finalPrice > 0;
  const savings = hasDiscount ? originalPrice - finalPrice : 0;
  const discountPercent =
    hasDiscount && originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  return {
    finalPrice,
    originalPrice: hasDiscount ? originalPrice : 0,
    hasDiscount,
    savings,
    discountPercent,
  };
}

