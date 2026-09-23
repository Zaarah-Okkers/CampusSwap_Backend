// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/orders/checkout
router.post('/checkout', async (req, res, next) => {
  const { user_id, product_id, total_amount, payment_method } = req.body;

  if (!user_id || !product_id || !total_amount) {
    return res.status(400).json({ error: 'Missing required checkout fields' });
  }

  const escrow_fee = total_amount * 0.05;

  try {
    const [result] = await db.query(
      `INSERT INTO orders (user_id, product_id, order_type, total_amount, escrow_fee, status, payment_method)
       VALUES (?, ?, 'product', ?, ?, 'pending', ?)`,
      [user_id, product_id, total_amount, escrow_fee, payment_method || 'card']
    );

    const orderId = result.insertId;

    return res.status(201).json({
      message: 'Checkout initiated successfully',
      orderId: orderId,
      paymentData: {
        m_payment_id: orderId,
        amount: total_amount,
        item_name: `CampusSwap SA Order #${orderId}`,
        return_url: `http://localhost:5173/order/success?order_id=${orderId}`,
        cancel_url: `http://localhost:5173/order/cancel?order_id=${orderId}`,
        notify_url: `http://localhost:3000/api/payments/webhook`
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT o.*, p.name AS product_name 
       FROM orders o 
       LEFT JOIN products p ON o.product_id = p.id 
       WHERE o.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/orders/:id/release
router.post('/:id/release', async (req, res, next) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(
      `UPDATE orders SET status = 'completed', escrow_released = 1 WHERE id = ? AND status = 'in_escrow'`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        error: 'Order cannot be released (must be in_escrow status)' 
      });
    }

    return res.json({ 
      message: `Order #${id} completed. Funds released to seller.` 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;