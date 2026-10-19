
import mongoose from "mongoose";

const { Schema } = mongoose;

// ============================================================
// MEDIA SCHEMA
// ============================================================

const mediaSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      default: "",
      trim: true,
    },

    alt: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

// ============================================================
// TAB SCHEMA
// ============================================================

const tabSchema = {
  type: String,
  trim: true,
  maxlength: 150,
};

// ============================================================
// SERVICE SCHEMA
// ============================================================

const serviceSchema = new Schema(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    subcategory: {
      type: Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 220,
    },

    smallDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    longDescription: {
      type: String,
      default: "",
    },

    tabs: {
      type: [tabSchema],
      default: [],
    },

    translatorInfo: {
      numberOfTranslators: {
        type: Number,
        default: 0,
        min: 0,
      },

      rating: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },

        totalReviews: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    // ========================================================
    // DELIVERY
    //
    // One input in admin:
    // 2-4
    // 0-1
    // 3
    // ========================================================

    delivery: {
      range: {
        type: String,
        default: "1",
        trim: true,
        match: [/^\d+(?:-\d+)?$/, "Invalid delivery range."],
      },

      unit: {
        type: String,
        enum: ["hour", "day", "business_day"],
        default: "day",
      },
    },

    thumbnail: {
      type: mediaSchema,
      default: null,
    },

    images: {
      type: [mediaSchema],
      default: [],
    },

    purchaseModes: {
      fixed: {
        type: Boolean,
        default: true,
      },

      fileUpload: {
        type: Boolean,
        default: true,
      },
    },

    // ========================================================
    // STARTING PRICE
    //
    // Direct currency amount.
    // 20    = $20
    // 25.50 = $25.50
    // ========================================================

    startingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    startingPriceCurrency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },

    // ========================================================
    // DISCOUNT
    //
    // Direct currency amount.
    // Example: startingPrice $100, discount $20.
    // ========================================================

    // discount: {
    //   enabled: {
    //     type: Boolean,
    //     default: false,
    //   },

    //   value: {
    //     type: Number,
    //     default: 0,
    //     min: 0,
    //   },

    //   currency: {
    //     type: String,
    //     default: "USD",
    //     uppercase: true,
    //     trim: true,
    //   },
    // },

    discount: {
      enabled: {
        type: Boolean,
        default: false,
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
      currency: {
        type: String,
        default: "USD",
        uppercase: true,
        trim: true,
      },
    },

    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: true,
  }
);

serviceSchema.index({
  category: 1,
  subcategory: 1,
  status: 1,
});

serviceSchema.index({
  subcategory: 1,
  status: 1,
  sortOrder: 1,
});

serviceSchema.index({
  status: 1,
  isFeatured: 1,
  sortOrder: 1,
});

serviceSchema.index({
  status: 1,
  createdAt: -1,
});

export default mongoose.model("Service", serviceSchema);
