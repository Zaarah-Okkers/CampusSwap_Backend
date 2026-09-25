import express from "express";
import {
  studentDashboard,
  providerDashboard,
  resManagerDashboard,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/dashboards/student/:id", studentDashboard);
router.get("/dashboards/provider/:id", providerDashboard);
router.get("/dashboards/res-manager", resManagerDashboard);

export default router;