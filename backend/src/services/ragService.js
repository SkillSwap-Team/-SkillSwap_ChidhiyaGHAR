const { supabaseAdmin } = require('../config/supabaseClient')
const { generateEmbedding } = require('./embedding.js')
const OpenAI = require('openai')
const logger = require('../utils/logger.js')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ✅ RAG: Retrieve relevant session notes and knowledge for a question
async function retrieveRelevantContext(userId, query, { topK = 5 } = {}) {
  try {
    const queryEmbedding = await generateEmbedding(query)

    // Search session notes by vector similarity
    const { data: notes, error } = await supabaseAdmin.rpc('match_session_notes', {
      query_embedding: queryEmbedding,
      user_id_filter: userId,
      match_count: topK,
      match_threshold: 0.65
    })

    if (error) {
      logger.warn(`[RAG] match_session_notes RPC error: ${error.message}`)
      return []
    }

    return notes || []
  } catch (err) {
    logger.error(`[RAG] retrieveRelevantContext error: ${err.message}`)
    return []
  }
}

// ✅ RAG Q&A pipeline: answer a user's learning question with context
async function answerLearningQuestion(userId, question) {
  try {
    const contextDocs = await retrieveRelevantContext(userId, question)

    const contextText = contextDocs.length > 0
      ? contextDocs.map((d, i) => `[Source ${i + 1}]: ${d.content}`).join('\n\n')
      : 'No relevant session notes found.'

    const systemPrompt = `You are a personalized learning assistant for SkillSwap, a peer-to-peer skill exchange platform. 
Answer the user's question based on their session notes and learning history when available.
Be concise, actionable, and encouraging. If you don't know something, say so.`

    const userPrompt = `User's question: ${question}

Relevant context from their session notes:
${contextText}

Please provide a helpful, personalized answer.`

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    return {
      answer: completion.choices[0].message.content,
      sources: contextDocs.length,
      model: completion.model
    }
  } catch (err) {
    logger.error(`[RAG] answerLearningQuestion error: ${err.message}`)
    throw err
  }
}

// ✅ Generate skill-based knowledge summary for onboarding
async function generateSkillSummary(skillName, targetLevel) {
  try {
    const prompt = `Create a concise learning roadmap for someone who wants to learn "${skillName}" to ${targetLevel} level on SkillSwap.
Include: 3-5 key concepts to master, estimated time with a peer tutor, and what they should be able to do at the end.
Keep it under 200 words and make it motivating.`

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 300
    })

    return completion.choices[0].message.content
  } catch (err) {
    logger.error(`[RAG] generateSkillSummary error: ${err.message}`)
    return null
  }
}

module.exports = { retrieveRelevantContext, answerLearningQuestion, generateSkillSummary }
