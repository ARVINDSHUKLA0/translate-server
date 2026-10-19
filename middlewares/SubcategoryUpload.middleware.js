import multer from "multer";

// ============================================================
// MEMORY STORAGE
// ============================================================

const storage = multer.memoryStorage();

// ============================================================
// ALLOWED IMAGE TYPES
// ============================================================

const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Only JPG, PNG and WEBP images are allowed."
            ),
            false
        );
    }
};

// ============================================================
// SUBCATEGORY IMAGE UPLOAD
// ============================================================

const uploadSubcategoryImage = multer({
    storage,
    fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024,
    },
}).single("subcategoryImage");

// ============================================================
// EXPORT
// ============================================================

export default uploadSubcategoryImage;