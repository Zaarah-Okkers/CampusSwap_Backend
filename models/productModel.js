import pool from "../config/db.js";

export async function getAllUniversities() {
  const [rows] = await pool.query(
    "SELECT id, name, province FROM universities ORDER BY name",
  );
  return rows;
}

export async function getAllCategories() {
  const [rows] = await pool.query(
    "SELECT id, name, description FROM categories ORDER BY name",
  );
  return rows;
}

export async function getHomepageUniversities() {
  const [rows] = await pool.query(
    "SELECT id, name FROM universities ORDER BY name",
  );
  return rows;
}

/**
 * Featured listings for the homepage.
 * Deliberately mixes sale, rent and swap so the front page never shows
 * one listing type only. Three sale, two rent, three swap.
 */
export async function getFeaturedProducts() {
  const [rows] = await pool.query(`
    (
      SELECT p.*, c.name AS category_name, u.name AS university_name,
             seller.full_name AS seller_name, seller.rating AS seller_rating
        FROM products p
        JOIN users seller ON seller.id = p.seller_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN universities u ON u.id = p.university_id
       WHERE p.status = 'active' AND p.listing_type = 'sale'
       ORDER BY p.created_at DESC
       LIMIT 3
    )
    UNION ALL
    (
      SELECT p.*, c.name AS category_name, u.name AS university_name,
             seller.full_name AS seller_name, seller.rating AS seller_rating
        FROM products p
        JOIN users seller ON seller.id = p.seller_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN universities u ON u.id = p.university_id
       WHERE p.status = 'active' AND p.listing_type = 'rent'
       ORDER BY p.created_at DESC
       LIMIT 2
    )
    UNION ALL
    (
      SELECT p.*, c.name AS category_name, u.name AS university_name,
             seller.full_name AS seller_name, seller.rating AS seller_rating
        FROM products p
        JOIN users seller ON seller.id = p.seller_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN universities u ON u.id = p.university_id
       WHERE p.status = 'active' AND p.listing_type = 'swap'
       ORDER BY p.created_at DESC
       LIMIT 3
    )
  `);
  return rows;
}

/**
 * Filtered product listing. All filters are optional and combine via AND.
 */
export async function getProducts({ search, university, condition, maxPrice }) {
  const filters = ["p.status = 'active'"];
  const params = [];

  if (search) {
    filters.push("(p.name LIKE ? OR p.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (university) {
    filters.push("u.name = ?");
    params.push(university);
  }
  if (condition) {
    filters.push("p.condition_status = ?");
    params.push(condition);
  }
  if (maxPrice !== "" && maxPrice != null) {
    filters.push("p.price <= ?");
    params.push(Number(maxPrice));
  }

  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category_name, u.name AS university_name,
            seller.full_name AS seller_name, seller.rating AS seller_rating
       FROM products p
       JOIN users seller ON seller.id = p.seller_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN universities u ON u.id = p.university_id
      WHERE ${filters.join(" AND ")}
      ORDER BY p.created_at DESC`,
    params,
  );
  return rows;
}