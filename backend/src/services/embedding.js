const { GoogleGenerativeAI } = require('@google/generative-ai')
const logger = require('../utils/logger.js')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const EMBEDDING_MODEL = 'text-embedding-004'
const EMBEDDING_DIMENSIONS = 1536 // Match PostgreSQL database index dimension
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Helper: sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Retry helper with exponential backoff
async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === retries) throw err
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      logger.warn(`[Embedding] Attempt ${attempt} failed, retrying in ${delay}ms: ${err.message}`)
      await sleep(delay)
    }
  }
}

/**
 * Generate semantic embedding for a single text string using Gemini.
 * Pads the resulting vector to 1536 dimensions with zeros to fit PostgreSQL's vector(1536) constraints.
 */
async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    return new Array(EMBEDDING_DIMENSIONS).fill(0.0)
  }

  const truncated = text.substring(0, 8000).trim()

  return withRetry(async () => {
    try {
      const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })
      const result = await model.embedContent(truncated)
      const values = result.embedding?.values

      if (!values || !Array.isArray(values)) {
        throw new Error('[Embedding] Failed to retrieve embedding values from Gemini')
      }

      // Pad with zeros to scale to 1536 dimensions mathematically preserving cosine similarity rankings
      if (values.length < EMBEDDING_DIMENSIONS) {
        const padding = new Array(EMBEDDING_DIMENSIONS - values.length).fill(0)
        return [...values, ...padding]
      } else if (values.length > EMBEDDING_DIMENSIONS) {
        return values.slice(0, EMBEDDING_DIMENSIONS)
      }

      return values
    } catch (err) {
      logger.warn(`[Embedding] Gemini API error, returning fallback zero vector: ${err.message}`)
      return new Array(EMBEDDING_DIMENSIONS).fill(0.0)
    }
  })
}

/**
 * Generate embeddings for multiple texts in batch.
 */
async function generateEmbeddingsBatch(texts, batchSize = 20) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('[Embedding] Input must be a non-empty array')
  }

  const results = []
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const promises = batch.map(t => generateEmbedding(t))
    const embeddings = await Promise.all(promises)
    results.push(...embeddings)
    logger.info(`[Embedding] Batch ${Math.ceil((i + 1) / batchSize)} completed (${results.length}/${texts.length})`)
  }
  return results
}

function buildProfileEmbeddingText(profile, skillsOffered = [], skillsWanted = []) {
  const parts = []
  if (profile.full_name) parts.push(`Name: ${profile.full_name}`)
  if (profile.bio) parts.push(`Bio: ${profile.bio}`)
  if (profile.location) parts.push(`Location: ${profile.location}`)
  if (skillsOffered.length) {
    parts.push(`Skills I teach: ${skillsOffered.map(s => `${s.skill_name} (${s.proficiency_level})`).join(', ')}`)
  }
  if (skillsWanted.length) {
    parts.push(`Skills I want to learn: ${skillsWanted.map(s => s.skill_name).join(', ')}`)
  }
  return parts.join('\n')
}

function buildSkillEmbeddingText(skillName, proficiencyLevel, description = '') {
  return [
    `Skill: ${skillName}`,
    `Proficiency: ${proficiencyLevel}`,
    description ? `Description: ${description}` : ''
  ].filter(Boolean).join('\n')
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  buildProfileEmbeddingText,
  buildSkillEmbeddingText,
  EMBEDDING_DIMENSIONS
}
