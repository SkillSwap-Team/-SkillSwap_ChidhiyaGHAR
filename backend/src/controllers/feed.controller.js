const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const { getTopSkillsByDemand } = require('../services/analyticsService.js')
const logger = require('../utils/logger.js')

// ✅ GET /api/feed
const getActivityFeed = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const result = await db.paginate('activities', '*', {}, {
      page: parseInt(page),
      limit: parseInt(limit),
      orderBy: 'created_at',
      ascending: false
    })

    // Fetch related profiles for actors to make feed rich
    const data = result.data || []
    const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))]

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

      const profileMap = new Map((profiles || []).map(p => [p.id, p]))

      data.forEach(activity => {
        if (activity.user_id) {
          activity.user_profile = profileMap.get(activity.user_id) || null
        }
      })
    }

    return res.status(200).json({
      data,
      pagination: result.pagination
    })
  } catch (err) { next(err) }
}

// ✅ GET /api/feed/trending
const getTrendingSkills = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query
    const skills = await getTopSkillsByDemand({ limit: parseInt(limit) })
    return res.status(200).json({ data: skills })
  } catch (err) { next(err) }
}

module.exports = {
  getActivityFeed,
  getTrendingSkills
}
