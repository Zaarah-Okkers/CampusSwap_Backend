import express from "express";
import {
  checkout,
  getOrders,
  getOrder,
  paymentWebhook,
  releaseOrder,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/orders/checkout", checkout);
router.get("/orders", getOrders);
router.get("/orders/:id", getOrder);
router.post("/payments/webhook", paymentWebhook);
router.post("/orders/:id/release", releaseOrder);

export default router;