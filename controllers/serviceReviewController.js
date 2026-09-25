import { asyncRoute } from "../utils/asyncRoute.js";
import { createNotification } from "../utils/notifications.js";
import { getServiceById } from "../models/serviceModel.js";
import {
  findReviewByServiceId,
  insertServiceReview,
  getProviderReviews,
  getProviderReviewSummary,
} from "../models/serviceReviewModel.js";

// POST /api/services/:id/review
export const createReview = asyncRoute(async (req, res) => {
  const { student_id, rating, comment } = req.body || {};
  if (!student_id || !rating) {
    return res
      .status(400)
      .json({ error: "student_id and rating are required" });
  }
  const r = Number(rating);
  if (isNaN(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: "rating must be 1–5" });
  }

  const service = await getServiceById(req.params.id);
  if (!service) return res.status(404).json({ error: "Service not found" });
  if (service.student_id !== Number(student_id)) {
    return res.status(403).json({ error: "You did not create this request" });
  }
  if (!["completed", "cancelled"].includes(service.status)) {
    return res
      .status(409)
      .json({ error: "You can only review a completed job" });
  }
  if (!service.service_provider_id) {
    return res.status(409).json({ error: "No provider was assigned" });
  }

  const existing = await findReviewByServiceId(req.params.id);
  if (existing) {
    return res
      .status(409)
      .json({ error: "This job has already been reviewed" });
  }

  const id = await insertServiceReview({
    serviceId: req.params.id,
    studentId: student_id,
    providerId: service.service_provider_id,
    rating: r,
    comment: comment || null,
  });

  createNotification({
    userId: service.service_provider_id,
    type: "service",
    title: "New review received",
    message: `A student left you a ${r}-star review for "${service.title}".`,
    actionUrl: "/provider-dashboard",
  }).catch((err) => console.warn("[notify] review failed:", err.message));

  res.status(201).json({ success: true, id });
});

// GET /api/services/reviews?provider_id=X
export const listProviderReviews = asyncRoute(async (req, res) => {
  const providerId = req.query.provider_id || req.query.providerId;
  if (!providerId) {
    return res.status(400).json({ error: "provider_id is required" });
  }

  const rows = await getProviderReviews(providerId);
  const summary = await getProviderReviewSummary(providerId);

  res.json({
    success: true,
    count: rows.length,
    average: summary.average || 0,
    data: rows,
  });
});

// GET /api/services/:id/review
export const checkServiceReview = asyncRoute(async (req, res) => {
  const review = await findReviewByServiceId(req.params.id);
  res.json({
    success: true,
    reviewed: Boolean(review),
    data: review || null,
  });
});
