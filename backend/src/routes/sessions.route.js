const express = require('express')
const router = express.Router()
const sessionsController = require('../controllers/sessions.controller.js')
const { verifyToken } = require('../middleware/auth.middleware.js')
const { normalLimiter } = require('../services/rateLimitter.js')
const { createSessionValidator, handleValidationErrors } = require('../middleware/validation.js')

router.use(verifyToken, normalLimiter)

router.get('/', sessionsController.getMySessions)
router.post('/', createSessionValidator, handleValidationErrors, sessionsController.scheduleSession)
router.get('/:id', sessionsController.getSessionById)
router.post('/:id/confirm', sessionsController.confirmSession)
router.post('/:id/cancel', sessionsController.cancelSession)
router.post('/:id/join', sessionsController.joinSession)
router.post('/:id/complete', sessionsController.completeSession)
router.post('/:id/notes', sessionsController.saveNotes)
router.post('/:id/attendance', sessionsController.markAttendance)

module.exports = router
