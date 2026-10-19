import mongoose from 'mongoose'

const staffSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: { type: String, required: true, select: false },
        role: {
            type: String,
            enum: ['superadmin', 'staff'],
            default: 'staff',
        },
        // Only used when role === 'staff'. Superadmin always has full access.
        permissions: { type: [String], default: [] },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
)

export default mongoose.models.Staff || mongoose.model('Staff', staffSchema)