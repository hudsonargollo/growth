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
      comments.push({
        id:      item.snippet.topLevelComment.id,
        text:    snippet.textDisplay,
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

// ── OpenAI reply generation ───────────────────────────────────────────────────
const BRAND_TONE = `You are a friendly YouTube channel assistant for a product review channel.
Reply to comments in a helpful, enthusiastic tone. Keep replies under 3 sentences.
Always mention checking the description for affiliate links when relevant.
Never make false claims. Include affiliate disclosure when recommending products.`

async function generateReply(keys, comment) {
  if (!keys.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${keys.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       keys.LLM_MODEL ?? 'gpt-4o-mini',
      messages:    [
        { role: 'system', content: BRAND_TONE },
        { role: 'user',   content: `Reply to this YouTube comment from "${comment.author ?? 'viewer'}": "${comment.text}"` },
      ],
      temperature: 0.6,
      max_tokens:  150,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const json = await res.json()
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

// ── YouTube reply posting ─────────────────────────────────────────────────────
async function postYouTubeReply(keys, { commentId, reply }) {
  if (!keys.YOUTUBE_OAUTH_TOKEN) {
    console.log(`[comments] No YOUTUBE_OAUTH_TOKEN — reply not posted to YouTube: ${reply.slice(0, 60)}`)
    return
  }

  const res = await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${keys.YOUTUBE_OAUTH_TOKEN}`,
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
export async function runCommentAgent(env, tenantId, db, keys) {
  // Fall back to env keys if none provided (cron before Phase 3 or direct API call)
  const resolvedKeys = keys ?? {
    YOUTUBE_API_KEY:    env.YOUTUBE_API_KEY,
    YOUTUBE_CHANNEL_ID: env.YOUTUBE_CHANNEL_ID,
    YOUTUBE_VIDEO_IDS:  env.YOUTUBE_VIDEO_IDS,
    YOUTUBE_OAUTH_TOKEN: env.YOUTUBE_OAUTH_TOKEN,
    OPENAI_API_KEY:     env.OPENAI_API_KEY,
    LLM_MODEL:          env.LLM_MODEL,
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
        reply  = await generateReply(resolvedKeys, comment)
        status = 'completed'
        await postYouTubeReply(resolvedKeys, { commentId: comment.id, reply })
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

export async function listCommentJobs(env, tenantId, db) {
  let query = db.from('comment_reply_jobs').select('*').order('createdAt', { ascending: false }).limit(100)
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function reviewComment(env, tenantId, db, jobId, decision) {
  let query = db
    .from('comment_reply_jobs')
    .update({ status: decision === 'approved' ? 'completed' : 'rejected', reviewedAt: new Date().toISOString() })
    .eq('id', jobId)
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data, error } = await query.select().single()
  if (error) throw new Error(error.message)
  return data
}
