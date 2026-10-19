
// import express from "express";

// import {
//     registerClient,
//     loginClient,
//     logoutClient,
//     getClientProfile,
// } from "../controllers/Client.controller.js";

// import {
//     protectClient,
// } from "../middlewares/Clientauth.middleware.js";

// const router = express.Router();

// router.post("/register", registerClient);
// router.post("/login", loginClient);
// router.post("/logout", logoutClient);
// router.get("/me", protectClient, getClientProfile);

// export default router;






import express from "express";

import {
    registerClient,
    loginClient,
    logoutClient,
    getClientProfile,
    getAllClients,
} from "../controllers/Client.controller.js";

import { protectClient } from "../middlewares/Clientauth.middleware.js";
import {
    protect,
    authorize,
} from "../middlewares/Authmiddleware.js";

const router = express.Router();

// Public client authentication
router.post("/register", registerClient);
router.post("/login", loginClient);
router.post("/logout", logoutClient);

// Logged-in client profile
router.get("/me", protectClient, getClientProfile);

// Admin-only client listing
router.get("/", protect, authorize("manage_users"), getAllClients);

export default router;
