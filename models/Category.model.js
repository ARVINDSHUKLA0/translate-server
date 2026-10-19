import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },

    categoryImage: {
      public_id: {
        type: String,
        default: null,
      },

      url: {
        type: String,
        default: null,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate category names
categorySchema.index(
  { categoryName: 1 },
  { unique: true }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;