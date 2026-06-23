const { supabaseAdmin } = require('../config/supabaseClient')
const logger = require('../utils/logger.js')
const { v4: uuidv4 } = require('uuid')

const BUCKETS = {
  avatars: process.env.STORAGE_BUCKET_AVATARS || 'avatars',
  files: process.env.STORAGE_BUCKET_FILES || 'session-files',
  recordings: process.env.STORAGE_BUCKET_RECORDINGS || 'recordings'
}

// ✅ Upload a file to Supabase Storage
async function uploadFile(bucket, filePath, fileBuffer, contentType = 'application/octet-stream') {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: true
    })

  if (error) {
    logger.error(`[Storage] Upload error: ${error.message}`)
    throw error
  }
  return data
}

// ✅ Upload avatar image
async function uploadAvatar(userId, fileBuffer, contentType = 'image/jpeg') {
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const filePath = `${userId}/avatar.${ext}`

  const result = await uploadFile(BUCKETS.avatars, filePath, fileBuffer, contentType)
  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKETS.avatars).getPublicUrl(filePath)

  // Update profile
  await supabaseAdmin.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)

  return { path: filePath, publicUrl }
}

// ✅ Upload session file (attachments, resources)
async function uploadSessionFile(sessionId, userId, fileBuffer, originalName, contentType) {
  const fileId = uuidv4()
  const ext = originalName.split('.').pop()
  const filePath = `${sessionId}/${fileId}.${ext}`

  await uploadFile(BUCKETS.files, filePath, fileBuffer, contentType)

  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKETS.files).getPublicUrl(filePath)
  return { path: filePath, publicUrl, fileName: originalName, fileId }
}

// ✅ Generate signed URL (for private files)
async function getSignedUrl(bucket, filePath, expiresInSeconds = 3600) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresInSeconds)

  if (error) throw error
  return data.signedUrl
}

// ✅ Get public URL
function getPublicUrl(bucket, filePath) {
  const { data: { publicUrl } } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)
  return publicUrl
}

// ✅ Delete file
async function deleteFile(bucket, filePath) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath])
  if (error) throw error
  return true
}

// ✅ List files in a folder
async function listFiles(bucket, folderPath) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(folderPath)
  if (error) throw error
  return data || []
}

module.exports = { uploadFile, uploadAvatar, uploadSessionFile, getSignedUrl, getPublicUrl, deleteFile, listFiles, BUCKETS }
