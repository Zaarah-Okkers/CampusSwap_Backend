import { db } from "../config/dhl_config.js";

// Fetch featured products for the home feed
export const getFeaturedProducts = async () => {
  const [rows] = await db.query(
    `SELECT p.*, c.name AS category_name, u.name AS university_name,
            seller.full_name AS seller_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN universities u ON p.university_id = u.id
     JOIN users seller ON p.seller_id = seller.id
     WHERE p.status = 'active'
     ORDER BY p.created_at DESC
     LIMIT 6`,
  );

  return rows;
};

// Fetch categories for search filters

export const getAllCategories = async () => {
  const [rows] = await db.query("SELECT * FROM categories ORDER BY name ASC");

  return rows;
};

// Fetch universities for location filters
export const getAllUniversities = async () => {
  const [rows] = await db.query("SELECT * FROM universities ORDER BY name ASC");

  return rows;
};
