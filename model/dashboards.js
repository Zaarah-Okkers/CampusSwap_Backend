// here will be the imports
import { db } from "../config/dhl_config.js";

// here will b the functions to fetch the information from the database

// the student database

export const getStudentDashData = async (userId) => {
  const [mylistings] = await db.query(
    "SELECT * FROM products WHERE seller_id = ? ",
    [userId],
  );

  const [myOrders] = await db.query("SELECT * FROM orders WHERE user_id =?", [
    userId,
  ]);

  return { mylistings, myOrders };
};

// the admin database

export const getAdminStats = async () => {
  const [[users]] = await db.query("SELECT COUNT(*) AS totalUsers FROM users");

  const [[products]] = await db.query(
    "SELECT COUNT(*) AS totalProducts FROM products",
  );

  const [[reports]] = await db.query(
    "SELECT COUNT(*) AS pendingReports FROM reports WHERE status = 'pending'",
  );

  return {
    totalUsers: users.totalUsers,
    totalListings: products.totalProducts,
    reportsPending: reports.pendingReports,
  };
};

// the res database

export const getResMangerData = async () => {
  const [services] = await db.query(
    `SELECT services.*, users.full_name AS student_name 
    FROM services 
    JOIN users  ON services.student_id = users.id 
    ORDER BY services.created_at DESC`,
  );

  return { maintenanceRequests: services };
};

// the provider database

export const getProviderData = async (providerId) => {
  const [assignedJobs] = await db.query(
    "SELECT * FROM services WHERE service_provider_id = ?",
    [providerId],
  );

  return { assignedJobs };
};
