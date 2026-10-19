import jwt from 'jsonwebtoken'

// Mirrors the setAuthCookie() helper already in your Auth.controller.js.
// If you already have a shared version of this, delete this file and
// import your existing one instead — just keep the payload shape below.
export const setAuthCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
}

export const signToken = (payload) =>
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })