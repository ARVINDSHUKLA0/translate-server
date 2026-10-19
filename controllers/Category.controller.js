import mongoose from "mongoose";
import Category from "../models/Category.model.js";

import {
  uploadFile,
  uploadImageFromUrl,
  deleteFile,
} from "../utils/storage/index.js";

const FOLDER = "translation/categories";

const uploadImage = (file, url) =>
  file ? uploadFile(file, FOLDER) : uploadImageFromUrl(url, FOLDER);

const removeImage = async (publicId) => {
  if (!publicId) return;

  try {
    await deleteFile(publicId);
  } catch (error) {
    console.error("CATEGORY IMAGE DELETE ERROR:", error);
  }
};

// ============================================================
// CREATE CATEGORY
// POST /api/categories
// ============================================================
export const createCategory = async (req, res) => {
  let uploadedImage = null;

  try {
    const { categoryName, categoryImageUrl } = req.body;

    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    if (!req.file && !categoryImageUrl) {
      return res.status(400).json({
        success: false,
        message: "Category image is required.",
      });
    }

    uploadedImage = await uploadImage(req.file, categoryImageUrl);

    if (!uploadedImage?.publicId || !uploadedImage?.url) {
      return res.status(500).json({
        success: false,
        message: "Category image upload failed.",
      });
    }

    // Duplicate name is handled by the unique index (error 11000 below)
    const category = await Category.create({
      categoryName: categoryName.trim(),
      categoryImage: {
        public_id: uploadedImage.publicId,
        url: uploadedImage.url,
      },
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);

    if (uploadedImage?.publicId) {
      await removeImage(uploadedImage.publicId);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create category.",
    });
  }
};

// ============================================================
// GET ALL CATEGORIES
// GET /api/categories
// ============================================================
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories.",
    });
  }
};

// ============================================================
// GET SINGLE CATEGORY
// GET /api/categories/:id
// ============================================================
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const category = await Category.findById(id).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("GET CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category.",
    });
  }
};

// ============================================================
// UPDATE CATEGORY
// PUT /api/categories/:id
// ============================================================
export const updateCategory = async (req, res) => {
  let uploadedImage = null;

  try {
    const { id } = req.params;
    const { categoryName, categoryImageUrl, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    if (categoryName !== undefined) {
      const normalizedName = categoryName.trim();

      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty.",
        });
      }

      category.categoryName = normalizedName;
    }

    if (isActive !== undefined) {
      category.isActive = isActive === true || isActive === "true";
    }

    let oldPublicId = null;

    if (req.file || categoryImageUrl) {
      uploadedImage = await uploadImage(req.file, categoryImageUrl);

      oldPublicId = category.categoryImage?.public_id;

      category.categoryImage = {
        public_id: uploadedImage.publicId,
        url: uploadedImage.url,
      };
    }

    // Duplicate name is handled by the unique index (error 11000 below)
    await category.save();

    await removeImage(oldPublicId);

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);

    if (uploadedImage?.publicId) {
      await removeImage(uploadedImage.publicId);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update category.",
    });
  }
};

// ============================================================
// DELETE CATEGORY
// DELETE /api/categories/:id
// ============================================================
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    // One DB call: delete and get the document back
    const category = await Category.findByIdAndDelete(id).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    await removeImage(category.categoryImage?.public_id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete category.",
    });
  }
};
