// import jwt from 'jsonwebtoken'
// import Translator from '../models/Translator.model.js'

// // ---------------------------------------------------------------------
// // protectTranslator
// // Verifies the `translator-auth` cookie, loads the translator, and
// // re-checks status on EVERY request — not just at login time. This way
// // if an admin rejects/disables an already-logged-in translator mid
// // session, their next request gets blocked immediately instead of
// // waiting for the JWT to expire.
// // ---------------------------------------------------------------------
// export const protectTranslator = async (req, res, next) => {
//     try {
//         const token = req.cookies?.['translator-auth']

//         if (!token) {
//             return res.status(401).json({ success: false, message: 'Please log in to continue.' })
//         }

//         let decoded
//         try {
//             decoded = jwt.verify(token, process.env.JWT_SECRET)
//         } catch {
//             return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
//         }

//         const translator = await Translator.findById(decoded.id)
//         if (!translator) {
//             return res.status(401).json({ success: false, message: 'Account not found.' })
//         }

//         if (!translator.isActive) {
//             res.clearCookie('translator-auth')
//             return res.status(403).json({
//                 success: false,
//                 code: 'ACCOUNT_DISABLED',
//                 message: 'Your account has been disabled. Please contact support.',
//             })
//         }

//         if (translator.verificationStatus === 'pending') {
//             res.clearCookie('translator-auth')
//             return res.status(403).json({
//                 success: false,
//                 code: 'VERIFICATION_PENDING',
//                 message: 'Your account is still under review.',
//             })
//         }

//         if (translator.verificationStatus === 'rejected') {
//             res.clearCookie('translator-auth')
//             return res.status(403).json({
//                 success: false,
//                 code: 'VERIFICATION_REJECTED',
//                 message: translator.rejectionReason
//                     ? `Your application was rejected. Reason: ${translator.rejectionReason}`
//                     : 'Your application was rejected.',
//             })
//         }

//         req.translator = { id: translator._id.toString(), role: 'translator' }
//         next()
//     } catch (err) {
//         console.error(err)
//         return res.status(500).json({ success: false, message: 'Something went wrong.' })
//     }
// }










import jwt from 'jsonwebtoken'
import Translator from '../models/Translator.model.js'

// ---------------------------------------------------------------------
// protectTranslator
// Verifies the translator token (from the `translator-auth` cookie OR
// the `Authorization: Bearer <token>` header), loads the translator, and
// re-checks status on EVERY request — not just at login time. This way
// if an admin rejects/disables an already-logged-in translator mid
// session, their next request gets blocked immediately instead of
// waiting for the JWT to expire.
// ---------------------------------------------------------------------
export const protectTranslator = async (req, res, next) => {
    try {
        // Cookie (same-site) OR Authorization: Bearer <token> (cross-site fallback)
        const authHeader = req.headers.authorization || ''
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
        const token = bearerToken || req.cookies?.['translator-auth']

        if (!token) {
            return res.status(401).json({ success: false, message: 'Please log in to continue.' })
        }

        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        } catch {
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
        }

        const translator = await Translator.findById(decoded.id)
        if (!translator) {
            return res.status(401).json({ success: false, message: 'Account not found.' })
        }

        if (!translator.isActive) {
            res.clearCookie('translator-auth')
            return res.status(403).json({
                success: false,
                code: 'ACCOUNT_DISABLED',
                message: 'Your account has been disabled. Please contact support.',
            })
        }

        if (translator.verificationStatus === 'pending') {
            res.clearCookie('translator-auth')
            return res.status(403).json({
                success: false,
                code: 'VERIFICATION_PENDING',
                message: 'Your account is still under review.',
            })
        }

        if (translator.verificationStatus === 'rejected') {
            res.clearCookie('translator-auth')
            return res.status(403).json({
                success: false,
                code: 'VERIFICATION_REJECTED',
                message: translator.rejectionReason
                    ? `Your application was rejected. Reason: ${translator.rejectionReason}`
                    : 'Your application was rejected.',
            })
        }

        req.translator = { id: translator._id.toString(), role: 'translator' }
        next()
    } catch (err) {
        console.error(err)
        return res.status(500).json({ success: false, message: 'Something went wrong.' })
    }
}