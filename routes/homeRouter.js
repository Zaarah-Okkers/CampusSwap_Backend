import express from "express";
import { getHomePageData } from "../controller/home_con.js";

const router = express.Router();

// GET /api/home
router.get("/", getHomePageData);

export default router;