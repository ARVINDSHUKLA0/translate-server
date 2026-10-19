// import express from 'express'
// // import { registerSuperAdmin, login, logout, getMe } from '../controllers/auth.controller.js'
// // import { protect } from '../middlewares/authMiddleware.js'
// import {
//   registerSuperAdmin,
//   login,
//   logout,
//   getMe,
// } from "../controllers/Auth.controller.js";

// import { protect } from "../middlewares/Authmiddleware.js";

// const router = express.Router()

// router.post('/register-superadmin', registerSuperAdmin) // use once, then remove or protect this route
// router.post('/login', login)
// router.post('/logout', logout)
// router.get('/me', protect, getMe)

// export default router








import express from "express";

import {
  registerSuperAdmin,
  login,
  logout,
  getMe,
} from "../controllers/Auth.controller.js";

import { protect } from "../middlewares/Authmiddleware.js";

const router = express.Router();

const requireSetupKey = (req, res, next) => {
  const configuredKey = process.env.SUPERADMIN_SETUP_KEY;
  const providedKey = req.get("x-setup-key");

  if (
    !configuredKey ||
    !providedKey ||
    providedKey !== configuredKey
  ) {
    return res.status(403).json({
      success: false,
      message: "Forbidden.",
    });
  }

  next();
};

router.post(
  "/register-superadmin",
  requireSetupKey,
  registerSuperAdmin
);

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;
