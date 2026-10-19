import express from "express";
import { getAdminDashboard } from "../controllers/AdminDashboard.controller.js";
import { protect } from "../middlewares/Authmiddleware.js";

const router = express.Router();

router.get("/", protect, getAdminDashboard);

export default router; 