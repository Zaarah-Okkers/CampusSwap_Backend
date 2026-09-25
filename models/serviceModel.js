import pool from "../config/db.js";

// Reusable SELECT that joins the services table with its type, student
// and provider names. Exported so Phase 9's dashboard controllers can
// reuse it once they move out of app.js.
export const serviceQuery = `
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

export async function getServiceTypes() {
  const [rows] = await pool.query(
    "SELECT id, name, description FROM service_types WHERE is_active = TRUE ORDER BY name",
  );
  return rows;
}

export async function getProviders({ service, emergency }) {
  const filters = ["u.role = 'service_provider'", "u.is_banned = FALSE"];
  const params = [];
  if (service) {
    filters.push("p.service_type LIKE ?");
    params.push(`%${service}%`);
  }
  if (emergency === "true") filters.push("p.accepts_emergency = TRUE");

  const [rows] = await pool.query(
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
  return rows;
}

export async function getOpenServices() {
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
  return rows;
}

export async function getAllServices({ student_id, provider_id, status } = {}) {
  const where = ["1=1"];
  const params = [];
  if (student_id) {
    where.push("s.student_id = ?");
    params.push(student_id);
  }
  if (provider_id) {
    where.push("s.service_provider_id = ?");
    params.push(provider_id);
  }
  if (status) {
    where.push("s.status = ?");
    params.push(status);
  }
  const [rows] = await pool.query(
    `${serviceQuery} WHERE ${where.join(" AND ")} ORDER BY s.created_at DESC`,
    params,
  );
  return rows;
}

export async function getActiveRepairs() {
  const [rows] = await pool.query(
    `${serviceQuery}
      WHERE s.status NOT IN ('completed', 'cancelled')
      ORDER BY s.created_at DESC`,
  );
  return rows;
}

export async function getServiceById(id) {
  const [[service]] = await pool.query(`${serviceQuery} WHERE s.id = ?`, [id]);
  return service;
}

export async function findServiceTypeById(id) {
  const [[row]] = await pool.query(
    "SELECT id, name FROM service_types WHERE id = ?",
    [id],
  );
  return row;
}

export async function findProviderById(id) {
  const [[row]] = await pool.query(
    "SELECT id, full_name FROM users WHERE id = ? AND role = 'service_provider' AND is_banned = FALSE",
    [id],
  );
  return row;
}

export async function insertServiceRequest({
  studentId,
  serviceTypeId,
  title,
  description,
  residenceName,
  roomNumber,
  photoUrl,
  priority,
}) {
  const [result] = await pool.query(
    `INSERT INTO services
       (student_id, service_type_id, title, description, residence_name, room_number, photo_url, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studentId,
      serviceTypeId,
      title,
      description,
      residenceName,
      roomNumber,
      photoUrl,
      priority,
    ],
  );
  return result.insertId;
}

export async function submitQuote({ id, providerId, cost }) {
  const [result] = await pool.query(
    `UPDATE services
        SET service_provider_id = ?, estimated_cost = ?, status = 'quoted'
      WHERE id = ? AND status = 'pending' AND service_provider_id IS NULL`,
    [providerId, cost, id],
  );
  return result.affectedRows > 0;
}

export async function approveService(id) {
  const [result] = await pool.query(
    `UPDATE services SET status = 'approved'
      WHERE id = ? AND status = 'quoted'`,
    [id],
  );
  return result.affectedRows > 0;
}

export async function declineService(id) {
  const [result] = await pool.query(
    `UPDATE services SET status = 'declined'
      WHERE id = ? AND status = 'quoted'`,
    [id],
  );
  return result.affectedRows > 0;
}

export async function assignProviderToService({ id, providerId }) {
  await pool.query(
    "UPDATE services SET service_provider_id = ?, status = 'assigned' WHERE id = ?",
    [providerId, id],
  );
}

export async function updateServiceStatusById(id, status) {
  await pool.query("UPDATE services SET status = ? WHERE id = ?", [
    status,
    id,
  ]);
}