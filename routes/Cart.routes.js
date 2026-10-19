
import express from "express";

import {
    getCart,
    addCartItem,
    updateCartItem,
    removeCartItem,
    clearCart,
} from "../controllers/Cart.controller.js";

import { protectClient } from "../middlewares/Clientauth.middleware.js";

const router = express.Router();

// All cart routes require client authentication.
router.use(protectClient);

// Get logged-in client's cart
router.get("/", getCart);

// Add service to cart
router.post("/items", addCartItem);

// Update cart item quantity
router.patch("/items/:itemId", updateCartItem);

// Remove one item from cart
router.delete("/items/:itemId", removeCartItem);

// Clear entire cart
router.delete("/", clearCart);

export default router;
