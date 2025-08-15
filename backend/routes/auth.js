const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
//const { withAccelerate } = require('@prisma/extension-accelerate')

const router = express.Router()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'changeme'

router.post('/signup', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' })
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) return res.status(400).json({ error: 'User exists' })
  const hash = await bcrypt.hash(password, 10)
  try {
    await prisma.user.create({ data: { username, password: hash } })
    const token = jwt.sign({ username }, JWT_SECRET)
    res.json({ token, username })
  } catch (err) {
    if (err.code === 'P2002') {
      // Prisma unique constraint error
      return res.status(400).json({ error: 'User exists' })
    }
    // Other errors
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' })
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ username }, JWT_SECRET)
  res.json({ token, username })
})

router.post('/guest', (req, res) => {
  const token = jwt.sign({ guest: true }, JWT_SECRET)
  res.json({ token, guest: true })
})

module.exports = router