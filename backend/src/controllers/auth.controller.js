const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const speakeasy = require('speakeasy')
const { v4: uuidv4 } = require('uuid')
const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const emailService = require('../services/emailService.js')
const { createEmailVerificationToken, verifyEmailToken, createPasswordResetToken, verifyPasswordResetToken } = require('../services/verificationService.js')
const logger = require('../utils/logger.js')

const BCRYPT_COST = parseInt(process.env.BCRYPT_COST_FACTOR || '12')
const JWT_SECRET = () => (process.env.JWT_SECRET || '').replace(/^["']|["']$/g, '').trim()
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d'
const REFRESH_SECRET = () => (process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || '').replace(/^["']|["']$/g, '').trim()
const SESSION_EXPIRY_DAYS = 30

// Helper: generate tokens
function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET(), { expiresIn: JWT_EXPIRES })
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, REFRESH_SECRET(), { expiresIn: `${SESSION_EXPIRY_DAYS}d` })
  return { accessToken, refreshToken }
}

// Helper: set auth cookies
function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('access_token', accessToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000
  })
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: SESSION_EXPIRY_DAYS * 24 * 3600 * 1000
  })
}

// Helper: clear auth cookies
function clearAuthCookies(res) {
  res.clearCookie('access_token')
  res.clearCookie('refresh_token')
}

// ✅ POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { email, password, username } = req.body

    // Check for existing user
    const existing = await db.selectOne('users', 'id, email', { email: email.toLowerCase() })
    if (existing) return res.status(409).json({ error: 'Email already registered.' })

    if (username) {
      const existingUsername = await db.selectOne('users', 'id', { username })
      if (existingUsername) return res.status(409).json({ error: 'Username already taken.' })
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_COST)
    const userId = uuidv4()

    // Create user
    const [newUser] = await db.insert('users', {
      id: userId,
      email: email.toLowerCase(),
      password_hash,
      username: username || null,
      role: 'user',
      is_email_verified: false,
      is_active: true
    })

    // Create profile
    await db.insert('profiles', { id: userId })

    // Send verification email
    const verifyToken = await createEmailVerificationToken(userId)
    await emailService.sendVerificationEmail(email, verifyToken, username || email.split('@')[0], userId)

    // Log registration
    await db.insert('audit_logs', {
      user_id: userId,
      action: 'user_register',
      resource_type: 'user',
      resource_id: userId,
      ip_address: req.ip
    })

    return res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      data: { id: newUser.id, email: newUser.email, username: newUser.username }
    })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password, mfaCode } = req.body

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !user) {
      await db.insert('login_history', { ip_address: req.ip, user_agent: req.headers['user-agent'], success: false, failure_reason: 'user_not_found' }).catch(() => {})
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    if (user.is_banned) return res.status(403).json({ error: 'Account suspended.' })
    if (!user.password_hash) return res.status(401).json({ error: 'Please use OAuth to sign in.' })

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      await db.insert('login_history', { user_id: user.id, ip_address: req.ip, user_agent: req.headers['user-agent'], success: false, failure_reason: 'wrong_password' }).catch(() => {})
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    // MFA check
    if (user.mfa_enabled) {
      if (!mfaCode) return res.status(200).json({ requiresMfa: true, message: 'MFA code required.' })
      const isValidMfa = speakeasy.totp.verify({
        secret: user.mfa_secret, encoding: 'base32', token: mfaCode, window: 2
      })
      if (!isValidMfa) return res.status(401).json({ error: 'Invalid MFA code.' })
    }

    const { accessToken, refreshToken } = generateTokens(user.id)
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 3600 * 1000).toISOString()

    // Store session
    await db.insert('user_sessions', {
      user_id: user.id,
      session_token: accessToken,
      refresh_token: refreshToken,
      device_info: { user_agent: req.headers['user-agent'] },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      is_active: true,
      expires_at: expiresAt
    })

    // Log success
    await db.insert('login_history', { user_id: user.id, ip_address: req.ip, user_agent: req.headers['user-agent'], success: true }).catch(() => {})

    setAuthCookies(res, accessToken, refreshToken)

    return res.status(200).json({
      message: 'Login successful.',
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, username: user.username, role: user.role, is_email_verified: user.is_email_verified }
      }
    })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    await supabaseAdmin.from('user_sessions').update({ is_active: false }).eq('session_token', req.token)
    clearAuthCookies(res)
    return res.status(200).json({ message: 'Logged out successfully.' })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token || req.body?.refreshToken
    if (!token) return res.status(401).json({ error: 'Refresh token missing.' })

    const decoded = jwt.verify(token, REFRESH_SECRET())
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type.' })

    const session = await db.selectOne('user_sessions', 'id, user_id, is_active', { refresh_token: token })
    if (!session || !session.is_active) return res.status(401).json({ error: 'Session expired or revoked.' })

    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId)
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 3600 * 1000).toISOString()

    await db.update('user_sessions', {
      session_token: accessToken,
      refresh_token: newRefresh,
      expires_at: expiresAt,
      last_seen_at: new Date().toISOString()
    }, { id: session.id })

    setAuthCookies(res, accessToken, newRefresh)
    return res.status(200).json({ data: { accessToken, refreshToken: newRefresh } })
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' })
    }
    next(err)
  }
}

// ✅ GET /api/auth/verify-email
const verifyEmail = async (req, res, next) => {
  try {
    const { token, userId } = req.query
    if (!token || !userId) return res.status(400).json({ error: 'Token and userId required.' })

    const result = await verifyEmailToken(token, userId)
    if (!result.success) return res.status(400).json({ error: result.message })

    if (result.message !== 'Already verified') {
      await emailService.sendWelcomeEmail(
        (await db.selectOne('users', 'email, username', { id: userId }))?.email,
        (await db.selectOne('profiles', 'full_name', { id: userId }))?.full_name
      ).catch(() => {})
    }

    return res.status(200).json({ message: 'Email verified successfully.' })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/resend-verification
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body
    const user = await db.selectOne('users', 'id, email, username, is_email_verified', { email })
    if (!user) return res.status(200).json({ message: 'If that email exists, a verification link was sent.' })
    if (user.is_email_verified) return res.status(200).json({ message: 'Email already verified.' })

    const token = await createEmailVerificationToken(user.id)
    await emailService.sendVerificationEmail(user.email, token, user.username || user.email.split('@')[0], user.id)

    return res.status(200).json({ message: 'Verification email sent.' })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    const result = await createPasswordResetToken(email)

    if (result) {
      const { data: user } = await supabaseAdmin.from('users').select('email, username').eq('id', result.userId).single()
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${result.token}`
      await emailService.sendPasswordResetEmail(user.email, user.username, resetLink)
    }

    return res.status(200).json({ message: 'If that email exists, a reset link was sent.' })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body
    const result = await verifyPasswordResetToken(token)
    if (!result.success) return res.status(400).json({ error: result.message })

    const password_hash = await bcrypt.hash(password, BCRYPT_COST)
    await supabaseAdmin.from('users').update({
      password_hash,
      password_reset_token: null,
      password_reset_expires: null
    }).eq('id', result.userId)

    // Revoke all sessions for security
    await supabaseAdmin.from('user_sessions').update({ is_active: false }).eq('user_id', result.userId)

    return res.status(200).json({ message: 'Password reset successfully. Please login.' })
  } catch (err) {
    next(err)
  }
}

// ✅ OAuth initiation (redirect to provider)
const initiateOAuth = async (req, res, next) => {
  try {
    const { provider } = req.params
    const supported = ['google', 'github', 'linkedin']
    if (!supported.includes(provider)) return res.status(400).json({ error: 'Unsupported OAuth provider.' })

    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${process.env.FRONTEND_URL}/auth/callback` }
    })
    if (error) throw error
    return res.redirect(data.url)
  } catch (err) {
    next(err)
  }
}

// ✅ OAuth callback handler
const handleOAuthCallback = async (req, res, next) => {
  try {
    const { code } = req.query
    if (!code) return res.status(400).json({ error: 'OAuth code missing.' })

    const { data: sessionData, error } = await supabaseAdmin.auth.exchangeCodeForSession(code)
    if (error) throw error

    const supabaseUser = sessionData?.user
    if (!supabaseUser) return res.status(401).json({ error: 'OAuth authentication failed.' })

    // Find or create user
    let user = await db.selectOne('users', '*', { email: supabaseUser.email })
    if (!user) {
      const userId = uuidv4()
      const [newUser] = await db.insert('users', {
        id: userId,
        email: supabaseUser.email,
        is_email_verified: true,
        is_active: true,
        role: 'user'
      })
      await db.insert('profiles', { id: userId, full_name: supabaseUser.user_metadata?.full_name, avatar_url: supabaseUser.user_metadata?.avatar_url })
      user = newUser
    }

    const { accessToken, refreshToken } = generateTokens(user.id)
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 3600 * 1000).toISOString()

    await db.insert('user_sessions', {
      user_id: user.id, session_token: accessToken, refresh_token: refreshToken,
      ip_address: req.ip, is_active: true, expires_at: expiresAt
    })

    setAuthCookies(res, accessToken, refreshToken)
    return res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${accessToken}`)
  } catch (err) {
    next(err)
  }
}

// ✅ MFA setup
const setupMfa = async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({ name: `${process.env.MFA_APP_NAME || 'SkillSwap'}:${req.user.email}` })
    await supabaseAdmin.from('users').update({ mfa_secret: secret.base32 }).eq('id', req.user.id)
    return res.status(200).json({ data: { secret: secret.base32, otpauthUrl: secret.otpauth_url, qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(secret.otpauth_url)}` } })
  } catch (err) { next(err) }
}

// ✅ MFA verify and enable
const verifyMfa = async (req, res, next) => {
  try {
    const { code } = req.body
    const { data: user } = await supabaseAdmin.from('users').select('mfa_secret').eq('id', req.user.id).single()
    const isValid = speakeasy.totp.verify({ secret: user.mfa_secret, encoding: 'base32', token: code, window: 2 })
    if (!isValid) return res.status(400).json({ error: 'Invalid MFA code.' })
    await supabaseAdmin.from('users').update({ mfa_enabled: true }).eq('id', req.user.id)
    return res.status(200).json({ message: 'MFA enabled successfully.' })
  } catch (err) { next(err) }
}

// ✅ MFA disable
const disableMfa = async (req, res, next) => {
  try {
    const { code } = req.body
    const { data: user } = await supabaseAdmin.from('users').select('mfa_secret, mfa_enabled').eq('id', req.user.id).single()
    if (!user.mfa_enabled) return res.status(400).json({ error: 'MFA not enabled.' })
    const isValid = speakeasy.totp.verify({ secret: user.mfa_secret, encoding: 'base32', token: code, window: 2 })
    if (!isValid) return res.status(400).json({ error: 'Invalid MFA code.' })
    await supabaseAdmin.from('users').update({ mfa_enabled: false, mfa_secret: null }).eq('id', req.user.id)
    return res.status(200).json({ message: 'MFA disabled.' })
  } catch (err) { next(err) }
}

// ✅ GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const { data: user } = await supabaseAdmin.from('users').select('id, email, username, role, is_email_verified, mfa_enabled, created_at').eq('id', req.user.id).single()
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', req.user.id).single()
    return res.status(200).json({ data: { ...user, profile } })
  } catch (err) { next(err) }
}

// ✅ POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const { data: user } = await supabaseAdmin.from('users').select('password_hash').eq('id', req.user.id).single()
    const isValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isValid) return res.status(401).json({ error: 'Current password incorrect.' })
    const newHash = await bcrypt.hash(newPassword, BCRYPT_COST)
    await supabaseAdmin.from('users').update({ password_hash: newHash }).eq('id', req.user.id)
    return res.status(200).json({ message: 'Password changed successfully.' })
  } catch (err) { next(err) }
}

// ✅ GET /api/auth/sessions
const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await db.select('user_sessions', 'id, device_info, ip_address, user_agent, last_seen_at, created_at, expires_at', { user_id: req.user.id, is_active: true })
    return res.status(200).json({ data: sessions })
  } catch (err) { next(err) }
}

// ✅ DELETE /api/auth/sessions/:sessionId
const revokeSession = async (req, res, next) => {
  try {
    await supabaseAdmin.from('user_sessions').update({ is_active: false }).eq('id', req.params.sessionId).eq('user_id', req.user.id)
    return res.status(200).json({ message: 'Session revoked.' })
  } catch (err) { next(err) }
}

// ✅ DELETE /api/auth/sessions (revoke all)
const revokeAllSessions = async (req, res, next) => {
  try {
    await supabaseAdmin.from('user_sessions').update({ is_active: false }).eq('user_id', req.user.id).neq('session_token', req.token)
    return res.status(200).json({ message: 'All other sessions revoked.' })
  } catch (err) { next(err) }
}

module.exports = {
  register, login, logout, refreshToken, verifyEmail, resendVerification,
  forgotPassword, resetPassword, initiateOAuth, handleOAuthCallback,
  setupMfa, verifyMfa, disableMfa, getMe, changePassword,
  getActiveSessions, revokeSession, revokeAllSessions
}
