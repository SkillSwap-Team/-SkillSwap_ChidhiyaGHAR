const crypto = require('crypto')

const CSRF_SECRET = process.env.JWT_SECRET || 'csrf_fallback_secret'
const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

// ✅ Generate CSRF token
const generateCsrfToken = () => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

// ✅ CSRF token generation endpoint middleware
// Call this on GET requests that initiate a form/mutation flow
const setCsrfToken = (req, res, next) => {
  const token = generateCsrfToken()
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JS to send in header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600 * 1000 // 1 hour
  })
  res.locals.csrfToken = token
  next()
}

// ✅ CSRF validation middleware (apply to state-mutating routes)
const validateCsrf = (req, res, next) => {
  // Skip CSRF for API-only clients using Authorization header auth
  // CSRF only relevant for cookie-based sessions
  if (req.headers.authorization) return next()

  // Skip in development
  if (process.env.NODE_ENV === 'development') return next()

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME]

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF token missing' })
  }

  if (cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token invalid' })
  }

  next()
}

// ✅ Provide CSRF token in response (for SPA clients)
const getCsrfToken = (req, res) => {
  const token = generateCsrfToken()
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600 * 1000
  })
  res.status(200).json({ csrfToken: token })
}

module.exports = { setCsrfToken, validateCsrf, getCsrfToken, generateCsrfToken }
