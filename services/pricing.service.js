import mongoose from "mongoose";

import Service from "../models/Service.model.js";
import ServicePricing from "../models/ServicePricing.model.js";
import ServiceAddon from "../models/ServiceAddon.model.js";


// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (value) => {
    return mongoose.Types.ObjectId.isValid(value);
};

const roundTo = (value, decimals = 2) => {
    const factor = Math.pow(10, decimals);

    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const roundMoney = (value) => roundTo(value, 2);


// ============================================================
// PAGE COUNT
//
// 250 words = 1 page
// 1-250   = 1
// 251-500 = 2
// 501-750 = 3
// ============================================================

export const calculatePageCount = ({
    wordCount,
    wordsPerPage,
    minimumPages = 1,
}) => {
    if (!Number.isInteger(wordCount) || wordCount < 0) {
        throw new Error("Invalid word count.");
    }

    if (!Number.isInteger(wordsPerPage) || wordsPerPage <= 0) {
        throw new Error("Invalid words-per-page configuration.");
    }

    return Math.max(
        minimumPages,
        Math.ceil(wordCount / wordsPerPage)
    );
};


// ============================================================
// ADDONS
//
// Add-on price is a fixed dollar amount from ServiceAddon.price.
// It is added once per order.
// ============================================================

const resolveAddons = async (addonIds = []) => {
    if (!Array.isArray(addonIds)) {
        throw new Error("addonIds must be an array.");
    }

    const uniqueAddonIds = [
        ...new Set(addonIds.map((id) => String(id))),
    ];

    if (uniqueAddonIds.length === 0) {
        return [];
    }

    for (const addonId of uniqueAddonIds) {
        if (!isValidObjectId(addonId)) {
            throw new Error(`Invalid addon ID: ${addonId}`);
        }
    }

    const addons = await ServiceAddon.find({
        _id: { $in: uniqueAddonIds },
        isActive: true,
    })
        .select("_id key name price")
        .lean();

    if (addons.length !== uniqueAddonIds.length) {
        throw new Error("One or more selected addons are not available.");
    }

    // Keep the same order the customer selected.
    const addonMap = new Map(
        addons.map((addon) => [String(addon._id), addon])
    );

    return uniqueAddonIds.map((id) => addonMap.get(id));
};


// ============================================================
// PURE CALCULATION (no database)
// ============================================================

export const computePrice = ({
    service,
    pricing,
    addons = [],
    purchaseMethod,
    sourceLanguage = null,
    targetLanguage = null,
    wordCount = null,
}) => {

    let currency;
    let pricingVersion = null;
    let wordsPerPage = null;
    let pageCount = null;
    let standardBaseAmount;
    let languageMultiplier = 1;
    let languageAdjustedAmount;

    // --------------------------------------------------------
    // FIXED / ADMIN SERVICE
    // Price comes from Service.startingPrice.
    // Language multiplier is not applied to fixed services.
    // --------------------------------------------------------

    if (purchaseMethod === "fixed") {

        if (service.purchaseModes?.fixed === false) {
            throw new Error("Fixed purchase is not available for this service.");
        }

        currency = service.startingPriceCurrency || "USD";

        standardBaseAmount = roundMoney(service.startingPrice || 0);

        languageAdjustedAmount = standardBaseAmount;
    }

    // --------------------------------------------------------
    // FILE UPLOAD
    // pages x price per page x language multiplier
    // --------------------------------------------------------

    else if (purchaseMethod === "file_upload") {

        if (!pricing) {
            throw new Error("Service pricing not found.");
        }

        if (
            service.purchaseModes?.fileUpload === false ||
            !pricing.fileUploadPurchase?.enabled
        ) {
            throw new Error("File upload purchase is not available for this service.");
        }

        if (!isValidObjectId(sourceLanguage)) {
            throw new Error("Invalid source language.");
        }

        if (!isValidObjectId(targetLanguage)) {
            throw new Error("Invalid target language.");
        }

        if (!Number.isInteger(wordCount) || wordCount < 0) {
            throw new Error("Valid word count is required for file upload purchase.");
        }

        currency = pricing.currency;

        pricingVersion = pricing.version;

        wordsPerPage = pricing.fileRules.wordsPerPage;

        pageCount = calculatePageCount({
            wordCount,
            wordsPerPage,
            minimumPages: pricing.fileRules.minimumPages || 1,
        });

        standardBaseAmount = roundMoney(
            pageCount * pricing.fileUploadPurchase.standardPrice
        );

        const isBaseLanguage =
            String(sourceLanguage) ===
            String(pricing.languagePricing.baseLanguage);

        languageMultiplier = isBaseLanguage
            ? pricing.languagePricing.baseLanguageMultiplier
            : pricing.languagePricing.otherLanguageMultiplier;

        languageAdjustedAmount = roundTo(
            standardBaseAmount * languageMultiplier,
            pricing.rounding?.decimals ?? 2
        );
    }

    else {
        throw new Error("Invalid purchase method.");
    }

    // --------------------------------------------------------
    // ADDONS (flat dollars, once per order)
    // --------------------------------------------------------

    const selectedAddons = addons.map((addon) => {
        const amount = roundMoney(addon.price || 0);

        return {
            addonId: addon._id,
            code: addon.key,
            name: addon.name,
            valueType: "flat",
            value: amount,
            amount,
        };
    });

    const addonsTotal = roundMoney(
        selectedAddons.reduce((sum, addon) => sum + addon.amount, 0)
    );

    const total = roundMoney(languageAdjustedAmount + addonsTotal);

    return {
        serviceId: String(service._id),

        purchaseMethod,

        sourceLanguage,

        targetLanguage,

        currency,

        pricingVersion,

        wordsPerPage,

        wordCount,

        pageCount,

        standardBaseAmount,

        languageMultiplier,

        languageAdjustedAmount,

        selectedAddons,

        addonsTotal,

        subtotal: languageAdjustedAmount,

        total,

        calculatedAt: new Date(),
    };
};


// ============================================================
// MAIN PRICE CALCULATOR (loads data, then calculates)
// ============================================================

const calculatePrice = async ({
    serviceId,
    purchaseMethod,
    sourceLanguage = null,
    targetLanguage = null,
    wordCount = null,
    addonIds = [],
}) => {

    if (!isValidObjectId(serviceId)) {
        throw new Error("Invalid service ID.");
    }

    if (!["fixed", "file_upload"].includes(purchaseMethod)) {
        throw new Error("Invalid purchase method.");
    }

    const service = await Service.findById(serviceId)
        .select("_id status purchaseModes startingPrice startingPriceCurrency")
        .lean();

    if (!service || service.status !== "active") {
        throw new Error("Service not found.");
    }

    let pricing = null;

    if (purchaseMethod === "file_upload") {
        pricing = await ServicePricing.findOne({
            service: serviceId,
            isActive: true,
        }).lean();
    }

    const addons = await resolveAddons(addonIds);

    return computePrice({
        service,
        pricing,
        addons,
        purchaseMethod,
        sourceLanguage,
        targetLanguage,
        wordCount,
    });
};

export default calculatePrice;