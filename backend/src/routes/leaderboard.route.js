const express = require('express')
const router = express.Router()
const leaderboardController = require('../controllers/leaderboard.controller.js')
const { verifyToken } = require('../middleware/auth.middleware.js')
const { normalLimiter } = require('../services/rateLimitter.js')

router.use(verifyToken, normalLimiter)

router.get('/', leaderboardController.getLeaderboard)
router.get('/rank/:userId', leaderboardController.getUserLeaderboardRank)

module.exports = router
