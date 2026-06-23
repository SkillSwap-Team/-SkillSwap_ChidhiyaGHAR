const { supabaseAdmin } = require('../config/supabaseClient')
const logger = require('../utils/logger.js')

// ✅ Multi-channel notification dispatcher
async function sendNotification({ userId, actorId = null, type, title, body = '', data = {} }) {
  try {
    // 1. Persist in-app notification
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: actorId,
        type,
        title,
        body,
        data,
        is_read: false,
        is_pushed: false
      })
      .select()
      .single()

    if (error) {
      logger.error(`[Notification] DB insert error: ${error.message}`)
      return null
    }

    return notification
  } catch (err) {
    logger.error(`[Notification] sendNotification error: ${err.message}`)
    return null
  }
}

// ✅ Send via Socket.IO (real-time push)
function sendSocketNotification(io, userId, notification) {
  if (!io) return
  try {
    io.to(`user:${userId}`).emit('notification:new', notification)
  } catch (err) {
    logger.warn(`[Notification] Socket emit error: ${err.message}`)
  }
}

// ✅ Batch send notifications to multiple users
async function broadcastNotification(userIds, notificationData) {
  const results = await Promise.allSettled(
    userIds.map(userId => sendNotification({ ...notificationData, userId }))
  )
  const failed = results.filter(r => r.status === 'rejected').length
  if (failed > 0) logger.warn(`[Notification] ${failed}/${userIds.length} broadcast notifications failed`)
  return results.filter(r => r.status === 'fulfilled').map(r => r.value)
}

// ✅ Mark notification read
async function markRead(notificationId, userId) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) throw error
  return true
}

// ✅ Mark all notifications read for a user
async function markAllRead(userId) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw error
  return true
}

// ✅ Get unread count
async function getUnreadCount(userId) {
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw error
  return count || 0
}

// ✅ Notification type helpers
const notify = {
  matchFound: (io, userId, actorId, matchData) =>
    sendNotification({ userId, actorId, type: 'match_found', title: 'New skill match found!', body: `You have a new match!`, data: matchData })
      .then(n => n && sendSocketNotification(io, userId, n)),

  matchAccepted: (io, userId, actorId, matchData) =>
    sendNotification({ userId, actorId, type: 'match_accepted', title: 'Match accepted!', body: 'Your match request was accepted.', data: matchData })
      .then(n => n && sendSocketNotification(io, userId, n)),

  newMessage: (io, userId, actorId, messageData) =>
    sendNotification({ userId, actorId, type: 'message', title: 'New message', body: messageData.preview || 'You have a new message', data: messageData })
      .then(n => n && sendSocketNotification(io, userId, n)),

  sessionScheduled: (io, userId, actorId, sessionData) =>
    sendNotification({ userId, actorId, type: 'session_scheduled', title: 'Session scheduled', body: `Session: ${sessionData.title}`, data: sessionData })
      .then(n => n && sendSocketNotification(io, userId, n)),

  sessionReminder: (io, userId, actorId, sessionData) =>
    sendNotification({ userId, actorId, type: 'session_reminder', title: 'Session starting soon!', body: `${sessionData.title} starts in 1 hour`, data: sessionData })
      .then(n => n && sendSocketNotification(io, userId, n)),

  sessionCancelled: (io, userId, actorId, sessionData) =>
    sendNotification({ userId, actorId, type: 'session_cancelled', title: 'Session cancelled', body: `${sessionData.title} has been cancelled`, data: sessionData })
      .then(n => n && sendSocketNotification(io, userId, n)),

  reviewReceived: (io, userId, actorId, reviewData) =>
    sendNotification({ userId, actorId, type: 'review_received', title: 'New review received!', body: `You received a ${reviewData.rating}-star review`, data: reviewData })
      .then(n => n && sendSocketNotification(io, userId, n)),

  badgeEarned: (io, userId, badgeData) =>
    sendNotification({ userId, type: 'badge_earned', title: `Badge earned: ${badgeData.name}`, body: badgeData.description, data: badgeData })
      .then(n => n && sendSocketNotification(io, userId, n))
}

module.exports = { sendNotification, sendSocketNotification, broadcastNotification, markRead, markAllRead, getUnreadCount, notify }
