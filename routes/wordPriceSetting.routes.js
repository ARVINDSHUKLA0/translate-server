import express from "express";

import {
  getWordPriceSetting,
  createWordPriceSetting,
  updateWordPriceSetting,
  deleteWordPriceSetting,
} from "../controllers/wordPriceSetting.controller.js";

import { protect } from "../middlewares/Authmiddleware.js";

const router = express.Router();

router.get("/", getWordPriceSetting);
router.post("/", protect, createWordPriceSetting);
router.put("/", protect, updateWordPriceSetting);
router.delete("/", protect, deleteWordPriceSetting);

export default router;