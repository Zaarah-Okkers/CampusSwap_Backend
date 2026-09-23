// routes/payments.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/payments/webhook
router.post('/webhook', async (req, res) => {
  const { m_payment_id, payment_status } = req.body;

  if (!m_payment_id) {
    return res.status(400).send('Missing order ID');
  }

  try {
    if (payment_status === 'COMPLETE' || payment_status === 'SUCCESS') {
      // Update order status to 'in_escrow'
      await db.query(
        `UPDATE orders SET status = 'in_escrow' WHERE id = ?`,
        [m_payment_id]
      );
      console.log(`Order #${m_payment_id} successfully paid and moved to escrow.`);
    } else {
      await db.query(
        `UPDATE orders SET status = 'cancelled' WHERE id = ?`,
        [m_payment_id]
      );
    }

    // Always respond with HTTP 200 OK to acknowledge receipt to the gateway
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;