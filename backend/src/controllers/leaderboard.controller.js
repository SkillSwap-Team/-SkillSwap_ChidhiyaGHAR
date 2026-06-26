const { getTopUsers, getUserRank, computeLeaderboardFromDB, getActivityLeaderboard } = require('../services/leaderboardService.js')
const logger = require('../utils/logger.js')

// ✅ GET /api/leaderboard
const getLeaderboard = async (req, res, next) => {
  try {
    const { period = 'allTime', limit = 50, offset = 0, type = 'reputation' } = req.query
    const validPeriods = ['weekly', 'monthly', 'allTime']
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: "Invalid period. Must be 'weekly', 'monthly', or 'allTime'." })
    }

    if (type === 'activity') {
      const leaderboard = await getActivityLeaderboard({ limit: parseInt(limit), offset: parseInt(offset) })
      return res.status(200).json({ data: leaderboard })
    }

    const leaderboard = await getTopUsers(period, { limit: parseInt(limit), offset: parseInt(offset) })
    return res.status(200).json({ data: leaderboard })
  } catch (err) { next(err) }
}

// ✅ GET /api/leaderboard/rank/:userId
const getUserLeaderboardRank = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { period = 'allTime' } = req.query
    const validPeriods = ['weekly', 'monthly', 'allTime']
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: "Invalid period. Must be 'weekly', 'monthly', or 'allTime'." })
    }

    const rankInfo = await getUserRank(userId, period)
    return res.status(200).json({ data: rankInfo })
  } catch (err) { next(err) }
}

// ✅ GET /api/leaderboard/activity
const getActivityLeaderboardCtrl = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const leaderboard = await getActivityLeaderboard({ limit: parseInt(limit), offset: parseInt(offset) })
    return res.status(200).json({ data: leaderboard })
  } catch (err) { next(err) }
}

module.exports = {
  getLeaderboard,
  getUserLeaderboardRank,
  getActivityLeaderboard: getActivityLeaderboardCtrl
}
