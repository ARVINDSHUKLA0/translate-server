import mongoose from 'mongoose'

const { Schema } = mongoose

// One uploaded verification document (certificate, ID, diploma, etc.)
const documentSchema = new Schema(
    {
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },

        // 'local'  -> AWS not configured yet, file saved on disk under /uploads/verification-docs
        // 's3'     -> file pushed to the configured S3 bucket
        provider: { type: String, enum: ['local', 's3'], required: true },

        // Present when provider === 'local'
        localPath: { type: String },

        // Present when provider === 's3'
        s3Key: { type: String },
        s3Url: { type: String },

        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: true }
)

const languagePairSchema = new Schema(
    {
        from: { type: String, required: true, uppercase: true, trim: true }, // e.g. "EN"
        to: { type: String, required: true, uppercase: true, trim: true },   // e.g. "DE"
    },
    { _id: false }
)

const translatorSchema = new Schema(
    {
        fullName: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: { type: String, required: true }, // hashed

        role: { type: String, default: 'translator', immutable: true },

        nativeLanguage: { type: String, trim: true },
        languagePairs: { type: [languagePairSchema], default: [] },

        // Verification documents — NOT mandatory at signup time.
        documents: { type: [documentSchema], default: [] },

        verificationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        rejectionReason: { type: String, default: '' },
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
        verifiedAt: { type: Date },

        // Account enabled/disabled by admin (separate from verification status)
        isActive: { type: Boolean, default: true },

        // Only true once approved — gate this in your "find a translator" / job-pickup logic
        canWork: { type: Boolean, default: false },
    },
    { timestamps: true }
)

translatorSchema.index({ verificationStatus: 1 })

export default mongoose.models.Translator || mongoose.model('Translator', translatorSchema)