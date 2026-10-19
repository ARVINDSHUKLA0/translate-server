import cloudinary from "../../config/cloudinary.config.js";

// ============================================================
// GET STORAGE PROVIDER
// ============================================================

const getStorageProvider = () => {
    return (
        process.env.STORAGE_PROVIDER || "cloudinary"
    ).toLowerCase();
};

// ============================================================
// UPLOAD FILE TO CLOUDINARY
// ============================================================

const uploadToCloudinary = async (
    file,
    folder
) => {
    if (!file?.buffer) {
        throw new Error(
            "File buffer is required for Cloudinary upload."
        );
    }

    const result = await new Promise(
        (resolve, reject) => {
            const uploadStream =
                cloudinary.uploader.upload_stream(
                    {
                        folder,
                        resource_type: "image",
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve(result);
                    }
                );

            uploadStream.end(file.buffer);
        }
    );

    return {
        provider: "cloudinary",
        publicId: result.public_id,
        url: result.secure_url,
    };
};

// ============================================================
// UPLOAD REMOTE IMAGE URL TO CLOUDINARY
// ============================================================

const uploadUrlToCloudinary = async (
    imageUrl,
    folder
) => {
    if (!imageUrl) {
        throw new Error(
            "Image URL is required."
        );
    }

    const result =
        await cloudinary.uploader.upload(
            imageUrl,
            {
                folder,
                resource_type: "image",
            }
        );

    return {
        provider: "cloudinary",
        publicId: result.public_id,
        url: result.secure_url,
    };
};

// ============================================================
// COMMON FILE UPLOAD
// ============================================================

export const uploadFile = async (
    file,
    folder = "uploads"
) => {
    if (!file) {
        throw new Error(
            "File is required."
        );
    }

    const provider =
        getStorageProvider();

    if (
        provider === "cloudinary"
    ) {
        return uploadToCloudinary(
            file,
            folder
        );
    }

    throw new Error(
        `Unsupported storage provider: ${provider}`
    );
};

// ============================================================
// COMMON URL UPLOAD
// ============================================================

export const uploadImageFromUrl = async (
    imageUrl,
    folder = "uploads"
) => {
    if (!imageUrl) {
        throw new Error(
            "Image URL is required."
        );
    }

    const provider =
        getStorageProvider();

    if (
        provider === "cloudinary"
    ) {
        return uploadUrlToCloudinary(
            imageUrl,
            folder
        );
    }

    throw new Error(
        `Unsupported storage provider: ${provider}`
    );
};

// ============================================================
// DELETE CLOUDINARY FILE
// ============================================================

const deleteFromCloudinary = async (
    publicId
) => {
    if (!publicId) {
        return;
    }

    await cloudinary.uploader.destroy(
        publicId,
        {
            resource_type: "image",
        }
    );
};

// ============================================================
// COMMON DELETE
// ============================================================

export const deleteFile = async (
    publicId
) => {
    if (!publicId) {
        return;
    }

    const provider =
        getStorageProvider();

    if (
        provider === "cloudinary"
    ) {
        return deleteFromCloudinary(
            publicId
        );
    }

    throw new Error(
        `Unsupported storage provider: ${provider}`
    );
};