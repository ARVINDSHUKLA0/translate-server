import WordPriceSetting from "../models/WordPriceSetting.model.js";

const DEFAULT_SETTINGS = {
  settingKey: "default",
  currency: "USD",
  pricePerPage: 100,
  wordsPerPage: 250,
  baseLanguage: "English",
  baseLanguageMultiplier: 1,
  otherLanguageMultiplier: 2,
  minimumPages: 1,
  maxFileSizeMB: 100,
  isActive: true,
};

const normalizeSettings = (body = {}) => {
  const price = Number(body.pricePerPage);
  const wordsPerPage = Number(body.wordsPerPage);
  const baseLanguage = String(body.baseLanguage || "").trim();

  if (
    body.pricePerPage === "" ||
    body.pricePerPage === null ||
    body.pricePerPage === undefined ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return {
      error: "Enter a valid non-negative price per page.",
    };
  }

  if (
    body.wordsPerPage === "" ||
    body.wordsPerPage === null ||
    body.wordsPerPage === undefined ||
    !Number.isSafeInteger(wordsPerPage) ||
    wordsPerPage < 1
  ) {
    return {
      error: "Words per page must be a positive whole number.",
    };
  }

  if (!baseLanguage) {
    return {
      error: "Base language is required.",
    };
  }

  return {
    value: {
      currency: "USD",
      pricePerPage: Math.round(price * 100) / 100,
      wordsPerPage,
      baseLanguage,
      baseLanguageMultiplier: 1,
      otherLanguageMultiplier: 2,
      minimumPages: 1,
      maxFileSizeMB: 100,
      isActive: true,
    },
  };
};

export const getWordPriceSetting = async (req, res) => {
  try {
    const settings = await WordPriceSetting.findOne({
      settingKey: "default",
    }).lean();

    return res.status(200).json({
      success: true,
      exists: Boolean(settings),
      data: settings || DEFAULT_SETTINGS,
    });
  } catch (error) {
    console.error("getWordPriceSetting:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load word pricing settings.",
    });
  }
};

export const createWordPriceSetting = async (req, res) => {
  try {
    const existing = await WordPriceSetting.findOne({
      settingKey: "default",
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Settings already exist. Please update them instead.",
      });
    }

    const normalized = normalizeSettings(req.body);

    if (normalized.error) {
      return res.status(400).json({
        success: false,
        message: normalized.error,
      });
    }

    const settings = await WordPriceSetting.create({
      ...DEFAULT_SETTINGS,
      ...normalized.value,
    });

    return res.status(201).json({
      success: true,
      message: "Word pricing settings created successfully.",
      data: settings,
    });
  } catch (error) {
    console.error("createWordPriceSetting:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Word pricing settings already exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create word pricing settings.",
    });
  }
};

export const updateWordPriceSetting = async (req, res) => {
  try {
    const normalized = normalizeSettings(req.body);

    if (normalized.error) {
      return res.status(400).json({
        success: false,
        message: normalized.error,
      });
    }

    const settings = await WordPriceSetting.findOneAndUpdate(
      { settingKey: "default" },
      {
        $set: normalized.value,
        $setOnInsert: {
          settingKey: "default",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Word pricing settings saved successfully.",
      data: settings,
    });
  } catch (error) {
    console.error("updateWordPriceSetting:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save word pricing settings.",
    });
  }
};

export const deleteWordPriceSetting = async (req, res) => {
  try {
    const deleted = await WordPriceSetting.findOneAndDelete({
      settingKey: "default",
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Word pricing settings were not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Word pricing settings removed successfully.",
    });
  } catch (error) {
    console.error("deleteWordPriceSetting:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove word pricing settings.",
    });
  }
};
