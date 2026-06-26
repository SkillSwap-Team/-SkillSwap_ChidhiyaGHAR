const express = require('express')
const router = express.Router()
const badgesController = require('../controllers/badges.controller.js')
const { evaluateUserBadges } = require('../services/badgeEngine.js')
const { verifyToken } = require('../middleware/auth.middleware.js')
const { normalLimiter } = require('../services/rateLimitter.js')

router.use(verifyToken, normalLimiter)

router.get('/definitions', badgesController.getBadgeDefinitions)
router.get('/my', badgesController.getMyBadges)
router.get('/user/:userId', badgesController.getUserBadges)
router.post('/evaluate', async (req, res) => {
  const userId = req.user.id
  try {
    const awarded = await evaluateUserBadges(userId)
    return res.status(200).json({ data: awarded })
  } catch (err) {
    return res.status(500).json({ error: 'Badge evaluation failed', details: err.message })
  }
})

module.exports = router
