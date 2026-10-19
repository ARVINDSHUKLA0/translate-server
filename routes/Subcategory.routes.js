
import express from "express";

import {
    createSubcategory,
    getSubcategories,
    getSubcategoryById,
    updateSubcategory,
    deleteSubcategory,
} from "../controllers/Subcategory.controller.js";

import uploadSubcategoryImage from "../middlewares/SubcategoryUpload.middleware.js";
import { protect } from "../middlewares/Authmiddleware.js";

const router = express.Router();

router.post("/", protect, uploadSubcategoryImage, createSubcategory);
router.get("/", getSubcategories);
router.get("/:id", getSubcategoryById);
router.put("/:id", protect, uploadSubcategoryImage, updateSubcategory);
router.delete("/:id", protect, deleteSubcategory);

export default router;