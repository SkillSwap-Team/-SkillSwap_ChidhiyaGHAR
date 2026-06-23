const express = require('express')
const router = express.Router()
const reviewsController = require('../controllers/reviews.controller.js')
const { verifyToken } = require('../middleware/auth.middleware.js')
const { normalLimiter } = require('../services/rateLimitter.js')

router.use(verifyToken, normalLimiter)

router.post('/', reviewsController.submitReview)
router.get('/user/:userId', reviewsController.getUserReviews)
router.post('/:reviewId/respond', reviewsController.respondToReview)

module.exports = router
