
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import Client from "../models/Client.model.js";

// const COOKIE_NAME = "client-auth";
// const COOKIE_AGE = 7 * 24 * 60 * 60 * 1000;

// const cookieOptions = () => ({
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//     path: "/",
//     maxAge: COOKIE_AGE,
// });

// const publicClient = (client) => ({
//     id: client._id,
//     fullName: client.fullName,
//     company: client.company,
//     email: client.email,
//     role: "client",
// });

// export const registerClient = async (req, res) => {
//     try {
//         const { fullName, company, email, password } = req.body;

//         if (
//             typeof fullName !== "string" ||
//             typeof company !== "string" ||
//             typeof email !== "string" ||
//             typeof password !== "string" ||
//             !fullName.trim() ||
//             !company.trim() ||
//             !email.trim() ||
//             !password
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required.",
//             });
//         }

//         if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Enter a valid email address.",
//             });
//         }

//         if (password.length < 8) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Password must be at least 8 characters.",
//             });
//         }

//         const normalizedEmail = email.trim().toLowerCase();

//         const existing = await Client.findOne({
//             email: normalizedEmail,
//         });

//         if (existing) {
//             return res.status(409).json({
//                 success: false,
//                 message: "Email already registered.",
//             });
//         }

//         const hashedPassword = await bcrypt.hash(password, 12);

//         const client = await Client.create({
//             fullName: fullName.trim(),
//             company: company.trim(),
//             email: normalizedEmail,
//             password: hashedPassword,
//         });

//         return res.status(201).json({
//             success: true,
//             message: "Client account created successfully. Please log in.",
//             data: publicClient(client),
//         });
//     } catch (error) {
//         if (error.code === 11000) {
//             return res.status(409).json({
//                 success: false,
//                 message: "Email already registered.",
//             });
//         }

//         console.error("CLIENT REGISTER ERROR:", error.message);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to create account.",
//         });
//     }
// };

// export const loginClient = async (req, res) => {
//     try {
//         const { email, password } = req.body;

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

//         if (!process.env.JWT_SECRET) {
//             throw new Error("JWT_SECRET is not configured.");
//         }

//         const client = await Client.findOne({
//             email: email.trim().toLowerCase(),
//         }).select("+password");

//         if (
//             !client ||
//             !(await bcrypt.compare(password, client.password))
//         ) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Invalid email or password.",
//             });
//         }

//         if (!client.isActive) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Your account is disabled.",
//             });
//         }

//         const token = jwt.sign(
//             {
//                 id: client._id.toString(),
//                 role: "client",
//             },
//             process.env.JWT_SECRET,
//             { expiresIn: "7d" }
//         );

//         res.cookie(COOKIE_NAME, token, cookieOptions());

//         return res.status(200).json({
//             success: true,
//             message: "Login successful.",
//             data: publicClient(client),
//         });
//     } catch (error) {
//         console.error("CLIENT LOGIN ERROR:", error.message);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to log in.",
//         });
//     }
// };

// export const logoutClient = (req, res) => {
//     const { maxAge, ...options } = cookieOptions();

//     res.clearCookie(COOKIE_NAME, options);

//     return res.status(200).json({
//         success: true,
//         message: "Logged out successfully.",
//     });
// };

// export const getClientProfile = async (req, res) => {
//     return res.status(200).json({
//         success: true,
//         data: publicClient(req.client),
//     });
// };


















import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Client from "../models/Client.model.js";

const COOKIE_NAME = "client-auth";
const TOKEN_EXPIRY = "7d";
const COOKIE_AGE = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: COOKIE_AGE,
});

const publicClient = (client) => ({
    id: client._id.toString(),
    fullName: client.fullName,
    company: client.company,
    email: client.email,
    role: "client",
});

const createClientToken = (client) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured.");
    }

    return jwt.sign(
        {
            id: client._id.toString(),
            role: "client",
        },
        process.env.JWT_SECRET,
        {
            expiresIn: TOKEN_EXPIRY,
            issuer: "translate-co-api",
            audience: "translate-co-client",
        }
    );
};

// REGISTER CLIENT
export const registerClient = async (req, res) => {
    try {
        const { fullName, company, email, password } = req.body ?? {};

        if (
            typeof fullName !== "string" ||
            typeof company !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !fullName.trim() ||
            !company.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address.",
            });
        }

        if (fullName.trim().length > 120 || company.trim().length > 150) {
            return res.status(400).json({
                success: false,
                message: "Name or company name is too long.",
            });
        }

        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({
                success: false,
                message: "Password must contain between 8 and 128 characters.",
            });
        }

        const existing = await Client.findOne({
            email: normalizedEmail,
        }).lean();

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const client = await Client.create({
            fullName: fullName.trim(),
            company: company.trim(),
            email: normalizedEmail,
            password: hashedPassword,
        });

        return res.status(201).json({
            success: true,
            message: "Client account created successfully. Please log in.",
            data: publicClient(client),
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        console.error("CLIENT REGISTER ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create account.",
        });
    }
};

// LOGIN CLIENT
export const loginClient = async (req, res) => {
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

        const client = await Client.findOne({
            email: email.trim().toLowerCase(),
        }).select("+password");

        if (
            !client ||
            typeof client.password !== "string" ||
            !(await bcrypt.compare(password, client.password))
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (client.isActive === false) {
            return res.status(403).json({
                success: false,
                message: "Your account is disabled.",
            });
        }

        const token = createClientToken(client);

        res.cookie(COOKIE_NAME, token, cookieOptions());

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            tokenType: "Bearer",
            expiresIn: TOKEN_EXPIRY,
            data: publicClient(client),
        });
    } catch (error) {
        console.error("CLIENT LOGIN ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to log in.",
        });
    }
};

// LOGOUT CLIENT
export const logoutClient = (req, res) => {
    const { maxAge, ...options } = cookieOptions();

    res.clearCookie(COOKIE_NAME, options);

    return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
    });
};

// GET CLIENT PROFILE
export const getClientProfile = async (req, res) => {
    if (!req.client) {
        return res.status(401).json({
            success: false,
            message: "Authentication required.",
        });
    }

    return res.status(200).json({
        success: true,
        data: publicClient(req.client),
    });
};



/**
 * GET /api/client
 * Admin-only: list registered clients.
 */
export const getAllClients = async (req, res) => {
    try {
        const clients = await Client.find({})
            .select("_id fullName company email role isActive createdAt updatedAt")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: clients.length,
            data: clients,
        });
    } catch (error) {
        console.error("GET ALL CLIENTS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch clients.",
        });
    }
};
