import { asyncRoute } from "../utils/asyncRoute.js";
import { createNotification } from "../utils/notifications.js";
import {
  listNotifications,
  countUnread,
  markNotificationRead,
  markAllRead,
} from "../models/notificationModel.js";

// GET /api/notifications?user_id=X&limit=N
export const getNotifications = asyncRoute(async (req, res) => {
  const { user_id, userId, limit = 50 } = req.query;
  const uid = user_id || userId;
  if (!uid) return res.status(400).json({ error: "user_id is required" });

  const [rows, unread] = await Promise.all([
    listNotifications({ userId: uid, limit }),
    countUnread(uid),
  ]);

  res.json({ success: true, unread, count: rows.length, data: rows });
});

// PATCH /api/notifications/:id/read
export const markOneRead = asyncRoute(async (req, res) => {
  const ok = await markNotificationRead(req.params.id);
  if (!ok) {
    return res
      .status(404)
      .json({ success: false, message: "Notification not found" });
  }
  res.json({ success: true, message: "Marked as read" });
});

// PATCH /api/notifications/read-all?user_id=X
export const markAllReadForUser = asyncRoute(async (req, res) => {
  const uid = req.query.user_id || req.query.userId;
  if (!uid) return res.status(400).json({ error: "user_id is required" });

  const updated = await markAllRead(uid);
  res.json({ success: true, updated });
});

// POST /api/notifications
export const createOne = asyncRoute(async (req, res) => {
  const b = req.body || {};
  const uid = b.userId || b.user_id;

  if (!uid || !b.type || !b.title || !b.message) {
    return res
      .status(400)
      .json({ error: "user_id, type, title and message are required" });
  }

  const id = await createNotification({
    userId: uid,
    type: b.type,
    title: b.title,
    message: b.message,
    actionUrl: b.actionUrl || b.action_url || null,
    metadata: b.metadata || null,
  });

  res.status(201).json({ success: true, id });
});