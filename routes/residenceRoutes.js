import express from "express";
import {
  getResidences,
  getResidenceRequests,
  createResidenceRequest,
  updateResidenceRequest,
  getResidencePayments,
  payResidencePayment,
  updateResidencePaymentStatus,
} from "../controllers/residenceController.js";

const router = express.Router();

// Residences
router.get("/residences", getResidences);

// Residence requests
router.get("/residence-requests", getResidenceRequests);
router.post("/residence-requests", createResidenceRequest);
router.patch("/residence-requests/:id", updateResidenceRequest);

// Residence payments
router.get("/residence-payments", getResidencePayments);
router.patch("/residence-payments/:id/pay", payResidencePayment);
router.patch("/residence-payments/:id/status", updateResidencePaymentStatus);

export default router;
