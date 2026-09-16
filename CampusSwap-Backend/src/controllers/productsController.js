const pool = require('../db')
const { mapProduct, mapReview } = require('../utils/mapProduct')

const PRODUCT_SELECT = `
  SELECT
    p.*,
    s.full_name AS seller_name,
    s.rating AS seller_rating,
    uni.name AS university_name
  FROM products p
  JOIN users s ON p.seller_id = s.id
  LEFT JOIN universities uni ON p.university_id = uni.id
`

const REVIEW_SELECT = `
  SELECT rv.*, u.full_name AS reviewer_name
  FROM reviews rv
  JOIN users u ON rv.reviewer_id = u.id
  WHERE rv.product_id = ?
  ORDER BY rv.created_at DESC
`

async function getProducts(req, res) {
  try {
    const { university = '', condition = '', maxPrice, search = '' } = req.query
    const price = maxPrice !== undefined ? Number(maxPrice) : 5000

    const [rows] = await pool.query(
      `${PRODUCT_SELECT}
       WHERE (? = '' OR uni.name = ?)
         AND (? = '' OR p.condition_label = ?)
         AND (p.price IS NULL OR p.price <= ?)
         AND (? = '' OR p.name LIKE CONCAT('%', ?, '%'))
       ORDER BY p.created_at DESC`,
      [university, university, condition, condition, price, search, search]
    )

    res.json(rows.map(mapProduct))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params

    const [rows] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [id])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const [reviewRows] = await pool.query(REVIEW_SELECT, [id])

    const product = mapProduct(rows[0])
    product.reviews = reviewRows.map(mapReview)

    res.json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
}

async function createProduct(req, res) {
  const conn = await pool.getConnection()
  try {
    const {
      sellerId,
      categoryId,
      universityId = null,
      listingType = 'sell',
      name,
      price = null,
      rentPeriod = null,
      swapFor = null,
      condition,
      conditionClass = '',
      image = 'https://placehold.co/300x200',
      description = ''
    } = req.body

    if (!name || !condition || !sellerId || !categoryId) {
      return res.status(400).json({ error: 'name, condition, sellerId, and categoryId are required' })
    }

    await conn.beginTransaction()

    const [sellerRows] = await conn.query('SELECT id FROM users WHERE id = ?', [sellerId])
    if (sellerRows.length === 0) {
      await conn.rollback()
      return res.status(400).json({ error: 'sellerId does not match an existing user' })
    }

    const [insertResult] = await conn.query(
      `INSERT INTO products
        (seller_id, category_id, university_id, listing_type, name, description, price, rent_period, swap_for, condition_label, condition_class, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerId, categoryId, universityId, listingType, name, description, price, rentPeriod, swapFor, condition, conditionClass, image]
    )

    await conn.commit()

    const [rows] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [insertResult.insertId])
    res.status(201).json(mapProduct(rows[0]))
  } catch (err) {
    await conn.rollback()
    console.error(err)
    res.status(500).json({ error: 'Failed to create product' })
  } finally {
    conn.release()
  }
}

async function submitReview(req, res) {
  const conn = await pool.getConnection()
  try {
    const { id } = req.params
    const { reviewerId, productRating = 0, sellerRating = 0, comment = '' } = req.body

    if (!reviewerId) {
      return res.status(400).json({ error: 'reviewerId is required' })
    }

    await conn.beginTransaction()

    const [productRows] = await conn.query(
      'SELECT id, seller_id, rating, sales FROM products WHERE id = ? FOR UPDATE',
      [id]
    )
    if (productRows.length === 0) {
      await conn.rollback()
      return res.status(404).json({ error: 'Product not found' })
    }
    const product = productRows[0]

    await conn.query(
      `INSERT INTO reviews (product_id, reviewer_id, product_rating, seller_rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [id, reviewerId, productRating || null, sellerRating || null, comment]
    )

    if (productRating > 0) {
      const newSales = product.sales + 1
      const newRating = ((product.rating * product.sales) + productRating) / newSales
      await conn.query('UPDATE products SET rating = ?, sales = ? WHERE id = ?', [
        newRating.toFixed(1),
        newSales,
        id
      ])
    }

    if (sellerRating > 0) {
      const [sellerRows] = await conn.query(
        'SELECT rating, rating_count FROM users WHERE id = ? FOR UPDATE',
        [product.seller_id]
      )
      const seller = sellerRows[0]
      const newCount = seller.rating_count + 1
      const newRating = ((seller.rating * seller.rating_count) + sellerRating) / newCount
      await conn.query('UPDATE users SET rating = ?, rating_count = ? WHERE id = ?', [
        newRating.toFixed(1),
        newCount,
        product.seller_id
      ])
    }

    await conn.commit()

    const [rows] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [id])
    const [reviewRows] = await pool.query(REVIEW_SELECT, [id])
    const updated = mapProduct(rows[0])
    updated.reviews = reviewRows.map(mapReview)

    res.json(updated)
  } catch (err) {
    await conn.rollback()
    console.error(err)
    res.status(500).json({ error: 'Failed to submit review' })
  } finally {
    conn.release()
  }
}

module.exports = { getProducts, getProductById, createProduct, submitReview }