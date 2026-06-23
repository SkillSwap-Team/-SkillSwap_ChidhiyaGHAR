const express = require('express')
const router = express.Router()
const chatController = require('../controllers/chat.controller.js')
const { verifyToken } = require('../middleware/auth.middleware.js')
const { relaxedLimiter } = require('../services/rateLimitter.js')

router.use(verifyToken, relaxedLimiter)

router.get('/conversations', chatController.getConversations)
router.post('/conversations', chatController.createConversation)
router.get('/conversations/:conversationId/messages', chatController.getMessages)
router.post('/conversations/:conversationId/messages', chatController.sendMessage)
router.post('/conversations/:conversationId/read', chatController.markRead)
router.post('/messages/:messageId/reaction', chatController.addReaction)

module.exports = router
