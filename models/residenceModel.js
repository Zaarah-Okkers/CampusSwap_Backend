import pool from "../config/db.js";

// ---------------------------------------------------------------------------
// Residences
// ---------------------------------------------------------------------------

export async function getActiveResidences() {
  const [rows] = await pool.query(`
    SELECT r.*, u.full_name AS manager_name
      FROM residences r
      LEFT JOIN users u ON u.id = r.manager_id
     WHERE r.status = 'active'
     ORDER BY r.name
  `);
  return rows;
}

export async function findResidenceById(id) {
  const [[row]] = await pool.query(
    "SELECT id, manager_id, name FROM residences WHERE id = ?",
    [id],
  );
  return row;
}

// ---------------------------------------------------------------------------
// Residence requests
// ---------------------------------------------------------------------------

export async function listResidenceRequests({ studentId, managerId } = {}) {
  const filters = ["1=1"];
  const params = [];
  if (studentId) {
    filters.push("rr.student_id = ?");
    params.push(studentId);
  }
  if (managerId) {
    filters.push("r.manager_id = ?");
    params.push(managerId);
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
  return rows;
}

export async function insertResidenceRequest({
  residenceId,
  studentId,
  notes,
}) {
  const [result] = await pool.query(
    `INSERT INTO residence_requests (residence_id, student_id, notes)
     VALUES (?, ?, ?)`,
    [residenceId, studentId, notes],
  );
  return result.insertId;
}

export async function findResidenceRequestById(id) {
  const [[row]] = await pool.query(
    `SELECT rr.*, r.name AS residence_name, r.location AS residence_location
       FROM residence_requests rr
       JOIN residences r ON r.id = rr.residence_id
      WHERE rr.id = ?`,
    [id],
  );
  return row;
}

export async function setResidenceRequestStatus(id, status) {
  const [result] = await pool.query(
    "UPDATE residence_requests SET status = ? WHERE id = ?",
    [status, id],
  );
  return result.affectedRows > 0;
}

// ---------------------------------------------------------------------------
// Residence payments
// ---------------------------------------------------------------------------

export async function listResidencePayments({ studentId, managerId } = {}) {
  const filters = ["1=1"];
  const params = [];
  if (studentId) {
    filters.push("rp.student_id = ?");
    params.push(studentId);
  }
  if (managerId) {
    filters.push("r.manager_id = ?");
    params.push(managerId);
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
  return rows;
}

export async function markPaymentAsPaid(id) {
  const [result] = await pool.query(
    `UPDATE residence_payments
        SET status = 'paid', paid_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [id],
  );
  return result.affectedRows > 0;
}

export async function setPaymentStatus(id, status) {
  await pool.query("UPDATE residence_payments SET status = ? WHERE id = ?", [
    status,
    id,
  ]);
}
