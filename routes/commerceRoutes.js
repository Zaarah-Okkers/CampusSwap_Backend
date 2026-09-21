import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.get('/products', async (req, res) => {
  try {
    const { search = '', university = '', condition = '', maxPrice = '' } = req.query
    const params = []
    const filters = ["p.status = 'active'"]
    if (search) { filters.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`) }
    if (university) { filters.push('u.name = ?'); params.push(university) }
    if (condition) { filters.push('p.condition_label = ?'); params.push(condition) }
    if (maxPrice !== '') { filters.push('p.price <= ?'); params.push(Number(maxPrice)) }

    const [products] = await pool.query(`
      SELECT p.*, c.name AS category_name, u.name AS university_name,
             seller.full_name AS seller_name, seller.rating AS seller_rating
      FROM products p
      JOIN users seller ON seller.id = p.seller_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN universities u ON u.id = p.university_id
         WHERE ${filters.join(' AND ')}
         ORDER BY p.created_at DESC
      `, params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/universities', async (req, res) => {
  try {
    const [universities] = await pool.query('SELECT id, name FROM universities ORDER BY name');
    res.json(universities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch universities' });
  }
});

// The checkout view calls these repair requests "repairs". Jobs are the
// equivalent entity in the CampusSwap schema, so return UI-compatible names.
router.get('/repairs', async (req, res) => {
  try {
    const [repairs] = await pool.query(`
      SELECT id, title, description, residence_name, room_number,
             estimated_cost, status, priority, created_at
      FROM services
      WHERE status NOT IN ('completed', 'cancelled')
      ORDER BY created_at DESC
    `);
    res.json(repairs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repairs' });
  }
});

router.post('/orders/checkout', async (req, res) => {
  const { buyerId, buyer_id, sellerId = null, seller_id = null, items = [] } = req.body;
  const buyer = buyerId ?? buyer_id;
  const seller = sellerId ?? seller_id;
  if (!buyer || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'buyerId and at least one item are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const total = items.reduce((sum, item) => sum + Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? 1), 0);
    const reference = `CS-${Date.now()}`;
    const [order] = await connection.query(
      'INSERT INTO orders (order_reference, buyer_id, seller_id, total_amount) VALUES (?, ?, ?, ?)',
      [reference, buyer, seller, total],
    );
    for (const item of items) {
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        [
          order.insertId,
          item.productId ?? item.product_id ?? item.id,
          item.sellerId ?? item.seller_id ?? seller,
          quantity,
          unitPrice,
        ],
      );
    }
    await connection.query('INSERT INTO payments (order_id, amount) VALUES (?, ?)', [order.insertId, total]);
    await connection.commit();
    res.status(201).json({ id: order.insertId, order_reference: reference, total_amount: total, status: 'pending_payment' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to create checkout' });
  } finally {
    connection.release();
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ ...order, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.post('/payments/webhook', async (req, res) => {
  const orderId = req.body.m_payment_id;
  if (!orderId) return res.status(400).send('Missing order id');
  try {
    await pool.query("UPDATE payments SET status = 'complete', paid_at = CURRENT_TIMESTAMP WHERE order_id = ?", [orderId]);
    await pool.query("UPDATE orders SET status = 'paid', payment_status = 'complete' WHERE id = ?", [orderId]);
    res.send('OK');
  } catch (error) {
    res.status(500).send('Payment update failed');
  }
});

router.post('/orders/:id/release', async (req, res) => {
  try {
    await pool.query("UPDATE payments SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE order_id = ?", [req.params.id]);
    await pool.query("UPDATE orders SET status = 'completed' WHERE id = ?", [req.params.id]);
    res.json({ id: Number(req.params.id), status: 'completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to release funds' });
  }
});

export default router;
