// import express from 'express'
// import {
//     registerTranslator,
//     loginTranslator,
//     logoutTranslator,
//     getMyProfile,
// } from '../controllers/Translator.controller.js'
// // import { uploadVerificationDoc } from '../middlewares/upload.middleware.js'
// import {
//   uploadVerificationDoc,
// } from "../middlewares/Upload.middleware.js";
// import { protectTranslator } from '../middlewares/translatorAuth.middleware.js'

// const router = express.Router()

// // Public
// router.post('/register', uploadVerificationDoc, registerTranslator)
// router.post('/login', loginTranslator)
// router.post('/logout', logoutTranslator)

// // Protected — needs a valid translator-auth cookie + approved status
// router.get('/me', protectTranslator, getMyProfile)

// export default router




import express from "express";

import {
    registerTranslator,
    loginTranslator,
    logoutTranslator,
    getMyProfile,
    getAllTranslators,
} from "../controllers/Translator.controller.js";

import { uploadVerificationDoc } from "../middlewares/Upload.middleware.js";
import { protectTranslator } from "../middlewares/translatorAuth.middleware.js";
import {
    protect,
    authorize,
} from "../middlewares/Authmiddleware.js";

const router = express.Router();

// Public translator authentication
router.post("/register", uploadVerificationDoc, registerTranslator);
router.post("/login", loginTranslator);
router.post("/logout", logoutTranslator);

// Logged-in, approved translator profile
router.get("/me", protectTranslator, getMyProfile);

// Admin-only translator listing
router.get("/", protect, authorize("manage_users"), getAllTranslators);

export default router;
