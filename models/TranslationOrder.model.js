import mongoose from "mongoose";

const { Schema } = mongoose;

const selectedAddonSchema = new Schema(
  {
    addonId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceAddon",
      required: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    valueType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const pricingSnapshotSchema = new Schema(
  {
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },

    pricingVersion: {
      type: Number,
      required: true,
    },

    purchaseMethod: {
      type: String,
      enum: ["fixed", "file_upload"],
      required: true,
    },

    sourceLanguage: {
      type: Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },

    targetLanguage: {
      type: Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },

    wordsPerPage: {
      type: Number,
      default: null,
    },

    wordCount: {
      type: Number,
      default: null,
    },

    pageCount: {
      type: Number,
      default: null,
    },

    standardBaseAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    languageMultiplier: {
      type: Number,
      required: true,
      min: 0,
    },

    languageAdjustedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    selectedAddons: {
      type: [selectedAddonSchema],
      default: [],
    },

    addonsTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const translationOrderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },

    upload: {
      type: Schema.Types.ObjectId,
      ref: "TranslationUpload",
      default: null,
      index: true,
    },

    pricing: {
      type: pricingSnapshotSchema,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending_payment",
        "paid",
        "processing",
        "assigned",
        "in_translation",
        "quality_check",
        "completed",
        "cancelled",
        "refunded",
      ],
      default: "pending_payment",
      index: true,
    },

    payment: {
      status: {
        type: String,
        enum: [
          "pending",
          "paid",
          "failed",
          "refunded",
          "partially_refunded",
        ],
        default: "pending",
      },

      provider: {
        type: String,
        default: null,
      },

      transactionId: {
        type: String,
        default: null,
      },

      paidAt: {
        type: Date,
        default: null,
      },
    },

    delivery: {
      value: {
        type: Number,
        default: null,
      },

      unit: {
        type: String,
        enum: ["hour", "day", "business_day", null],
        default: null,
      },

      dueAt: {
        type: Date,
        default: null,
      },
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: true,
  }
);

translationOrderSchema.index({
  user: 1,
  createdAt: -1,
});

translationOrderSchema.index({
  service: 1,
  createdAt: -1,
});

translationOrderSchema.index({
  status: 1,
  createdAt: -1,
});

export default mongoose.model(
  "TranslationOrder",
  translationOrderSchema
);
