import { asyncRoute } from "../utils/asyncRoute.js";
import { createNotification } from "../utils/notifications.js";
import {
  getPendingUsers,
  getAllUsers,
  verifyUserById,
  getAdminStats,
  getAdminDashboard,
} from "../models/adminModel.js";

export const listPendingUsers = asyncRoute(async (req, res) => {
  const users = await getPendingUsers();
  res.json({ success: true, count: users.length, data: users });
});

export const listAllUsers = asyncRoute(async (req, res) => {
  const data = await getAllUsers();
  res.json({ success: true, count: data.length, data });
});

export const verifyUser = asyncRoute(async (req, res) => {
  const user = await verifyUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  createNotification({
    userId: user.id,
    type: "general",
    title: "Account verified",
    message:
      "Your account has been verified. You can now trade on CampusSwap with full access.",
    actionUrl: "/student-dashboard",
  }).catch((err) => console.warn("[notify] verify failed:", err.message));

  res.json({ success: true, message: "User verified", data: user });
});

export const stats = asyncRoute(async (req, res) => {
  const data = await getAdminStats();
  res.json({ success: true, data });
});

export const dashboard = asyncRoute(async (req, res) => {
  const data = await getAdminDashboard();
  res.json(data);
});
