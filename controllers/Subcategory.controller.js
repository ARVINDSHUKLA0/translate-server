import mongoose from "mongoose";

import Subcategory from "../models/Subcategory.model.js";
import Category from "../models/Category.model.js";

import {
  uploadFile,
  uploadImageFromUrl,
  deleteFile,
} from "../utils/storage/index.js";

const FOLDER = "translation/subcategories";

const removeImage = async (publicId) => {
  if (!publicId) return;

  try {
    await deleteFile(publicId);
  } catch (error) {
    console.error("SUBCATEGORY IMAGE DELETE ERROR:", error);
  }
};

// ============================================================
// CREATE SUBCATEGORY
// POST /api/subcategories
// ============================================================
export const createSubcategory = async (req, res) => {
  let uploadedImage = null;

  try {
    const { subcategoryName, category, subcategoryImageUrl } = req.body;

    if (!subcategoryName || !subcategoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subcategory name is required.",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const categoryExists = await Category.exists({ _id: category });

    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    if (req.file) {
      uploadedImage = await uploadFile(req.file, FOLDER);
    } else if (subcategoryImageUrl) {
      uploadedImage = await uploadImageFromUrl(subcategoryImageUrl, FOLDER);
    }

    // Duplicate (same name in same category) is handled by the
    // unique index (error 11000 below)
    const subcategory = await Subcategory.create({
      subcategoryName: subcategoryName.trim(),
      category,
      subcategoryImage: {
        public_id: uploadedImage?.publicId || null,
        url: uploadedImage?.url || null,
      },
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Subcategory created successfully.",
      data: subcategory,
    });
  } catch (error) {
    console.error("CREATE SUBCATEGORY ERROR:", error);

    if (uploadedImage?.publicId) {
      await removeImage(uploadedImage.publicId);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Subcategory already exists in this category.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create subcategory.",
    });
  }
};

// ============================================================
// GET ALL SUBCATEGORIES
// GET /api/subcategories
// ============================================================
export const getSubcategories = async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      if (!mongoose.Types.ObjectId.isValid(req.query.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID.",
        });
      }

      filter.category = req.query.category;
    }

    const subcategories = await Subcategory.find(filter)
      .populate("category", "categoryName categoryImage")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: subcategories.length,
      data: subcategories,
    });
  } catch (error) {
    console.error("GET SUBCATEGORIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories.",
    });
  }
};

// ============================================================
// GET SINGLE SUBCATEGORY
// GET /api/subcategories/:id
// ============================================================
export const getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    const subcategory = await Subcategory.findById(id)
      .populate("category", "categoryName categoryImage")
      .lean();

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: subcategory,
    });
  } catch (error) {
    console.error("GET SUBCATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategory.",
    });
  }
};

// ============================================================
// UPDATE SUBCATEGORY
// PUT /api/subcategories/:id
// ============================================================
export const updateSubcategory = async (req, res) => {
  let uploadedImage = null;

  try {
    const { id } = req.params;
    const { subcategoryName, category, subcategoryImageUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    const subcategory = await Subcategory.findById(id);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    const newCategory = category || subcategory.category;

    if (!mongoose.Types.ObjectId.isValid(newCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    // Check category only when it is actually changed
    if (String(newCategory) !== String(subcategory.category)) {
      const categoryExists = await Category.exists({ _id: newCategory });

      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Category not found.",
        });
      }
    }

    const newName =
      subcategoryName !== undefined
        ? subcategoryName.trim()
        : subcategory.subcategoryName;

    if (!newName) {
      return res.status(400).json({
        success: false,
        message: "Subcategory name cannot be empty.",
      });
    }

    let oldPublicId = null;

    if (req.file || subcategoryImageUrl) {
      uploadedImage = req.file
        ? await uploadFile(req.file, FOLDER)
        : await uploadImageFromUrl(subcategoryImageUrl, FOLDER);

      oldPublicId = subcategory.subcategoryImage?.public_id;

      subcategory.subcategoryImage = {
        public_id: uploadedImage.publicId,
        url: uploadedImage.url,
      };
    }

    subcategory.subcategoryName = newName;
    subcategory.category = newCategory;

    // Duplicate is handled by the unique index (error 11000 below).
    // Old image is deleted only AFTER a successful save.
    await subcategory.save();

    await removeImage(oldPublicId);

    return res.status(200).json({
      success: true,
      message: "Subcategory updated successfully.",
      data: subcategory,
    });
  } catch (error) {
    console.error("UPDATE SUBCATEGORY ERROR:", error);

    if (uploadedImage?.publicId) {
      await removeImage(uploadedImage.publicId);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Subcategory already exists in this category.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update subcategory.",
    });
  }
};

// ============================================================
// DELETE SUBCATEGORY
// DELETE /api/subcategories/:id
// ============================================================
export const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    // One DB call: delete and get the document back
    const subcategory = await Subcategory.findByIdAndDelete(id).lean();

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    await removeImage(subcategory.subcategoryImage?.public_id);

    return res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE SUBCATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete subcategory.",
    });
  }
};
