const express = require('express')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const router = express.Router()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'changeme'

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

module.exports = router