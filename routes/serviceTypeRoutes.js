import express from "express";
import { listServiceTypes } from "../controllers/serviceTypeController.js";

const router = express.Router();
router.get("/", listServiceTypes);

export default router;