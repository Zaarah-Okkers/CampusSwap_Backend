import express from "express";
import {
  createServiceRequest,
  getServiceRequests,
  getOpenRequests,
  getRepairs,
  submitServiceQuote,
  approveServiceRequest,
  declineServiceRequest,
  assignProvider,
  updateServiceStatus,
} from "../controllers/serviceController.js";
import {
  createReview,
  listProviderReviews,
  checkServiceReview,
} from "../controllers/serviceReviewController.js";

const router = express.Router();

// Read
router.get("/", getServiceRequests);
router.get("/open", getOpenRequests);
router.get("/reviews", listProviderReviews); // MUST come before /:id/review
router.get("/:id/review", checkServiceReview);

// Create
router.post("/", createServiceRequest);
router.post("/emergency", (req, res, next) => {
  req.body = { ...req.body, emergency: true, priority: "emergency" };
  createServiceRequest(req, res, next);
});
router.post("/:id/review", createReview);

// Workflow
router.patch("/:id/quote", submitServiceQuote);
router.patch("/:id/approve", approveServiceRequest);
router.patch("/:id/decline", declineServiceRequest);
router.patch("/:id/assign", assignProvider);
router.patch("/:id/status", updateServiceStatus);

export default router;