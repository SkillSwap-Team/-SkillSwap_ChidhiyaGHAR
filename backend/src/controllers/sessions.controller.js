const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const { generateRtcToken } = require('../services/agoraService.js')
const { notify } = require('../services/notificationService.js')
const emailService = require('../services/emailService.js')
const logger = require('../utils/logger.js')

async function addActivity({ userId, actorId, type, title, body = null, points = 1, referenceId = null }) {
  try {
    const record = await db.insert('activities', {
      user_id: userId,
      actor_id: actorId ?? userId,
      type,
      title,
      body,
      points,
      reference_id: referenceId
    })

    await supabaseAdmin.rpc('increment_activity', { user_id_input: userId, points_input: points }).catch(() => {})
    return record
  } catch (err) {
    logger.warn(`[Activity] Failed to record ${type} for ${userId}: ${err.message}`)
    return null
  }
}

// ✅ GET /api/sessions
const getMySessions = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { status } = req.query

    let query = supabaseAdmin
      .from('learning_sessions')
      .select(`
        *,
        host:host_id (id, username),
        participant:participant_id (id, username)
      `)
      .or(`host_id.eq.${userId},participant_id.eq.${userId}`)
      .order('scheduled_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return res.status(200).json({ data: data || [] })
  } catch (err) { next(err) }
}

// ✅ GET /api/sessions/:id
const getSessionById = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { data, error } = await supabaseAdmin
      .from('learning_sessions')
      .select(`
        *,
        host:host_id (id, username),
        participant:participant_id (id, username)
      `)
      .eq('id', req.params.id)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Session not found.' })
    if (data.host_id !== userId && data.participant_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this session.' })
    }

    return res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ✅ POST /api/sessions (Schedule Session)
const scheduleSession = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { participantId, title, description, scheduledAt, durationMinutes, matchId } = req.body

    if (!participantId || !title || !scheduledAt || !durationMinutes) {
      return res.status(400).json({ error: 'Required fields: participantId, title, scheduledAt, durationMinutes.' })
    }

    // Insert new session (host is the creator)
    const [session] = await db.insert('learning_sessions', {
      host_id: userId,
      participant_id: participantId,
      match_id: matchId || null,
      title,
      description: description || '',
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      status: req.body.status || 'pending',
      agora_channel: `session-${Date.now()}`
    })

    // Notify the participant
    const io = req.app.get('io')
    await notify.sessionScheduled(io, participantId, userId, {
      sessionId: session.id,
      title,
      status: session.status
    })

    setImmediate(async () => {
      try {
        await evaluateUserBadges(userId)
        await evaluateUserBadges(participantId)
      } catch (e) { logger.error(`[Sessions] Async badge check failed: ${e.message}`) }
    })

    return res.status(201).json({ data: session, message: 'Session scheduled.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/sessions/:id/confirm
const confirmSession = async (req, res, next) => {
  try {
    const userId = req.user.id
    const session = await db.selectOne('learning_sessions', '*', { id: req.params.id })
    if (!session) return res.status(404).json({ error: 'Session not found.' })

    if (session.participant_id !== userId) {
      return res.status(403).json({ error: 'Only the invited participant can confirm the session.' })
    }

    const [updated] = await db.update('learning_sessions', {
      status: 'confirmed',
      updated_at: new Date().toISOString()
    }, { id: session.id })

    // Fetch user emails for email notifications
    const hostUser = await db.selectOne('users', 'email, username', { id: session.host_id })
    const participantProfile = await db.selectOne('profiles', 'full_name', { id: session.participant_id })

    // Send emails & notifications
    await emailService.sendSessionConfirmedEmail(hostUser.email, hostUser.username || hostUser.email, {
      id: session.id,
      title: session.title,
      scheduled_at: session.scheduled_at,
      duration_minutes: session.duration_minutes
    }).catch(e => logger.warn(`[Sessions] Email confirmation failed: ${e.message}`))

    const io = req.app.get('io')
    await notify.sessionConfirmed(io, session.host_id, userId, { sessionId: session.id, title: session.title })

    return res.status(200).json({ data: updated, message: 'Session confirmed.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/sessions/:id/cancel
const cancelSession = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { reason } = req.body
    const session = await db.selectOne('learning_sessions', '*', { id: req.params.id })
    if (!session) return res.status(404).json({ error: 'Session not found.' })

    if (session.host_id !== userId && session.participant_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to cancel this session.' })
    }

    const [updated] = await db.update('learning_sessions', {
      status: 'cancelled',
      cancellation_reason: reason || 'Cancelled by user',
      updated_at: new Date().toISOString()
    }, { id: session.id })

    const otherId = session.host_id === userId ? session.participant_id : session.host_id
    const otherUser = await db.selectOne('users', 'email, username', { id: otherId })

    await emailService.sendSessionCancelledEmail(otherUser.email, otherUser.username || otherUser.email, {
      title: session.title,
      cancellation_reason: reason
    }).catch(e => logger.warn(`[Sessions] Email cancellation failed: ${e.message}`))

    const io = req.app.get('io')
    await notify.sessionCancelled(io, otherId, userId, { sessionId: session.id, title: session.title, reason })

    return res.status(200).json({ data: updated, message: 'Session cancelled.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/sessions/:id/join (Get Agora Token & Channel Details)
const joinSession = async (req, res, next) => {
  try {
    const userId = req.user.id
    const session = await db.selectOne('learning_sessions', '*', { id: req.params.id })
    if (!session) return res.status(404).json({ error: 'Session not found.' })

    if (session.host_id !== userId && session.participant_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to join this session.' })
    }

    if (session.status !== 'confirmed') {
      return res.status(400).json({ error: 'Only confirmed sessions can be joined.' })
    }

    const role = session.host_id === userId ? 'host' : 'attendee'
    const token = generateRtcToken(session.agora_channel, userId, role)

    return res.status(200).json({
      data: {
        channelName: session.agora_channel,
        token,
        uid: userId,
        role
      }
    })
  } catch (err) { next(err) }
}

// ✅ POST /api/sessions/:id/complete
const completeSession = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { actualDurationMinutes } = req.body
    const session = await db.selectOne('learning_sessions', '*', { id: req.params.id })
    if (!session) return res.status(404).json({ error: 'Session not found.' })

    // Only host can mark session complete
    if (session.host_id !== userId) {
      return res.status(403).json({ error: 'Only the session host can complete the session.' })
    }

    const duration = actualDurationMinutes || session.duration_minutes

    const [updated] = await db.update('learning_sessions', {
      status: 'completed',
      actual_duration_minutes: duration,
      updated_at: new Date().toISOString()
    }, { id: session.id })

    // Add teaching/learning hours and reputation points
    // Host (Teacher): Increment teaching hours, earn reputation
    await supabaseAdmin.rpc('increment_teaching_hours', { user_id_input: session.host_id, hours_input: duration / 60 }).catch(() => {})
    await supabaseAdmin.rpc('increment_reputation', { user_id_input: session.host_id, points_input: 20 }).catch(() => {})
    await db.insert('reputation_points', {
      user_id: session.host_id, points: 20, action: 'teach_session', reference_type: 'session', reference_id: session.id
    })

    // Participant (Learner): Increment learning hours, earn reputation
    await supabaseAdmin.rpc('increment_learning_hours', { user_id_input: session.participant_id, hours_input: duration / 60 }).catch(() => {})
    await supabaseAdmin.rpc('increment_reputation', { user_id_input: session.participant_id, points_input: 10 }).catch(() => {})
    await db.insert('reputation_points', {
      user_id: session.participant_id, points: 10, action: 'learn_session', reference_type: 'session', reference_id: session.id
    })

    // Award +30 activity points for the call
    await Promise.all([
      addActivity({ userId: session.host_id, actorId: session.host_id, type: 'call_completed', title: 'Call completed', points: 30, referenceId: session.id }),
      addActivity({ userId: session.participant_id, actorId: session.participant_id, type: 'call_completed', title: 'Call completed', points: 30, referenceId: session.id })
    ]).catch(() => {})

    // Trigger badge evaluation asynchronously
    const { evaluateUserBadges } = require('../services/badgeEngine.js')
    setImmediate(async () => {
      try {
        await evaluateUserBadges(session.host_id)
        await evaluateUserBadges(session.participant_id)
      } catch (e) { logger.error(`[Sessions] Async badge check failed: ${e.message}`) }
    })

    return res.status(200).json({ data: updated, message: 'Session completed successfully.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/sessions/:id/notes
const saveNotes = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { notes } = req.body
    if (!notes) return res.status(400).json({ error: 'Notes content is required.' })

    const session = await db.selectOne('learning_sessions', '*', { id: req.params.id })
    if (!session) return res.status(404).json({ error: 'Session not found.' })

    if (session.host_id !== userId && session.participant_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to add notes.' })
    }

    const [updated] = await db.update('learning_sessions', {
      session_notes: notes,
      updated_at: new Date().toISOString()
    }, { id: session.id })

    return res.status(200).json({ data: updated, message: 'Notes saved.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/sessions/:id/attendance
const markAttendance = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { attended } = req.body
    const session = await db.selectOne('learning_sessions', '*', { id: req.params.id })
    if (!session) return res.status(404).json({ error: 'Session not found.' })

    const updates = {}
    if (session.host_id === userId) {
      updates.host_attendance = attended !== false
    } else if (session.participant_id === userId) {
      updates.participant_attendance = attended !== false
    } else {
      return res.status(403).json({ error: 'Unauthorized.' })
    }

    const [updated] = await db.update('learning_sessions', updates, { id: session.id })
    return res.status(200).json({ data: updated, message: 'Attendance updated.' })
  } catch (err) { next(err) }
}

module.exports = {
  getMySessions,
  getSessionById,
  scheduleSession,
  confirmSession,
  cancelSession,
  joinSession,
  completeSession,
  saveNotes,
  markAttendance
}
