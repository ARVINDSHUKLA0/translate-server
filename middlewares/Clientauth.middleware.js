
// import jwt from "jsonwebtoken";
// import Client from "../models/Client.model.js";

// export const protectClient = async (req, res, next) => {
//     try {
//         if (!process.env.JWT_SECRET) {
//             throw new Error("JWT_SECRET is not configured.");
//         }

//         const token = req.cookies?.["client-auth"];

//         if (!token) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Please log in to continue.",
//             });
//         }

//         let decoded;

//         try {
//             decoded = jwt.verify(token, process.env.JWT_SECRET);
//         } catch {
//             return res.status(401).json({
//                 success: false,
//                 message: "Session expired. Please log in again.",
//             });
//         }

//         if (decoded.role !== "client" || !decoded.id) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Invalid client session.",
//             });
//         }

//         const client = await Client.findById(decoded.id);

//         if (!client || !client.isActive) {
//             res.clearCookie("client-auth", {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === "production",
//                 sameSite:
//                     process.env.NODE_ENV === "production" ? "none" : "lax",
//                 path: "/",
//             });

//             return res.status(401).json({
//                 success: false,
//                 message: "Client account not found or inactive.",
//             });
//         }

//         req.client = client;
//         next();
//     } catch (error) {
//         console.error("CLIENT AUTH ERROR:", error.message);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to verify client session.",
//         });
//     }
// };











import jwt from "jsonwebtoken";
import Client from "../models/Client.model.js";

export const protectClient = async (req, res, next) => {
    try {
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                message: "Server authentication is not configured.",
            });
        }

        // Prefer the HttpOnly cookie; otherwise accept a Bearer token.
        const authorization = req.headers.authorization;

        const bearerToken =
            typeof authorization === "string" &&
            authorization.startsWith("Bearer ")
                ? authorization.slice(7).trim()
                : null;

        const token = req.cookies?.["client-auth"] || bearerToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Please log in to continue.",
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET, {
                issuer: "translate-co-api",
                audience: "translate-co-client",
            });
        } catch {
            return res.status(401).json({
                success: false,
                message: "Session expired or invalid. Please log in again.",
            });
        }

        if (decoded.role !== "client" || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Invalid client session.",
            });
        }

        const client = await Client.findById(decoded.id);

        if (!client || client.isActive === false) {
            res.clearCookie("client-auth", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite:
                    process.env.NODE_ENV === "production" ? "none" : "lax",
                path: "/",
            });

            return res.status(401).json({
                success: false,
                message: "Client account not found or inactive.",
            });
        }

        req.client = client;

        return next();
    } catch (error) {
        console.error("CLIENT AUTH ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to verify client session.",
        });
    }
};
