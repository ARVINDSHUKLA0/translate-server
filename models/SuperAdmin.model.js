import mongoose from 'mongoose'

const superAdminSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // hidden by default

    role: {
      type:    String,
      enum:    ['superadmin'],
      default: 'superadmin',
    },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },

    // optional profile extras
    phone: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
)

superAdminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password
    return ret
  },
})

export default mongoose.model('SuperAdmin', superAdminSchema)