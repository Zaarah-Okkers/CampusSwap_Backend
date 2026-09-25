import { asyncRoute } from "../utils/asyncRoute.js";
import { createNotification } from "../utils/notifications.js";
import {
  getOpenServices,
  getAllServices,
  getActiveRepairs,
  getServiceById,
  findServiceTypeById,
  findProviderById,
  insertServiceRequest,
  submitQuote,
  approveService,
  declineService,
  assignProviderToService,
  updateServiceStatusById,
} from "../models/serviceModel.js";

// Create a new SafeHome request.
export const createServiceRequest = asyncRoute(async (req, res) => {
  const studentId =
    req.body.student_id ?? req.body.studentId ?? req.body.user_id;
  const serviceTypeId = req.body.service_type_id ?? req.body.serviceTypeId;
  const title =
    req.body.title ??
    req.body.service_name ??
    req.body.service ??
    "SafeHome service request";
  const description = req.body.description;
  const residenceName =
    req.body.residence_name ?? req.body.residenceName ?? req.body.residence;
  const roomNumber = req.body.room_number ?? req.body.roomNumber ?? null;
  const photoUrl =
    req.body.photo_url ?? req.body.photoUrl ?? req.body.photo_name ?? null;
  const priority =
    req.body.priority ??
    (req.body.emergency || req.body.is_emergency ? "emergency" : "normal");

  if (!studentId || !serviceTypeId || !title || !description || !residenceName) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields.",
    });
  }

  const serviceType = await findServiceTypeById(serviceTypeId);
  if (!serviceType) {
    return res
      .status(404)
      .json({ success: false, message: "Service type not found." });
  }

  const insertId = await insertServiceRequest({
    studentId,
    serviceTypeId,
    title,
    description,
    residenceName,
    roomNumber,
    photoUrl,
    priority,
  });

  const created = await getServiceById(insertId);
  res.status(201).json({
    success: true,
    message: "Service request created successfully.",
    data: created,
  });
});

// GET /api/services?student_id=&provider_id=&status=
export const getServiceRequests = asyncRoute(async (req, res) => {
  const { student_id, studentId, provider_id, providerId, status } = req.query;
  const data = await getAllServices({
    student_id: student_id || studentId,
    provider_id: provider_id || providerId,
    status,
  });
  res.json({ success: true, count: data.length, data });
});

// GET /api/services/open
export const getOpenRequests = asyncRoute(async (req, res) => {
  const data = await getOpenServices();
  res.json({ success: true, count: data.length, data });
});

// GET /api/repairs
export const getRepairs = asyncRoute(async (req, res) => {
  const data = await getActiveRepairs();
  res.json(data);
});

// PATCH /api/services/:id/quote
export const submitServiceQuote = asyncRoute(async (req, res) => {
  const { provider_id, estimated_cost } = req.body || {};
  if (!provider_id || !estimated_cost) {
    return res.status(400).json({
      success: false,
      message: "provider_id and estimated_cost are required",
    });
  }
  const cost = Number(estimated_cost);
  if (isNaN(cost) || cost <= 0) {
    return res.status(400).json({
      success: false,
      message: "estimated_cost must be a positive number",
    });
  }

  const ok = await submitQuote({
    id: req.params.id,
    providerId: provider_id,
    cost,
  });
  if (!ok) {
    return res.status(409).json({
      success: false,
      message: "This request is no longer available.",
    });
  }
  const updated = await getServiceById(req.params.id);

  createNotification({
    userId: updated?.student_id,
    type: "service",
    title: "Quote received",
    message: `A provider has quoted R${cost.toFixed(2)} for "${updated?.title}". Awaiting manager approval.`,
    actionUrl: "/safehome",
    metadata: { serviceId: updated?.id, cost },
  }).catch((err) => console.warn("[notify] quote failed:", err.message));

  res.json({ success: true, message: "Quote submitted", data: updated });
});

// PATCH /api/services/:id/approve
export const approveServiceRequest = asyncRoute(async (req, res) => {
  const ok = await approveService(req.params.id);
  if (!ok) {
    return res.status(409).json({
      success: false,
      message: "This request is not awaiting approval.",
    });
  }
  const updated = await getServiceById(req.params.id);

  createNotification({
    userId: updated?.student_id,
    type: "service",
    title: "Repair approved",
    message: `Your request "${updated?.title}" has been approved at R${updated?.estimated_cost}. The provider will be in touch.`,
    actionUrl: "/safehome",
    metadata: { serviceId: updated?.id },
  }).catch((err) => console.warn("[notify] approve failed:", err.message));

  res.json({ success: true, message: "Request approved", data: updated });
});

// PATCH /api/services/:id/decline
export const declineServiceRequest = asyncRoute(async (req, res) => {
  const ok = await declineService(req.params.id);
  if (!ok) {
    return res.status(409).json({
      success: false,
      message: "This request is not awaiting approval.",
    });
  }
  const updated = await getServiceById(req.params.id);

  createNotification({
    userId: updated?.student_id,
    type: "service",
    title: "Repair declined",
    message: `Your request "${updated?.title}" was not approved. Please try another provider.`,
    actionUrl: "/safehome",
    metadata: { serviceId: updated?.id },
  }).catch((err) => console.warn("[notify] decline failed:", err.message));

  res.json({ success: true, message: "Request declined", data: updated });
});

// PATCH /api/services/:id/assign
export const assignProvider = asyncRoute(async (req, res) => {
  const providerId = req.body.service_provider_id || req.body.providerId;
  if (!providerId) {
    return res.status(400).json({
      success: false,
      message: "Please provide a service provider ID.",
    });
  }

  const service = await getServiceById(req.params.id);
  if (!service) {
    return res
      .status(404)
      .json({ success: false, message: "Service request not found." });
  }

  const provider = await findProviderById(providerId);
  if (!provider) {
    return res
      .status(404)
      .json({ success: false, message: "Service provider not found." });
  }

  await assignProviderToService({ id: req.params.id, providerId });
  const updated = await getServiceById(req.params.id);

  res.json({
    success: true,
    message: "Service provider assigned successfully.",
    data: updated,
  });
});

// PATCH /api/services/:id/status
export const updateServiceStatus = asyncRoute(async (req, res) => {
  const { status } = req.body || {};
  const allowed = [
    "pending",
    "quoted",
    "approved",
    "declined",
    "assigned",
    "in_progress",
    "completed",
    "paid",
    "cancelled",
  ];
  if (!status || !allowed.includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid service status." });
  }

  const service = await getServiceById(req.params.id);
  if (!service) {
    return res
      .status(404)
      .json({ success: false, message: "Service request not found." });
  }

  await updateServiceStatusById(req.params.id, status);
  const updated = await getServiceById(req.params.id);

  res.json({
    success: true,
    message: "Service status updated successfully.",
    data: updated,
  });
});