const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const logger = require('../utils/logger.js')

// ✅ GET /api/notifications
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20 } = req.query

    const result = await db.paginate('notifications', '*', { user_id: userId }, {
      page: parseInt(page),
      limit: parseInt(limit),
      orderBy: 'created_at',
      ascending: false
    })

    return res.status(200).json(result)
  } catch (err) { next(err) }
}

// ✅ POST /api/notifications/read
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { notificationIds } = req.body // array of IDs, or empty to mark all

    let query = supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      query = query.in('id', notificationIds)
    } else {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query.select()
    if (error) throw error

    return res.status(200).json({ data, message: 'Notifications marked as read.' })
  } catch (err) { next(err) }
}

// ✅ GET /api/notifications/preferences
const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id
    let prefs = await db.selectOne('notification_preferences', '*', { user_id: userId })
    if (!prefs) {
      // Create defaults
      const [newPrefs] = await db.insert('notification_preferences', {
        user_id: userId,
        email_matches: true,
        email_sessions: true,
        email_messages: true,
        email_badges: true,
        push_matches: true,
        push_sessions: true,
        push_messages: true,
        push_badges: true
      })
      prefs = newPrefs
    }
    return res.status(200).json({ data: prefs })
  } catch (err) { next(err) }
}

// ✅ PUT /api/notifications/preferences
const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { email_matches, email_sessions, email_messages, email_badges,
            push_matches, push_sessions, push_messages, push_badges } = req.body

    const updates = {}
    if (email_matches !== undefined) updates.email_matches = email_matches
    if (email_sessions !== undefined) updates.email_sessions = email_sessions
    if (email_messages !== undefined) updates.email_messages = email_messages
    if (email_badges !== undefined) updates.email_badges = email_badges
    if (push_matches !== undefined) updates.push_matches = push_matches
    if (push_sessions !== undefined) updates.push_sessions = push_sessions
    if (push_messages !== undefined) updates.push_messages = push_messages
    if (push_badges !== undefined) updates.push_badges = push_badges

    const [result] = await db.upsert('notification_preferences', {
      user_id: userId,
      ...updates
    }, { onConflict: 'user_id' })

    return res.status(200).json({ data: result, message: 'Preferences updated.' })
  } catch (err) { next(err) }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  getPreferences,
  updatePreferences
}
