import pool from "../config/db.js";

/**
 * List all active books, optionally filtered by format.
 * Returns rows with the seller's name and university.
 */
export async function getBooks({ format } = {}) {
  const filters = ["b.is_active = 1"];
  const params = [];

  if (format && ["ebook", "audiobook", "guide"].includes(format)) {
    filters.push("b.format = ?");
    params.push(format);
  }

  const [rows] = await pool.query(
    `SELECT b.*,
            u.full_name AS seller_name,
            u.university_id,
            uni.name AS university_name
       FROM books b
       LEFT JOIN users u ON u.id = b.seller_id
       LEFT JOIN universities uni ON uni.id = u.university_id
      WHERE ${filters.join(" AND ")}
      ORDER BY b.created_at DESC`,
    params,
  );
  return rows;
}