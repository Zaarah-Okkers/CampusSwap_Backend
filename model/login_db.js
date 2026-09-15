// here will be the imports 
import { db } from "../config/home_config.js";


// here will b the functions to fetch the infor form the database 

export const getUserByEmail = async (email) => {
  const [rows] = await db.query ("SELECT * FROM users WHERE email = ? ", [email]);
  return rows[0];
};

// here this will be a function that creates a new user 

export const CreateUser = async (userdata) => {
  const {

    email, password_hash, full_name, student_number, role, university_id, phone } = userdata;

  const [result] = await db.query (

    `INSERT INTO users (email, password_hash, full_name, student_number, role, university_id, phone, is_verified)                      VALUES (?,?,?,?,?,?,?, TRUE)`,

    [email, password_hash, full_name, student_number || null, role, university_id || null, phone || null]

  );

  return result.insertId;
};