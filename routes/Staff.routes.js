import express from 'express'
// import {
//     getPermissionsList,
//     getAllStaff,
//     addStaff,
//     updateStaffPermissions,
//     toggleStaffActive,
//     deleteStaff,
// } from '../controllers/staff.controller.js'
// import { protect, authorize } from '../middlewares/authMiddleware.js'

import {
  getPermissionsList,
  getAllStaff,
  addStaff,
  updateStaffPermissions,
  toggleStaffActive,
  deleteStaff,
} from "../controllers/Staff.controller.js";

import {
  protect,
  authorize,
} from "../middlewares/Authmiddleware.js";

const router = express.Router()

router.use(protect)

router.get('/permissions', getPermissionsList)
router.get('/', authorize('manage_staff'), getAllStaff)
router.post('/', authorize('manage_staff'), addStaff)
router.put('/:id/permissions', authorize('manage_staff'), updateStaffPermissions)
router.put('/:id/toggle-active', authorize('manage_staff'), toggleStaffActive)
router.delete('/:id', authorize('manage_staff'), deleteStaff)

export default router