const pool = require('../db')

async function getUniversities(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, name FROM universities ORDER BY name')
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch universities' })
  }
}

module.exports = { getUniversities }