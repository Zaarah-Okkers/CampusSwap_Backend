const express = require('express')
const router = express.Router()
const { getProducts, getProductById, createProduct, submitReview } = require('../controllers/productsController')

router.get('/', getProducts)
router.get('/:id', getProductById)
router.post('/', createProduct)
router.post('/:id/reviews', submitReview)

module.exports = router