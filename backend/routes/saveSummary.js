// routes/saveSummary.js
const express = require('express')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const router = express.Router()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'changeme'

// POST /save-summary (existing)
router.post('/save-summary', async (req, res) => {
  const { token, summary } = req.body
  if (!token || !summary) return res.status(400).json({ error: 'Missing token or summary' })
  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
  if (payload.guest) return res.status(403).json({ error: 'Guest mode, not saving' })
  const user = await prisma.user.findUnique({ where: { username: payload.username } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  await prisma.conversationSummary.create({
    data: {
      summary,
      userId: user.id
    }
  })
  res.json({ status: 'saved' })
})

// GET /summaries - returns all summaries for the authenticated user
// Response: { summaries: [{ id, createdAt, summary }, ...] }
router.get('/summaries', async (req, res) => {
  // Accept token from Authorization header: "Bearer <token>" OR from query param ?token=...
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.query.token || null)

  if (!token) return res.status(400).json({ error: 'Missing token' })

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (payload.guest) return res.status(403).json({ error: 'Guest mode, no saved summaries' })

  const user = await prisma.user.findUnique({ where: { username: payload.username } })
  if (!user) return res.status(404).json({ error: 'User not found' })

  // fetch summaries (ensure your Prisma model has createdAt)
  const summaries = await prisma.conversationSummary.findMany({
    where: { userId: user.id },
    select: { id: true, summary: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  })

  res.json({ summaries })
})

module.exports = router