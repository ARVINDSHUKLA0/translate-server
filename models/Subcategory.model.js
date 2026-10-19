import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
    {
        // ============================================
        // SUBCATEGORY NAME
        // ============================================
        subcategoryName: {
            type: String,
            required: true,
            trim: true,
        },

        // ============================================
        // PARENT CATEGORY
        // ============================================
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },

        // ============================================
        // SUBCATEGORY IMAGE
        // ============================================
        subcategoryImage: {
            public_id: {
                type: String,
                default: null,
            },

            url: {
                type: String,
                default: null,
            },
        },

        // ============================================
        // ACTIVE / INACTIVE
        // ============================================
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================
// SAME SUBCATEGORY NAME
// SAME CATEGORY ME DUPLICATE NA HO
// ============================================

subcategorySchema.index(
    {
        category: 1,
        subcategoryName: 1,
    },
    {
        unique: true,
    }
);

const Subcategory = mongoose.model(
    "Subcategory",
    subcategorySchema
);

export default Subcategory;