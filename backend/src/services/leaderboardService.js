const redis = require('../config/redisClient')
const { supabaseAdmin } = require('../config/supabaseClient')
const logger = require('../utils/logger.js')

const LEADERBOARD_KEYS = {
  weekly: 'leaderboard:weekly',
  monthly: 'leaderboard:monthly',
  allTime: 'leaderboard:alltime',
  bySkill: (skillId) => `leaderboard:skill:${skillId}`
}

const CACHE_TTL_SECONDS = {
  weekly: 3600,    // 1 hour
  monthly: 7200,   // 2 hours
  allTime: 14400   // 4 hours
}

// ✅ Update a user's score on leaderboards
async function updateLeaderboardScore(userId, points, period = 'all') {
  try {
    const now = Date.now()
    await redis.zadd(LEADERBOARD_KEYS.allTime, points, userId)

    if (period === 'weekly' || period === 'all') {
      const weekKey = `${LEADERBOARD_KEYS.weekly}:${getWeekKey()}`
      await redis.zadd(weekKey, 'INCR', points, userId)
      await redis.expire(weekKey, 7 * 24 * 3600) // 7 days
    }

    if (period === 'monthly' || period === 'all') {
      const monthKey = `${LEADERBOARD_KEYS.monthly}:${getMonthKey()}`
      await redis.zadd(monthKey, 'INCR', points, userId)
      await redis.expire(monthKey, 31 * 24 * 3600) // 31 days
    }
  } catch (err) {
    logger.error(`[Leaderboard] updateScore error: ${err.message}`)
  }
}

// ✅ Get top N users for a leaderboard period
async function getTopUsers(period = 'allTime', { limit = 50, offset = 0 } = {}) {
  try {
    const key = period === 'weekly'
      ? `${LEADERBOARD_KEYS.weekly}:${getWeekKey()}`
      : period === 'monthly'
        ? `${LEADERBOARD_KEYS.monthly}:${getMonthKey()}`
        : LEADERBOARD_KEYS.allTime

    // Get user IDs + scores from Redis sorted set (highest score first)
    const results = await redis.zrevrange(key, offset, offset + limit - 1, 'WITHSCORES')

    if (!results || results.length === 0) {
      // Fallback: compute from DB
      return computeLeaderboardFromDB(period, limit)
    }

    // Parse Redis results: [userId, score, userId, score, ...]
    const userIds = []
    const scoreMap = new Map()
    for (let i = 0; i < results.length; i += 2) {
      userIds.push(results[i])
      scoreMap.set(results[i], parseFloat(results[i + 1]))
    }

    if (userIds.length === 0) return []

    // Fetch user profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, avg_rating, total_sessions, reputation_points')
      .in('id', userIds)

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .in('id', userIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const userMap = new Map((users || []).map(u => [u.id, u]))

    return userIds.map((id, index) => ({
      rank: offset + index + 1,
      userId: id,
      username: userMap.get(id)?.username,
      profile: profileMap.get(id),
      score: scoreMap.get(id)
    })).filter(u => u.profile)
  } catch (err) {
    logger.error(`[Leaderboard] getTopUsers error: ${err.message}`)
    return computeLeaderboardFromDB(period, limit)
  }
}

// ✅ Get a user's rank
async function getUserRank(userId, period = 'allTime') {
  try {
    const key = period === 'weekly'
      ? `${LEADERBOARD_KEYS.weekly}:${getWeekKey()}`
      : period === 'monthly'
        ? `${LEADERBOARD_KEYS.monthly}:${getMonthKey()}`
        : LEADERBOARD_KEYS.allTime

    const rank = await redis.zrevrank(key, userId)
    const score = await redis.zscore(key, userId)
    return { rank: rank !== null ? rank + 1 : null, score: score ? parseFloat(score) : 0 }
  } catch (err) {
    logger.error(`[Leaderboard] getUserRank error: ${err.message}`)
    return { rank: null, score: 0 }
  }
}

// ✅ Fallback: compute leaderboard from DB
async function computeLeaderboardFromDB(period = 'allTime', limit = 50, type = 'allTime') {
  const scoreColumn = type === 'activity' ? 'activity_score' : 'reputation_points'

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url, avg_rating, total_sessions, activity_score, reputation_points')
    .order(scoreColumn, { ascending: false })
    .limit(limit)

  if (!profiles) return []

  const userIds = profiles.map(p => p.id)
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, username')
    .in('id', userIds)

  const userMap = new Map((users || []).map(u => [u.id, u]))

  return profiles.map((p, i) => ({
    rank: i + 1,
    userId: p.id,
    username: userMap.get(p.id)?.username,
    profile: p,
    score: p[scoreColumn] || 0
  }))
}

// ✅ Compute activity leaderboard directly from DB
async function getActivityLeaderboard({ limit = 50, offset = 0 } = {}) {
  return computeLeaderboardFromDB('allTime', limit, 'activity')
}

// ✅ Rebuild Redis leaderboard from DB (called by leaderboardWorker)
async function rebuildLeaderboard() {
  try {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, reputation_points')
      .gt('reputation_points', 0)

    if (!profiles || profiles.length === 0) return

    const pipeline = redis.pipeline()
    for (const p of profiles) {
      pipeline.zadd(LEADERBOARD_KEYS.allTime, p.reputation_points, p.id)
    }
    await pipeline.exec()
    logger.info(`[Leaderboard] Rebuilt all-time leaderboard with ${profiles.length} users`)
  } catch (err) {
    logger.error(`[Leaderboard] rebuildLeaderboard error: ${err.message}`)
  }
}

// Helper: week key (YYYY-WW)
function getWeekKey() {
  const d = new Date()
  const week = Math.ceil((d.getDate() + new Date(d.getFullYear(), 0, 1).getDay()) / 7)
  return `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`
}

// Helper: month key (YYYY-MM)
function getMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

module.exports = { updateLeaderboardScore, getTopUsers, getUserRank, computeLeaderboardFromDB, rebuildLeaderboard }
