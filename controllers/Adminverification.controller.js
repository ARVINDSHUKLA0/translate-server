import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Translator from "../models/Translator.model.js";
import { LOCAL_UPLOAD_DIR } from "../middlewares/Upload.middleware.js";

const isValidId = (id) => mongoose.isValidObjectId(id);

const safeTranslator = (translator) => {
    const data = translator.toObject();
    delete data.password;
    return data;
};

// GET /api/admin/translators/verification-queue?status=pending
export const getVerificationQueue = async (req, res) => {
    try {
        const status = req.query.status || "pending";

        if (!["pending", "approved", "rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification status.",
            });
        }

        const translators = await Translator.find({
            verificationStatus: status,
        })
            .select("-password")
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            data: translators,
            count: translators.length,
        });
    } catch (err) {
        console.error("Verification queue error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};

// GET /api/admin/translators/:id
export const getTranslatorById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid translator ID.",
            });
        }

        const translator = await Translator.findById(req.params.id)
            .select("-password");

        if (!translator) {
            return res.status(404).json({
                success: false,
                message: "Translator not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: translator,
        });
    } catch (err) {
        console.error("Translator detail error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};

// GET /api/admin/translators/:id/documents/:docId
export const viewTranslatorDocument = async (req, res) => {
    try {
        const { id, docId } = req.params;

        if (!isValidId(id) || !isValidId(docId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid translator or document ID.",
            });
        }

        const translator = await Translator.findById(id);

        if (!translator) {
            return res.status(404).json({
                success: false,
                message: "Translator not found.",
            });
        }

        const doc = translator.documents.id(docId);

        if (!doc) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");

        if (doc.provider === "s3") {
            if (!doc.s3Url) {
                return res.status(404).json({
                    success: false,
                    message: "Document URL not found.",
                });
            }

            const s3Url = new URL(doc.s3Url);

            if (s3Url.protocol !== "https:") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid document URL.",
                });
            }

            return res.redirect(doc.s3Url);
        }

        if (doc.provider !== "local" || !doc.localPath) {
            return res.status(404).json({
                success: false,
                message: "Document path not found.",
            });
        }

        const uploadRoot = path.resolve(LOCAL_UPLOAD_DIR);
        const absolutePath = path.resolve(doc.localPath);
        const relativePath = path.relative(uploadRoot, absolutePath);

        // Do not allow files outside the verification upload directory.
        if (
            !relativePath ||
            relativePath.startsWith("..") ||
            path.isAbsolute(relativePath)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access to this file is not allowed.",
            });
        }

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({
                success: false,
                message: "File missing on disk.",
            });
        }

        return res.sendFile(absolutePath, (err) => {
            if (err && !res.headersSent) {
                console.error("Document send error:", err.message);
                res.status(err.statusCode || 500).json({
                    success: false,
                    message: "Unable to send document.",
                });
            }
        });
    } catch (err) {
        console.error("Document view error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};

// PUT /api/admin/translators/:id/approve
export const approveTranslator = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid translator ID.",
            });
        }

        const adminId = req.staff?._id || req.user?.id;

        if (!adminId || !isValidId(adminId)) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const translator = await Translator.findById(req.params.id);

        if (!translator) {
            return res.status(404).json({
                success: false,
                message: "Translator not found.",
            });
        }

        translator.verificationStatus = "approved";
        translator.canWork = true;
        translator.rejectionReason = "";
        translator.verifiedBy = adminId;
        translator.verifiedAt = new Date();

        await translator.save();

        return res.status(200).json({
            success: true,
            message: "Translator approved.",
            data: safeTranslator(translator),
        });
    } catch (err) {
        console.error("Translator approval error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};

// PUT /api/admin/translators/:id/reject
// Body: { "reason": "Reason for rejection" }
export const rejectTranslator = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid translator ID.",
            });
        }

        const adminId = req.staff?._id || req.user?.id;

        if (!adminId || !isValidId(adminId)) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const { reason } = req.body || {};

        if (
            reason !== undefined &&
            (typeof reason !== "string" || reason.length > 1000)
        ) {
            return res.status(400).json({
                success: false,
                message: "Reason must be text and no longer than 1000 characters.",
            });
        }

        const translator = await Translator.findById(req.params.id);

        if (!translator) {
            return res.status(404).json({
                success: false,
                message: "Translator not found.",
            });
        }

        translator.verificationStatus = "rejected";
        translator.canWork = false;
        translator.rejectionReason = reason?.trim() || "Not specified.";
        translator.verifiedBy = adminId;
        translator.verifiedAt = new Date();

        await translator.save();

        return res.status(200).json({
            success: true,
            message: "Translator rejected.",
            data: safeTranslator(translator),
        });
    } catch (err) {
        console.error("Translator rejection error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};
