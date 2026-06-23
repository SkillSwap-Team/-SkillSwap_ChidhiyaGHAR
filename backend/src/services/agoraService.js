const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = require('agora-access-token')
const { v4: uuidv4 } = require('uuid')
const logger = require('../utils/logger.js')

const APP_ID = process.env.AGORA_APP_ID
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE
const TOKEN_EXPIRY_SECONDS = 7200 // 2 hours

// ✅ Generate RTC token (video/audio/screen share)
function generateRtcToken(channelName, uid, role = 'publisher') {
  if (!APP_ID || !APP_CERTIFICATE) throw new Error('Agora credentials not configured')
  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
  const privilegeExpiry = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS
  const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, agoraRole, privilegeExpiry)
  logger.info(`[Agora] Generated RTC token for channel: ${channelName}, uid: ${uid}`)
  return { token, channelName, uid, appId: APP_ID, expiresAt: new Date(privilegeExpiry * 1000).toISOString() }
}

// ✅ Generate RTM token (whiteboard signaling)
function generateRtmToken(userId) {
  if (!APP_ID || !APP_CERTIFICATE) throw new Error('Agora credentials not configured')
  const privilegeExpiry = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS
  const token = RtmTokenBuilder.buildToken(APP_ID, APP_CERTIFICATE, userId.toString(), privilegeExpiry)
  return { token, userId, appId: APP_ID, expiresAt: new Date(privilegeExpiry * 1000).toISOString() }
}

// ✅ Generate screen share token (special UID convention: original + 10000)
function generateScreenShareToken(channelName, uid) {
  const screenUid = (uid + 10000) % 100000
  return generateRtcToken(channelName, screenUid, 'publisher')
}

// ✅ Generate unique channel name for a session
function generateChannelName(sessionId) {
  return `skillswap_${sessionId.replace(/-/g, '')}`
}

// ✅ Start Cloud Recording (Agora Cloud Recording API)
async function startCloudRecording(channelName, uid, token) {
  try {
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }))
    if (!fetch) throw new Error('fetch not available')

    const acquireUrl = `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/acquire`
    const basicAuth = Buffer.from(`${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`).toString('base64')

    // Acquire resource ID
    const acquireRes = await fetch(acquireUrl, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cname: channelName, uid: uid.toString(), clientRequest: {} })
    })
    const acquireData = await acquireRes.json()
    const resourceId = acquireData.resourceId

    if (!resourceId) throw new Error('Failed to acquire Agora resource ID')

    // Start recording
    const startUrl = `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`
    const startRes = await fetch(startUrl, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cname: channelName,
        uid: uid.toString(),
        clientRequest: {
          token,
          recordingConfig: {
            maxIdleTime: 30,
            streamTypes: 3,
            channelType: 0,
            videoStreamType: 0
          },
          storageConfig: {
            vendor: 0, // Agora managed
            region: 0,
            bucket: '',
            accessKey: '',
            secretKey: ''
          }
        }
      })
    })
    const startData = await startRes.json()
    return { resourceId, sid: startData.sid }
  } catch (err) {
    logger.error(`[Agora] startCloudRecording error: ${err.message}`)
    return null
  }
}

// ✅ Stop Cloud Recording
async function stopCloudRecording(channelName, uid, resourceId, sid) {
  try {
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }))
    const basicAuth = Buffer.from(`${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`).toString('base64')

    const stopUrl = `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`
    const res = await fetch(stopUrl, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cname: channelName, uid: uid.toString(), clientRequest: {} })
    })
    return await res.json()
  } catch (err) {
    logger.error(`[Agora] stopCloudRecording error: ${err.message}`)
    return null
  }
}

module.exports = {
  generateRtcToken,
  generateRtmToken,
  generateScreenShareToken,
  generateChannelName,
  startCloudRecording,
  stopCloudRecording
}
