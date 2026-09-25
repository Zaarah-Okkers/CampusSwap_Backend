import express from "express";
import {
  getNotifications,
  markOneRead,
  markAllReadForUser,
  createOne,
} from "../controllers/notificationController.js";

const router = express.Router();

// read-all must come before :id/read so "/read-all" isn't captured as an id.
router.patch("/notifications/read-all", markAllReadForUser);
router.patch("/notifications/:id/read", markOneRead);
router.get("/notifications", getNotifications);
router.post("/notifications", createOne);

export default router;