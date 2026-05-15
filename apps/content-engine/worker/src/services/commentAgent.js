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
async function fetchYouTubeComments(env) {
  if (!env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY not configured — add it via: wrangler secret put YOUTUBE_API_KEY')
  }
  if (!env.YOUTUBE_CHANNEL_ID && !env.YOUTUBE_VIDEO_IDS) {
    throw new Error('Set YOUTUBE_CHANNEL_ID or YOUTUBE_VIDEO_IDS (comma-separated) to specify which videos to monitor')
  }

  const videoIds = env.YOUTUBE_VIDEO_IDS
    ? env.YOUTUBE_VIDEO_IDS.split(',').map((v) => v.trim())
    : await fetchChannelVideoIds(env)

  const comments = []
  for (const videoId of videoIds.slice(0, 5)) { // max 5 videos per run
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=time&key=${env.YOUTUBE_API_KEY}`
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

async function fetchChannelVideoIds(env) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${env.YOUTUBE_CHANNEL_ID}&maxResults=5&order=date&type=video&key=${env.YOUTUBE_API_KEY}`
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

async function generateReply(env, comment) {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       env.LLM_MODEL ?? 'gpt-4o-mini',
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
async function postYouTubeReply(env, { commentId, reply }) {
  if (!env.YOUTUBE_OAUTH_TOKEN) {
    // Log only — posting requires OAuth, which is optional
    console.log(`[comments] No YOUTUBE_OAUTH_TOKEN — reply not posted to YouTube: ${reply.slice(0, 60)}`)
    return
  }

  const res = await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${env.YOUTUBE_OAUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        parentId:    commentId,
        textOriginal: reply,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[comments] YouTube post error ${res.status}: ${err.slice(0, 200)}`)
  }
}

// ── Main agent ────────────────────────────────────────────────────────────────
export async function runCommentAgent(env) {
  const db = getDb(env)

  let comments
  try {
    comments = await fetchYouTubeComments(env)
  } catch (e) {
    console.error('[comments] Fetch failed:', e.message)
    throw e
  }

  let processed = 0
  let flaggedCount = 0

  for (const comment of comments) {
    // Skip if already processed
    const { data: existing } = await db
      .from('comment_reply_jobs')
      .select('id')
      .eq('commentId', comment.id)
      .single()
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
    .update({
      status:     decision === 'approved' ? 'completed' : 'rejected',
      reviewedAt: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
