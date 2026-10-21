// import express from 'express'
// import dotenv from 'dotenv'
// import cors from 'cors'
// import cookieParser from 'cookie-parser'
// import connectDB from './config/db.js' 
// import authRoutes from "./routes/Auth.routes.js";
// import staffRoutes from "./routes/Staff.routes.js";
// import profileRoutes from "./routes/Profile.routes.js";
// import adminVerificationRoutes from "./routes/Adminverification.routes.js";
// import translatorRoutes from './routes/Translator.routes.js'
// import categoryRoutes from "./routes/Category.routes.js";
// import subcategoryRoutes from "./routes/Subcategory.routes.js"; 
// import serviceAddonRoutes from "./routes/serviceAddon.routes.js";
// import serviceRoutes from "./routes/service.routes.js";
// import wordPriceSettingRoutes from "./routes/wordPriceSetting.routes.js";
// import translationUploadRoutes from "./routes/translationUpload.routes.js";
// import clientRoutes from "./routes/Client.routes.js";
// import dns from "dns"; 

// dotenv.config()
// dns.setDefaultResultOrder("ipv4first");
// dns.setServers(["8.8.8.8", "1.1.1.1"]);
// const PORT = process.env.PORT || 8000

// // ── Connect DB ────────────────────────────────────────────────────────────────
// connectDB()

// const app = express()

// // ── Middlewares ───────────────────────────────────────────────────────────────
// app.use(cookieParser())
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))

// // ── CORS ──────────────────────────────────────────────────────────────────────

// const allowedOrigins = [
//   'http://localhost:3000',
//   'http://localhost:3001',
//   'http://localhost:3002',
//   'http://localhost:5173',
//   'http://localhost:5174',
//   'http://dr-mehta-1keq.localhost:3000',
//   'http://dr-ranjan.localhost:3000',
// ]

// app.use(
//   cors({
//     origin(origin, callback) {
//       // Allow requests without an Origin header, such as local scripts.
//       if (!origin || allowedOrigins.includes(origin)) {
//         return callback(null, true)
//       }

//       return callback(
//         new Error(`CORS blocked this origin: ${origin}`)
//       )
//     },
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   })
// )


// // ── No-cache headers (304 fix) ────────────────────────────────────────────────
// app.use((req, res, next) => {
//   res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
//   res.setHeader('Pragma', 'no-cache')
//   res.setHeader('Expires', '0')
//   res.setHeader('Surrogate-Control', 'no-store')
//   next()
// })

// // ── Routes ────────────────────────────────────────────────────────────────────
// app.use('/api/auth', authRoutes)
// app.use('/api/staff', staffRoutes)
// app.use('/api/profile', profileRoutes)
// app.use('/api/translator', translatorRoutes)
// app.use('/api/admin/translators', adminVerificationRoutes)
// app.use('/api/categories', categoryRoutes)
// app.use("/api/subcategories", subcategoryRoutes);
// // app.use("/api/service-pricing",servicePricingRoutes); 
// app.use("/api/service-addons", serviceAddonRoutes);
// app.use("/api/services", serviceRoutes);
// app.use("/api/word-price-settings", wordPriceSettingRoutes);
// app.use("/api/translation-uploads", translationUploadRoutes);
// app.use("/api/client", clientRoutes);
// // ── Health check ──────────────────────────────────────────────────────────────
// app.get('/', (req, res) => res.json({ status: 'ok', service: 'MediFlow API' }))

// // ── Global error handler ──────────────────────────────────────────────────────
// app.use((err, req, res, next) => {
//   console.error('[Global Error]', err)
//   res.status(500).json({ success: false, message: 'Internal server error.' })
// })

// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))















// import express from 'express'
// import dotenv from 'dotenv'
// import cors from 'cors'
// import cookieParser from 'cookie-parser'
// import connectDB from './config/db.js'
// import authRoutes from './routes/Auth.routes.js'
// import staffRoutes from './routes/Staff.routes.js'
// import profileRoutes from './routes/Profile.routes.js'
// import adminVerificationRoutes from './routes/Adminverification.routes.js'
// import translatorRoutes from './routes/Translator.routes.js'
// import categoryRoutes from './routes/Category.routes.js'
// import subcategoryRoutes from './routes/Subcategory.routes.js'
// import serviceAddonRoutes from './routes/serviceAddon.routes.js'
// import serviceRoutes from './routes/service.routes.js'
// import wordPriceSettingRoutes from './routes/wordPriceSetting.routes.js'
// import translationUploadRoutes from './routes/translationUpload.routes.js'
// import clientRoutes from './routes/Client.routes.js'
// import adminDashboardRoutes from "./routes/AdminDashboard.routes.js";
// import cartRoutes from "./routes/Cart.routes.js";
// import wishlistRoutes from "./routes/Wishlist.routes.js";
// import dns from 'dns'

// dotenv.config()

// dns.setDefaultResultOrder('ipv4first')
// dns.setServers(['8.8.8.8', '1.1.1.1'])

// const PORT = process.env.PORT || 8000

// const app = express()

// // Middlewares
// app.use(cookieParser())
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))

// // CORS — local development only
// // const allowedOrigins = [
// //     'http://localhost:3000',
// //     'http://localhost:3001',
// //     'http://localhost:3002',
// //     'http://localhost:5173',
// //     'http://localhost:5174',
// //     'http://dr-mehta-1keq.localhost:3000',
// //     'http://dr-ranjan.localhost:3000',
// // ]



// // app.use(
// //     cors({
// //         origin(origin, callback) {
// //             if (!origin || allowedOrigins.includes(origin)) {
// //                 return callback(null, true)
// //             }

// //             return callback(new Error(`CORS blocked this origin: ${origin}`))
// //         },
// //         credentials: true,
// //         methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
// //         allowedHeaders: ['Content-Type', 'Authorization'],
// //     })
// // )


// /* CORS — local development and deployed websites */

// const allowedOrigins = [
//     'http://localhost:3000',
//     'http://localhost:3001',
//     'http://localhost:3002',
//     'http://localhost:5173',
//     'http://localhost:5174',
//     'http://dr-mehta-1keq.localhost:3000',
//     'http://dr-ranjan.localhost:3000',

//     // Production Admin
//     'https://translate-admin.vercel.app',

//     // Production Client — confirm this is your actual deployed URL
//     'https://translate-client-side.vercel.app',
// ]

// app.use(
//     cors({
//         origin(origin, callback) {
//             if (!origin || allowedOrigins.includes(origin)) {
//                 return callback(null, true)
//             }

//             console.error(`[CORS] Blocked origin: ${origin}`)
//             return callback(new Error(`CORS blocked this origin: ${origin}`))
//         },
//         credentials: true,
//         methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//         allowedHeaders: ['Content-Type', 'Authorization'],
//     })
// )


// // No-cache headers
// app.use((req, res, next) => {
//     res.setHeader(
//         'Cache-Control',
//         'no-store, no-cache, must-revalidate, proxy-revalidate'
//     )
//     res.setHeader('Pragma', 'no-cache')
//     res.setHeader('Expires', '0')
//     res.setHeader('Surrogate-Control', 'no-store')
//     next()
// })

// // API routes — existing routes preserved
// app.use('/api/auth', authRoutes)
// app.use('/api/staff', staffRoutes)
// app.use('/api/profile', profileRoutes)
// app.use('/api/translator', translatorRoutes)
// app.use('/api/admin/translators', adminVerificationRoutes)
// app.use('/api/categories', categoryRoutes)
// app.use('/api/subcategories', subcategoryRoutes)
// app.use('/api/service-addons', serviceAddonRoutes)
// app.use('/api/services', serviceRoutes)
// app.use('/api/word-price-settings', wordPriceSettingRoutes)
// app.use('/api/translation-uploads', translationUploadRoutes)
// app.use('/api/client', clientRoutes)
// app.use("/api/admin/dashboard", adminDashboardRoutes);
// app.use("/api/cart", cartRoutes);
// app.use("/api/wishlist", wishlistRoutes);


// // Health check
// app.get('/', (req, res) => {
//     res.json({ status: 'ok', service: 'MediFlow API' })
// })

// // Global error handler
// app.use((err, req, res, next) => {
//     console.error('[Global Error]', err)

//     if (err.message?.startsWith('CORS blocked this origin:')) {
//         return res.status(403).json({
//             success: false,
//             message: 'Origin not allowed by CORS.',
//         })
//     }

//     res.status(500).json({
//         success: false,
//         message: 'Internal server error.',
//     })
// })

// // Start server only after successful database connection
// const startServer = async () => {
//     try {
//         await connectDB()

//         const server = app.listen(PORT, () => {
//             console.log(`Server running on port ${PORT}`)
//         })

//         server.on('error', (error) => {
//             console.error('Server failed to start:', error.message)
//             process.exit(1)
//         })
//     } catch (error) {
//         console.error('Server startup failed:', error.message)
//         process.exit(1)
//     }
// }

// startServer()



















import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import connectDB from './config/db.js'
import authRoutes from './routes/Auth.routes.js'
import staffRoutes from './routes/Staff.routes.js'
import profileRoutes from './routes/Profile.routes.js'
import adminVerificationRoutes from './routes/Adminverification.routes.js'
import translatorRoutes from './routes/Translator.routes.js'
import categoryRoutes from './routes/Category.routes.js'
import subcategoryRoutes from './routes/Subcategory.routes.js'
import serviceAddonRoutes from './routes/serviceAddon.routes.js'
import serviceRoutes from './routes/service.routes.js'
import wordPriceSettingRoutes from './routes/wordPriceSetting.routes.js'
import translationUploadRoutes from './routes/translationUpload.routes.js'
import clientRoutes from './routes/Client.routes.js'
import adminDashboardRoutes from "./routes/AdminDashboard.routes.js";
import cartRoutes from "./routes/Cart.routes.js";
import wishlistRoutes from "./routes/Wishlist.routes.js";
import dns from 'dns'

dotenv.config()

dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '1.1.1.1'])

const PORT = process.env.PORT || 8000

const app = express()

// Middlewares
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS — local development only
// const allowedOrigins = [
//     'http://localhost:3000',
//     'http://localhost:3001',
//     'http://localhost:3002',
//     'http://localhost:5173',
//     'http://localhost:5174',
//     'http://dr-mehta-1keq.localhost:3000',
//     'http://dr-ranjan.localhost:3000',
// ]



// app.use(
//     cors({
//         origin(origin, callback) {
//             if (!origin || allowedOrigins.includes(origin)) {
//                 return callback(null, true)
//             }

//             return callback(new Error(`CORS blocked this origin: ${origin}`))
//         },
//         credentials: true,
//         methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//         allowedHeaders: ['Content-Type', 'Authorization'],
//     })
// )


/* CORS — local development and deployed websites */

// const allowedOrigins = [
//     'http://localhost:3000',
//     'http://localhost:3001',
//     'http://localhost:3002',
//     'http://localhost:5173',
//     'http://localhost:5174',
//     'http://dr-mehta-1keq.localhost:3000',
//     'http://dr-ranjan.localhost:3000',

//     // Production Admin
//     'https://translate-admin.vercel.app',

//     // Production Client — confirm this is your actual deployed URL
//     'https://translate-client-side.vercel.app',
// ]

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://dr-mehta-1keq.localhost:3000',
    'http://dr-ranjan.localhost:3000',

    // Production Admin
    'https://translate-admin.vercel.app',

    // Production Client — confirm this is your actual deployed URL
    'https://translate-client-side.vercel.app',

    // Production Translator dashboard — REPLACE with your real translator URL
    'https://YOUR-TRANSLATOR-APP.vercel.app',
]

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true)
            }

            console.error(`[CORS] Blocked origin: ${origin}`)
            return callback(new Error(`CORS blocked this origin: ${origin}`))
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 7200, // browser may cache the preflight for 2 hours
    })
)


// No-cache headers
app.use((req, res, next) => {
    res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Surrogate-Control', 'no-store')
    next()
})

// API routes — existing routes preserved
app.use('/api/auth', authRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/translator', translatorRoutes)
app.use('/api/admin/translators', adminVerificationRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/subcategories', subcategoryRoutes)
app.use('/api/service-addons', serviceAddonRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/word-price-settings', wordPriceSettingRoutes)
app.use('/api/translation-uploads', translationUploadRoutes)
app.use('/api/client', clientRoutes)
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);


// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'MediFlow API' })
})

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Global Error]', err)

    if (err.message?.startsWith('CORS blocked this origin:')) {
        return res.status(403).json({
            success: false,
            message: 'Origin not allowed by CORS.',
        })
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error.',
    })
})

// Start server only after successful database connection
const startServer = async () => {
    try {
        await connectDB()

        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })

        server.on('error', (error) => {
            console.error('Server failed to start:', error.message)
            process.exit(1)
        })
    } catch (error) {
        console.error('Server startup failed:', error.message)
        process.exit(1)
    }
}

startServer()
