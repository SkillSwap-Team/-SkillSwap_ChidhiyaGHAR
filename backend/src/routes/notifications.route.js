const express = require('express')
const router = express.Router()
const notificationsController = require('../controllers/notifications.controller.js')
const { verifyToken } = require('../middleware/auth.middleware.js')
const { normalLimiter } = require('../services/rateLimitter.js')

router.use(verifyToken, normalLimiter)

router.get('/', notificationsController.getMyNotifications)
router.post('/read', notificationsController.markAsRead)
router.get('/preferences', notificationsController.getPreferences)
router.put('/preferences', notificationsController.updatePreferences)

module.exports = router
