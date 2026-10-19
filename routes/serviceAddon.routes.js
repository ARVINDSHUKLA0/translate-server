import express from "express";

import {
    createServiceAddon,
    getServiceAddons,
    getServiceAddonById,
    updateServiceAddon,
    deleteServiceAddon,
} from "../controllers/serviceAddon.controller.js";

import { protect } from "../middlewares/Authmiddleware.js";

const router = express.Router();

router.post("/", protect, createServiceAddon);
router.get("/", getServiceAddons);
router.get("/:id", getServiceAddonById);
router.put("/:id", protect, updateServiceAddon);
router.delete("/:id", protect, deleteServiceAddon);

export default router;