import bcrypt from 'bcryptjs'
import Staff from '../models/Staff.js'
import { PERMISSIONS, PERMISSION_KEYS } from '../utils/Permissions.js'

// GET /api/staff/permissions
// Returns the master permission list so the frontend can render
// checkboxes dynamically instead of hardcoding them.
export const getPermissionsList = async (req, res) => {
    return res.status(200).json({ success: true, data: PERMISSIONS })
}

// GET /api/staff
export const getAllStaff = async (req, res) => {
    try {
        const staff = await Staff.find({ role: 'staff' }).sort({ createdAt: -1 })
        return res.status(200).json({ success: true, data: staff })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/staff
export const addStaff = async (req, res) => {
    try {
        const { fullName, email, password, permissions = [] } = req.body

        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: 'Full name, email and password are required.' })
        }

        const existing = await Staff.findOne({ email: email.toLowerCase() })
        if (existing) {
            return res.status(400).json({ success: false, message: 'This email is already in use.' })
        }

        const validPermissions = permissions.filter((p) => PERMISSION_KEYS.includes(p))
        const hashed = await bcrypt.hash(password, 10)

        const staff = await Staff.create({
            fullName,
            email: email.toLowerCase(),
            password: hashed,
            role: 'staff',
            permissions: validPermissions,
        })

        return res.status(201).json({
            success: true,
            message: 'Staff added successfully.',
            data: {
                _id: staff._id,
                fullName: staff.fullName,
                email: staff.email,
                permissions: staff.permissions,
                isActive: staff.isActive,
            },
        })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

// PUT /api/staff/:id/permissions
export const updateStaffPermissions = async (req, res) => {
    try {
        const { permissions = [] } = req.body
        const validPermissions = permissions.filter((p) => PERMISSION_KEYS.includes(p))

        const staff = await Staff.findByIdAndUpdate(
            req.params.id,
            { permissions: validPermissions },
            { new: true }
        )

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff not found.' })
        }

        return res.status(200).json({ success: true, message: 'Permissions updated.', data: staff })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

// PUT /api/staff/:id/toggle-active
export const toggleStaffActive = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id)
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff not found.' })
        }

        staff.isActive = !staff.isActive
        await staff.save()

        return res.status(200).json({ success: true, message: 'Status updated.', data: staff })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

// DELETE /api/staff/:id
export const deleteStaff = async (req, res) => {
    try {
        const staff = await Staff.findByIdAndDelete(req.params.id)
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff not found.' })
        }
        return res.status(200).json({ success: true, message: 'Staff removed.' })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}