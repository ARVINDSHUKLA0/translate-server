import mongoose from "mongoose";

const { Schema } = mongoose;

const translationUploadSchema = new Schema(
  {
    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    file: {
      storageProvider: {
        type: String,
        enum: ["cloudinary", "s3", "r2", "local"],
        required: true,
      },

      storageKey: {
        type: String,
        required: true,
        trim: true,
      },

      // Optional: production systems can generate signed URLs later.
      url: {
        type: String,
        default: "",
        trim: true,
      },

      originalName: {
        type: String,
        required: true,
        trim: true,
      },

      mimeType: {
        type: String,
        required: true,
        trim: true,
      },

      sizeBytes: {
        type: Number,
        required: true,
        min: 0,
      },
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

    wordCount: {
      type: Number,
      default: null,
      min: 0,
    },

    pageCount: {
      type: Number,
      default: null,
      min: 0,
    },

    processing: {
      status: {
        type: String,
        enum: [
          "uploaded",
          "queued",
          "processing",
          "completed",
          "failed",
        ],
        default: "uploaded",
        index: true,
      },

      attempts: {
        type: Number,
        default: 0,
        min: 0,
      },

      errorCode: {
        type: String,
        default: null,
      },

      errorMessage: {
        type: String,
        default: null,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },
    },

    parserMetadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // When reached, MongoDB removes this upload document.
    // Actual Cloudinary/S3/R2 file cleanup must be handled separately.
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: true,
  }
);

translationUploadSchema.index({
  user: 1,
  createdAt: -1,
});

translationUploadSchema.index({
  service: 1,
  createdAt: -1,
});

translationUploadSchema.index({
  "processing.status": 1,
  createdAt: 1,
});

// TTL: deletes the MongoDB upload document when expiresAt is reached.
translationUploadSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model(
  "TranslationUpload",
  translationUploadSchema
);











