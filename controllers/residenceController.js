import { asyncRoute } from "../utils/asyncRoute.js";
import { createNotification } from "../utils/notifications.js";
import {
  getActiveResidences,
  findResidenceById,
  listResidenceRequests,
  insertResidenceRequest,
  findResidenceRequestById,
  setResidenceRequestStatus,
  listResidencePayments,
  markPaymentAsPaid,
  setPaymentStatus,
} from "../models/residenceModel.js";

// ---------------------------------------------------------------------------
// Residences
// ---------------------------------------------------------------------------

export const getResidences = asyncRoute(async (req, res) => {
  const rows = await getActiveResidences();
  res.json({ success: true, count: rows.length, data: rows });
});

// ---------------------------------------------------------------------------
// Residence requests
// ---------------------------------------------------------------------------

export const getResidenceRequests = asyncRoute(async (req, res) => {
  const { student_id, studentId, manager_id, managerId } = req.query;
  const rows = await listResidenceRequests({
    studentId: student_id || studentId,
    managerId: manager_id || managerId,
  });
  res.json({ success: true, count: rows.length, data: rows });
});

export const createResidenceRequest = asyncRoute(async (req, res) => {
  const b = req.body || {};
  const residenceId = b.residence_id || b.residenceId;
  const studentId = b.student_id || b.studentId;
  const notes = b.notes || null;

  if (!residenceId || !studentId) {
    return res
      .status(400)
      .json({ error: "residence_id and student_id are required" });
  }

  const insertId = await insertResidenceRequest({
    residenceId,
    studentId,
    notes,
  });
  const request = await findResidenceRequestById(insertId);

  // Notify the residence's manager.
  const residence = await findResidenceById(residenceId);
  if (residence?.manager_id) {
    createNotification({
      userId: residence.manager_id,
      type: "residence_request",
      title: "New residence request",
      message: `A new request was submitted for ${residence.name}.`,
      actionUrl: "/resmanager-dashboard",
    }).catch((err) =>
      console.warn("[notify] residence request failed:", err.message),
    );
  }

  res.status(201).json({ success: true, data: request });
});

export const updateResidenceRequest = asyncRoute(async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["approved", "declined", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const ok = await setResidenceRequestStatus(req.params.id, status);
  if (!ok) {
    return res.status(404).json({ error: "Request not found" });
  }

  // Notify the student that the manager acted on their request.
  const request = await findResidenceRequestById(req.params.id);
  if (request?.student_id) {
    createNotification({
      userId: request.student_id,
      type: "residence_request",
      title:
        status === "approved"
          ? "Residence request approved"
          : status === "declined"
            ? "Residence request declined"
            : "Residence request cancelled",
      message: `Your request for ${request.residence_name} has been ${status}.`,
      actionUrl: "/student-residence",
    }).catch((err) =>
      console.warn("[notify] residence request update failed:", err.message),
    );
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Residence payments
// ---------------------------------------------------------------------------

export const getResidencePayments = asyncRoute(async (req, res) => {
  const { student_id, studentId, manager_id, managerId } = req.query;
  const rows = await listResidencePayments({
    studentId: student_id || studentId,
    managerId: manager_id || managerId,
  });
  res.json({ success: true, count: rows.length, data: rows });
});

export const payResidencePayment = asyncRoute(async (req, res) => {
  const ok = await markPaymentAsPaid(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: "Payment not found" });
  }
  res.json({ success: true });
});

export const updateResidencePaymentStatus = asyncRoute(async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["upcoming", "pending", "paid", "late", "extended"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  await setPaymentStatus(req.params.id, status);
  res.json({ success: true });
});