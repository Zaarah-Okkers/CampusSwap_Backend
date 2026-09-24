import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import pool from "./config/db.js";
import safeHomeRoutes from "./routes/serviceRoutes.js";

const app = express();
const sessions = new Map();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const asyncRoute = (handler) => (req, res) =>
  Promise.resolve(handler(req, res)).catch((error) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

const roleMap = {
  provider: "service_provider",
  resmanager: "res_manager",
  res_manager: "res_manager",
};
const normalizeRole = (role) => roleMap[role] || role || "student";

const userPayload = (user) => {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return {
    ...safe,
    name: safe.full_name,
    university: safe.university_name || "",
  };
};

/**
 * Insert a notification for a user. Used by every action-flow that needs to
 * ping somebody (order placed, payment confirmed, funds released, service
 * assigned/approved, etc.). Fire-and-forget — the caller wraps the promise
 * with .catch() so a failed notification never fails the main operation.
 */
async function createNotification({
  userId,
  type,
  title,
  message,
  actionUrl = null,
  metadata = null,
}) {
  if (!userId) return null;
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      title,
      message,
      actionUrl,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
  return result.insertId;
}

// ---------------------------------------------------------------------------
// Health + mount
// ---------------------------------------------------------------------------

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", service: "campusswap-api" }),
);
app.get("/", (req, res) => res.json({ message: "CampusSwap API is running" }));

app.use("/api/services", safeHomeRoutes);

// ===========================================================================
// AUTH
// ===========================================================================

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const { email, password, role } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const [[user]] = await pool.query(
      `SELECT u.*, uni.name AS university_name
         FROM users u
         LEFT JOIN universities uni ON uni.id = u.university_id
        WHERE u.email = ?
        LIMIT 1`,
      [email],
    );
    if (!user || user.is_banned)
      return res.status(401).json({ message: "Invalid credentials" });

    const valid = user.password_hash?.startsWith("$2")
      ? await bcrypt.compare(password, user.password_hash)
      : user.password_hash === password;
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const expectedRole = normalizeRole(role);
    if (role && user.role !== expectedRole)
      return res
        .status(403)
        .json({ message: "Account role does not match selected role" });

    if (!user.password_hash.startsWith("$2"))
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
        await bcrypt.hash(password, 12),
        user.id,
      ]);

    const token = crypto.randomUUID();
    sessions.set(token, user.id);
    res.json({ message: "Login successful", token, user: userPayload(user) });
  }),
);

app.post(
  "/api/auth/register",
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    const fullName = body.full_name || body.fullName;
    const email = body.email;
    const password = body.password || body.password_hash;
    const role = normalizeRole(body.role);

    if (!fullName || !email || !password)
      return res
        .status(400)
        .json({ error: "fullName, email and password are required" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    if (!["student", "service_provider", "admin", "res_manager"].includes(role))
      return res.status(400).json({ error: "Invalid role" });

    const hash = await bcrypt.hash(password, 12);
    const universityName = body.university || null;
    let universityId = null;
    if (universityName) {
      const [[uni]] = await pool.query(
        "SELECT id FROM universities WHERE name = ? LIMIT 1",
        [universityName],
      );
      universityId = uni?.id || null;
    }

    try {
      const [result] = await pool.query(
        `INSERT INTO users
           (full_name, email, password_hash, role, student_number, university_id, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
        [
          fullName,
          email,
          hash,
          role,
          body.studentNumber || body.student_number || null,
          universityId,
        ],
      );

      if (role === "service_provider") {
        const rawService = (body.service_type || body.serviceType || "").trim();
        const canonical = rawService
          ? rawService.charAt(0).toUpperCase() +
            rawService.slice(1).toLowerCase()
          : "Handyman";

        await pool.query(
          `INSERT INTO service_provider_profiles
             (user_id, business_name, service_type, bio, location, verification_status, accepts_emergency)
           VALUES (?, ?, ?, ?, ?, 'pending', FALSE)`,
          [
            result.insertId,
            body.business_name || fullName,
            canonical,
            body.bio || "New service provider on CampusSwap.",
            body.service_area || "Cape Town",
          ],
        );
      }

      res.status(201).json({
        message: "User registered successfully",
        userId: result.insertId,
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY")
        return res.status(409).json({ error: "Email is already registered" });
      throw error;
    }
  }),
);

app.post(
  "/api/auth/change-password",
  asyncRoute(async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body || {};
    if (!userId || !currentPassword || !newPassword)
      return res.status(400).json({ error: "All fields are required" });

    const [[user]] = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = ?",
      [userId],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = user.password_hash.startsWith("$2")
      ? await bcrypt.compare(currentPassword, user.password_hash)
      : user.password_hash === currentPassword;
    if (!valid) return res.status(401).json({ error: "Incorrect credentials" });

    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      await bcrypt.hash(newPassword, 12),
      userId,
    ]);
    res.json({ message: "Password updated successfully" });
  }),
);

// ===========================================================================
// CATALOG
// ===========================================================================

app.get(
  "/api/universities",
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id, name, province FROM universities ORDER BY name",
    );
    res.json(rows);
  }),
);

app.get(
  "/api/home",
  asyncRoute(async (req, res) => {
    const [[products], [categories], [universities]] = await Promise.all([
      pool.query(
        `SELECT p.*, c.name AS category_name, u.name AS university_name,
                seller.full_name AS seller_name, seller.rating AS seller_rating
           FROM products p
           JOIN users seller ON seller.id = p.seller_id
           LEFT JOIN categories c ON c.id = p.category_id
           LEFT JOIN universities u ON u.id = p.university_id
          WHERE p.status = 'active'
          ORDER BY p.created_at DESC
          LIMIT 8`,
      ),
      pool.query("SELECT id, name, description FROM categories ORDER BY name"),
      pool.query("SELECT id, name FROM universities ORDER BY name"),
    ]);
    res.json({ featuredProducts: products, categories, universities });
  }),
);

app.get(
  "/api/products",
  asyncRoute(async (req, res) => {
    const {
      search = "",
      university = "",
      condition = "",
      maxPrice = "",
    } = req.query;
    const filters = ["p.status = 'active'"];
    const params = [];

    if (search) {
      filters.push("(p.name LIKE ? OR p.description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (university) {
      filters.push("u.name = ?");
      params.push(university);
    }
    if (condition) {
      filters.push("p.condition_status = ?");
      params.push(condition);
    }
    if (maxPrice !== "") {
      filters.push("p.price <= ?");
      params.push(Number(maxPrice));
    }

    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category_name, u.name AS university_name,
              seller.full_name AS seller_name, seller.rating AS seller_rating
         FROM products p
         JOIN users seller ON seller.id = p.seller_id
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN universities u ON u.id = p.university_id
        WHERE ${filters.join(" AND ")}
        ORDER BY p.created_at DESC`,
      params,
    );
    res.json(rows);
  }),
);

// ===========================================================================
// SAFEHOME — service types + providers
// ===========================================================================

app.get(
  "/api/service-types",
  asyncRoute(async (req, res) => {
    const [data] = await pool.query(
      "SELECT id, name, description FROM service_types WHERE is_active = TRUE ORDER BY name",
    );
    res.json({ success: true, count: data.length, data });
  }),
);

app.get(
  "/api/providers",
  asyncRoute(async (req, res) => {
    const { service = "", emergency = "" } = req.query;
    const params = [];
    const filters = ["u.role = 'service_provider'", "u.is_banned = FALSE"];
    if (service) {
      filters.push("p.service_type LIKE ?");
      params.push(`%${service}%`);
    }
    if (emergency === "true") filters.push("p.accepts_emergency = TRUE");

    const [data] = await pool.query(
      `SELECT u.id, u.full_name, u.email, p.bio,
              p.location AS service_area, p.rating,
              p.total_reviews AS rating_count,
              p.accepts_emergency AS emergency_ready,
              (p.verification_status = 'verified') AS is_verified,
              p.service_type AS services
         FROM users u
         JOIN service_provider_profiles p ON p.user_id = u.id
        WHERE ${filters.join(" AND ")}
        ORDER BY p.rating DESC`,
      params,
    );
    res.json({ success: true, count: data.length, data });
  }),
);

// ===========================================================================
// SAFEHOME — requests
// ===========================================================================

const serviceQuery = `
  SELECT
    s.*,
    st.name AS service_type,
    student.full_name AS student_name,
    provider.full_name AS provider_name
  FROM services s
  JOIN service_types st ON st.id = s.service_type_id
  JOIN users student ON student.id = s.student_id
  LEFT JOIN users provider ON provider.id = s.service_provider_id
`;

app.get(
  "/api/services/open",
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT s.id, s.title, s.description, s.residence_name, s.room_number,
             s.priority, s.status, s.created_at,
             st.id AS service_type_id, st.name AS service_type,
             student.full_name AS student_name
        FROM services s
        JOIN service_types st ON st.id = s.service_type_id
        JOIN users student ON student.id = s.student_id
       WHERE s.status = 'pending' AND s.service_provider_id IS NULL
       ORDER BY (s.priority = 'emergency') DESC, s.created_at DESC
    `);
    res.json({ success: true, count: rows.length, data: rows });
  }),
);

app.patch(
  "/api/services/:id/quote",
  asyncRoute(async (req, res) => {
    const { provider_id, estimated_cost } = req.body || {};
    if (!provider_id || !estimated_cost) {
      return res.status(400).json({
        success: false,
        message: "provider_id and estimated_cost are required",
      });
    }
    const cost = Number(estimated_cost);
    if (isNaN(cost) || cost <= 0) {
      return res.status(400).json({
        success: false,
        message: "estimated_cost must be a positive number",
      });
    }
    const [result] = await pool.query(
      `UPDATE services
          SET service_provider_id = ?, estimated_cost = ?, status = 'quoted'
        WHERE id = ? AND status = 'pending' AND service_provider_id IS NULL`,
      [provider_id, cost, req.params.id],
    );
    if (!result.affectedRows) {
      return res.status(409).json({
        success: false,
        message: "This request is no longer available.",
      });
    }
    const [[updated]] = await pool.query(`${serviceQuery} WHERE s.id = ?`, [
      req.params.id,
    ]);

    // Notify the student that a provider has quoted their request.
    createNotification({
      userId: updated?.student_id,
      type: "service",
      title: "Quote received",
      message: `A provider has quoted R${cost.toFixed(2)} for "${updated?.title}". Awaiting manager approval.`,
      actionUrl: "/safehome",
      metadata: { serviceId: updated?.id, cost },
    }).catch((err) => console.warn("[notify] quote failed:", err.message));

    res.json({ success: true, message: "Quote submitted", data: updated });
  }),
);

app.patch(
  "/api/services/:id/approve",
  asyncRoute(async (req, res) => {
    const [result] = await pool.query(
      `UPDATE services SET status = 'approved'
        WHERE id = ? AND status = 'quoted'`,
      [req.params.id],
    );
    if (!result.affectedRows) {
      return res.status(409).json({
        success: false,
        message: "This request is not awaiting approval.",
      });
    }
    const [[updated]] = await pool.query(`${serviceQuery} WHERE s.id = ?`, [
      req.params.id,
    ]);

    createNotification({
      userId: updated?.student_id,
      type: "service",
      title: "Repair approved",
      message: `Your request "${updated?.title}" has been approved at R${updated?.estimated_cost}. The provider will be in touch.`,
      actionUrl: "/safehome",
      metadata: { serviceId: updated?.id },
    }).catch((err) => console.warn("[notify] approve failed:", err.message));

    res.json({ success: true, message: "Request approved", data: updated });
  }),
);

app.patch(
  "/api/services/:id/decline",
  asyncRoute(async (req, res) => {
    const [result] = await pool.query(
      `UPDATE services SET status = 'declined'
        WHERE id = ? AND status = 'quoted'`,
      [req.params.id],
    );
    if (!result.affectedRows) {
      return res.status(409).json({
        success: false,
        message: "This request is not awaiting approval.",
      });
    }
    const [[updated]] = await pool.query(`${serviceQuery} WHERE s.id = ?`, [
      req.params.id,
    ]);

    createNotification({
      userId: updated?.student_id,
      type: "service",
      title: "Repair declined",
      message: `Your request "${updated?.title}" was not approved. Please try another provider.`,
      actionUrl: "/safehome",
      metadata: { serviceId: updated?.id },
    }).catch((err) => console.warn("[notify] decline failed:", err.message));

    res.json({ success: true, message: "Request declined", data: updated });
  }),
);

app.get(
  "/api/repairs",
  asyncRoute(async (req, res) => {
    const [data] = await pool.query(
      `${serviceQuery}
       WHERE s.status NOT IN ('completed', 'cancelled')
       ORDER BY s.created_at DESC`,
    );
    res.json(data);
  }),
);

// ===========================================================================
// ORDERS + PAYMENTS
// ===========================================================================

app.post(
  "/api/orders/checkout",
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    const buyer = b.buyerId || b.buyer_id;
    const items = b.items;

    if (!buyer || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "buyerId and items are required" });

    // Ensure every item has a sellerId. If the client didn't send one,
    // look it up from the product record so the order can be created.
    for (const item of items) {
      const existing = item.sellerId || item.seller_id;
      if (existing) {
        item.sellerId = existing;
        continue;
      }
      const productId = item.productId || item.product_id || item.id;
      if (!productId) continue;
      const [[product]] = await pool.query(
        "SELECT seller_id FROM products WHERE id = ? LIMIT 1",
        [productId],
      );
      if (product?.seller_id) item.sellerId = product.seller_id;
    }

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

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const total = items.reduce(
        (sum, item) =>
          sum +
          Number(item.unitPrice ?? item.price ?? 0) *
            Number(item.quantity ?? 1),
        0,
      );
      const reference = `CS-${Date.now()}`;
      const [order] = await connection.query(
        "INSERT INTO orders (order_reference, buyer_id, seller_id, total_amount) VALUES (?, ?, ?, ?)",
        [reference, buyer, headlineSeller, total],
      );
      for (const item of items)
        await connection.query(
          "INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
          [
            order.insertId,
            item.productId || item.product_id || item.id,
            item.sellerId,
            item.quantity || 1,
            item.unitPrice ?? item.price ?? 0,
          ],
        );
      await connection.query(
        "INSERT INTO payments (order_id, amount) VALUES (?, ?)",
        [order.insertId, total],
      );
      await connection.commit();

      // Notify the seller that a new order came in. Fire-and-forget — a failed
      // notification must not fail the order.
      createNotification({
        userId: headlineSeller,
        type: "order",
        title: "New order received",
        message: `You have a new order for R${total.toFixed(2)}. Reference: ${reference}.`,
        actionUrl: "/checkout",
        metadata: { orderId: order.insertId, reference, total },
      }).catch((err) =>
        console.warn("[notify] seller order failed:", err.message),
      );

      res.status(201).json({
        id: order.insertId,
        order_reference: reference,
        total_amount: total,
        status: "pending_payment",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

app.get(
  "/api/orders",
  asyncRoute(async (req, res) => {
    const { buyer_id, buyerId, seller_id, sellerId } = req.query;
    const buyer = buyer_id || buyerId;
    const seller = seller_id || sellerId;

    const filters = ["1=1"];
    const params = [];
    if (buyer) {
      filters.push("o.buyer_id = ?");
      params.push(buyer);
    }
    if (seller) {
      filters.push("o.seller_id = ?");
      params.push(seller);
    }
    if (!buyer && !seller) {
      return res
        .status(400)
        .json({ error: "buyer_id or seller_id is required" });
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
    res.json(rows);
  }),
);

app.get(
  "/api/orders/:id",
  asyncRoute(async (req, res) => {
    const [[order]] = await pool.query("SELECT * FROM orders WHERE id = ?", [
      req.params.id,
    ]);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const [items] = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [req.params.id],
    );
    res.json({ ...order, items });
  }),
);

app.post(
  "/api/payments/webhook",
  asyncRoute(async (req, res) => {
    const id = req.body.m_payment_id;
    if (!id) return res.status(400).send("Missing order id");
    await pool.query(
      "UPDATE payments SET status = 'complete', paid_at = CURRENT_TIMESTAMP WHERE order_id = ?",
      [id],
    );
    await pool.query(
      "UPDATE orders SET status = 'paid', payment_status = 'complete' WHERE id = ?",
      [id],
    );

    // Notify the seller that the buyer's payment cleared escrow.
    const [[order]] = await pool.query(
      "SELECT seller_id, total_amount FROM orders WHERE id = ?",
      [id],
    );
    if (order?.seller_id) {
      createNotification({
        userId: order.seller_id,
        type: "payment",
        title: "Payment confirmed",
        message: `Order #${id} is paid — R${Number(order.total_amount).toFixed(2)} held in escrow.`,
        actionUrl: "/checkout",
        metadata: { orderId: id, amount: order.total_amount },
      }).catch((err) =>
        console.warn("[notify] payment webhook failed:", err.message),
      );
    }

    res.send("OK");
  }),
);

app.post(
  "/api/orders/:id/release",
  asyncRoute(async (req, res) => {
    await pool.query(
      "UPDATE payments SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE order_id = ?",
      [req.params.id],
    );
    await pool.query("UPDATE orders SET status = 'completed' WHERE id = ?", [
      req.params.id,
    ]);

    // Notify both sides. Fire-and-forget.
    const [[order]] = await pool.query(
      "SELECT id, buyer_id, seller_id, total_amount FROM orders WHERE id = ?",
      [req.params.id],
    );
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
  }),
);

// ===========================================================================
// DASHBOARDS
// ===========================================================================

app.get(
  "/api/dashboards/student/:id",
  asyncRoute(async (req, res) => {
    const [[user]] = await pool.query(
      `SELECT u.*, uni.name AS university_name
         FROM users u
         LEFT JOIN universities uni ON uni.id = u.university_id
        WHERE u.id = ?`,
      [req.params.id],
    );
    const [mylistings] = await pool.query(
      "SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC",
      [req.params.id],
    );
    const [myOrders] = await pool.query(
      "SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC",
      [req.params.id],
    );
    res.json({ user: userPayload(user), mylistings, myOrders });
  }),
);

// ===========================================================================
// ADMIN — verification queue
// ===========================================================================

app.get(
  "/api/admin/pending-users",
  asyncRoute(async (req, res) => {
    const [users] = await pool.query(`
      SELECT u.id, u.email, u.full_name, u.role, u.student_number,
             u.phone, u.university_id, uni.name AS university_name,
             u.is_verified, u.created_at
        FROM users u
        LEFT JOIN universities uni ON uni.id = u.university_id
       WHERE u.is_verified = FALSE AND u.is_banned = FALSE
       ORDER BY u.created_at DESC
    `);
    res.json({ success: true, count: users.length, data: users });
  }),
);

app.patch(
  "/api/admin/users/:id/verify",
  asyncRoute(async (req, res) => {
    const [result] = await pool.query(
      "UPDATE users SET is_verified = TRUE WHERE id = ?",
      [req.params.id],
    );
    if (!result.affectedRows) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const [[user]] = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_verified
         FROM users u
        WHERE u.id = ?`,
      [req.params.id],
    );

    // Let the user know their account is verified.
    createNotification({
      userId: user.id,
      type: "general",
      title: "Account verified",
      message:
        "Your account has been verified. You can now trade on CampusSwap with full access.",
      actionUrl: "/student-dashboard",
    }).catch((err) => console.warn("[notify] verify failed:", err.message));

    res.json({ success: true, message: "User verified", data: user });
  }),
);

app.get(
  "/api/admin/users",
  asyncRoute(async (req, res) => {
    const [data] = await pool.query(`
      SELECT u.id, u.email, u.full_name AS name, u.role,
             u.is_verified, u.is_premium AS isPremium, u.online, u.is_banned,
             uni.name AS university
        FROM users u
        LEFT JOIN universities uni ON uni.id = u.university_id
       ORDER BY u.created_at DESC
       LIMIT 100
    `);
    res.json({ success: true, count: data.length, data });
  }),
);

app.get(
  "/api/admin/stats",
  asyncRoute(async (req, res) => {
    const [[users]] = await pool.query("SELECT COUNT(*) AS count FROM users");
    const [[premium]] = await pool.query(
      "SELECT COUNT(*) AS count FROM users WHERE is_premium = TRUE",
    );
    const [[listings]] = await pool.query(
      "SELECT COUNT(*) AS count FROM products WHERE status = 'active'",
    );
    const [[reports]] = await pool.query(
      "SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'",
    );
    res.json({
      success: true,
      data: {
        users: users.count,
        premiumUsers: premium.count,
        listings: listings.count,
        pendingReports: reports.count,
      },
    });
  }),
);

app.get(
  "/api/dashboards/admin",
  asyncRoute(async (req, res) => {
    const [[users]] = await pool.query("SELECT COUNT(*) AS count FROM users");
    const [[listings]] = await pool.query(
      "SELECT COUNT(*) AS count FROM products WHERE status = 'active'",
    );
    res.json({ users: users.count, listings: listings.count });
  }),
);

app.get(
  "/api/dashboards/provider/:id",
  asyncRoute(async (req, res) => {
    const [jobs] = await pool.query(
      `${serviceQuery}
        WHERE s.service_provider_id = ?
        ORDER BY s.created_at DESC`,
      [req.params.id],
    );
    res.json({ jobs });
  }),
);

app.get(
  "/api/dashboards/res-manager",
  asyncRoute(async (req, res) => {
    const [maintenanceRequests] = await pool.query(
      `${serviceQuery}
        WHERE s.status NOT IN ('completed', 'cancelled')
        ORDER BY s.created_at DESC`,
    );
    res.json({ maintenanceRequests });
  }),
);

// ===========================================================================
// RESIDENCES — student housing + manager workflows
// ===========================================================================

// List active residences.
app.get(
  "/api/residences",
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT r.*, u.full_name AS manager_name
        FROM residences r
        LEFT JOIN users u ON u.id = r.manager_id
       WHERE r.status = 'active'
       ORDER BY r.name
    `);
    res.json({ success: true, count: rows.length, data: rows });
  }),
);

// List residence requests — filter by student OR by manager.
app.get(
  "/api/residence-requests",
  asyncRoute(async (req, res) => {
    const { student_id, studentId, manager_id, managerId } = req.query;
    const student = student_id || studentId;
    const manager = manager_id || managerId;

    const filters = ["1=1"];
    const params = [];
    if (student) {
      filters.push("rr.student_id = ?");
      params.push(student);
    }
    if (manager) {
      filters.push("r.manager_id = ?");
      params.push(manager);
    }

    const [rows] = await pool.query(
      `SELECT rr.*,
              r.name AS residence_name,
              r.location AS residence_location,
              r.monthly_price,
              u.full_name AS student_name,
              u.email AS student_email
         FROM residence_requests rr
         JOIN residences r ON r.id = rr.residence_id
         JOIN users u ON u.id = rr.student_id
        WHERE ${filters.join(" AND ")}
        ORDER BY rr.requested_at DESC`,
      params,
    );
    res.json({ success: true, count: rows.length, data: rows });
  }),
);

// Create a residence request (student action).
app.post(
  "/api/residence-requests",
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    const residenceId = b.residence_id || b.residenceId;
    const studentId = b.student_id || b.studentId;
    const notes = b.notes || null;

    if (!residenceId || !studentId) {
      return res
        .status(400)
        .json({ error: "residence_id and student_id are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO residence_requests (residence_id, student_id, notes)
       VALUES (?, ?, ?)`,
      [residenceId, studentId, notes],
    );

    const [[request]] = await pool.query(
      `SELECT rr.*, r.name AS residence_name, r.location AS residence_location
         FROM residence_requests rr
         JOIN residences r ON r.id = rr.residence_id
        WHERE rr.id = ?`,
      [result.insertId],
    );

    // Notify the manager who owns this residence.
    const [[residence]] = await pool.query(
      "SELECT manager_id, name FROM residences WHERE id = ?",
      [residenceId],
    );
    if (residence?.manager_id) {
      createNotification({
        userId: residence.manager_id,
        type: "residence_request",
        title: "New residence request",
        message: `A new request was submitted for ${residence.name}.`,
        actionUrl: "/resmanager-dashboard",
      }).catch((err) =>
        console.warn("[notify] residence request failed:", err.message),
      );
    }

    res.status(201).json({ success: true, data: request });
  }),
);

// Approve / decline / cancel a residence request (manager or student).
app.patch(
  "/api/residence-requests/:id",
  asyncRoute(async (req, res) => {
    const { status } = req.body || {};
    const allowed = ["approved", "declined", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [result] = await pool.query(
      "UPDATE residence_requests SET status = ? WHERE id = ?",
      [status, req.params.id],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Notify the student that the manager acted on their request.
    const [[request]] = await pool.query(
      `SELECT rr.student_id, r.name AS residence_name
         FROM residence_requests rr
         JOIN residences r ON r.id = rr.residence_id
        WHERE rr.id = ?`,
      [req.params.id],
    );
    if (request?.student_id) {
      createNotification({
        userId: request.student_id,
        type: "residence_request",
        title:
          status === "approved"
            ? "Residence request approved"
            : status === "declined"
              ? "Residence request declined"
              : "Residence request cancelled",
        message: `Your request for ${request.residence_name} has been ${status}.`,
        actionUrl: "/student-residence",
      }).catch((err) =>
        console.warn("[notify] residence request update failed:", err.message),
      );
    }

    res.json({ success: true });
  }),
);

// List residence payments — filter by student OR by manager.
app.get(
  "/api/residence-payments",
  asyncRoute(async (req, res) => {
    const { student_id, studentId, manager_id, managerId } = req.query;
    const student = student_id || studentId;
    const manager = manager_id || managerId;

    const filters = ["1=1"];
    const params = [];
    if (student) {
      filters.push("rp.student_id = ?");
      params.push(student);
    }
    if (manager) {
      filters.push("r.manager_id = ?");
      params.push(manager);
    }

    const [rows] = await pool.query(
      `SELECT rp.*,
              r.name AS residence_name,
              u.full_name AS student_name
         FROM residence_payments rp
         JOIN residences r ON r.id = rp.residence_id
         JOIN users u ON u.id = rp.student_id
        WHERE ${filters.join(" AND ")}
        ORDER BY rp.due_date DESC`,
      params,
    );
    res.json({ success: true, count: rows.length, data: rows });
  }),
);

// Mark a payment as paid (student self-service).
app.patch(
  "/api/residence-payments/:id/pay",
  asyncRoute(async (req, res) => {
    const [result] = await pool.query(
      `UPDATE residence_payments
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [req.params.id],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json({ success: true });
  }),
);

// Manager changes a payment status (late, extended, etc.).
app.patch(
  "/api/residence-payments/:id/status",
  asyncRoute(async (req, res) => {
    const { status } = req.body || {};
    const allowed = ["upcoming", "pending", "paid", "late", "extended"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    await pool.query("UPDATE residence_payments SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ success: true });
  }),
);

// ===========================================================================
// SERVICE REVIEWS — students rate completed SafeHome jobs
// ===========================================================================

// Create a review. Only the student who owns the request can review it,
// and only after the job is done.
app.post(
  "/api/services/:id/review",
  asyncRoute(async (req, res) => {
    const { student_id, rating, comment } = req.body || {};
    if (!student_id || !rating) {
      return res
        .status(400)
        .json({ error: "student_id and rating are required" });
    }
    const r = Number(rating);
    if (isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: "rating must be 1–5" });
    }

    // Load the service.
    const [[service]] = await pool.query(
      `SELECT id, student_id, service_provider_id, status, title
         FROM services WHERE id = ?`,
      [req.params.id],
    );
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (service.student_id !== Number(student_id)) {
      return res.status(403).json({ error: "You did not create this request" });
    }
    if (!["completed", "cancelled"].includes(service.status)) {
      return res
        .status(409)
        .json({ error: "You can only review a completed job" });
    }
    if (!service.service_provider_id) {
      return res.status(409).json({ error: "No provider was assigned" });
    }

    // One review per service.
    const [[existing]] = await pool.query(
      "SELECT id FROM service_reviews WHERE service_id = ?",
      [req.params.id],
    );
    if (existing) {
      return res.status(409).json({ error: "This job has already been reviewed" });
    }

    const [result] = await pool.query(
      `INSERT INTO service_reviews (service_id, student_id, provider_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.params.id,
        student_id,
        service.service_provider_id,
        r,
        comment || null,
      ],
    );

    // Notify the provider.
    createNotification({
      userId: service.service_provider_id,
      type: "service",
      title: "New review received",
      message: `A student left you a ${r}-star review for "${service.title}".`,
      actionUrl: "/provider-dashboard",
    }).catch((err) => console.warn("[notify] review failed:", err.message));

    res.status(201).json({ success: true, id: result.insertId });
  }),
);

// Provider fetches all their reviews.
app.get(
  "/api/services/reviews",
  asyncRoute(async (req, res) => {
    const providerId = req.query.provider_id || req.query.providerId;
    if (!providerId) {
      return res.status(400).json({ error: "provider_id is required" });
    }
    const [rows] = await pool.query(
      `SELECT sr.id, sr.service_id, sr.rating, sr.comment, sr.created_at,
              sr.student_id,
              student.full_name AS student_name,
              s.title AS service_title,
              st.name AS service_type
         FROM service_reviews sr
         JOIN users student ON student.id = sr.student_id
         JOIN services s ON s.id = sr.service_id
         JOIN service_types st ON st.id = s.service_type_id
        WHERE sr.provider_id = ?
        ORDER BY sr.created_at DESC`,
      [providerId],
    );
    const [[summary]] = await pool.query(
      `SELECT
         COUNT(*) AS count,
         ROUND(AVG(rating), 2) AS average
       FROM service_reviews WHERE provider_id = ?`,
      [providerId],
    );
    res.json({
      success: true,
      count: rows.length,
      average: summary.average || 0,
      data: rows,
    });
  }),
);

// Check if a single service has been reviewed (so the UI can hide the button).
app.get(
  "/api/services/:id/review",
  asyncRoute(async (req, res) => {
    const [[review]] = await pool.query(
      "SELECT id, rating, comment, created_at FROM service_reviews WHERE service_id = ?",
      [req.params.id],
    );
    res.json({ success: true, reviewed: Boolean(review), data: review || null });
  }),
);


// ===========================================================================
// NOTIFICATIONS — read endpoints
// ===========================================================================

app.get(
  "/api/notifications",
  asyncRoute(async (req, res) => {
    const { user_id, userId, limit = 50 } = req.query;
    const uid = user_id || userId;
    if (!uid) return res.status(400).json({ error: "user_id is required" });

    const [rows] = await pool.query(
      `SELECT id, user_id, type, title, message, action_url, metadata, is_read, created_at
         FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [uid, Number(limit)],
    );
    const [[{ unread }]] = await pool.query(
      "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [uid],
    );
    res.json({ success: true, unread, count: rows.length, data: rows });
  }),
);

app.patch(
  "/api/notifications/:id/read",
  asyncRoute(async (req, res) => {
    const [result] = await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = ?",
      [req.params.id],
    );
    if (!result.affectedRows) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, message: "Marked as read" });
  }),
);

app.patch(
  "/api/notifications/read-all",
  asyncRoute(async (req, res) => {
    const uid = req.query.user_id || req.query.userId;
    if (!uid) return res.status(400).json({ error: "user_id is required" });
    const [result] = await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
      [uid],
    );
    res.json({ success: true, updated: result.affectedRows });
  }),
);

app.post(
  "/api/notifications",
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    const uid = b.userId || b.user_id;
    if (!uid || !b.type || !b.title || !b.message) {
      return res
        .status(400)
        .json({ error: "user_id, type, title and message are required" });
    }
    const id = await createNotification({
      userId: uid,
      type: b.type,
      title: b.title,
      message: b.message,
      actionUrl: b.actionUrl || b.action_url || null,
      metadata: b.metadata || null,
    });
    res.status(201).json({ success: true, id });
  }),
);

// ===========================================================================
// FALLBACKS
// ===========================================================================

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
