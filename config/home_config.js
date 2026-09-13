import dotenv from 'dotenv':
import mysql from 'mysql2/promise';

dotenv.config();

export const db = mysql.createPool({
  user: process.env.DB_USER,
  host:  process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
  
});