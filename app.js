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

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", service: "campusswap-api" }),
);
app.get("/", (req, res) => res.json({ message: "CampusSwap API is running" }));

// Mounted route module for clients that use the SafeHome namespace.
app.use("/api/services", safeHomeRoutes);

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const { email, password, role } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    const [[user]] = await pool.query(
      `SELECT u.*, uni.name AS university_name FROM users u LEFT JOIN universities uni ON uni.id = u.university_id WHERE u.email = ? LIMIT 1`,
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
        "INSERT INTO users (full_name,email,password_hash,role,student_number,university_id,is_verified) VALUES (?,?,?,?,?,?,FALSE)",
        [
          fullName,
          email,
          hash,
          role,
          body.studentNumber || body.student_number || null,
          universityId,
        ],
      );

      res
        .status(201)
        .json({
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
      "SELECT id,password_hash FROM users WHERE id = ?",
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

app.get(
  "/api/universities",
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id,name FROM universities ORDER BY name",
    );
    res.json(rows);
  }),
);

app.get(
  "/api/home",
  asyncRoute(async (req, res) => {
    const [[products], [categories], [universities]] = await Promise.all([
      pool.query(
        `SELECT p.*, c.name AS category_name, u.name AS university_name, seller.full_name AS seller_name, seller.rating AS seller_rating FROM products p JOIN users seller ON seller.id=p.seller_id LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN universities u ON u.id=p.university_id WHERE p.status='active' ORDER BY p.created_at DESC LIMIT 8`,
      ),
      pool.query("SELECT id,name,description FROM categories ORDER BY name"),
      pool.query("SELECT id,name FROM universities ORDER BY name"),
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
    const filters = ["p.status='active'"];
    const params = [];

    if (search) {
      filters.push("(p.name LIKE ? OR p.description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (university) {
      filters.push("u.name=?");
      params.push(university);
    }

    if (condition) {
      filters.push("p.condition_status=?");
      params.push(condition);
    }

    if (maxPrice !== "") {
      filters.push("p.price<=?");
      params.push(Number(maxPrice));
    }

    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category_name, u.name AS university_name, seller.full_name AS seller_name, seller.rating AS seller_rating FROM products p JOIN users seller ON seller.id=p.seller_id LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN universities u ON u.id=p.university_id WHERE ${filters.join(" AND ")} ORDER BY p.created_at DESC`,
      params,
    );
    res.json(rows);
  }),
);

app.get(
  "/api/service-types",
  asyncRoute(async (req, res) => {
    const [data] = await pool.query(
      "SELECT id,name,description FROM service_types WHERE is_active=TRUE ORDER BY name",
    );
    res.json({ success: true, count: data.length, data });
  }),
);

app.get(
  "/api/providers",
  asyncRoute(async (req, res) => {
    const { service = "", emergency = "" } = req.query;
    const params = [];
    const filters = ["u.role='service_provider'", "u.is_banned=FALSE"];
    if (service) {
      filters.push("p.service_type LIKE ?");
      params.push(`%${service}%`);
    }
    if (emergency === "true") filters.push("p.accepts_emergency=TRUE");
    const [data] = await pool.query(
      `SELECT u.id,u.full_name,u.email,p.bio,p.location AS service_area,p.rating,p.total_reviews AS rating_count,p.accepts_emergency AS emergency_ready,(p.verification_status='verified') AS is_verified,p.service_type AS services FROM users u JOIN service_provider_profiles p ON p.user_id=u.id WHERE ${filters.join(" AND ")} ORDER BY p.rating DESC`,
      params,
    );
    res.json({ success: true, count: data.length, data });
  }),
);

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
  "/api/repairs",
  asyncRoute(async (req, res) => {
    const [data] = await pool.query(
      `${serviceQuery} WHERE s.status NOT IN ('completed','cancelled') ORDER BY s.created_at DESC`,
    );
    res.json(data);
  }),
);

app.post(
  "/api/orders/checkout",
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    const buyer = b.buyerId || b.buyer_id;
    const items = b.items;
    if (!buyer || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "buyerId and items are required" });
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
        "INSERT INTO orders (order_reference,buyer_id,seller_id,total_amount) VALUES (?,?,?,?)",
        [reference, buyer, b.sellerId || b.seller_id || null, total],
      );
      for (const item of items)
        await connection.query(
          "INSERT INTO order_items (order_id,product_id,seller_id,quantity,unit_price) VALUES (?,?,?,?,?)",
          [
            order.insertId,
            item.productId || item.product_id || item.id,
            item.sellerId || item.seller_id || b.sellerId || b.seller_id,
            item.quantity || 1,
            item.unitPrice ?? item.price ?? 0,
          ],
        );
      await connection.query(
        "INSERT INTO payments (order_id,amount) VALUES (?,?)",
        [order.insertId, total],
      );
      await connection.commit();
      res
        .status(201)
        .json({
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
  "/api/orders/:id",
  asyncRoute(async (req, res) => {
    const [[order]] = await pool.query("SELECT * FROM orders WHERE id=?", [
      req.params.id,
    ]);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const [items] = await pool.query(
      "SELECT * FROM order_items WHERE order_id=?",
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
      "UPDATE payments SET status='complete',paid_at=CURRENT_TIMESTAMP WHERE order_id=?",
      [id],
    );
    await pool.query(
      "UPDATE orders SET status='paid',payment_status='complete' WHERE id=?",
      [id],
    );
    res.send("OK");
  }),
);
app.post(
  "/api/orders/:id/release",
  asyncRoute(async (req, res) => {
    await pool.query(
      "UPDATE payments SET status='released',released_at=CURRENT_TIMESTAMP WHERE order_id=?",
      [req.params.id],
    );
    await pool.query("UPDATE orders SET status='completed' WHERE id=?", [
      req.params.id,
    ]);
    res.json({ id: Number(req.params.id), status: "completed" });
  }),
);

app.get(
  "/api/dashboards/student/:id",
  asyncRoute(async (req, res) => {
    const [[user]] = await pool.query(
      "SELECT u.*,uni.name AS university_name FROM users u LEFT JOIN universities uni ON uni.id=u.university_id WHERE u.id=?",
      [req.params.id],
    );
    const [mylistings] = await pool.query(
      "SELECT * FROM products WHERE seller_id=? ORDER BY created_at DESC",
      [req.params.id],
    );
    const [myOrders] = await pool.query(
      "SELECT * FROM orders WHERE buyer_id=? ORDER BY created_at DESC",
      [req.params.id],
    );
    res.json({ user: userPayload(user), mylistings, myOrders });
  }),
);
app.get(
  "/api/dashboards/admin",
  asyncRoute(async (req, res) => {
    const [[users]] = await pool.query("SELECT COUNT(*) AS count FROM users");
    const [[listings]] = await pool.query(
      "SELECT COUNT(*) AS count FROM products WHERE status='active'",
    );
    res.json({ users: users.count, listings: listings.count });
  }),
);
app.get(
  "/api/dashboards/provider/:id",
  asyncRoute(async (req, res) => {
    const [jobs] = await pool.query(
      `${serviceQuery} WHERE s.service_provider_id=? ORDER BY s.created_at DESC`,
      [req.params.id],
    );
    res.json({ jobs });
  }),
);
app.get(
  "/api/dashboards/res-manager",
  asyncRoute(async (req, res) => {
    const [maintenanceRequests] = await pool.query(
      `${serviceQuery} WHERE s.status NOT IN ('completed','cancelled') ORDER BY s.created_at DESC`,
    );
    res.json({ maintenanceRequests });
  }),
);

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
