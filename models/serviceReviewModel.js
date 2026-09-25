import pool from "../config/db.js";

export async function findReviewByServiceId(serviceId) {
  const [[review]] = await pool.query(
    "SELECT id, rating, comment, created_at FROM service_reviews WHERE service_id = ?",
    [serviceId],
  );
  return review;
}

export async function insertServiceReview({
  serviceId,
  studentId,
  providerId,
  rating,
  comment,
}) {
  const [result] = await pool.query(
    `INSERT INTO service_reviews (service_id, student_id, provider_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [serviceId, studentId, providerId, rating, comment],
  );
  return result.insertId;
}

export async function getProviderReviews(providerId) {
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
  return rows;
}

export async function getProviderReviewSummary(providerId) {
  const [[summary]] = await pool.query(
    `SELECT COUNT(*) AS count, ROUND(AVG(rating), 2) AS average
       FROM service_reviews WHERE provider_id = ?`,
    [providerId],
  );
  return summary;
}