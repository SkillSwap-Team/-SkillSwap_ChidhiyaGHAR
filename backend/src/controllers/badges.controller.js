const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const logger = require('../utils/logger.js')

// ✅ GET /api/badges/definitions
const getBadgeDefinitions = async (req, res, next) => {
  try {
    const definitions = await db.select('badge_definitions', '*', { is_active: true })
    return res.status(200).json({ data: definitions || [] })
  } catch (err) { next(err) }
}

// ✅ GET /api/badges/my
const getMyBadges = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { data, error } = await supabaseAdmin
      .from('user_badges')
      .select('id, earned_at, badge_definitions(*)')
      .eq('user_id', userId)

    if (error) throw error
    return res.status(200).json({ data: data || [] })
  } catch (err) { next(err) }
}

// ✅ GET /api/badges/user/:userId
const getUserBadges = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { data, error } = await supabaseAdmin
      .from('user_badges')
      .select('id, earned_at, badge_definitions(*)')
      .eq('user_id', userId)

    if (error) throw error
    return res.status(200).json({ data: data || [] })
  } catch (err) { next(err) }
}

module.exports = {
  getBadgeDefinitions,
  getMyBadges,
  getUserBadges
}
