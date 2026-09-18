const express = require('express')
const cors = require('cors')
const productsRouter = require('./routes/products')
const universitiesRouter = require('./routes/universities') 

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api/products', productsRouter)
app.use('/api/universities', universitiesRouter)  

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

module.exports = app