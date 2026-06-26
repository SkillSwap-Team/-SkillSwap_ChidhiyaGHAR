const bcrypt = require('bcrypt')
const speakeasy = require('speakeasy')
const { v4: uuidv4 } = require('uuid')
const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const emailService = require('../services/emailService.js')
const logger = require('../utils/logger.js')

const SESSION_EXPIRY_DAYS = 30

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

    // Check for existing user in database
    const existing = await db.selectOne('users', 'id, email', { email: email.toLowerCase() })
    if (existing) return res.status(409).json({ error: 'Email already registered.' })

    if (username) {
      const existingUsername = await db.selectOne('users', 'id', { username })
      if (existingUsername) return res.status(409).json({ error: 'Username already taken.' })
    }

    const userId = uuidv4()

    // Create user in public.users table directly
    const [newUser] = await db.insert('users', {
      id: userId,
      email: email.toLowerCase(),
      username: username || null,
      role: 'user',
      is_email_verified: true,
      is_active: true
    })

    // Create profile
    await db.insert('profiles', { id: userId })

    // Log registration
    await db.insert('audit_logs', {
      user_id: userId,
      action: 'user_register',
      resource_type: 'user',
      resource_id: userId,
      ip_address: req.ip
    })

    return res.status(201).json({
      message: 'Registration successful.',
      data: {
        accessToken: userId,
        user: { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role, is_email_verified: true }
      }
    })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Fetch user from public.users table by email
    const user = await db.selectOne('users', '*', { email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    if (user.is_banned) return res.status(403).json({ error: 'Account suspended.' })
    if (!user.is_active) return res.status(403).json({ error: 'Account inactive.' })

    // Log success
    await db.insert('login_history', { user_id: user.id, ip_address: req.ip, user_agent: req.headers['user-agent'], success: true }).catch(() => {})

    return res.status(200).json({
      message: 'Login successful.',
      data: {
        accessToken: user.id,
        user: { id: user.id, email: user.email, username: user.username, role: user.role, is_email_verified: true }
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
    await supabaseAdmin.auth.signOut(req.token)
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

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: token })
    if (error || !data.session) return res.status(401).json({ error: 'Session expired or invalid.' })

    const { session } = data
    const expiresAt = new Date(Date.now() + session.expires_in * 1000).toISOString()

    // Update session locally
    await supabaseAdmin.from('user_sessions')
      .update({
        session_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: expiresAt,
        last_seen_at: new Date().toISOString()
      })
      .eq('refresh_token', token)

    setAuthCookies(res, session.access_token, session.refresh_token)
    return res.status(200).json({ data: { accessToken: session.access_token, refreshToken: session.refresh_token } })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/verify-email
const verifyEmail = async (req, res, next) => {
  try {
    const { token, email, type = 'signup' } = req.body || req.query
    if (!token || !email) return res.status(400).json({ error: 'Token and email required.' })

    const { data, error } = await supabaseAdmin.auth.verifyOTP({
      email,
      token,
      type
    })
    if (error) return res.status(400).json({ error: error.message })

    // Update public database verification status
    await supabaseAdmin.from('users').update({ is_email_verified: true }).eq('id', data.user.id)

    // Send welcome email
    const profile = await db.selectOne('profiles', 'full_name', { id: data.user.id })
    await emailService.sendWelcomeEmail(email, profile?.full_name || email.split('@')[0]).catch(() => {})

    return res.status(200).json({ message: 'Email verified successfully.', data })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/resend-verification
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email parameter is required.' })

    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email
    })
    if (error) return res.status(400).json({ error: error.message })

    return res.status(200).json({ message: 'Verification email sent.' })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email parameter is required.' })

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    })

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ message: 'If that email exists, a reset link was sent.' })
  } catch (err) {
    next(err)
  }
}

// ✅ POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' })

    // Resolve user from Supabase access token (sent during redirect)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return res.status(400).json({ error: 'Invalid or expired reset token.' })

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password })
    if (updateError) return res.status(400).json({ error: updateError.message })

    // Revoke all sessions locally for security
    await supabaseAdmin.from('user_sessions').update({ is_active: false }).eq('user_id', user.id)

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

    // Find or create user locally
    let user = await db.selectOne('users', '*', { id: supabaseUser.id })
    if (!user) {
      const [newUser] = await db.insert('users', {
        id: supabaseUser.id,
        email: supabaseUser.email,
        is_email_verified: true,
        is_active: true,
        role: 'user'
      })
      await db.insert('profiles', {
        id: supabaseUser.id,
        full_name: supabaseUser.user_metadata?.full_name,
        avatar_url: supabaseUser.user_metadata?.avatar_url
      })
      user = newUser
    }

    const session = sessionData.session
    const expiresAt = new Date(Date.now() + session.expires_in * 1000).toISOString()

    await db.insert('user_sessions', {
      user_id: user.id,
      session_token: session.access_token,
      refresh_token: session.refresh_token,
      ip_address: req.ip,
      is_active: true,
      expires_at: expiresAt
    })

    setAuthCookies(res, session.access_token, session.refresh_token)
    return res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${session.access_token}`)
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
    const { newPassword } = req.body
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: newPassword })
    if (error) return res.status(400).json({ error: error.message })
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
