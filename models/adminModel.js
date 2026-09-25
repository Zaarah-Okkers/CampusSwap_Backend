import pool from "../config/db.js";

export async function getPendingUsers() {
  const [rows] = await pool.query(`
    SELECT u.id, u.email, u.full_name, u.role, u.student_number,
           u.phone, u.university_id, uni.name AS university_name,
           u.is_verified, u.created_at
      FROM users u
      LEFT JOIN universities uni ON uni.id = u.university_id
     WHERE u.is_verified = FALSE AND u.is_banned = FALSE
     ORDER BY u.created_at DESC
  `);
  return rows;
}

export async function getAllUsers() {
  const [rows] = await pool.query(`
    SELECT u.id, u.email, u.full_name AS name, u.role,
           u.is_verified, u.is_premium AS isPremium, u.online, u.is_banned,
           uni.name AS university
      FROM users u
      LEFT JOIN universities uni ON uni.id = u.university_id
     ORDER BY u.created_at DESC
     LIMIT 100
  `);
  return rows;
}

export async function verifyUserById(id) {
  const [result] = await pool.query(
    "UPDATE users SET is_verified = TRUE WHERE id = ?",
    [id],
  );
  if (!result.affectedRows) return null;
  const [[user]] = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.is_verified
       FROM users u WHERE u.id = ?`,
    [id],
  );
  return user;
}

export async function getAdminStats() {
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
  return {
    users: users.count,
    premiumUsers: premium.count,
    listings: listings.count,
    pendingReports: reports.count,
  };
}

export async function getAdminDashboard() {
  const [[users]] = await pool.query("SELECT COUNT(*) AS count FROM users");
  const [[listings]] = await pool.query(
    "SELECT COUNT(*) AS count FROM products WHERE status = 'active'",
  );
  return { users: users.count, listings: listings.count };
}
