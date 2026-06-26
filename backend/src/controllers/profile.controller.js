const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const { uploadAvatar } = require('../services/storageService.js')
const { generateEmbedding, buildProfileEmbeddingText } = require('../services/embedding.js')
const logger = require('../utils/logger.js')

// ✅ GET /api/profile/
const getMyProfile = async (req, res, next) => {
  try {
    let { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, email, username, role, is_email_verified, mfa_enabled, created_at,
        profile:profiles (*),
        user_skills_offered (id, proficiency_level, years_experience, description, skills(id, name, slug, skill_categories(name))),
        user_skills_wanted (id, current_level, target_level, urgency, skills(id, name, slug))
      `)
      .eq('id', req.user.id)
      .single()

    if (error) throw error

    if (!user || !user.profile) {
      // Auto-create profile if missing
      await db.insert('profiles', { id: req.user.id }).catch(() => {})
      
      // Fetch again
      const { data: updatedUser } = await supabaseAdmin
        .from('users')
        .select(`
          id, email, username, role, is_email_verified, mfa_enabled, created_at,
          profile:profiles (*),
          user_skills_offered (id, proficiency_level, years_experience, description, skills(id, name, slug, skill_categories(name))),
          user_skills_wanted (id, current_level, target_level, urgency, skills(id, name, slug))
        `)
        .eq('id', req.user.id)
        .single()
      if (updatedUser) {
        user = updatedUser
      }
    }

    // Assemble the composite object in the profiles-first shape expected by the frontend
    const profileData = user ? {
      ...(user.profile || {}),
      users: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_email_verified: user.is_email_verified,
        mfa_enabled: user.mfa_enabled,
        created_at: user.created_at
      },
      user_skills_offered: user.user_skills_offered || [],
      user_skills_wanted: user.user_skills_wanted || []
    } : null

    return res.status(200).json({ data: profileData })
  } catch (err) { next(err) }
}

// ✅ GET /api/profile/:userId
const getPublicProfile = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, full_name, avatar_url, cover_url, bio, timezone, location, city, country_code,
        website_url, github_url, linkedin_url, twitter_url,
        is_verified_mentor, teaching_hours, learning_hours, total_sessions,
        avg_rating, total_reviews, reputation_points, followers_count, following_count, created_at,
        users:id (username, role),
        user_skills_offered (id, proficiency_level, years_experience, description, skills(id, name, slug, skill_categories(name))),
        user_skills_wanted (id, current_level, target_level, urgency, skills(id, name, slug))
      `)
      .eq('id', userId)
      .single()

    if (!profile) return res.status(404).json({ error: 'Profile not found.' })
    return res.status(200).json({ data: profile })
  } catch (err) { next(err) }
}

// ✅ PUT /api/profile/
const updateProfile = async (req, res, next) => {
  try {
    const { full_name, bio, timezone, location, city, state_code, country_code, coordinates,
      website_url, github_url, linkedin_url, twitter_url, semantic_summary } = req.body

    const updates = { updated_at: new Date().toISOString() }
    if (full_name !== undefined) updates.full_name = full_name
    if (bio !== undefined) updates.bio = bio
    if (timezone !== undefined) updates.timezone = timezone
    if (location !== undefined) updates.location = location
    if (city !== undefined) updates.city = city
    if (state_code !== undefined) updates.state_code = state_code
    if (country_code !== undefined) updates.country_code = country_code
    if (coordinates !== undefined) updates.coordinates = coordinates
    if (website_url !== undefined) updates.website_url = website_url
    if (github_url !== undefined) updates.github_url = github_url
    if (linkedin_url !== undefined) updates.linkedin_url = linkedin_url
    if (twitter_url !== undefined) updates.twitter_url = twitter_url

    // Check profile completeness
    const { data: currentProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', req.user.id).single()
    const merged = { ...currentProfile, ...updates }
    
    if (!merged.avatar_url) {
      const { data: user } = await supabaseAdmin.from('users').select('username').eq('id', req.user.id).single()
      const seed = user?.username || req.user.id
      updates.avatar_url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`
      merged.avatar_url = updates.avatar_url
    }

    const isComplete = !!(merged.full_name && merged.bio && merged.avatar_url && merged.city)
    updates.is_profile_complete = isComplete

    const [updated] = await db.update('profiles', updates, { id: req.user.id })

    // Async: regenerate embedding
    setImmediate(async () => {
      try {
        const { data: skills_offered } = await supabaseAdmin.from('user_skills_offered').select('skills(name), proficiency_level').eq('user_id', req.user.id)
        const { data: skills_wanted } = await supabaseAdmin.from('user_skills_wanted').select('skills(name)').eq('user_id', req.user.id)
        const text = buildProfileEmbeddingText(merged, skills_offered || [], skills_wanted || [])
        const embedding = await generateEmbedding(text)
        await supabaseAdmin.from('profiles').update({ embedding }).eq('id', req.user.id)
      } catch (e) { logger.warn(`[Profile] Embedding update failed: ${e.message}`) }
    })

    return res.status(200).json({ data: updated, message: 'Profile updated.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/profile/avatar
const uploadAvatarHandler = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' })
    const result = await uploadAvatar(req.user.id, req.file.buffer, req.file.mimetype)
    return res.status(200).json({ data: result, message: 'Avatar updated.' })
  } catch (err) { next(err) }
}

// ✅ DELETE /api/profile/avatar
const deleteAvatar = async (req, res, next) => {
  try {
    await db.update('profiles', { avatar_url: null }, { id: req.user.id })
    return res.status(200).json({ message: 'Avatar removed.' })
  } catch (err) { next(err) }
}

// ✅ Education CRUD
const getEducation = async (req, res, next) => {
  try {
    const data = await db.select('education', '*', { user_id: req.user.id })
    return res.status(200).json({ data })
  } catch (err) { next(err) }
}

const addEducation = async (req, res, next) => {
  try {
    const { institution, degree, field_of_study, start_year, end_year, description } = req.body
    const [result] = await db.insert('education', { user_id: req.user.id, institution, degree, field_of_study, start_year, end_year, description })
    return res.status(201).json({ data: result })
  } catch (err) { next(err) }
}

const updateEducation = async (req, res, next) => {
  try {
    const { institution, degree, field_of_study, start_year, end_year, description } = req.body
    const [result] = await db.update('education', { institution, degree, field_of_study, start_year, end_year, description }, { id: req.params.id, user_id: req.user.id })
    return res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

const deleteEducation = async (req, res, next) => {
  try {
    await db.delete('education', { id: req.params.id, user_id: req.user.id })
    return res.status(200).json({ message: 'Education entry deleted.' })
  } catch (err) { next(err) }
}

// ✅ Experience CRUD
const getExperience = async (req, res, next) => {
  try {
    const data = await db.select('experience', '*', { user_id: req.user.id })
    return res.status(200).json({ data })
  } catch (err) { next(err) }
}

const addExperience = async (req, res, next) => {
  try {
    const { company, title, start_date, end_date, is_current, description } = req.body
    const [result] = await db.insert('experience', { user_id: req.user.id, company, title, start_date, end_date, is_current, description })
    return res.status(201).json({ data: result })
  } catch (err) { next(err) }
}

const updateExperience = async (req, res, next) => {
  try {
    const { company, title, start_date, end_date, is_current, description } = req.body
    const [result] = await db.update('experience', { company, title, start_date, end_date, is_current, description }, { id: req.params.id, user_id: req.user.id })
    return res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

const deleteExperience = async (req, res, next) => {
  try {
    await db.delete('experience', { id: req.params.id, user_id: req.user.id })
    return res.status(200).json({ message: 'Experience entry deleted.' })
  } catch (err) { next(err) }
}

// ✅ Availability CRUD
const getAvailability = async (req, res, next) => {
  try {
    const data = await db.select('availability', '*', { user_id: req.user.id })
    return res.status(200).json({ data })
  } catch (err) { next(err) }
}

const setAvailability = async (req, res, next) => {
  try {
    const slots = req.body.slots || [req.body]
    const inserts = slots.map(s => ({
      user_id: req.user.id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      timezone: s.timezone || 'UTC',
      is_recurring: s.is_recurring !== false
    }))
    const result = await db.upsert('availability', inserts, { onConflict: 'user_id,day_of_week,start_time' })
    return res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

const deleteAvailability = async (req, res, next) => {
  try {
    await db.delete('availability', { id: req.params.id, user_id: req.user.id })
    return res.status(200).json({ message: 'Availability slot removed.' })
  } catch (err) { next(err) }
}

// ✅ Follow system
const followUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself.' })
    await db.insert('user_follows', { follower_id: req.user.id, following_id: userId }).catch(() => {})
    await supabaseAdmin.rpc('increment_follow_counts', { follower_id: req.user.id, following_id: userId }).catch(() => {})
    return res.status(200).json({ message: 'Following user.' })
  } catch (err) { next(err) }
}

const unfollowUser = async (req, res, next) => {
  try {
    await db.delete('user_follows', { follower_id: req.user.id, following_id: req.params.userId })
    return res.status(200).json({ message: 'Unfollowed user.' })
  } catch (err) { next(err) }
}

const getFollowers = async (req, res, next) => {
  try {
    const { data } = await supabaseAdmin.from('user_follows')
      .select('follower_id, profiles:follower_id(id, full_name, avatar_url, reputation_points)')
      .eq('following_id', req.params.userId)
    return res.status(200).json({ data: data?.map(f => f.profiles) || [] })
  } catch (err) { next(err) }
}

const getFollowing = async (req, res, next) => {
  try {
    const { data } = await supabaseAdmin.from('user_follows')
      .select('following_id, profiles:following_id(id, full_name, avatar_url, reputation_points)')
      .eq('follower_id', req.params.userId)
    return res.status(200).json({ data: data?.map(f => f.profiles) || [] })
  } catch (err) { next(err) }
}

const getOnlineUsers = async (req, res, next) => {
  try {
    const socketServer = require('../websocket/socketServer.js')
    const onlineIds = Array.from(socketServer.activeUsers.keys()).filter(id => id !== req.user.id)

    if (onlineIds.length === 0) {
      const { data: allProfiles, error: err } = await supabaseAdmin
        .from('profiles')
        .select('*, users:id(id, email, username)')
        .neq('id', req.user.id)
        .limit(20)

      if (err) throw err
      const processed = (allProfiles || []).map(p => ({ ...p, is_online: true }))
      return res.status(200).json({ data: processed })
    }

    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('*, users:id(id, email, username)')
      .in('id', onlineIds)

    if (error) throw error

    const processed = (profiles || []).map(p => ({ ...p, is_online: true }))
    return res.status(200).json({ data: processed })
  } catch (err) {
    next(err)
  }
}

const searchUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.status(200).json({ data: [] })

    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, users:id(username)')
      .ilike('full_name', `%${q}%`)
      .neq('id', req.user.id)
      .limit(20)

    if (error) throw error

    const processed = (profiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name,
      username: p.users?.username || null,
      avatar_url: p.avatar_url,
    }))

    return res.status(200).json({ data: processed })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getMyProfile, getPublicProfile, updateProfile,
  uploadAvatar: uploadAvatarHandler, deleteAvatar,
  getEducation, addEducation, updateEducation, deleteEducation,
  getExperience, addExperience, updateExperience, deleteExperience,
  getAvailability, setAvailability, deleteAvailability,
  followUser, unfollowUser, getFollowers, getFollowing,
  getOnlineUsers, searchUsers
}
