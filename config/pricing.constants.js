// Safe defaults only.
// Actual service pricing MUST be stored in ServicePricing.
// Money is stored in dollars (example: $50 => 50).
// Add-on prices (Express, Certified) live in ServiceAddon.
// Fixed/Admin service price lives in Service.startingPrice.

export const DEFAULT_TRANSLATION_PRICING = {
  currency: "USD",

  fileUploadPurchase: {
    enabled: true,
    billingType: "per_page",
    standardPrice: 50,
  },

  fileRules: {
    wordsPerPage: 250,
    minimumPages: 1,
    maxFileSizeMB: 100,
    processingMode: "async",
  },

  languagePricing: {
    baseLanguageMultiplier: 1,
    otherLanguageMultiplier: 2,
  },

  rounding: {
    decimals: 2,
  },

  version: 1,
  isActive: true,
};