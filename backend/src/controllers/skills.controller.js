const { supabaseAdmin } = require('../config/supabaseClient')
const db = require('../services/db.js')
const { generateEmbedding, buildSkillEmbeddingText } = require('../services/embedding.js')
const logger = require('../utils/logger.js')

// ✅ GET /api/skills/categories
const getCategories = async (req, res, next) => {
  try {
    const data = await db.select('skill_categories', 'id, name, slug, icon, color, description', { is_active: true })
    return res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ✅ GET /api/skills/categories/:categoryId
const getCategoryWithSkills = async (req, res, next) => {
  try {
    const { data } = await supabaseAdmin
      .from('skill_categories')
      .select('*, skills(*)')
      .eq('id', req.params.categoryId)
      .eq('is_active', true)
      .single()
    if (!data) return res.status(404).json({ error: 'Category not found.' })
    return res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ✅ GET /api/skills
const getAllSkills = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, category_id } = req.query
    const filters = { is_active: true }
    if (category_id) filters.category_id = category_id
    const result = await db.paginate('skills', 'id, name, slug, description, icon_url, tags, usage_count, skill_categories(name, color)', filters, {
      page: parseInt(page), limit: parseInt(limit), orderBy: 'usage_count', ascending: false
    })
    return res.status(200).json(result)
  } catch (err) { next(err) }
}

// ✅ GET /api/skills/search
const searchSkills = async (req, res, next) => {
  try {
    const { q } = req.query
    if (!q) return res.status(400).json({ error: 'Query parameter q required.' })
    const { data } = await supabaseAdmin
      .from('skills')
      .select('id, name, slug, description, icon_url, skill_categories(name, color)')
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .limit(20)
    return res.status(200).json({ data: data || [] })
  } catch (err) { next(err) }
}

// ✅ GET /api/skills/:skillId
const getSkillById = async (req, res, next) => {
  try {
    const { data } = await supabaseAdmin.from('skills').select('*, skill_categories(*)').eq('id', req.params.skillId).single()
    if (!data) return res.status(404).json({ error: 'Skill not found.' })
    return res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ✅ GET /api/skills/user/offered
const getMyOfferedSkills = async (req, res, next) => {
  try {
    const { data } = await supabaseAdmin.from('user_skills_offered')
      .select('*, skills(*, skill_categories(name, color))')
      .eq('user_id', req.user.id)
    return res.status(200).json({ data: data || [] })
  } catch (err) { next(err) }
}

// ✅ GET /api/skills/user/wanted
const getMyWantedSkills = async (req, res, next) => {
  try {
    const { data } = await supabaseAdmin.from('user_skills_wanted')
      .select('*, skills(*, skill_categories(name, color))')
      .eq('user_id', req.user.id)
    return res.status(200).json({ data: data || [] })
  } catch (err) { next(err) }
}

// ✅ POST /api/skills/user/offered
const addOfferedSkill = async (req, res, next) => {
  try {
    const { skill_id, proficiency_level, years_experience, description } = req.body
    const [result] = await db.upsert('user_skills_offered', {
      user_id: req.user.id, skill_id, proficiency_level, years_experience, description
    }, { onConflict: 'user_id,skill_id' })
    // Async: generate embedding
    setImmediate(async () => {
      try {
        const { data: skill } = await supabaseAdmin.from('skills').select('name').eq('id', skill_id).single()
        const text = buildSkillEmbeddingText(skill.name, proficiency_level, description)
        const embedding = await generateEmbedding(text)
        await supabaseAdmin.from('user_skills_offered').update({ embedding }).eq('id', result.id)
        // Increment skill usage count
        await supabaseAdmin.rpc('increment_skill_usage', { skill_id_input: skill_id }).catch(() => {})
      } catch (e) { logger.warn(`[Skills] Embedding failed: ${e.message}`) }
    })
    return res.status(201).json({ data: result, message: 'Skill added to offered list.' })
  } catch (err) { next(err) }
}

// ✅ PUT /api/skills/user/offered/:id
const updateOfferedSkill = async (req, res, next) => {
  try {
    const { proficiency_level, years_experience, description } = req.body
    const [result] = await db.update('user_skills_offered', { proficiency_level, years_experience, description, updated_at: new Date().toISOString() }, { id: req.params.id, user_id: req.user.id })
    return res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

// ✅ DELETE /api/skills/user/offered/:id
const removeOfferedSkill = async (req, res, next) => {
  try {
    await db.delete('user_skills_offered', { id: req.params.id, user_id: req.user.id })
    return res.status(200).json({ message: 'Skill removed from offered list.' })
  } catch (err) { next(err) }
}

// ✅ POST /api/skills/user/wanted
const addWantedSkill = async (req, res, next) => {
  try {
    const { skill_id, current_level, target_level, urgency, notes } = req.body
    const [result] = await db.upsert('user_skills_wanted', {
      user_id: req.user.id, skill_id, current_level, target_level, urgency: urgency || 'medium', notes
    }, { onConflict: 'user_id,skill_id' })
    return res.status(201).json({ data: result, message: 'Skill added to wanted list.' })
  } catch (err) { next(err) }
}

// ✅ PUT /api/skills/user/wanted/:id
const updateWantedSkill = async (req, res, next) => {
  try {
    const { current_level, target_level, urgency, notes } = req.body
    const [result] = await db.update('user_skills_wanted', { current_level, target_level, urgency, notes }, { id: req.params.id, user_id: req.user.id })
    return res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

// ✅ DELETE /api/skills/user/wanted/:id
const removeWantedSkill = async (req, res, next) => {
  try {
    await db.delete('user_skills_wanted', { id: req.params.id, user_id: req.user.id })
    return res.status(200).json({ message: 'Skill removed from wanted list.' })
  } catch (err) { next(err) }
}

// ✅ Admin: POST /api/skills/admin/create
const createSkill = async (req, res, next) => {
  try {
    const { name, category_id, description, icon_url, tags, slug } = req.body
    const [result] = await db.insert('skills', { name, category_id, description, icon_url, tags, slug: slug || name.toLowerCase().replace(/\s+/g, '-'), is_verified: true })
    return res.status(201).json({ data: result })
  } catch (err) { next(err) }
}

// ✅ Admin: PUT /api/skills/admin/:skillId/verify
const verifySkill = async (req, res, next) => {
  try {
    const [result] = await db.update('skills', { is_verified: true }, { id: req.params.skillId })
    return res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

// ✅ Admin: PUT /api/skills/admin/:skillId
const updateSkill = async (req, res, next) => {
  try {
    const { name, description, icon_url, tags, is_active } = req.body
    const [result] = await db.update('skills', { name, description, icon_url, tags, is_active }, { id: req.params.skillId })
    return res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

// ✅ POST /api/skills/custom (Authenticated user creates custom skill)
const createCustomSkill = async (req, res, next) => {
  try {
    const { name, description } = req.body
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Skill name is required.' })
    }
    const cleanName = name.trim()
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    // Check if skill with this name or slug already exists
    let existing = await db.selectOne('skills', '*', { name: cleanName })
    if (!existing) {
      existing = await db.selectOne('skills', '*', { slug })
    }
    
    if (existing) {
      return res.status(200).json({ data: existing })
    }
    
    // Create new custom skill
    const [result] = await db.insert('skills', {
      name: cleanName,
      slug,
      description: description || `Custom skill: ${cleanName}`,
      is_verified: false,
      is_active: true
    })
    
    return res.status(201).json({ data: result })
  } catch (err) { next(err) }
}

module.exports = {
  getCategories, getCategoryWithSkills, getAllSkills, searchSkills, getSkillById,
  getMyOfferedSkills, getMyWantedSkills, addOfferedSkill, updateOfferedSkill, removeOfferedSkill,
  addWantedSkill, updateWantedSkill, removeWantedSkill,
  createSkill, verifySkill, updateSkill, createCustomSkill
}
