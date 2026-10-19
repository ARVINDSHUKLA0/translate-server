
import express from "express";

import {
    getWishlist,
    addWishlistItem,
    removeWishlistItem,
} from "../controllers/Wishlist.controller.js";

import { protectClient } from "../middlewares/Clientauth.middleware.js";

const router = express.Router();

// All wishlist routes require client authentication.
router.use(protectClient);

// Get logged-in client's wishlist
router.get("/", getWishlist);

// Add service to wishlist
router.post("/:serviceId", addWishlistItem);

// Remove service from wishlist
router.delete("/:serviceId", removeWishlistItem);

export default router;
