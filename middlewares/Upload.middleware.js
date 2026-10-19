import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Local fallback folder — used whenever S3 isn't configured yet.
// Swap this out once AWS creds are ready; see utils/s3Upload.js
export const LOCAL_UPLOAD_DIR = path.resolve('uploads/verification-docs')

if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, LOCAL_UPLOAD_DIR),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        const ext = path.extname(file.originalname)
        cb(null, `${unique}${ext}`)
    },
})

const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
]

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error('Only PDF, JPG, PNG or WEBP files are allowed for verification documents.'))
    }
}

// field name: "document" — kept OPTIONAL everywhere it's used (req.file may be undefined)
export const uploadVerificationDoc = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('document')