import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

// Safety guardrails — comments matching these patterns go to human review
const FLAG_PATTERNS = [
  /scam|fake|fraud|lie|liar/i,
  /hate|racist|sexist/i,
  /lawsuit|legal action/i,
  /spam|bot|fake account/i,
]
const isFlagged = (text) => FLAG_PATTERNS.some((p) => p.test(text))

// Strip HTML tags and decode common entities from YouTube textDisplay
function stripHtml(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

// True if a comment looks like a channel-owner pinned product list (not a viewer comment)
function isProductListComment(text) {
  const linkCount = (text.match(/https?:\/\//g) ?? []).length
  return linkCount >= 3 || text.length > 800
}

// ── YouTube Data API ──────────────────────────────────────────────────────────
async function fetchYouTubeComments(keys) {
  if (!keys.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY not configured')
  }
  if (!keys.YOUTUBE_CHANNEL_ID && !keys.YOUTUBE_VIDEO_IDS) {
    throw new Error('Set YOUTUBE_CHANNEL_ID or YOUTUBE_VIDEO_IDS to specify which videos to monitor')
  }

  const videoIds = keys.YOUTUBE_VIDEO_IDS
    ? keys.YOUTUBE_VIDEO_IDS.split(',').map((v) => v.trim())
    : await fetchChannelVideoIds(keys)

  const comments = []
  for (const videoId of videoIds.slice(0, 5)) {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=time&key=${keys.YOUTUBE_API_KEY}`
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`[comments] YouTube API error for video ${videoId}: ${res.status}`)
      continue
    }
    const json = await res.json()
    for (const item of json.items ?? []) {
      const snippet = item.snippet?.topLevelComment?.snippet
      if (!snippet) continue
      const rawText  = snippet.textDisplay ?? ''
      const cleanText = stripHtml(rawText)
      // Skip pinned product-list comments (channel owner posts with many links)
      if (isProductListComment(rawText)) {
        console.log(`[comments] skipping product-list comment ${item.snippet.topLevelComment.id}`)
        continue
      }
      comments.push({
        id:      item.snippet.topLevelComment.id,
        text:    cleanText,
        videoId,
        author:  snippet.authorDisplayName,
      })
    }
  }

  return comments
}

async function fetchChannelVideoIds(keys) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${keys.YOUTUBE_CHANNEL_ID}&maxResults=5&order=date&type=video&key=${keys.YOUTUBE_API_KEY}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`YouTube search API error: ${res.status}`)
  const json = await res.json()
  return (json.items ?? []).map((item) => item.id.videoId).filter(Boolean)
}

// ── LLM reply generation (Anthropic preferred, OpenAI fallback via llm.js) ────
const BRAND_TONE = `You are a friendly YouTube channel assistant for a product review channel.
Reply to comments in a helpful, enthusiastic tone. Keep replies under 3 sentences.
Always mention checking the description for affiliate links when relevant.
Never make false claims. Include affiliate disclosure when recommending products.`

async function generateReply(env, comment) {
  const { callLLM } = await import('../lib/llm.js')
  return callLLM(env, {
    system:    BRAND_TONE,
    prompt:    `Reply to this YouTube comment from "${comment.author ?? 'viewer'}": "${comment.text.slice(0, 400)}"`,
    maxTokens: 150,
  })
}

// ── YouTube OAuth token refresh ───────────────────────────────────────────────
/**
 * Exchanges the stored refresh_token for a short-lived access_token.
 * Falls back to the legacy static YOUTUBE_OAUTH_TOKEN if no refresh token is stored.
 * Returns an access token string, or null if neither credential is available.
 */
async function refreshYouTubeToken(env) {
  const { resolveKey } = await import('../lib/resolveKey.js')

  // Prefer OAuth refresh token flow (long-lived, automatic)
  const clientId     = env.GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  const refreshToken = await resolveKey(env, 'GOOGLE_REFRESH_TOKEN')

  if (clientId && clientSecret && refreshToken) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    })

    if (res.ok) {
      const { access_token } = await res.json()
      if (access_token) return access_token
    } else {
      console.error('[comments] OAuth token refresh failed:', res.status, await res.text().catch(() => ''))
    }
  }

  // Legacy fallback: static token stored via Settings → API Keys UI
  const staticToken = await resolveKey(env, 'YOUTUBE_OAUTH_TOKEN')
  if (staticToken) {
    console.warn('[comments] Using legacy static YOUTUBE_OAUTH_TOKEN — consider connecting via YouTube OAuth')
    return staticToken
  }

  return null
}

// ── YouTube reply posting ─────────────────────────────────────────────────────
async function postYouTubeReply(env, { commentId, reply }) {
  const accessToken = await refreshYouTubeToken(env)

  if (!accessToken) {
    console.log(`[comments] No YouTube auth token — reply saved to DB but not posted: ${reply.slice(0, 60)}`)
    return
  }

  const res = await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: { parentId: commentId, textOriginal: reply },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[comments] YouTube post error ${res.status}: ${err.slice(0, 200)}`)
  }
}

// ── Main agent ────────────────────────────────────────────────────────────────
// tenantId: uuid of the tenant being processed
// db: Supabase client to use (user-scoped for API calls, service role for cron)
// keys: API keys object { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID, OPENAI_API_KEY, ... }
//       For API-triggered runs, keys are sourced from env (Phase 3 will load per-tenant keys)
export async function runCommentAgent(env, tenantId, dbArg, keys) {
  // If db not passed (API-triggered call), create a service-role client
  const db = dbArg ?? getDb(env)

  // Load keys from env secrets first, fall back to DB-stored credentials (Settings UI)
  const { resolveKey } = await import('../lib/resolveKey.js')
  const resolvedKeys = keys ?? {
    YOUTUBE_API_KEY:     await resolveKey(env, 'YOUTUBE_API_KEY'),
    YOUTUBE_CHANNEL_ID:  await resolveKey(env, 'YOUTUBE_CHANNEL_ID'),
    YOUTUBE_VIDEO_IDS:   env.YOUTUBE_VIDEO_IDS ?? null,
    YOUTUBE_OAUTH_TOKEN: await resolveKey(env, 'YOUTUBE_OAUTH_TOKEN'),
    OPENAI_API_KEY:      await resolveKey(env, 'OPENAI_API_KEY'),
    LLM_MODEL:           env.LLM_MODEL,
  }

  let comments
  try {
    comments = await fetchYouTubeComments(resolvedKeys)
  } catch (e) {
    console.error('[comments] Fetch failed:', e.message)
    throw e
  }

  let processed = 0
  let flaggedCount = 0

  for (const comment of comments) {
    let q = db.from('comment_reply_jobs').select('id').eq('commentId', comment.id)
    if (tenantId) q = q.eq('tenant_id', tenantId)
    const { data: existing } = await q.single()
    if (existing) continue

    const flagged = isFlagged(comment.text)
    let reply  = null
    let status = flagged ? 'flagged' : 'pending'

    if (!flagged) {
      try {
        reply  = await generateReply(env, comment)
        status = 'completed'
        await postYouTubeReply(env, { commentId: comment.id, reply })
      } catch (e) {
        console.error(`[comments] Reply generation failed for ${comment.id}:`, e.message)
        status = 'failed'
      }
    } else {
      flaggedCount++
      console.warn(`[comments] Flagged for review: ${comment.id} — "${comment.text.slice(0, 60)}"`)
    }

    const { error } = await db.from('comment_reply_jobs').insert({
      id:        uid(),
      commentId: comment.id,
      videoId:   comment.videoId,
      comment:   comment.text,
      reply,
      status,
      source:    flagged ? 'human' : 'AI',
      flagged,
      tenant_id: tenantId,
    })
    if (error) console.error('[comments] DB insert error:', error.message)
    processed++
  }

  return { processed, flagged: flaggedCount }
}

export async function listCommentJobs(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('comment_reply_jobs')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return data
}

export async function reviewComment(env, jobId, decision) {
  const db = getDb(env)
  const { data, error } = await db
    .from('comment_reply_jobs')
    .update({ status: decision === 'approved' ? 'completed' : 'rejected', reviewedAt: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
