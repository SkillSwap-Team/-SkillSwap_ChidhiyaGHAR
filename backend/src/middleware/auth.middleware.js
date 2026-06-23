const { supabaseAdmin } = require('../config/supabaseClient')
const jwt = require('jsonwebtoken')

// ✅ Dual extraction: Cookie FIRST, then Authorization Bearer header
const getAccessTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.access_token
  if (typeof cookieToken === 'string' && cookieToken.trim()) return cookieToken.trim()
  const authHeader = req.headers.authorization
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) return authHeader.substring(7).trim()
  return null
}

// ✅ Primary auth guard
const verifyToken = async (req, res, next) => {
  try {
    const token = getAccessTokenFromRequest(req)
    console.log('Auth middleware - token:', token ? 'Present' : 'Missing')
    if (!token) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication token missing.' })

    const jwtSecret = (process.env.JWT_SECRET || '').replace(/^["']|["']$/g, '').trim()
    const decoded = jwt.verify(token, jwtSecret)

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single()

    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token.' })
    if (user.is_banned) return res.status(403).json({ error: 'Account banned.', message: 'Your account has been suspended.' })
    if (!user.is_active) return res.status(403).json({ error: 'Account inactive.', message: 'Your account is inactive.' })

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      profile: user
    }
    req.token = token

    // ✅ Non-blocking session liveness check
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('id, is_active')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError) {
      console.warn('[Auth] user_sessions lookup failed (non-blocking):', sessionError.message)
    } else if (session !== null && !session.is_active) {
      return res.status(401).json({ error: 'Session expired or revoked. Please login again.' })
    }

    // Fire-and-forget: update last_seen_at
    supabaseAdmin
      .from('user_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('session_token', token)
      .then(() => {})

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token.', details: error.message })
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired.', expiredAt: error.expiredAt })
    return res.status(500).json({ error: 'Authentication failed.', details: error.message })
  }
}

// ✅ Optional auth (doesn't block unauthenticated requests)
const optionalVerifyToken = async (req, res, next) => {
  try {
    const token = getAccessTokenFromRequest(req)
    if (!token) { req.user = null; return next() }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { data: user } = await supabaseAdmin.from('users').select('*').eq('id', decoded.userId).single()

    req.user = user ? {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      profile: user
    } : null
    req.token = token
    next()
  } catch {
    req.user = null
    next()
  }
}

// ✅ Email verification guard
const requireVerification = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'User not authenticated.' })
  if (!req.user.profile.is_email_verified) {
    return res.status(403).json({
      error: 'Email verification required.',
      message: 'Please verify your email address to continue.'
    })
  }
  next()
}

// ✅ RBAC guard
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: `Required role: ${roles.join(' or ')}`
    })
  }
  next()
}

module.exports = {
  verifyToken,
  optionalVerifyToken,
  requireVerification,
  requireRole,
  getAccessTokenFromRequest
}
