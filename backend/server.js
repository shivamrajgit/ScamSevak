require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./')
const saveSummaryRoutes = require('./routes/saveSummary')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api', authRoutes)
app.use('/api', saveSummaryRoutes)

app.get('/', (req, res) => res.send('API running'))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on ${PORT}`))