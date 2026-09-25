import express from "express";
import {
  getUniversities,
  getHome,
  listProducts,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/universities", getUniversities);
router.get("/home", getHome);
router.get("/products", listProducts);

export default router;
