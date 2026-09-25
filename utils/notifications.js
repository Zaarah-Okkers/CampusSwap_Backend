// Shared notification writer. Every action-flow uses this single entry
// point so the table shape stays consistent across controllers.
import pool from "../config/db.js";

export async function createNotification({
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