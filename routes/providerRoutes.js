import express from "express";
import { listProviders } from "../controllers/providerController.js";

const router = express.Router();
router.get("/", listProviders);

export default router;