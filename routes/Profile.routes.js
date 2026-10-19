import express from 'express'
// import { updateProfile, changePassword } from '../controllers/profile.controller.js'
// import { protect } from '../middlewares/authMiddleware.js'
import {
  updateProfile,
  changePassword,
} from "../controllers/Profile.controller.js";

import { protect } from "../middlewares/Authmiddleware.js";

const router = express.Router()

router.use(protect)

router.put('/', updateProfile)
router.put('/password', changePassword)

export default router