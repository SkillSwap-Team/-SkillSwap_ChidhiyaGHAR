const Redis = require('ioredis')

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined

let redis

const createRedisClient = () => {
  const options = {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 10) {
        console.error('[Redis] Max retries reached. Giving up.')
        return null
      }
      const delay = Math.min(times * 100, 3000)
      console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})...`)
      return delay
    },
    lazyConnect: false,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    commandTimeout: 5000
  }

  if (REDIS_PASSWORD) options.password = REDIS_PASSWORD

  const client = new Redis(REDIS_URL, options)

  client.on('connect', () => {
    console.log('[Redis] ✅ Connected to Redis')
  })

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message)
  })

  client.on('reconnecting', () => {
    console.warn('[Redis] Reconnecting...')
  })

  client.on('close', () => {
    console.warn('[Redis] Connection closed')
  })

  return client
}

// Singleton instance
if (!redis) {
  redis = createRedisClient()
}

module.exports = redis
