const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const { findTopMatches, computeMatchScore } = require('../services/matchingEngine.js')
const { notify } = require('../services/notificationService.js')
const emailService = require('../services/emailService.js')
const logger = require('../utils/logger.js')

// ✅ GET /api/matching
const getMyMatches = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    let query = supabaseAdmin
      .from('matches')
      .select(`
        id, status, match_score, ai_explanation, matched_skills, created_at, updated_at,
        user_a:user_a_id (id, username, profiles:id(full_name, avatar_url, avg_rating, reputation_points)),
        user_b:user_b_id (id, username, profiles:id(full_name, avatar_url, avg_rating, reputation_points))
      `)
      .or(`user_a_id.eq.${req.user.id},user_b_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return res.status(200).json({ data: data || [] })
  } catch (err) { next(err) }
}

// ✅ GET /api/matching/suggestions
const getMatchSuggestions = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query
    const suggestions = await findTopMatches(req.user.id, { limit: parseInt(limit) })
    return res.status(200).json({ data: suggestions })
  } catch (err) { next(err) }
}

// ✅ POST /api/matching/run
const runMatchingForMe = async (req, res, next) => {
  try {
    const matches = await findTopMatches(req.user.id, { limit: 30 })

    // Save top matches to DB
    const savedMatches = []
    for (const match of matches.slice(0, 10)) {
      try {
        const existing = await db.selectOne('matches', 'id', {
          user_a_id: req.user.id, user_b_id: match.userId
        })
        if (existing) continue

        const [saved] = await db.insert('matches', {
          user_a_id: req.user.id,
          user_b_id: match.userId,
          status: 'pending',
          match_score: match.matchScore,
          skill_similarity_score: match.skillSimilarityScore,
          availability_score: match.availabilityScore,
          reputation_score: match.reputationScore,
          expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
        })
        savedMatches.push(saved)
      } catch (e) {
        logger.warn(`[Matching] Failed to save match: ${e.message}`)
      }
    }

    return res.status(200).json({ data: { suggestions: matches, saved: savedMatches.length }, message: `Found ${matches.length} potential matches.` })
  } catch (err) { next(err) }
}

// ✅ GET /api/matching/:matchId
const getMatchById = async (req, res, next) => {
  try {
    const { data } = await supabaseAdmin
      .from('matches')
      .select(`*, user_a:user_a_id(id, username, profiles:id(full_name, avatar_url, bio, avg_rating)), user_b:user_b_id(id, username, profiles:id(full_name, avatar_url, bio, avg_rating))`)
      .eq('id', req.params.matchId)
      .or(`user_a_id.eq.${req.user.id},user_b_id.eq.${req.user.id}`)
      .single()

    if (!data) return res.status(404).json({ error: 'Match not found.' })
    return res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ✅ POST /api/matching/:matchId/accept
const acceptMatch = async (req, res, next) => {
  try {
    const match = await db.selectOne('matches', '*', { id: req.params.matchId })
    if (!match) return res.status(404).json({ error: 'Match not found.' })

    const isUserA = match.user_a_id === req.user.id
    const updates = { status: 'accepted', updated_at: new Date().toISOString() }
    if (isUserA) updates.user_a_action = 'accepted'
    else updates.user_b_action = 'accepted'

    // If both accepted, fully accept
    if ((isUserA && match.user_b_action === 'accepted') || (!isUserA && match.user_a_action === 'accepted')) {
      updates.status = 'accepted'
    }

    const [updated] = await db.update('matches', updates, { id: match.id })

    // Notify the other user
    const otherId = isUserA ? match.user_b_id : match.user_a_id
    const io = req.app.get('io')
    await notify.matchAccepted(io, otherId, req.user.id, { matchId: match.id })

    return res.status(200).json({ data: updated, message: 'Match accepted.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/matching/:matchId/reject
const rejectMatch = async (req, res, next) => {
  try {
    const [updated] = await db.update('matches', { status: 'rejected', updated_at: new Date().toISOString() }, { id: req.params.matchId })
    return res.status(200).json({ data: updated, message: 'Match rejected.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/matching/:matchId/block
const blockMatch = async (req, res, next) => {
  try {
    const [updated] = await db.update('matches', { status: 'blocked', updated_at: new Date().toISOString() }, { id: req.params.matchId })
    return res.status(200).json({ data: updated, message: 'Match blocked.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/matching/request/:targetUserId
const sendMatchRequest = async (req, res, next) => {
  try {
    const { targetUserId } = req.params
    if (targetUserId === req.user.id) return res.status(400).json({ error: 'Cannot match with yourself.' })

    const existing = await db.selectOne('matches', 'id, status', { user_a_id: req.user.id, user_b_id: targetUserId })
    if (existing) return res.status(409).json({ error: 'Match request already exists.', data: existing })

    const scores = await computeMatchScore(req.user.id, targetUserId)
    const [match] = await db.insert('matches', {
      user_a_id: req.user.id,
      user_b_id: targetUserId,
      status: 'pending',
      match_score: scores.matchScore,
      skill_similarity_score: scores.skillSimilarityScore,
      initiated_by: req.user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    })

    const io = req.app.get('io')
    await notify.matchFound(io, targetUserId, req.user.id, { matchId: match.id, score: scores.matchScore })

    return res.status(201).json({ data: match, message: 'Match request sent.' })
  } catch (err) { next(err) }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const getNearbyLearners = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userProfile = await db.selectOne('profiles', 'latitude, longitude, city, country_code', { id: userId })
    const userOffered = await db.select('user_skills_offered', 'skill_id', { user_id: userId })
    
    if (!userOffered || userOffered.length === 0) {
      return res.status(200).json({ data: [] })
    }
    const offeredSkillIds = userOffered.map(s => s.skill_id)

    const { data: candidates, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, full_name, avatar_url, avg_rating, total_sessions, reputation_points, location, city, state_code, latitude, longitude,
        user_skills_wanted ( skill_id, skills ( name ) )
      `)
      .neq('id', userId)
      .eq('is_profile_complete', true)

    if (error) throw error
    if (!candidates || candidates.length === 0) return res.status(200).json({ data: [] })

    const learners = []
    const socketServer = require('../websocket/socketServer.js')
    const active = socketServer.activeUsers

    for (const candidate of candidates) {
      const wantedSkills = candidate.user_skills_wanted || []
      const matchingSkills = wantedSkills.filter(s => offeredSkillIds.includes(s.skill_id)).map(s => s.skills?.name).filter(Boolean)
      
      if (matchingSkills.length > 0) {
        let distance = null
        if (userProfile?.latitude && userProfile?.longitude && candidate.latitude && candidate.longitude) {
          distance = haversineDistance(userProfile.latitude, userProfile.longitude, candidate.latitude, candidate.longitude)
        }
        learners.push({
          userId: candidate.id,
          profile: candidate,
          skillsWanted: matchingSkills,
          skillsOffered: [],
          distance: distance ? Math.round(distance * 10) / 10 : null,
          isLive: active ? active.has(candidate.id) : false
        })
      }
    }

    learners.sort((a, b) => {
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })

    return res.status(200).json({ data: learners })
  } catch (err) { next(err) }
}

const getNearbyTeachers = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userProfile = await db.selectOne('profiles', 'latitude, longitude, city, country_code', { id: userId })
    const userWanted = await db.select('user_skills_wanted', 'skill_id', { user_id: userId })

    if (!userWanted || userWanted.length === 0) {
      return res.status(200).json({ data: [] })
    }
    const wantedSkillIds = userWanted.map(s => s.skill_id)

    const { data: candidates, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, full_name, avatar_url, avg_rating, total_sessions, reputation_points, location, city, state_code, latitude, longitude,
        user_skills_offered ( skill_id, skills ( name ) )
      `)
      .neq('id', userId)
      .eq('is_profile_complete', true)

    if (error) throw error
    if (!candidates || candidates.length === 0) return res.status(200).json({ data: [] })

    const teachers = []
    const socketServer = require('../websocket/socketServer.js')
    const active = socketServer.activeUsers

    for (const candidate of candidates) {
      const offeredSkills = candidate.user_skills_offered || []
      const matchingSkills = offeredSkills.filter(s => wantedSkillIds.includes(s.skill_id)).map(s => s.skills?.name).filter(Boolean)

      if (matchingSkills.length > 0) {
        let distance = null
        if (userProfile?.latitude && userProfile?.longitude && candidate.latitude && candidate.longitude) {
          distance = haversineDistance(userProfile.latitude, userProfile.longitude, candidate.latitude, candidate.longitude)
        }
        teachers.push({
          userId: candidate.id,
          profile: candidate,
          skillsOffered: matchingSkills,
          skillsWanted: [],
          distance: distance ? Math.round(distance * 10) / 10 : null,
          isLive: active ? active.has(candidate.id) : false
        })
      }
    }

    teachers.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1
      if (!a.isLive && b.isLive) return 1
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })

    return res.status(200).json({ data: teachers })
  } catch (err) { next(err) }
}

module.exports = {
  getMyMatches, getMatchSuggestions, runMatchingForMe, getMatchById,
  acceptMatch, rejectMatch, blockMatch, sendMatchRequest,
  getNearbyLearners, getNearbyTeachers
}
