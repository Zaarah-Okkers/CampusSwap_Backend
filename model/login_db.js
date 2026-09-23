// here will be the imports
import { db } from "../config/dhl_config.js";

// here will b the functions to fetch the infor form the database

export const getUserByEmail = async (email) => {
  const [rows] = await db.query(
    `SELECT u.*, uni.name AS university_name
    FROM users u
    LEFT JOIN universities uni ON u.university_id = uni.id
    WHERE u.email = ?`,
    [email],
  );
  return rows[0];
};

// here this will be a function that creates a new user

export const CreateUser = async (userdata) => {
  const {
    email,
    password_hash,
    full_name,
    student_number,
    role,
    university,
    company,
  } = userdata;

  // the university : this will alllow the student to look up university_id from the name

  let university_id = null;

  const universityName = university || company;

  if (universityName) {
    const [uni] = await db.query(
      "SELECT id FROM universities WHERE name = ? LIMIT 1",
      [universityName],
    );

    university_id = uni[0]?.id || null;
  }

  const [result] = await db.query(
    `INSERT INTO users
       (email, password_hash, full_name, student_number, role, university_id)
       VALUES (?, ?, ?, ?, ?, ?)`,

    [
      email,
      password_hash,
      full_name,
      student_number || null,
      role,
      university_id,
      //company || null,
    ],
  );

  return result.insertId;
};

// Fetch a single user by ID (used for password change)

export const getUserById = async (id) => {
  const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);

  return rows[0];
};

// Update only the password hash for a user

export const updatePassword = async (id, newPasswordHash) => {
  const [result] = await db.query(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [newPasswordHash, id],
  );

  return result.affectedRows;
};
