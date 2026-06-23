const express = require('express')
const router = express.Router()
const matchingController = require('../controllers/matching.controller.js')
const { verifyToken, requireVerification } = require('../middleware/auth.middleware.js')
const { normalLimiter, aiLimiter } = require('../services/rateLimitter.js')

router.use(verifyToken, normalLimiter)

router.get('/', matchingController.getMyMatches)
router.get('/suggestions', matchingController.getMatchSuggestions)
router.get('/nearby-learners', matchingController.getNearbyLearners)
router.get('/nearby-teachers', matchingController.getNearbyTeachers)
router.post('/run', aiLimiter, matchingController.runMatchingForMe)
router.get('/:matchId', matchingController.getMatchById)
router.post('/:matchId/accept', matchingController.acceptMatch)
router.post('/:matchId/reject', matchingController.rejectMatch)
router.post('/:matchId/block', matchingController.blockMatch)
router.post('/request/:targetUserId', matchingController.sendMatchRequest)

module.exports = router
