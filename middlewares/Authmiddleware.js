import jwt from 'jsonwebtoken'
import Staff from '../models/Staff.js'

// Verifies the JWT stored in the httpOnly cookie and attaches the
// logged-in staff/admin document to req.staff
export const protect = async (req, res, next) => {
    try {
        const token = req.cookies?.token

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized, please login.' })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const staff = await Staff.findById(decoded.id)

        if (!staff || !staff.isActive) {
            return res.status(401).json({ success: false, message: 'Account not found or inactive.' })
        }

        req.staff = staff
        next()
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session.' })
    }
}

// Usage: router.get('/x', protect, authorize('manage_staff'), controllerFn)
// Superadmin always passes. Staff must have the given permission key.
export const authorize = (permissionKey) => {
    return (req, res, next) => {
        if (!req.staff) {
            return res.status(401).json({ success: false, message: 'Not authorized.' })
        }

        if (req.staff.role === 'superadmin') {
            return next()
        }

        if (req.staff.permissions?.includes(permissionKey)) {
            return next()
        }

        return res.status(403).json({ success: false, message: 'You do not have permission to do this.' })
    }
}