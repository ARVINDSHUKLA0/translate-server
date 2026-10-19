import mongoose from "mongoose";

const wordPriceSettingSchema = new mongoose.Schema(
  {
    settingKey: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },

    currency: {
      type: String,
      default: "USD",
      enum: ["USD"],
      required: true,
    },

    pricePerPage: {
      type: Number,
      default: 100,
      min: 0,
      required: true,
    },

    wordsPerPage: {
      type: Number,
      default: 250,
      min: 1,
      max: Number.MAX_SAFE_INTEGER,
      required: true,
      validate: {
        validator: Number.isSafeInteger,
        message: "Words per page must be a positive whole number.",
      },
    },

    baseLanguage: {
      type: String,
      default: "English",
      trim: true,
      required: true,
    },

    baseLanguageMultiplier: {
      type: Number,
      default: 1,
      min: 0,
      required: true,
    },

    otherLanguageMultiplier: {
      type: Number,
      default: 2,
      min: 0,
      required: true,
    },

    minimumPages: {
      type: Number,
      default: 1,
      min: 1,
      required: true,
    },

    maxFileSizeMB: {
      type: Number,
      default: 100,
      min: 1,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const WordPriceSetting =
  mongoose.models.WordPriceSetting ||
  mongoose.model("WordPriceSetting", wordPriceSettingSchema);

export default WordPriceSetting;
