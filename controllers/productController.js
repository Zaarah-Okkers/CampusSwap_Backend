import { asyncRoute } from "../utils/asyncRoute.js";
import { mapProductRow } from "../utils/mapProduct.js";
import {
  getAllUniversities,
  getAllCategories,
  getHomepageUniversities,
  getFeaturedProducts,
  getProducts,
} from "../models/productModel.js";

export const getUniversities = asyncRoute(async (req, res) => {
  const rows = await getAllUniversities();
  res.json(rows);
});

export const getHome = asyncRoute(async (req, res) => {
  const [products, categories, universities] = await Promise.all([
    getFeaturedProducts(),
    getAllCategories(),
    getHomepageUniversities(),
  ]);

  res.json({
    featuredProducts: products.map(mapProductRow),
    categories,
    universities,
  });
});

export const listProducts = asyncRoute(async (req, res) => {
  const {
    search = "",
    university = "",
    condition = "",
    maxPrice = "",
  } = req.query;

  const rows = await getProducts({ search, university, condition, maxPrice });
  res.json(rows.map(mapProductRow));
});