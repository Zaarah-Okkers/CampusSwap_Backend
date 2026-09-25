import pool from "../config/db.js";
import { serviceQuery } from "./serviceModel.js";

export async function getStudentDashboard(userId) {
  const [[user]] = await pool.query(
    `SELECT u.*, uni.name AS university_name
       FROM users u
       LEFT JOIN universities uni ON uni.id = u.university_id
      WHERE u.id = ?`,
    [userId],
  );

  const [mylistings] = await pool.query(
    "SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC",
    [userId],
  );

  const [myOrders] = await pool.query(
    "SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC",
    [userId],
  );

  return { user, mylistings, myOrders };
}

export async function getProviderDashboard(providerId) {
  const [jobs] = await pool.query(
    `${serviceQuery}
      WHERE s.service_provider_id = ?
      ORDER BY s.created_at DESC`,
    [providerId],
  );
  return { jobs };
}

export async function getResManagerDashboard() {
  const [maintenanceRequests] = await pool.query(
    `${serviceQuery}
      WHERE s.status NOT IN ('completed', 'cancelled')
      ORDER BY s.created_at DESC`,
  );
  return { maintenanceRequests };
}