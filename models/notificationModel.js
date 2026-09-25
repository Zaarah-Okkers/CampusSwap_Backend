import pool from "../config/db.js";

export async function listNotifications({ userId, limit = 50 }) {
  const [rows] = await pool.query(
    `SELECT id, user_id, type, title, message, action_url, metadata, is_read, created_at
       FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
    [userId, Number(limit)],
  );
  return rows;
}

export async function countUnread(userId) {
  const [[{ unread }]] = await pool.query(
    "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE",
    [userId],
  );
  return unread;
}

export async function markNotificationRead(id) {
  const [result] = await pool.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
}

export async function markAllRead(userId) {
  const [result] = await pool.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
    [userId],
  );
  return result.affectedRows;
}
