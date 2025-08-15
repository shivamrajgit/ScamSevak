require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth.js')
const saveSummaryRoutes = require('./routes/saveSummary.js')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api', authRoutes)
app.use('/api', saveSummaryRoutes)

app.get('/', (req, res) => res.send('API running'))

const PY_PORT = process.env.PY_PORT || 8000
app.listen(PY_PORT, () => console.log(`Server running on ${PY_PORT}`))