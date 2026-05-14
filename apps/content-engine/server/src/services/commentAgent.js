import cron from 'node-cron'
import { db } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const FLAG_PATTERNS = [
  /scam|fake|fraud|lie|liar/i,
  /hate|racist|sexist/i,
  /lawsuit|legal action/i,
]
const isFlagged = (text) => FLAG_PATTERNS.some((p) => p.test(text))

async function fetchYouTubeComments() {
  // TODO: call YouTube Data API v3
  // GET https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=...&key=YOUTUBE_API_KEY
  return [
    { id: `yt-${Date.now()}-1`, text: 'Which one has the best battery life?', videoId: 'vid-001' },
    { id: `yt-${Date.now()}-2`, text: 'Are these good for working out?',       videoId: 'vid-001' },
    { id: `yt-${Date.now()}-3`, text: "This is a scam, you're lying!",         videoId: 'vid-002' },
  ]
}

async function generateReply() {
  // TODO: call OpenAI
  // const res = await openai.chat.completions.create({ model: process.env.LLM_MODEL, messages: [...] })
  return `Thanks for your comment! Check the affiliate links in the description. 🙌`
}

async function postYouTubeReply({ commentId, reply }) {
  // TODO: call YouTube Data API to post reply
  console.log(`[comments] Stub reply to ${commentId}: ${reply.slice(0, 60)}`)
}

export async function runCommentAgent() {
  console.log('[comments] Agent run started')
  const comments = await fetchYouTubeComments()
  for (const comment of comments) {
    const flagged = isFlagged(comment.text)
    let reply = null
    let status = flagged ? 'flagged' : 'pending'
    if (!flagged) {
      reply  = await generateReply(comment)
      status = 'completed'
      await postYouTubeReply({ commentId: comment.id, reply })
    } else {
      console.warn(`[comments] Flagged for review: ${comment.id}`)
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
    if (error) console.error('[comments] DB error:', error.message)
  }
  console.log(`[comments] Done — ${comments.length} processed`)
}

export function startCommentCron() {
  const schedule = process.env.COMMENT_CRON ?? '0 */4 * * *'
  cron.schedule(schedule, runCommentAgent)
  console.log(`[comments] Cron scheduled: ${schedule}`)
}

export async function listCommentJobs() {
  const { data, error } = await db
    .from('comment_reply_jobs')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return data
}

export async function reviewComment(jobId, decision) {
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
