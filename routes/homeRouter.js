import express from "express";
import { getHomePageData } from "../controllers/home_con.js";

const router = express.Router();

// GET /api/home
router.get("/", getHomePageData);

export default router;