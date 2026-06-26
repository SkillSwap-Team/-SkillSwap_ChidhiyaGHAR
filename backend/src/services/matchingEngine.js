const { supabaseAdmin } = require('../config/supabaseClient')
const { generateEmbedding } = require('./embedding.js')
const logger = require('../utils/logger.js')

// ✅ Score weights (must sum to 1.0)
const WEIGHTS = {
  skillSimilarity: 0.45,
  availability: 0.20,
  reputation: 0.15,
  preferences: 0.10,
  mutual: 0.10
}

// ✅ Compute skill overlap score between two users
function computeSkillOverlapScore(userAOffered, userBWanted, userBOffered, userAWanted) {
  const aOfferedIds = new Set(userAOffered.map(s => s.skill_id))
  const bWantedIds = new Set(userBWanted.map(s => s.skill_id))
  const bOfferedIds = new Set(userBOffered.map(s => s.skill_id))
  const aWantedIds = new Set(userAWanted.map(s => s.skill_id))

  // Forward match: A teaches what B wants
  const forwardMatches = [...aOfferedIds].filter(id => bWantedIds.has(id)).length
  // Reverse match: B teaches what A wants
  const reverseMatches = [...bOfferedIds].filter(id => aWantedIds.has(id)).length

  const totalPossible = Math.max(bWantedIds.size + aWantedIds.size, 1)
  const score = ((forwardMatches + reverseMatches) / totalPossible) * 100

  return {
    score: Math.min(score, 100),
    forwardMatches,
    reverseMatches,
    matchedSkillIds: [
      ...[...aOfferedIds].filter(id => bWantedIds.has(id)),
      ...[...bOfferedIds].filter(id => aWantedIds.has(id))
    ]
  }
}

// ✅ Availability overlap score
function computeAvailabilityScore(availabilityA, availabilityB) {
  if (!availabilityA.length || !availabilityB.length) return 30 // default moderate score

  let overlappingSlots = 0
  for (const slotA of availabilityA) {
    for (const slotB of availabilityB) {
      if (slotA.day_of_week === slotB.day_of_week) {
        // Check time overlap
        const aStart = slotA.start_time
        const aEnd = slotA.end_time
        const bStart = slotB.start_time
        const bEnd = slotB.end_time
        if (aStart < bEnd && aEnd > bStart) overlappingSlots++
      }
    }
  }

  return Math.min((overlappingSlots / Math.max(availabilityA.length, 1)) * 100, 100)
}

// ✅ Reputation score (normalized 0-100)
function computeReputationScore(profileA, profileB) {
  const avgRating = ((profileA.avg_rating || 0) + (profileB.avg_rating || 0)) / 2
  const ratingScore = (avgRating / 5) * 60
  const sessionScore = Math.min(((profileA.total_sessions || 0) + (profileB.total_sessions || 0)) / 200 * 40, 40)
  return ratingScore + sessionScore
}

// ✅ Main composite matching score computation
async function computeMatchScore(userAId, userBId) {
  // Fetch all required data in parallel
  const [
    { data: userAOffered },
    { data: userAWanted },
    { data: userBOffered },
    { data: userBWanted },
    { data: availabilityA },
    { data: availabilityB },
    { data: profileA },
    { data: profileB }
  ] = await Promise.all([
    supabaseAdmin.from('user_skills_offered').select('skill_id, proficiency_level').eq('user_id', userAId),
    supabaseAdmin.from('user_skills_wanted').select('skill_id, urgency').eq('user_id', userAId),
    supabaseAdmin.from('user_skills_offered').select('skill_id, proficiency_level').eq('user_id', userBId),
    supabaseAdmin.from('user_skills_wanted').select('skill_id, urgency').eq('user_id', userBId),
    supabaseAdmin.from('availability').select('day_of_week, start_time, end_time').eq('user_id', userAId),
    supabaseAdmin.from('availability').select('day_of_week, start_time, end_time').eq('user_id', userBId),
    supabaseAdmin.from('profiles').select('avg_rating, total_sessions, reputation_points').eq('id', userAId).single(),
    supabaseAdmin.from('profiles').select('avg_rating, total_sessions, reputation_points').eq('id', userBId).single()
  ])

  const skillResult = computeSkillOverlapScore(
    userAOffered || [], userBWanted || [],
    userBOffered || [], userAWanted || []
  )
  const availabilityScore = computeAvailabilityScore(availabilityA || [], availabilityB || [])
  const reputationScore = computeReputationScore(profileA || {}, profileB || {})

  // Mutual interest score (both have skills the other wants)
  const mutualScore = skillResult.forwardMatches > 0 && skillResult.reverseMatches > 0 ? 100 : 50

  const compositeScore =
    skillResult.score * WEIGHTS.skillSimilarity +
    availabilityScore * WEIGHTS.availability +
    reputationScore * WEIGHTS.reputation +
    mutualScore * WEIGHTS.mutual

  return {
    matchScore: Math.round(compositeScore * 10) / 10,
    skillSimilarityScore: Math.round(skillResult.score * 10) / 10,
    availabilityScore: Math.round(availabilityScore * 10) / 10,
    reputationScore: Math.round(reputationScore * 10) / 10,
    preferenceScore: 70, // Default, can be enhanced with user preferences
    matchedSkillIds: skillResult.matchedSkillIds,
    forwardMatches: skillResult.forwardMatches,
    reverseMatches: skillResult.reverseMatches
  }
}

// ✅ Find top matches for a user using composite score (interest overlap & stars/reputation)
async function findTopMatches(userId, { limit = 20 } = {}) {
  try {
    // Get all users except self, with profiles and skills
    const { data: candidates } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, full_name, avatar_url, avg_rating, total_sessions, reputation_points, location, city, state_code,
        user_skills_offered(skills(name)),
        user_skills_wanted(skills(name))
      `)
      .neq('id', userId)
      .limit(200)

    if (!candidates || candidates.length === 0) return []

    // Compute match scores for top candidates
    const matchPromises = candidates.slice(0, 50).map(async (candidate) => {
      try {
        const scores = await computeMatchScore(userId, candidate.id)
        return {
          userId: candidate.id,
          profile: candidate,
          skillsOffered: candidate.user_skills_offered?.map(s => s.skills?.name).filter(Boolean) || [],
          skillsWanted: candidate.user_skills_wanted?.map(s => s.skills?.name).filter(Boolean) || [],
          ...scores
        }
      } catch {
        return null
      }
    })

    const results = (await Promise.all(matchPromises)).filter(Boolean)
    results.sort((a, b) => b.matchScore - a.matchScore)
    return results.slice(0, limit)
  } catch (err) {
    logger.error(`[MatchingEngine] findTopMatches error: ${err.message}`)
    throw err
  }
}

module.exports = { computeMatchScore, findTopMatches, computeSkillOverlapScore, computeAvailabilityScore }
