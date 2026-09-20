// here will be the imports
import { db } from "../config/dhl_config.js";

// here will b the functions to fetch the information from the database

// the student database

export const getStudentDashData = async (userId) => {
  const [mylistings] = await db.query(
    "SELECT * FROM products WHERE seller_id = ? ",
    [userId],
  );

  const [myOrders] = await db.query("SELECT * FROM orders WHERE buyer_id = ?", [
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
    "SELECT COUNT(*) AS pendingReports FROM reports WHERE status IN ('open', 'reviewing')",
  );

  return {
    totalUsers: users.totalUsers,
    totalListings: products.totalProducts,
    reportsPending: reports.pendingReports,
  };
};

// the res database

export const getResMangerData = async () => {
  const [requests] = await db.query(
    `SELECT rr.*, r.name AS residence_name, u.full_name AS student_name
     FROM residence_requests rr
     JOIN residences r ON rr.residence_id = r.id
     JOIN users u ON rr.student_id = u.id
     ORDER BY rr.requested_at DESC`,
  );

  return { maintenanceRequests: requests };
};

// the provider database

export const getProviderData = async (providerId) => {
  const [assignedJobs] = await db.query(
    "SELECT * FROM jobs WHERE provider_id = ?",
    [providerId],
  );

  return { assignedJobs };
};


