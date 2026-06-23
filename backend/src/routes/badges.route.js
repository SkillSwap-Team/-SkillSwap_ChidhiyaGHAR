const express = require('express')
const router = express.Router()
const badgesController = require('../controllers/badges.controller.js')
const { verifyToken } = require('../middleware/auth.middleware.js')
const { normalLimiter } = require('../services/rateLimitter.js')

router.use(verifyToken, normalLimiter)

router.get('/definitions', badgesController.getBadgeDefinitions)
router.get('/my', badgesController.getMyBadges)
router.get('/user/:userId', badgesController.getUserBadges)

module.exports = router
