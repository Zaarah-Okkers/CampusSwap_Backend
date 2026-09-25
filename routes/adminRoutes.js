import express from "express";
import {
  listPendingUsers,
  listAllUsers,
  verifyUser,
  stats,
  dashboard,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/admin/pending-users", listPendingUsers);
router.get("/admin/users", listAllUsers);
router.patch("/admin/users/:id/verify", verifyUser);
router.get("/admin/stats", stats);
router.get("/dashboards/admin", dashboard);

export default router;