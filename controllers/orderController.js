import { asyncRoute } from "../utils/asyncRoute.js";
import { createNotification } from "../utils/notifications.js";
import {
  findProductSellerId,
  createOrderWithItems,
  listOrders,
  findOrderById,
  findOrderBasicById,
  markPaymentComplete,
  releaseEscrow,
} from "../models/orderModel.js";

/**
 * POST /api/orders/checkout
 * Normalises the item list (backfilling any missing sellerId from the
 * product record), then creates the order + items + payment row in one
 * transaction. Notifies the seller (fire-and-forget).
 */
export const checkout = asyncRoute(async (req, res) => {
  const b = req.body || {};
  const buyerId = b.buyerId || b.buyer_id;
  const rawItems = b.items;

  if (!buyerId || !Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ error: "buyerId and items are required" });
  }

  // Normalise items to { productId, sellerId, quantity, unitPrice }.
  const items = [];
  for (const raw of rawItems) {
    const productId = raw.productId || raw.product_id || raw.id;
    let sellerId = raw.sellerId || raw.seller_id;
    if (!sellerId && productId) {
      sellerId = await findProductSellerId(productId);
    }
    items.push({
      productId,
      sellerId,
      quantity: Number(raw.quantity || 1),
      unitPrice: Number(raw.unitPrice ?? raw.price ?? 0),
    });
  }

  // Order.seller_id is NOT NULL — pick the first seller we managed to
  // resolve. (order_items tracks the true seller per line.)
  const headlineSeller =
    b.sellerId ||
    b.seller_id ||
    items.find((it) => it.sellerId)?.sellerId ||
    null;

  if (!headlineSeller) {
    return res
      .status(400)
      .json({ error: "Could not determine seller for any item" });
  }

  const total = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const reference = `CS-${Date.now()}`;

  const orderId = await createOrderWithItems({
    reference,
    buyerId,
    sellerId: headlineSeller,
    items,
    total,
  });

  createNotification({
    userId: headlineSeller,
    type: "order",
    title: "New order received",
    message: `You have a new order for R${total.toFixed(2)}. Reference: ${reference}.`,
    actionUrl: "/checkout",
    metadata: { orderId, reference, total },
  }).catch((err) => console.warn("[notify] seller order failed:", err.message));

  res.status(201).json({
    id: orderId,
    order_reference: reference,
    total_amount: total,
    status: "pending_payment",
  });
});

/**
 * GET /api/orders?buyer_id=X  OR  ?seller_id=X
 */
export const getOrders = asyncRoute(async (req, res) => {
  const { buyer_id, buyerId, seller_id, sellerId } = req.query;
  const buyer = buyer_id || buyerId;
  const seller = seller_id || sellerId;

  if (!buyer && !seller) {
    return res
      .status(400)
      .json({ error: "buyer_id or seller_id is required" });
  }

  const rows = await listOrders({ buyerId: buyer, sellerId: seller });
  res.json(rows);
});

/**
 * GET /api/orders/:id
 */
export const getOrder = asyncRoute(async (req, res) => {
  const order = await findOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

/**
 * POST /api/payments/webhook
 * Simulated payment provider callback. Flips the payment to complete
 * and notifies the seller.
 */
export const paymentWebhook = asyncRoute(async (req, res) => {
  const orderId = req.body.m_payment_id;
  if (!orderId) return res.status(400).send("Missing order id");

  const order = await markPaymentComplete(orderId);

  if (order?.seller_id) {
    createNotification({
      userId: order.seller_id,
      type: "payment",
      title: "Payment confirmed",
      message: `Order #${orderId} is paid — R${Number(order.total_amount).toFixed(2)} held in escrow.`,
      actionUrl: "/checkout",
      metadata: { orderId, amount: order.total_amount },
    }).catch((err) =>
      console.warn("[notify] payment webhook failed:", err.message),
    );
  }

  res.send("OK");
});

/**
 * POST /api/orders/:id/release
 * Buyer confirms delivery — escrow releases to the seller. Notifies
 * both sides.
 */
export const releaseOrder = asyncRoute(async (req, res) => {
  const order = await releaseEscrow(req.params.id);

  if (order?.seller_id) {
    createNotification({
      userId: order.seller_id,
      type: "payment",
      title: "Funds released",
      message: `R${Number(order.total_amount).toFixed(2)} has been released to you for order #${order.id}.`,
      actionUrl: "/checkout",
      metadata: { orderId: order.id, amount: order.total_amount },
    }).catch((err) =>
      console.warn("[notify] seller release failed:", err.message),
    );
  }
  if (order?.buyer_id) {
    createNotification({
      userId: order.buyer_id,
      type: "payment",
      title: "Escrow released",
      message: `You confirmed delivery for order #${order.id}. The seller has been paid.`,
      actionUrl: "/checkout",
      metadata: { orderId: order.id },
    }).catch((err) =>
      console.warn("[notify] buyer release failed:", err.message),
    );
  }

  res.json({ id: Number(req.params.id), status: "completed" });
});