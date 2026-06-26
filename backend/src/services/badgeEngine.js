const { supabaseAdmin } = require('../config/supabaseClient')
const logger = require('../utils/logger.js')

// ✅ Badge criteria evaluator
const BADGE_EVALUATORS = {
  // Session-count based badges
  session_count: async (userId, threshold) => {
    const { count } = await supabaseAdmin
      .from('learning_sessions')
      .select('id', { count: 'exact', head: true })
      .or(`host_id.eq.${userId},participant_id.eq.${userId}`)
      .eq('status', 'completed')
    return (count || 0) >= threshold
  },

  // Teaching hours based
  teaching_hours: async (userId, threshold) => {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('teaching_hours')
      .eq('id', userId)
      .single()
    return (profile?.teaching_hours || 0) >= threshold
  },

  // Review count + rating based
  review_rating: async (userId, { minRating, minCount }) => {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('avg_rating, total_reviews')
      .eq('id', userId)
      .single()
    return (profile?.avg_rating || 0) >= minRating && (profile?.total_reviews || 0) >= minCount
  },

  // Reputation points
  reputation_points: async (userId, threshold) => {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('reputation_points')
      .eq('id', userId)
      .single()
    return (profile?.reputation_points || 0) >= threshold
  },

  // Skill diversity: number of unique skills taught
  skill_diversity: async (userId, threshold) => {
    const { count } = await supabaseAdmin
      .from('user_skills_offered')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    return (count || 0) >= threshold
  },

  // Profile completeness
  profile_complete: async (userId) => {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_profile_complete, avatar_url, bio, full_name')
      .eq('id', userId)
      .single()
    return !!(profile?.is_profile_complete && profile?.avatar_url && profile?.bio && profile?.full_name)
  },

  // Match count
  match_count: async (userId, threshold) => {
    const { count } = await supabaseAdmin
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .eq('status', 'accepted')
    return (count || 0) >= threshold
  },

  // First chat badge: at least one message sent by the user
  first_chat: async (userId) => {
    const { count } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', userId)
    return (count || 0) >= 1
  },

  // First call badge: at least one completed session where user was host or participant
  first_call: async (userId) => {
    const { count } = await supabaseAdmin
      .from('learning_sessions')
      .select('id', { count: 'exact', head: true })
      .or(`host_id.eq.${userId},participant_id.eq.${userId}`)
      .eq('status', 'completed')
    return (count || 0) >= 1
  },

  // Leaderboard rank check
  leaderboard_rank: async (userId, { period = 'allTime', rank = 1 }) => {
    try {
      const { getUserRank } = require('./leaderboardService.js')
      const result = await getUserRank(userId, period)
      return result.rank !== null && result.rank <= rank
    } catch {
      return false
    }
  },

  // Conversation count badge
  conversation_count: async (userId, threshold) => {
    const { count } = await supabaseAdmin
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    return (count || 0) >= threshold
  }
}

// ✅ Check if user qualifies for a badge
async function checkBadgeCriteria(userId, badge) {
  try {
    const criteria = badge.criteria
    const evaluator = BADGE_EVALUATORS[criteria.type]
    if (!evaluator) {
      logger.warn(`[BadgeEngine] No evaluator for criteria type: ${criteria.type}`)
      return false
    }
    return await evaluator(userId, criteria.threshold ?? criteria)
  } catch (err) {
    logger.error(`[BadgeEngine] checkBadgeCriteria error for badge ${badge.slug}: ${err.message}`)
    return false
  }
}

// ✅ Award badge to user if not already awarded
async function awardBadge(userId, badgeId, badgeName) {
  try {
    const { data: existing } = await supabaseAdmin
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .maybeSingle()

    if (existing) return null // Already has badge

    const { data: awarded, error } = await supabaseAdmin
      .from('user_badges')
      .insert({ user_id: userId, badge_id: badgeId })
      .select()
      .single()

    if (error) throw error

    // Award reputation points for badge
    await supabaseAdmin.from('reputation_points').insert({
      user_id: userId,
      points: 50,
      action: `badge_earned:${badgeName}`,
      reference_type: 'badge',
      reference_id: badgeId
    })

    // Update profile reputation
    await supabaseAdmin.rpc('increment_reputation', { user_id_input: userId, points_input: 50 })

    // Update profile activity score too
    await supabaseAdmin.rpc('increment_activity', { user_id_input: userId, points_input: 25 }).catch(() => {})

    logger.info(`[BadgeEngine] Awarded badge "${badgeName}" to user ${userId}`)
    return awarded
  } catch (err) {
    logger.error(`[BadgeEngine] awardBadge error: ${err.message}`)
    return null
  }
}

// ✅ Evaluate all badges for a user and award qualifying ones
async function evaluateUserBadges(userId) {
  try {
    const { data: allBadges } = await supabaseAdmin
      .from('badge_definitions')
      .select('*')
      .eq('is_active', true)

    if (!allBadges || allBadges.length === 0) return []

    const awarded = []
    for (const badge of allBadges) {
      const qualifies = await checkBadgeCriteria(userId, badge)
      if (qualifies) {
        const result = await awardBadge(userId, badge.id, badge.name)
        if (result) awarded.push(badge)
      }
    }

    return awarded
  } catch (err) {
    logger.error(`[BadgeEngine] evaluateUserBadges error: ${err.message}`)
    return []
  }
}

module.exports = { checkBadgeCriteria, awardBadge, evaluateUserBadges, BADGE_EVALUATORS }
