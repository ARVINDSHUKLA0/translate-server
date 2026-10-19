import bcrypt from 'bcryptjs'
import Staff from '../models/Staff.js'

// PUT /api/profile
export const updateProfile = async (req, res) => {
    try {
        const { fullName, email } = req.body

        const staff = await Staff.findById(req.staff._id)
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Account not found.' })
        }

        if (email && email.toLowerCase() !== staff.email) {
            const existing = await Staff.findOne({ email: email.toLowerCase() })
            if (existing) {
                return res.status(400).json({ success: false, message: 'Email already in use.' })
            }
            staff.email = email.toLowerCase()
        }

        if (fullName) staff.fullName = fullName

        await staff.save()

        return res.status(200).json({
            success: true,
            message: 'Profile updated.',
            data: { id: staff._id, fullName: staff.fullName, email: staff.email, role: staff.role },
        })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

// PUT /api/profile/password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required.' })
        }

        const staff = await Staff.findById(req.staff._id).select('+password')

        const isMatch = await bcrypt.compare(currentPassword, staff.password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' })
        }

        staff.password = await bcrypt.hash(newPassword, 10)
        await staff.save()

        return res.status(200).json({ success: true, message: 'Password changed successfully.' })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}