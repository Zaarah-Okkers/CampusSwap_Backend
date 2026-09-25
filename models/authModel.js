import pool from "../config/db.js";

export async function findUserByEmail(email) {
  const [[user]] = await pool.query(
    `SELECT u.*, uni.name AS university_name
       FROM users u
       LEFT JOIN universities uni ON uni.id = u.university_id
      WHERE u.email = ?
      LIMIT 1`,
    [email],
  );
  return user;
}

export async function findUserById(id) {
  const [[user]] = await pool.query(
    "SELECT id, password_hash FROM users WHERE id = ?",
    [id],
  );
  return user;
}

export async function findUniversityByName(name) {
  const [[uni]] = await pool.query(
    "SELECT id FROM universities WHERE name = ? LIMIT 1",
    [name],
  );
  return uni;
}

export async function insertUser({
  fullName,
  email,
  passwordHash,
  role,
  studentNumber,
  universityId,
}) {
  const [result] = await pool.query(
    `INSERT INTO users
       (full_name, email, password_hash, role, student_number, university_id, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
    [fullName, email, passwordHash, role, studentNumber, universityId],
  );
  return result.insertId;
}

export async function insertProviderProfile({
  userId,
  businessName,
  serviceType,
  bio,
  location,
}) {
  await pool.query(
    `INSERT INTO service_provider_profiles
       (user_id, business_name, service_type, bio, location, verification_status, accepts_emergency)
     VALUES (?, ?, ?, ?, ?, 'pending', FALSE)`,
    [userId, businessName, serviceType, bio, location],
  );
}

export async function updatePasswordHash(userId, hash) {
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
    hash,
    userId,
  ]);
}