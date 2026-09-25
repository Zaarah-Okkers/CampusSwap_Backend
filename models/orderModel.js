import pool from "../config/db.js";

/**
 * Load a product's seller_id. Used by the checkout flow to backfill
 * missing seller identifiers before creating the order.
 */
export async function findProductSellerId(productId) {
  const [[row]] = await pool.query(
    "SELECT seller_id FROM products WHERE id = ? LIMIT 1",
    [productId],
  );
  return row?.seller_id || null;
}

/**
 * Insert an order + its items + a pending payment row in a single
 * transaction. Caller passes a normalised list of items with sellerId
 * already resolved.
 */
export async function createOrderWithItems({
  reference,
  buyerId,
  sellerId,
  items,
  total,
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [order] = await connection.query(
      "INSERT INTO orders (order_reference, buyer_id, seller_id, total_amount) VALUES (?, ?, ?, ?)",
      [reference, buyerId, sellerId, total],
    );

    for (const item of items) {
      await connection.query(
        "INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
        [
          order.insertId,
          item.productId,
          item.sellerId,
          item.quantity,
          item.unitPrice,
        ],
      );
    }

    await connection.query(
      "INSERT INTO payments (order_id, amount) VALUES (?, ?)",
      [order.insertId, total],
    );

    await connection.commit();
    return order.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * List orders filtered by buyer OR seller.
 * Returns the joined view with item_names aggregated for the UI.
 */
export async function listOrders({ buyerId, sellerId }) {
  const filters = ["1=1"];
  const params = [];
  if (buyerId) {
    filters.push("o.buyer_id = ?");
    params.push(buyerId);
  }
  if (sellerId) {
    filters.push("o.seller_id = ?");
    params.push(sellerId);
  }

  const [rows] = await pool.query(
    `SELECT o.*,
            seller.full_name AS seller_name,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
            (SELECT GROUP_CONCAT(p.name SEPARATOR ', ')
               FROM order_items oi
               JOIN products p ON p.id = oi.product_id
              WHERE oi.order_id = o.id) AS item_names
       FROM orders o
       LEFT JOIN users seller ON seller.id = o.seller_id
      WHERE ${filters.join(" AND ")}
      ORDER BY o.created_at DESC
      LIMIT 50`,
    params,
  );
  return rows;
}

export async function findOrderById(id) {
  const [[order]] = await pool.query("SELECT * FROM orders WHERE id = ?", [id]);
  if (!order) return null;
  const [items] = await pool.query(
    "SELECT * FROM order_items WHERE order_id = ?",
    [id],
  );
  return { ...order, items };
}

/** Order skeleton used by the release flow to know who to notify. */
export async function findOrderBasicById(id) {
  const [[order]] = await pool.query(
    "SELECT id, buyer_id, seller_id, total_amount FROM orders WHERE id = ?",
    [id],
  );
  return order;
}

/**
 * Payment webhook handler — flips the payment to 'complete' and the
 * order to 'paid'. Returns the order row so the caller can notify
 * the seller.
 */
export async function markPaymentComplete(orderId) {
  await pool.query(
    "UPDATE payments SET status = 'complete', paid_at = CURRENT_TIMESTAMP WHERE order_id = ?",
    [orderId],
  );
  await pool.query(
    "UPDATE orders SET status = 'paid', payment_status = 'complete' WHERE id = ?",
    [orderId],
  );
  const [[order]] = await pool.query(
    "SELECT seller_id, total_amount FROM orders WHERE id = ?",
    [orderId],
  );
  return order;
}

/**
 * Release escrow funds. Marks the payment row released and closes the
 * order. Returns the order row so the caller can notify both sides.
 */
export async function releaseEscrow(orderId) {
  await pool.query(
    "UPDATE payments SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE order_id = ?",
    [orderId],
  );
  await pool.query("UPDATE orders SET status = 'completed' WHERE id = ?", [
    orderId,
  ]);
  const [[order]] = await pool.query(
    "SELECT id, buyer_id, seller_id, total_amount FROM orders WHERE id = ?",
    [orderId],
  );
  return order;
}