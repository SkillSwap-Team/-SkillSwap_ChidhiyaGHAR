const { supabaseAdmin } = require('../config/supabaseClient')
const logger = require('../utils/logger.js')

// ✅ Content-based recommendations: suggest users who teach skills I want
async function getSkillBasedRecommendations(userId, { limit = 10 } = {}) {
  try {
    // Skills the user wants to learn
    const { data: wantedSkills } = await supabaseAdmin
      .from('user_skills_wanted')
      .select('skill_id')
      .eq('user_id', userId)

    if (!wantedSkills || wantedSkills.length === 0) return []
    const wantedIds = wantedSkills.map(s => s.skill_id)

    // Find users who offer those skills (excluding self + already matched)
    const { data: existingMatches } = await supabaseAdmin
      .from('matches')
      .select('user_a_id, user_b_id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)

    const matchedIds = new Set()
    existingMatches?.forEach(m => {
      if (m.user_a_id !== userId) matchedIds.add(m.user_a_id)
      if (m.user_b_id !== userId) matchedIds.add(m.user_b_id)
    })

    const { data: teachers } = await supabaseAdmin
      .from('user_skills_offered')
      .select(`
        user_id, proficiency_level,
        skills (id, name, slug),
        profiles:user_id (id, full_name, avatar_url, avg_rating, total_sessions, reputation_points, bio)
      `)
      .in('skill_id', wantedIds)
      .neq('user_id', userId)
      .limit(limit * 3)

    if (!teachers) return []

    // Deduplicate by user_id, score by profile quality
    const userMap = new Map()
    for (const t of teachers) {
      if (matchedIds.has(t.user_id)) continue
      if (!userMap.has(t.user_id)) {
        userMap.set(t.user_id, {
          userId: t.user_id,
          profile: t.profiles,
          matchingSkills: [],
          score: 0
        })
      }
      const entry = userMap.get(t.user_id)
      entry.matchingSkills.push({ skill: t.skills, level: t.proficiency_level })
      entry.score += (t.profiles?.avg_rating || 0) * 10 + (t.profiles?.total_sessions || 0) * 0.5
    }

    const sorted = [...userMap.values()].sort((a, b) => b.score - a.score)
    return sorted.slice(0, limit)
  } catch (err) {
    logger.error(`[RecommendationService] getSkillBasedRecommendations: ${err.message}`)
    return []
  }
}

// ✅ Collaborative filtering: users similar to people you already matched with
async function getCollaborativeRecommendations(userId, { limit = 10 } = {}) {
  try {
    const { data: myMatches } = await supabaseAdmin
      .from('matches')
      .select('user_a_id, user_b_id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .eq('status', 'accepted')
      .limit(20)

    if (!myMatches || myMatches.length === 0) return []

    const myPeerIds = myMatches.map(m => m.user_a_id === userId ? m.user_b_id : m.user_a_id)

    // Find users matched with my peers (friend-of-friend)
    const { data: peerMatches } = await supabaseAdmin
      .from('matches')
      .select('user_a_id, user_b_id')
      .or(myPeerIds.map(id => `user_a_id.eq.${id},user_b_id.eq.${id}`).join(','))
      .eq('status', 'accepted')
      .limit(100)

    if (!peerMatches) return []

    const candidateIds = new Set()
    const myPeerSet = new Set(myPeerIds)
    peerMatches.forEach(m => {
      if (m.user_a_id !== userId && !myPeerSet.has(m.user_a_id)) candidateIds.add(m.user_a_id)
      if (m.user_b_id !== userId && !myPeerSet.has(m.user_b_id)) candidateIds.add(m.user_b_id)
    })

    if (candidateIds.size === 0) return []

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, avg_rating, total_sessions, reputation_points, bio')
      .in('id', [...candidateIds])
      .limit(limit)

    return profiles || []
  } catch (err) {
    logger.error(`[RecommendationService] getCollaborativeRecommendations: ${err.message}`)
    return []
  }
}

// ✅ Trending skills: skills with most recent activity
async function getTrendingSkills({ limit = 10, days = 7 } = {}) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data } = await supabaseAdmin
      .from('user_skills_wanted')
      .select('skill_id, skills(id, name, slug, icon_url, skill_categories(name, color))')
      .gte('created_at', since)
      .limit(limit * 5)

    if (!data) return []

    const skillCounts = new Map()
    data.forEach(({ skill_id, skills }) => {
      if (!skillCounts.has(skill_id)) skillCounts.set(skill_id, { skill: skills, count: 0 })
      skillCounts.get(skill_id).count++
    })

    return [...skillCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ skill, count }) => ({ ...skill, trending_count: count }))
  } catch (err) {
    logger.error(`[RecommendationService] getTrendingSkills: ${err.message}`)
    return []
  }
}

module.exports = { getSkillBasedRecommendations, getCollaborativeRecommendations, getTrendingSkills }
