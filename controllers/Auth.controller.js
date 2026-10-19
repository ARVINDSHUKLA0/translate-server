// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";
// import Staff from "../models/Staff.js";

// // JWT token
// const signToken = (id) => {
//     const secret = process.env.JWT_SECRET;

//     if (!secret) {
//         throw new Error("JWT_SECRET is not configured.");
//     }

//     return jwt.sign({ id }, secret, { expiresIn: "7d" });
// };

// // Keep cookie options consistent for login and logout
// const authCookieOptions = {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "lax",
//     path: "/",
// };

// const setAuthCookie = (res, token) => {
//     // res.cookie("token", token, {
//     //     ...authCookieOptions,
//     //     maxAge: 7 * 24 * 60 * 60 * 1000,
//     // });
    
// };

// // POST /api/auth/register-superadmin
// // IMPORTANT: Protect this route. Do not leave it publicly accessible.
// export const registerSuperAdmin = async (req, res) => {
//     try {
//         const { fullName, email, password } = req.body || {};

//         if (
//             typeof fullName !== "string" ||
//             typeof email !== "string" ||
//             typeof password !== "string" ||
//             !fullName.trim() ||
//             !email.trim() ||
//             !password
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required.",
//             });
//         }

//         const normalizedEmail = email.trim().toLowerCase();

//         const existing = await Staff.findOne({
//             email: normalizedEmail,
//         });

//         if (existing) {
//             return res.status(409).json({
//                 success: false,
//                 message: "Email already registered.",
//             });
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);

//         const superadmin = await Staff.create({
//             fullName: fullName.trim(),
//             email: normalizedEmail,
//             password: hashedPassword,
//             role: "superadmin",
//             permissions: [],
//         });

//         return res.status(201).json({
//             success: true,
//             message: "Superadmin created successfully.",
//             data: {
//                 id: superadmin._id,
//                 email: superadmin.email,
//             },
//         });
//     } catch (err) {
//         console.error("Superadmin registration failed:", err.message);

//         // Handle duplicate email if a unique database index exists
//         if (err.code === 11000) {
//             return res.status(409).json({
//                 success: false,
//                 message: "Email already registered.",
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             message: "An internal server error occurred.",
//         });
//     }
// };

// // POST /api/auth/login
// export const login = async (req, res) => {
//     try {
//         const { email, password } = req.body || {};

//         if (
//             typeof email !== "string" ||
//             typeof password !== "string" ||
//             !email.trim() ||
//             !password
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Email and password are required.",
//             });
//         }

//         const staff = await Staff.findOne({
//             email: email.trim().toLowerCase(),
//         }).select("+password");

//         // Reject missing or explicitly inactive accounts
//         if (!staff || staff.isActive === false) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Invalid email or password.",
//             });
//         }

//         const isMatch = await bcrypt.compare(
//             password,
//             staff.password
//         );

//         if (!isMatch) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Invalid email or password.",
//             });
//         }

//         const token = signToken(staff._id);

//         setAuthCookie(res, token);

//         return res.status(200).json({
//             success: true,
//             message: "Login successful.",
//             data: {
//                 id: staff._id,
//                 fullName: staff.fullName,
//                 email: staff.email,
//                 role: staff.role,
//                 permissions: staff.permissions,
//             },
//         });
//     } catch (err) {
//         console.error("Login failed:", err.message);

//         return res.status(500).json({
//             success: false,
//             message: "An internal server error occurred.",
//         });
//     }
// };

// // POST /api/auth/logout
// export const logout = async (req, res) => {
//     res.clearCookie("token", authCookieOptions);

//     return res.status(200).json({
//         success: true,
//         message: "Logged out successfully.",
//     });
// };

// // GET /api/auth/me
// // Authentication middleware must set req.staff before this runs.
// export const getMe = async (req, res) => {
//     if (!req.staff) {
//         return res.status(401).json({
//             success: false,
//             message: "Authentication required.",
//         });
//     }

//     const {
//         _id,
//         fullName,
//         email,
//         role,
//         permissions,
//     } = req.staff;

//     return res.status(200).json({
//         success: true,
//         data: {
//             id: _id,
//             fullName,
//             email,
//             role,
//             permissions,
//         },
//     });
// };



















import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Staff from "../models/Staff.js";

// Create JWT token
const signToken = (id) => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not configured.");
    }

    return jwt.sign(
        { id: id.toString() },
        secret,
        { expiresIn: "7d" }
    );
};

// Keep login and logout cookie settings consistent
const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
};

const setAuthCookie = (res, token) => {
    res.cookie("token", token, {
        ...authCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

// POST /api/auth/register-superadmin
// IMPORTANT: Protect this route with an authorized setup/admin check.
// Do not expose public superadmin registration in production.
export const registerSuperAdmin = async (req, res) => {
    try {
        const { fullName, email, password } = req.body || {};

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
                message: "All fields are required.",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existing = await Staff.findOne({
            email: normalizedEmail,
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const superadmin = await Staff.create({
            fullName: fullName.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "superadmin",
            permissions: [],
        });

        return res.status(201).json({
            success: true,
            message: "Superadmin created successfully.",
            data: {
                id: superadmin._id,
                email: superadmin.email,
            },
        });
    } catch (err) {
        console.error(
            "Superadmin registration failed:",
            err.message
        );

        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "An internal server error occurred.",
        });
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

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
                message: "Authentication is not configured.",
            });
        }

        const staff = await Staff.findOne({
            email: email.trim().toLowerCase(),
        }).select("+password");

        if (!staff || staff.isActive === false) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (!staff.password) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            staff.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const token = signToken(staff._id);

        setAuthCookie(res, token);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            data: {
                id: staff._id,
                fullName: staff.fullName,
                email: staff.email,
                role: staff.role,
                permissions: staff.permissions || [],
            },
        });
    } catch (err) {
        console.error("Login failed:", err.message);

        return res.status(500).json({
            success: false,
            message: "An internal server error occurred.",
        });
    }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
    res.clearCookie("token", authCookieOptions);

    return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
    });
};

// GET /api/auth/me
// This route must use authentication middleware that sets req.staff.
export const getMe = async (req, res) => {
    if (!req.staff) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, please login.",
        });
    }

    const {
        _id,
        fullName,
        email,
        role,
        permissions,
    } = req.staff;

    return res.status(200).json({
        success: true,
        data: {
            id: _id,
            fullName,
            email,
            role,
            permissions: permissions || [],
        },
    });
};
