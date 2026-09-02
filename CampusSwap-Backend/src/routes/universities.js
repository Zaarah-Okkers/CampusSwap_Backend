const express = require('express')
const router = express.Router()
const { getUniversities } = require('../controllers/universitiesController')

router.get('/', getUniversities)

module.exports = router