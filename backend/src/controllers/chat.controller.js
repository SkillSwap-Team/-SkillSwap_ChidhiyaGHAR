const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const logger = require('../utils/logger.js')

// ✅ GET /api/chat/conversations
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id
    // Query conversations where req.user.id is a participant
    // Join participant user profiles
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        id, created_at, updated_at, last_message_at,
        participant_a:user_a_id (id, username, profiles:id (full_name, avatar_url)),
        participant_b:user_b_id (id, username, profiles:id (full_name, avatar_url))
      `)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    // Map responses to clean up format
    const formatted = (data || []).map(conv => {
      const otherUser = conv.participant_a.id === userId ? conv.participant_b : conv.participant_a
      return {
        id: conv.id,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        last_message_at: conv.last_message_at,
        other_user: {
          id: otherUser.id,
          username: otherUser.username,
          full_name: otherUser.profiles?.full_name || null,
          avatar_url: otherUser.profiles?.avatar_url || null
        }
      }
    })

    return res.status(200).json({ data: formatted })
  } catch (err) { next(err) }
}

// ✅ POST /api/chat/conversations
const createConversation = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { participantId } = req.body

    if (!participantId) return res.status(400).json({ error: 'participantId is required.' })
    if (userId === participantId) return res.status(400).json({ error: 'Cannot start a conversation with yourself.' })

    // Check if conversation already exists
    const { data: existing, error: findError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .or(`and(user_a_id.eq.${userId},user_b_id.eq.${participantId}),and(user_a_id.eq.${participantId},user_b_id.eq.${userId})`)
      .maybeSingle()

    if (findError) throw findError
    if (existing) {
      return res.status(200).json({ data: existing, message: 'Conversation already exists.' })
    }

    // Insert new conversation
    const [newConv] = await db.insert('conversations', {
      user_a_id: userId,
      user_b_id: participantId,
      last_message_at: new Date().toISOString()
    })

    return res.status(201).json({ data: newConv, message: 'Conversation started.' })
  } catch (err) { next(err) }
}

// ✅ GET /api/chat/conversations/:conversationId/messages
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params
    const { page = 1, limit = 50 } = req.query
    const userId = req.user.id

    // Verify conversation ownership
    const conv = await db.selectOne('conversations', 'id, user_a_id, user_b_id', { id: conversationId })
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' })
    if (conv.user_a_id !== userId && conv.user_b_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view these messages.' })
    }

    const result = await db.paginate('messages', '*', { conversation_id: conversationId }, {
      page: parseInt(page),
      limit: parseInt(limit),
      orderBy: 'created_at',
      ascending: false
    })

    return res.status(200).json(result)
  } catch (err) { next(err) }
}

// ✅ POST /api/chat/conversations/:conversationId/messages
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params
    const { text, attachment_url, attachment_type } = req.body
    const userId = req.user.id

    if (!text && !attachment_url) {
      return res.status(400).json({ error: 'Message content or attachment is required.' })
    }

    // Verify participant
    const conv = await db.selectOne('conversations', 'id, user_a_id, user_b_id', { id: conversationId })
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' })
    if (conv.user_a_id !== userId && conv.user_b_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to send message.' })
    }

    const [message] = await db.insert('messages', {
      conversation_id: conversationId,
      sender_id: userId,
      text: text || '',
      attachment_url: attachment_url || null,
      attachment_type: attachment_type || null,
      is_read: false
    })

    // Update last message timestamp
    await db.update('conversations', { last_message_at: new Date().toISOString() }, { id: conversationId })

    // Emit WebSocket event to recipient
    const recipientId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id
    const io = req.app.get('io')
    if (io) {
      io.to(`user:${recipientId}`).emit('new_message', { conversationId, message })
    }

    return res.status(201).json({ data: message })
  } catch (err) { next(err) }
}

// ✅ POST /api/chat/conversations/:conversationId/read
const markRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params
    const userId = req.user.id

    // Verify participant
    const conv = await db.selectOne('conversations', 'id, user_a_id, user_b_id', { id: conversationId })
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' })
    if (conv.user_a_id !== userId && conv.user_b_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized.' })
    }

    // Update messages sent by the other user to is_read = true
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)

    if (error) throw error

    // Emit socket read receipt
    const otherId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id
    const io = req.app.get('io')
    if (io) {
      io.to(`user:${otherId}`).emit('messages_read', { conversationId, readerId: userId })
    }

    return res.status(200).json({ message: 'Messages marked as read.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/chat/messages/:messageId/reaction
const addReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params
    const { emoji } = req.body
    const userId = req.user.id

    if (!emoji) return res.status(400).json({ error: 'Emoji is required.' })

    const msg = await db.selectOne('messages', 'id, conversation_id', { id: messageId })
    if (!msg) return res.status(404).json({ error: 'Message not found.' })

    // Verify conversation
    const conv = await db.selectOne('conversations', 'id, user_a_id, user_b_id', { id: msg.conversation_id })
    if (conv.user_a_id !== userId && conv.user_b_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized.' })
    }

    // Insert or update reaction
    const [reaction] = await db.upsert('message_reactions', {
      message_id: messageId,
      user_id: userId,
      emoji
    }, { onConflict: 'message_id,user_id' })

    // Emit event
    const otherId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id
    const io = req.app.get('io')
    if (io) {
      io.to(`user:${otherId}`).emit('message_reaction', { messageId, reaction })
    }

    return res.status(200).json({ data: reaction, message: 'Reaction added.' })
  } catch (err) { next(err) }
}

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markRead,
  addReaction
}
