// import jwt from 'jsonwebtoken'
// import Staff from '../models/Staff.js'

// // NOTE: you already have an Authmiddleware.js in your project (visible in
// // your VS Code tabs). If it already decodes the `token` cookie and sets
// // req.user, delete this file and just reuse that one — the two guards
// // below (requireTranslator / requireAdminPermission) will work with
// // whatever middleware sets `req.user = { id, role, permissions }`.

// export const protect = (req, res, next) => {
//     try {
//         const token = req.cookies?.token
//         if (!token) {
//             return res.status(401).json({ success: false, message: 'Not authenticated.' })
//         }
//         const decoded = jwt.verify(token, process.env.JWT_SECRET)
//         req.user = decoded // { id, role, ... }

//         // TEMP DEBUG — remove this line once things work.
//         console.log('[verification] decoded token:', decoded)

//         next()
//     } catch (err) {
//         console.log('[verification] token verify failed:', err.message)
//         return res.status(401).json({ success: false, message: 'Session expired, please log in again.' })
//     }
// }

// // The token only carries `id`, not `role` — superadmin AND staff records
// // both live in the Staff collection (registerSuperAdmin uses Staff.findOne
// // under the hood), so look the id up there and check role/permissions.
// export const requireAdminPermission = async (req, res, next) => {
//     try {
//         const staff = await Staff.findById(req.user?.id)

//         console.log(
//             '[verification] staff lookup for id:', req.user?.id,
//             '→ found:', Boolean(staff),
//             staff ? `role: ${staff.role}, permissions: ${staff.permissions}` : ''
//         )

//         const isSuperAdmin = staff?.role === 'superadmin'
//         const hasPermission = staff?.permissions?.includes('verify_translators')

//         if (!staff || (!isSuperAdmin && !hasPermission)) {
//             return res.status(403).json({ success: false, message: 'You do not have permission to do this.' })
//         }

//         next()
//     } catch (err) {
//         console.log('[verification] admin lookup failed:', err.message)
//         return res.status(403).json({ success: false, message: 'You do not have permission to do this.' })
//     }
// }









import jwt from "jsonwebtoken";
import Staff from "../models/Staff.js";

export const protect = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated.",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                message: "Authentication service is unavailable.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Invalid session.",
            });
        }

        const staff = await Staff.findById(decoded.id).select("-password");

        if (!staff || staff.isActive === false) {
            return res.status(401).json({
                success: false,
                message: "Your session is invalid or inactive.",
            });
        }

        req.user = {
            id: staff._id.toString(),
            role: staff.role,
            permissions: staff.permissions || [],
        };

        req.staff = staff;

        return next();
    } catch (err) {
        if (err.name !== "JsonWebTokenError" &&
            err.name !== "TokenExpiredError") {
            console.error("Authentication failed:", err.message);
        }

        return res.status(401).json({
            success: false,
            message: "Session invalid or expired. Please log in again.",
        });
    }
};

export const requireAdminPermission = (req, res, next) => {
    const isSuperAdmin = req.user?.role === "superadmin";

    const hasPermission =
        req.user?.permissions?.includes("verify_translators");

    if (!isSuperAdmin && !hasPermission) {
        return res.status(403).json({
            success: false,
            message: "You do not have permission to do this.",
        });
    }

    return next();
};
