import express from "express";

import {
    getVerificationQueue,
    getTranslatorById,
    viewTranslatorDocument,
    approveTranslator,
    rejectTranslator,
} from "../controllers/Adminverification.controller.js";

import {
    protect,
    requireAdminPermission,
} from "../middlewares/Verificationauth.middleware.js";

const router = express.Router();

// All routes below require authentication and permission.
router.use(protect, requireAdminPermission);

router.get("/verification-queue", getVerificationQueue);

router.get("/:id", getTranslatorById);

router.get(
    "/:id/documents/:docId",
    viewTranslatorDocument
);

router.put("/:id/approve", approveTranslator);

router.put("/:id/reject", rejectTranslator);

export default router;
