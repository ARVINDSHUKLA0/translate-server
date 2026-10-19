import express from "express";
import multer from "multer";

import {
    createService,
    getServices,
    getServiceById,
    updateService,
    deleteService,
} from "../controllers/service.controller.js";

import { protect } from "../middlewares/Authmiddleware.js";

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        files: 21,
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(
                new Error(
                    "Only JPG, PNG and WEBP images are allowed."
                )
            );
        }

        cb(null, true);
    },
});

const serviceFiles = upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 20 },
]);

router.post("/", protect, serviceFiles, createService);
router.get("/", getServices);
router.get("/:id", getServiceById);
router.put("/:id", protect, serviceFiles, updateService);
router.delete("/:id", protect, deleteService);

export default router;