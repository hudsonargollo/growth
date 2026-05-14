import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const FLAG_PATTERNS = [
  /scam|fake|fraud|lie|liar/i,
  /hate|racist|sexist/i,
  /lawsuit|legal action/i,
]
const isFlagged = (text) => FLAG_PATTERNS.some((p) => p.test(text))

async function fetchYouTubeComments(env) {
  // TODO: call YouTube Data API v3 with env.YOUTUBE_API_KEY
  // const res = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=...&key=${env.YOUTUBE_API_KEY}`)
  return [
    { id: `yt-${Date.now()}-1`, text: 'Which one has the best battery life?', videoId: 'vid-001' },
    { id: `yt-${Date.now()}-2`, text: 'Are these good for working out?',       videoId: 'vid-001' },
    { id: `yt-${Date.now()}-3`, text: "This is a scam, you're lying!",         videoId: 'vid-002' },
  ]
}

async function generateReply(env, comment) {
  // TODO: call OpenAI with env.OPENAI_API_KEY
  // const res = await fetch('https://api.openai.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: `Reply to: "${comment.text}"` }] }),
  // })
  return `Thanks for your comment! Check the affiliate links in the description. 🙌`
}

async function postYouTubeReply(env, { commentId, reply }) {
  // TODO: call YouTube Data API to post reply
  console.log(`[comments] Stub reply to ${commentId}: ${reply.slice(0, 60)}`)
}

export async function runCommentAgent(env) {
  const db = getDb(env)
  const comments = await fetchYouTubeComments(env)

  for (const comment of comments) {
    const flagged = isFlagged(comment.text)
    let reply = null
    let status = flagged ? 'flagged' : 'pending'

    if (!flagged) {
      reply  = await generateReply(env, comment)
      status = 'completed'
      await postYouTubeReply(env, { commentId: comment.id, reply })
    }

    const { error } = await db.from('comment_reply_jobs').insert({
      id: uid(), commentId: comment.id, videoId: comment.videoId,
      comment: comment.text, reply, status, source: flagged ? 'human' : 'AI', flagged,
    })
    if (error) console.error('[comments] DB error:', error.message)
  }

  return { processed: comments.length }
}

export async function listCommentJobs(env) {
  const db = getDb(env)
  const { data, error } = await db.from('comment_reply_jobs').select('*').order('createdAt', { ascending: false }).limit(100)
  if (error) throw new Error(error.message)
  return data
}

export async function reviewComment(env, jobId, decision) {
  const db = getDb(env)
  const { data, error } = await db
    .from('comment_reply_jobs')
    .update({ status: decision === 'approved' ? 'completed' : 'rejected', reviewedAt: new Date().toISOString() })
    .eq('id', jobId)
    .select().single()
  if (error) throw new Error(error.message)
  return data
}
