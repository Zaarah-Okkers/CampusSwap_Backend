const pool = require('../db')
const { mapProduct, mapReview } = require('../utils/mapProduct')

const PRODUCT_SELECT = `
  SELECT
    p.*,
    s.name AS seller_name,
    s.rating AS seller_rating,
    u.name AS university_name
  FROM products p
  JOIN sellers s ON p.seller_id = s.id
  LEFT JOIN universities u ON p.university_id = u.id
`

async function getProducts(req, res) {
  try {
    const { university = '', condition = '', maxPrice, search = '' } = req.query
    const price = maxPrice !== undefined ? Number(maxPrice) : 5000

    const [rows] = await pool.query(
      `${PRODUCT_SELECT}
       WHERE (? = '' OR u.name = ?)
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

    const [reviewRows] = await pool.query(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
      [id]
    )

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
      listingType = 'sell',
      name,
      price = null,
      rentPeriod = null,
      swapFor = null,
      condition,
      conditionClass = '',
      image = 'https://placehold.co/300x200',
      sellerName,
      description = ''
    } = req.body

    if (!name || !condition || !sellerName) {
      return res.status(400).json({ error: 'name, condition, and sellerName are required' })
    }

    await conn.beginTransaction()

    let [sellerRows] = await conn.query('SELECT id FROM sellers WHERE name = ?', [sellerName])
    let sellerId
    if (sellerRows.length > 0) {
      sellerId = sellerRows[0].id
    } else {
      const [result] = await conn.query('INSERT INTO sellers (name) VALUES (?)', [sellerName])
      sellerId = result.insertId
    }

    const [insertResult] = await conn.query(
      `INSERT INTO products
        (listing_type, name, description, price, rent_period, swap_for, condition_label, condition_class, image_url, seller_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [listingType, name, description, price, rentPeriod, swapFor, condition, conditionClass, image, sellerId]
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
    const { reviewerName, productRating = 0, sellerRating = 0, comment = '' } = req.body

    if (!reviewerName) {
      return res.status(400).json({ error: 'reviewerName is required' })
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
      `INSERT INTO reviews (product_id, reviewer_name, product_rating, seller_rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [id, reviewerName, productRating || null, sellerRating || null, comment]
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
        'SELECT rating, rating_count FROM sellers WHERE id = ? FOR UPDATE',
        [product.seller_id]
      )
      const seller = sellerRows[0]
      const newCount = seller.rating_count + 1
      const newRating = ((seller.rating * seller.rating_count) + sellerRating) / newCount
      await conn.query('UPDATE sellers SET rating = ?, rating_count = ? WHERE id = ?', [
        newRating.toFixed(1),
        newCount,
        product.seller_id
      ])
    }

    await conn.commit()

    const [rows] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [id])
    const [reviewRows] = await pool.query(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
      [id]
    )
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