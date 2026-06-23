const { body, param, query, validationResult } = require('express-validator')

// ✅ Validation error handler — call at end of validation chain
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg, value: e.value }))
    })
  }
  next()
}

// ✅ Auth validators
const registerValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*[0-9])/).withMessage('Password must contain uppercase letter and number'),
  body('username').optional().matches(/^[a-zA-Z0-9_]{3,30}$/).withMessage('Username must be 3-30 chars, letters/numbers/underscore only'),
  handleValidationErrors
]

const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors
]

const forgotPasswordValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  handleValidationErrors
]

const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidationErrors
]

// ✅ Profile validators
const updateProfileValidator = [
  body('full_name').optional().isLength({ max: 100 }).trim(),
  body('bio').optional().isLength({ max: 500 }).trim(),
  body('website_url').optional().isURL().withMessage('Invalid website URL'),
  body('github_url').optional().isURL().withMessage('Invalid GitHub URL'),
  body('linkedin_url').optional().isURL().withMessage('Invalid LinkedIn URL'),
  body('twitter_url').optional().isURL().withMessage('Invalid Twitter URL'),
  body('timezone').optional().isLength({ max: 50 }),
  handleValidationErrors
]

// ✅ Skill validators
const addSkillValidator = [
  body('skill_id').isUUID().withMessage('Valid skill_id UUID required'),
  body('proficiency_level').isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid proficiency level'),
  body('years_experience').optional().isFloat({ min: 0, max: 50 }).withMessage('Years experience must be 0-50'),
  body('description').optional().isLength({ max: 500 }).trim(),
  handleValidationErrors
]

const addWantedSkillValidator = [
  body('skill_id').isUUID().withMessage('Valid skill_id UUID required'),
  body('current_level').optional().isIn(['none', 'beginner', 'intermediate', 'advanced']),
  body('target_level').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']),
  body('urgency').optional().isIn(['low', 'medium', 'high']),
  handleValidationErrors
]

// ✅ Message validators
const sendMessageValidator = [
  body('content').optional().isLength({ max: 5000 }).trim(),
  body('message_type').optional().isIn(['text', 'image', 'file', 'voice', 'video', 'system']),
  body('reply_to_id').optional().isUUID(),
  handleValidationErrors
]

// ✅ Review validators
const createReviewValidator = [
  body('session_id').isUUID().withMessage('Valid session_id required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('content').optional().isLength({ max: 2000 }).trim(),
  handleValidationErrors
]

// ✅ Session validators
const createSessionValidator = [
  body('match_id').isUUID().withMessage('Valid match_id required'),
  body('title').notEmpty().isLength({ max: 200 }).trim().withMessage('Session title required'),
  body('scheduled_at').isISO8601().withMessage('Valid scheduled_at datetime required'),
  body('duration_minutes').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be 15-480 minutes'),
  body('skill_id').optional().isUUID(),
  handleValidationErrors
]

// ✅ UUID param validator
const uuidParamValidator = (paramName = 'id') => [
  param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors
]

// ✅ Pagination query validator
const paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  handleValidationErrors
]

// ✅ Admin validators
const banUserValidator = [
  body('reason').notEmpty().isLength({ max: 500 }).trim().withMessage('Ban reason required'),
  handleValidationErrors
]

module.exports = {
  handleValidationErrors,
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  updateProfileValidator,
  addSkillValidator,
  addWantedSkillValidator,
  sendMessageValidator,
  createReviewValidator,
  createSessionValidator,
  uuidParamValidator,
  paginationValidator,
  banUserValidator
}
