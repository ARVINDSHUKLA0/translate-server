import mongoose from "mongoose";
import ServiceAddon from "../models/ServiceAddon.model.js";


// ============================================================
// CREATE FEATURE
// POST /api/service-addons
// ============================================================

export const createServiceAddon = async (req, res) => {
    try {
        const {
            key,
            name,
            price,
            isActive = true,
        } = req.body;

        if (!key || !name) {
            return res.status(400).json({
                success: false,
                message: "Feature key and name are required.",
            });
        }

        const normalizedKey = String(key)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");

        if (!normalizedKey) {
            return res.status(400).json({
                success: false,
                message: "Feature key is required.",
            });
        }

        if (price === undefined || price === null || price === "") {
            return res.status(400).json({
                success: false,
                message: "Price is required.",
            });
        }

        const numericPrice = Number(price);

        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
            return res.status(400).json({
                success: false,
                message: "Price must be 0 or greater.",
            });
        }

        const existingAddon = await ServiceAddon.findOne({
            key: normalizedKey,
        });

        if (existingAddon) {
            return res.status(409).json({
                success: false,
                message: "A feature with this key already exists.",
            });
        }

        const addon = await ServiceAddon.create({
            key: normalizedKey,
            name: String(name).trim(),
            price: numericPrice,
            isActive: isActive === true || isActive === "true",
        });

        return res.status(201).json({
            success: true,
            message: "Feature created successfully.",
            data: addon,
        });

    } catch (error) {
        console.error("CREATE SERVICE ADDON ERROR:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A feature with this key already exists.",
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create feature.",
        });
    }
};


// ============================================================
// GET ALL FEATURES
// GET /api/service-addons
// ============================================================

export const getServiceAddons = async (req, res) => {
    try {
        const includeInactive =
            String(req.query.includeInactive || "").toLowerCase() === "true";

        const filter = includeInactive ? {} : { isActive: true };

        const addons = await ServiceAddon.find(filter)
            .sort({ name: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: addons.length,
            data: addons,
        });

    } catch (error) {
        console.error("GET SERVICE ADDONS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get features.",
        });
    }
};


// ============================================================
// GET FEATURE BY ID
// GET /api/service-addons/:id
// ============================================================

export const getServiceAddonById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid feature ID.",
            });
        }

        const addon = await ServiceAddon.findById(id);

        if (!addon) {
            return res.status(404).json({
                success: false,
                message: "Feature not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: addon,
        });

    } catch (error) {
        console.error("GET SERVICE ADDON BY ID ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get feature.",
        });
    }
};


// ============================================================
// UPDATE FEATURE
// PUT /api/service-addons/:id
// ============================================================

export const updateServiceAddon = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid feature ID.",
            });
        }

        const {
            key,
            name,
            price,
            isActive,
        } = req.body;

        const addon = await ServiceAddon.findById(id);

        if (!addon) {
            return res.status(404).json({
                success: false,
                message: "Feature not found.",
            });
        }

        // KEY
        if (key !== undefined) {
            const normalizedKey = String(key)
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "-");

            if (!normalizedKey) {
                return res.status(400).json({
                    success: false,
                    message: "Feature key cannot be empty.",
                });
            }

            const duplicate = await ServiceAddon.findOne({
                key: normalizedKey,
                _id: { $ne: id },
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "Another feature already uses this key.",
                });
            }

            addon.key = normalizedKey;
        }

        // NAME
        if (name !== undefined) {
            const cleanName = String(name).trim();

            if (!cleanName) {
                return res.status(400).json({
                    success: false,
                    message: "Feature name cannot be empty.",
                });
            }

            addon.name = cleanName;
        }

        // PRICE
        if (price !== undefined) {
            const numericPrice = Number(price);

            if (
                price === "" ||
                price === null ||
                !Number.isFinite(numericPrice) ||
                numericPrice < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be 0 or greater.",
                });
            }

            addon.price = numericPrice;
        }

        // ACTIVE
        if (isActive !== undefined) {
            addon.isActive = isActive === true || isActive === "true";
        }

        await addon.save();

        return res.status(200).json({
            success: true,
            message: "Feature updated successfully.",
            data: addon,
        });

    } catch (error) {
        console.error("UPDATE SERVICE ADDON ERROR:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A feature with this key already exists.",
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update feature.",
        });
    }
};


// ============================================================
// DELETE FEATURE (PERMANENT)
// DELETE /api/service-addons/:id
// ============================================================

export const deleteServiceAddon = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid feature ID.",
            });
        }

        const addon = await ServiceAddon.findByIdAndDelete(id);

        if (!addon) {
            return res.status(404).json({
                success: false,
                message: "Feature not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Feature deleted successfully.",
            data: addon,
        });

    } catch (error) {
        console.error("DELETE SERVICE ADDON ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete feature.",
        });
    }
};