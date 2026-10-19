import express from "express";

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/Category.controller.js";

import uploadCategoryImage from "../middlewares/CategoryUpload.middleware.js";
import { protect } from "../middlewares/Authmiddleware.js";

const router = express.Router();

router.post("/", protect, uploadCategoryImage, createCategory);
router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.put("/:id", protect, uploadCategoryImage, updateCategory);
router.delete("/:id", protect, deleteCategory);

export default router;