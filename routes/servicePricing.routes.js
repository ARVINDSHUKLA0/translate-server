import express from "express";

import {
    saveServicePricing,
    getServicePricing,
} from "../controllers/servicePricing.controller.js";


const router = express.Router();


// ============================================================
// CREATE / UPDATE SERVICE PRICING
// ============================================================

router.put(
    "/:serviceId",
    saveServicePricing
);


// ============================================================
// GET SERVICE PRICING
// ============================================================

router.get(
    "/:serviceId",
    getServicePricing
);


export default router;