// import bcrypt from 'bcrypt'
// import jwt from 'jsonwebtoken'
// import Translator from '../models/Translator.model.js'
// // import { uploadFileToS3 } from '../utils/s3Upload.js'
// import { uploadFileToS3 } from "../utils/S3upload.js";

// // Builds a document sub-record from a multer file, uploading to S3 if
// // configured, otherwise keeping the local disk copy as the record.
// const buildDocumentRecord = async (file) => {
//     const s3Result = await uploadFileToS3(file)

//     if (s3Result) {
//         return {
//             originalName: file.originalname,
//             mimeType: file.mimetype,
//             size: file.size,
//             provider: 's3',
//             s3Key: s3Result.s3Key,
//             s3Url: s3Result.s3Url,
//         }
//     }

//     // AWS not configured yet — fall back to local storage, nothing is lost.
//     return {
//         originalName: file.originalname,
//         mimeType: file.mimetype,
//         size: file.size,
//         provider: 'local',
//         localPath: file.path,
//     }
// }

// // ---------------------------------------------------------------------
// // POST /api/translator/register
// // multipart/form-data — "document" file field is OPTIONAL.
// // Body: fullName, email, password, nativeLanguage, languagePairs (JSON string, optional)
// // ---------------------------------------------------------------------
// export const registerTranslator = async (req, res) => {
//     try {
//         const { fullName, email, password, nativeLanguage, languagePairs } = req.body

//         if (!fullName || !email || !password) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Full name, email and password are required.',
//             })
//         }

//         const existing = await Translator.findOne({ email: email.toLowerCase() })
//         if (existing) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Email already registered.',
//             })
//         }

//         let parsedPairs = []
//         if (languagePairs) {
//             try {
//                 parsedPairs = typeof languagePairs === 'string' ? JSON.parse(languagePairs) : languagePairs
//             } catch {
//                 parsedPairs = []
//             }
//         }

//         const hashed = await bcrypt.hash(password, 10)

//         const documents = []
//         // Document is completely optional — registration never fails without it.
//         if (req.file) {
//             documents.push(await buildDocumentRecord(req.file))
//         }

//         const translator = await Translator.create({
//             fullName,
//             email: email.toLowerCase(),
//             password: hashed,
//             nativeLanguage,
//             languagePairs: parsedPairs,
//             documents,
//             verificationStatus: 'pending',
//         })

//         return res.status(201).json({
//             success: true,
//             message: documents.length
//                 ? 'Registration submitted. Your document is pending review.'
//                 : 'Registration submitted. You can upload a verification document any time before approval.',
//             data: {
//                 _id: translator._id,
//                 fullName: translator.fullName,
//                 email: translator.email,
//                 verificationStatus: translator.verificationStatus,
//             },
//         })
//     } catch (err) {
//         console.error(err)
//         return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
//     }
// }

// // ---------------------------------------------------------------------
// // POST /api/translator/login
// // Body: { email, password }
// //
// // Gate order matters:
// //   1. credentials wrong        -> 401 generic
// //   2. account disabled         -> 403 ACCOUNT_DISABLED
// //   3. verificationStatus check -> 403 VERIFICATION_PENDING / VERIFICATION_REJECTED
// //   4. approved                 -> issue cookie + token
// // ---------------------------------------------------------------------
// export const loginTranslator = async (req, res) => {
//     try {
//         const { email, password } = req.body

//         if (!email || !password) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Email and password are required.',
//             })
//         }

//         const translator = await Translator.findOne({ email: email.trim().toLowerCase() })
//         if (!translator) {
//             return res.status(401).json({ success: false, message: 'Invalid email or password.' })
//         }

//         const isMatch = await bcrypt.compare(password, translator.password)
//         if (!isMatch) {
//             return res.status(401).json({ success: false, message: 'Invalid email or password.' })
//         }

//         if (!translator.isActive) {
//             return res.status(403).json({
//                 success: false,
//                 code: 'ACCOUNT_DISABLED',
//                 message: 'Your account has been disabled. Please contact support.',
//             })
//         }

//         if (translator.verificationStatus === 'pending') {
//             return res.status(403).json({
//                 success: false,
//                 code: 'VERIFICATION_PENDING',
//                 message: 'Your account is still under review. We will notify you once it is verified.',
//             })
//         }

//         if (translator.verificationStatus === 'rejected') {
//             return res.status(403).json({
//                 success: false,
//                 code: 'VERIFICATION_REJECTED',
//                 message: translator.rejectionReason
//                     ? `Your application was rejected. Reason: ${translator.rejectionReason}`
//                     : 'Your application was rejected.',
//             })
//         }

//         // ---- approved -> issue token ----
//         const token = jwt.sign(
//             { id: translator._id, role: 'translator' },
//             process.env.JWT_SECRET,
//             { expiresIn: '7d' }
//         )

//         res.cookie('translator-auth', token, {
//             httpOnly: true,
//             sameSite: 'lax',
//             maxAge: 7 * 24 * 60 * 60 * 1000,
//         })

//         return res.json({
//             success: true,
//             message: 'Login successful.',
//             data: {
//                 _id: translator._id,
//                 fullName: translator.fullName,
//                 email: translator.email,
//                 verificationStatus: translator.verificationStatus,
//                 canWork: translator.canWork,
//             },
//         })
//     } catch (err) {
//         console.error(err)
//         return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
//     }
// }

// // ---------------------------------------------------------------------
// // POST /api/translator/logout
// // ---------------------------------------------------------------------
// export const logoutTranslator = async (req, res) => {
//     res.clearCookie('translator-auth')
//     return res.json({ success: true, message: 'Logged out.' })
// }

// // ---------------------------------------------------------------------
// // GET /api/translator/me
// // Returns the logged-in translator's profile (used to restore session
// // on page refresh). Requires the `protectTranslator` middleware.
// // ---------------------------------------------------------------------
// export const getMyProfile = async (req, res) => {
//     try {
//         const translator = await Translator.findById(req.translator.id).select('-password')
//         if (!translator) {
//             return res.status(404).json({ success: false, message: 'Translator not found.' })
//         }
//         return res.json({ success: true, data: translator })
//     } catch (err) {
//         console.error(err)
//         return res.status(500).json({ success: false, message: 'Something went wrong.' })
//     }
// }















import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Translator from "../models/Translator.model.js";
import { uploadFileToS3 } from "../utils/S3upload.js";

const TOKEN_EXPIRY = "7d";
const COOKIE_NAME = "translator-auth";
const COOKIE_AGE = 7 * 24 * 60 * 60 * 1000;

const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: COOKIE_AGE,
});

const buildDocumentRecord = async (file) => {
    const s3Result = await uploadFileToS3(file);

    if (s3Result) {
        return {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            provider: "s3",
            s3Key: s3Result.s3Key,
            s3Url: s3Result.s3Url,
        };
    }

    return {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        provider: "local",
        localPath: file.path,
    };
};

// POST /api/translator/register
export const registerTranslator = async (req, res) => {
    try {
        const { fullName, email, password, nativeLanguage, languagePairs } =
            req.body ?? {};

        if (
            typeof fullName !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !fullName.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address.",
            });
        }

        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({
                success: false,
                message: "Password must contain between 8 and 128 characters.",
            });
        }

        const existing = await Translator.findOne({
            email: normalizedEmail,
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        let parsedPairs = [];

        if (languagePairs) {
            try {
                parsedPairs =
                    typeof languagePairs === "string"
                        ? JSON.parse(languagePairs)
                        : languagePairs;

                if (!Array.isArray(parsedPairs)) {
                    return res.status(400).json({
                        success: false,
                        message: "Language pairs must be an array.",
                    });
                }
            } catch {
                return res.status(400).json({
                    success: false,
                    message: "Invalid language pairs format.",
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const documents = [];

        if (req.file) {
            documents.push(await buildDocumentRecord(req.file));
        }

        const translator = await Translator.create({
            fullName: fullName.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            nativeLanguage,
            languagePairs: parsedPairs,
            documents,
            verificationStatus: "pending",
        });

        return res.status(201).json({
            success: true,
            message: documents.length
                ? "Registration submitted. Your document is pending review."
                : "Registration submitted. Your account is pending review.",
            data: {
                _id: translator._id,
                fullName: translator.fullName,
                email: translator.email,
                verificationStatus: translator.verificationStatus,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        console.error("TRANSLATOR REGISTER ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to register. Please try again.",
        });
    }
};

// POST /api/translator/login
export const loginTranslator = async (req, res) => {
    try {
        const { email, password } = req.body ?? {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                message: "Authentication is not configured on the server.",
            });
        }

        const translator = await Translator.findOne({
            email: email.trim().toLowerCase(),
        }).select("+password");

        if (
            !translator ||
            typeof translator.password !== "string"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            translator.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (translator.isActive === false) {
            return res.status(403).json({
                success: false,
                code: "ACCOUNT_DISABLED",
                message: "Your account has been disabled. Please contact support.",
            });
        }

        if (translator.verificationStatus === "pending") {
            return res.status(403).json({
                success: false,
                code: "VERIFICATION_PENDING",
                message: "Your account is still under review. Please wait for approval.",
            });
        }

        if (translator.verificationStatus === "rejected") {
            return res.status(403).json({
                success: false,
                code: "VERIFICATION_REJECTED",
                message: translator.rejectionReason
                    ? `Your application was rejected. Reason: ${translator.rejectionReason}`
                    : "Your application was rejected.",
            });
        }

        if (translator.verificationStatus !== "approved") {
            return res.status(403).json({
                success: false,
                message: "Your account is not approved for login yet.",
            });
        }

        const token = jwt.sign(
            {
                id: translator._id.toString(),
                role: "translator",
            },
            process.env.JWT_SECRET,
            {
                expiresIn: TOKEN_EXPIRY,
            }
        );

        res.cookie(COOKIE_NAME, token, getCookieOptions());

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            tokenType: "Bearer",
            expiresIn: TOKEN_EXPIRY,
            data: {
                _id: translator._id,
                fullName: translator.fullName,
                email: translator.email,
                verificationStatus: translator.verificationStatus,
                canWork: translator.canWork,
            },
        });
    } catch (error) {
        console.error("TRANSLATOR LOGIN ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to log in. Please try again.",
        });
    }
};

// POST /api/translator/logout
export const logoutTranslator = (req, res) => {
    const { maxAge, ...cookieOptions } = getCookieOptions();

    res.clearCookie(COOKIE_NAME, cookieOptions);

    return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
    });
};

// GET /api/translator/me
export const getMyProfile = async (req, res) => {
    try {
        const translatorId = req.translator?.id || req.translator?._id;

        if (!translatorId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const translator = await Translator.findById(translatorId)
            .select("-password");

        if (!translator) {
            return res.status(404).json({
                success: false,
                message: "Translator not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: translator,
        });
    } catch (error) {
        console.error("GET TRANSLATOR PROFILE ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch translator profile.",
        });
    }
};



/**
 * GET /api/translator
 * Admin-only: list registered translators.
 */
export const getAllTranslators = async (req, res) => {
    try {
        const translators = await Translator.find({})
            .select(
                "_id fullName email role nativeLanguage languagePairs verificationStatus rejectionReason isActive canWork createdAt updatedAt"
            )
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: translators.length,
            data: translators,
        });
    } catch (error) {
        console.error("GET ALL TRANSLATORS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch translators.",
        });
    }
};
