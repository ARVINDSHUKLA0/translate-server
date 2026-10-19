import express from "express";
import {
  uploadDocument,
  uploadMiddleware,
} from "../controllers/translationUpload.controller.js";

const router = express.Router();

router.post("/", (req, res, next) => {
  uploadMiddleware(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "File upload failed.",
      });
    }

    next();
  });
}, uploadDocument);

export default router;