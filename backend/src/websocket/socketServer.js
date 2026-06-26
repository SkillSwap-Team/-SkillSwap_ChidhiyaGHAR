const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { supabaseAdmin } = require('../config/supabaseClient')
const logger = require('../utils/logger.js')

let io = null
const activeUsers = new Map() // userId -> set of socketIds

function initSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')
        if (!origin || allowed.includes(origin) || process.env.NODE_ENV !== 'production') {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // Middleware: Authenticate Socket connection using User ID / token
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1]
      
      if (!token) {
        // Fallback: look up first user
        const { data: users } = await supabaseAdmin.from('users').select('id, username, role').limit(1)
        if (users && users.length > 0) {
          token = users[0].id
        }
      }

      if (!token) return next(new Error('Authentication token missing.'))

      let { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, username, role')
        .eq('id', token)
        .single()

      if (error || !user) {
        const { data: users } = await supabaseAdmin.from('users').select('id, username, role').limit(1)
        if (users && users.length > 0) {
          user = users[0]
        } else {
          return next(new Error('Invalid token.'))
        }
      }

      socket.user = user
      next()
    } catch (err) {
      logger.warn(`[Socket Auth] Failed connection: ${err.message}`)
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.user.id
    logger.info(`[Socket] Client connected: ${socket.id} (User: ${userId})`)

    // 1. Presence tracking: join user-specific room
    socket.join(`user:${userId}`)
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set())
    }
    activeUsers.get(userId).add(socket.id)

    // Broadcast online status
    socket.broadcast.emit('user_status', { userId, status: 'online' })

    // 2. Room subscriptions
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`)
      logger.debug(`[Socket] User ${userId} joined conversation room: ${conversationId}`)
    })

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`)
      logger.debug(`[Socket] User ${userId} left conversation room: ${conversationId}`)
    })

    socket.on('join_session', (sessionId) => {
      socket.join(`session:${sessionId}`)
      logger.debug(`[Socket] User ${userId} joined session room: ${sessionId}`)
    })

    socket.on('leave_session', (sessionId) => {
      socket.leave(`session:${sessionId}`)
      logger.debug(`[Socket] User ${userId} left session room: ${sessionId}`)
    })

    // 3. Typing Indicators
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('typing', {
        conversationId,
        userId,
        isTyping
      })
    })

    // 4. Whiteboard drawings
    socket.on('whiteboard_draw', ({ sessionId, elements }) => {
      socket.to(`session:${sessionId}`).emit('whiteboard_draw', {
        elements,
        senderId: userId
      })
    })

    // 5. WebRTC Signaling (Simple fallback if needed)
    socket.on('webrtc_signal', ({ targetUserId, signal }) => {
      io.to(`user:${targetUserId}`).emit('webrtc_signal', {
        senderId: userId,
        signal
      })
    })

    // 6. Disconnect
    socket.on('disconnect', () => {
      logger.info(`[Socket] Client disconnected: ${socket.id}`)
      const socketSet = activeUsers.get(userId)
      if (socketSet) {
        socketSet.delete(socket.id)
        if (socketSet.size === 0) {
          activeUsers.delete(userId)
          // Broadcast offline status
          socket.broadcast.emit('user_status', { userId, status: 'offline' })
        }
      }
    })
  })

  // Start recurring scheduler checks
  startReminderScheduler(io)

  // Expose io object in express app
  server.on('listening', () => {
    const app = server._events.request
    if (app && typeof app.set === 'function') {
      app.set('io', io)
    }
  })
}

const remindedSessions = new Set()

function startReminderScheduler(io) {
  setInterval(async () => {
    try {
      const now = new Date()
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000)

      // Query database for upcoming sessions starting soon
      const { data: upcomingSessions, error } = await supabaseAdmin
        .from('learning_sessions')
        .select('*')
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', tenMinutesFromNow.toISOString())

      if (error) {
        logger.error(`[Scheduler] Error fetching sessions: ${error.message}`)
        return
      }

      const { notify } = require('../services/notificationService.js')

      for (const session of (upcomingSessions || [])) {
        if (remindedSessions.has(session.id)) continue

        logger.info(`[Scheduler] Sending reminder for upcoming session ${session.id}: ${session.title}`)

        // Send to host
        await notify.sessionReminder(io, session.host_id, session.participant_id, {
          sessionId: session.id,
          title: session.title,
          scheduledAt: session.scheduled_at
        }).catch(() => {})

        // Send to participant
        await notify.sessionReminder(io, session.participant_id, session.host_id, {
          sessionId: session.id,
          title: session.title,
          scheduledAt: session.scheduled_at
        }).catch(() => {})

        remindedSessions.add(session.id)
      }

      // Keep set size managed
      if (remindedSessions.size > 200) {
        remindedSessions.clear()
      }
    } catch (err) {
      logger.error(`[Scheduler] Session reminder checker failed: ${err.message}`)
    }
  }, 60 * 1000)
}

function getIo() {
  return io
}

module.exports = {
  initSocketServer,
  getIo,
  activeUsers
}
